/**
 * 상품 타이틀 역방향 마이닝 (B 알고리즘)
 * Helium 10 Cerebro 방식: 실제 상위 상품명에서 중요 키워드를 역방향으로 발굴
 *
 * 흐름:
 * 1. Naver Shopping 상위 50개 상품 타이틀 수집
 * 2. 토큰화 + 불용어 제거 + n-gram 추출
 * 3. 위치 가중치 적용 (상위 10개 타이틀 2배 가중치)
 * 4. 빈도 × 위치 점수로 중요 키워드 추출
 * 5. CO_TITLE 엣지로 그래프에 자동 적재 (D 알고리즘 cold start 해결)
 */

import { searchNaver } from "./naver";
import { upsertEdges } from "./keyword-graph";

// ─── 한국어 불용어 목록 ───────────────────────────────────────────
const STOPWORDS = new Set([
  // 일반 불용어
  "무료", "증정", "할인", "세일", "쿠폰", "특가", "혜택", "이벤트",
  "배송", "당일", "빠른", "정품", "공식", "인증", "국내", "해외",
  "최신", "신제품", "신형", "구형", "2023", "2024", "2025",
  // 상품 상태 묘사 (판매자 설명, 검색 키워드 아님)
  "미사용", "새제품", "미개봉", "리퍼", "중고", "정상품",
  // 세대/버전 단독 (2-gram의 첫 단어로만 의미 있음)
  "세대", "버전", "년형", "출시",
  // 수량/단위
  "1개", "2개", "3개", "4개", "5개", "1+1", "묶음", "세트", "박스",
  "개입", "매입", "포", "팩",
  // 조사 및 접속사 (공백 분리 후 잔여)
  "및", "또는", "그리고", "이상", "이하", "용", "형", "식",
]);

// 모델코드 패턴: 대문자+숫자+하이픈 조합 (ANC, XHA-K, MXP 등) — 검색 키워드로 부적합
const MODEL_CODE_RE = /^[A-Z][A-Z0-9\-]{1,}$/;

// 시드 키워드와 동일하거나 단순 복합어 변형 제거
function isRedundant(token: string, seed: string): boolean {
  if (token === seed) return true;
  if (token.replace(/\s/g, "") === seed.replace(/\s/g, "")) return true;
  return false;
}

// 숫자+단위 조합 패턴 (500g, 10kg, 50ml, 24cm 등은 보존)
const QTY_UNIT_RE = /^\d+(?:\.\d+)?(?:g|kg|ml|L|cm|mm|인치|매|개입|팩|봉|캡슐|포|T)$/i;

// ─── 타이틀 토큰화 ──────────────────────────────────────────────
function tokenize(title: string): string[] {
  return title
    .replace(/[()[\]{}<>'"「」【】\/\\|+,]/g, " ")
    // 숫자+단위 조합은 보존, 순수 숫자만 제거
    .replace(/(?<![a-zA-Z가-힣])\d+(?![a-zA-Z가-힣%])/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) =>
      t.length >= 2 &&
      !STOPWORDS.has(t) &&
      !MODEL_CODE_RE.test(t) &&
      // 순수 숫자 잔여물 제거 (but 숫자+단위는 통과)
      (QTY_UNIT_RE.test(t) || !/^\d+$/.test(t))
    );
}

export { tokenize as _tokenizeForTest, QTY_UNIT_RE };

const HAS_KOREAN = /[가-힣]/;
const HAS_LATIN  = /[a-zA-Z]/;

// ─── n-gram 생성 (1~2 단어) ──────────────────────────────────────
function getNgrams(tokens: string[]): string[] {
  const ngrams: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    // 한국어↔영어 혼합 2-gram 제외 (예: "노캔 Airpods" → 검색 키워드로 부적합)
    const aKo = HAS_KOREAN.test(a);
    const bKo = HAS_KOREAN.test(b);
    const aEn = HAS_LATIN.test(a) && !aKo;
    const bEn = HAS_LATIN.test(b) && !bKo;
    if (aKo && bEn) continue;
    if (aEn && bKo) continue;
    ngrams.push(`${a} ${b}`);
  }
  return ngrams;
}

export interface TitleMinedKeyword {
  keyword: string;
  titleScore: number;    // 빈도 × 위치 가중치 합산
  frequency: number;     // 등장 타이틀 수
}

// ─── 메인: 타이틀 마이닝 ─────────────────────────────────────────
export async function mineKeywordsFromTitles(
  seedKeyword: string
): Promise<TitleMinedKeyword[]> {
  // 1. 상위 50개 상품 타이틀 수집
  let items: { title: string }[] = [];
  try {
    const res = await searchNaver(seedKeyword, 50);
    items = res.items ?? [];
  } catch {
    return [];
  }

  if (items.length === 0) return [];

  // 2. 점수 누적
  const scoreMap = new Map<string, number>();
  const freqMap = new Map<string, number>();

  items.forEach((item, idx) => {
    // 상위 10개 타이틀 2배 가중치 (실제 상위 랭킹 상품의 언어 반영)
    const posWeight = idx < 10 ? 2.0 : 1.0;
    const tokens = tokenize(item.title);
    const ngrams = getNgrams(tokens);

    for (const gram of ngrams) {
      if (isRedundant(gram, seedKeyword)) continue;
      scoreMap.set(gram, (scoreMap.get(gram) ?? 0) + posWeight);
      freqMap.set(gram, (freqMap.get(gram) ?? 0) + 1);
    }
  });

  // 3. 1회만 등장한 저빈도 n-gram 제거 (노이즈)
  const results: TitleMinedKeyword[] = [];
  for (const [keyword, titleScore] of scoreMap) {
    const freq = freqMap.get(keyword) ?? 0;
    if (freq < 2) continue;
    results.push({ keyword, titleScore, frequency: freq });
  }

  // 4. titleScore 내림차순 정렬 → 상위 40개
  const top = results
    .sort((a, b) => b.titleScore - a.titleScore)
    .slice(0, 40);

  // 5. D 그래프에 CO_TITLE 엣지 자동 적재 (비동기, 오류 무시)
  const edges = top.slice(0, 20).map((k) => ({
    source: seedKeyword,
    target: k.keyword,
    relationType: "CO_TITLE" as const,
    weight: k.titleScore / 10,
  }));
  upsertEdges(edges).catch(() => {});

  return top;
}
