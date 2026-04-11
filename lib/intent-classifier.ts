/**
 * 한국어 키워드 구매 의도 분류기 (규칙 기반)
 *
 * 근거:
 *   Li et al. (WWW 2019, Alibaba) — 구매 의도 키워드 전환율 3.7× 높음
 *   Tagami et al. (RecSys 2019, Yahoo Japan) — 한국/일본 구매 의도 신호 패턴
 *   Brynjolfsson et al. (2011) — 롱테일 키워드 전환율 2.5× 높음
 */

/** 구매 의도 신호 (있을수록 구매 가능성 높음) */
const TRANSACTIONAL_SIGNALS = [
  // 거래/가격
  "구매", "주문", "최저가", "최저", "저렴", "할인", "세일", "특가", "쿠폰",
  "가성비", "싸게", "싸다", "무료배송", "빠른배송", "당일배송", "당일",
  "익일배송", "로켓배송", "직구", "해외직구",
  // 구성/수량
  "묶음", "세트", "대용량", "리필", "1+1", "2+1", "증정",
  // 진위/품질
  "정품", "국내정품", "병행수입", "정식수입", "리퍼",
  // 규격 단위 (단독보다 수식어로)
  "사이즈", "사이즈별", "호환", "전용",
];

/** 정보 탐색 신호 (있을수록 구매 의도 낮음) */
const INFORMATIONAL_SIGNALS = [
  "추천", "후기", "비교", "리뷰", "알아보기", "알려줘", "설명", "뭐야",
  "종류", "차이", "방법", "효과", "원인", "이유", "뜻", "의미",
  "순위", "베스트", "인기", "잘팔리는", "좋은", "괜찮은",
  "어때요", "어때", "어떤",
];

/** 구체성 수식어 (있을수록 롱테일, 전환율 높음)
 *  주의: lower.includes() 매칭이라 같은 토큰 중복/부분문자열 포함은 더블카운트 유발 →
 *  중복 제거 + 길이 내림차순으로 정렬하여 긴 매치 우선 1회만 카운트 (아래 매칭 루프 참조).
 */
const SPECIFICITY_MODIFIERS = [
  // 성별/연령
  "남성", "여성", "남자", "여자", "아동", "유아", "신생아", "어린이", "유치원",
  "초등", "중학생", "고등학생", "성인", "시니어", "노인",
  // 크기
  "초소형", "소형", "중형", "대형", "미니", "와이드",
  // 특성
  "경량", "접이식", "휴대용", "가정용", "업소용", "캠핑용", "실내용", "야외용",
  "방수", "방풍", "방한", "무선", "유선", "충전식", "건전지식", "자동", "수동",
  "전동",
  // 수용량 (긴 형태 우선)
  "1인용", "2인용", "3인용", "4인용", "6인용", "1인", "2인",
  // 색상
  "화이트", "블랙", "그레이", "베이지", "네이비", "핑크", "연두", "민트", "카키",
  // 재질
  "스테인리스", "알루미늄", "플라스틱", "가죽", "면", "폴리에스터", "나일론",
  // 브랜드 접두사 (브랜드명은 가산)
  "국산", "수입", "독일제", "일제",
];

export interface IntentResult {
  /** 구매 의도 유형 */
  type: "transactional" | "informational" | "neutral";
  /** 구매 의도 점수 (0–100): 높을수록 구매로 이어질 가능성 높음 */
  intentScore: number;
  /** 구체성 점수 (0–100): 롱테일일수록 높음 */
  specificityScore: number;
  /** 롱테일 여부 (토큰 3개 이상) */
  isLongTail: boolean;
  /** 토큰 수 */
  tokenCount: number;
}

/** 키워드 구매 의도 + 구체성 분류 */
export function classifyKeywordIntent(keyword: string): IntentResult {
  const lower = keyword.toLowerCase().trim();
  const tokens = lower.split(/\s+/).filter((t) => t.length > 0);
  const tokenCount = tokens.length;

  // ─── 구매 의도 채점 ──────────────────────────────────────────────
  // FIX: 부분문자열 더블카운트 방지 (예: "최저가" → "최저가"+"최저" 두 번 카운트되던 문제)
  //      긴 신호 우선, 매치 구간 마스킹 후 다음 신호 매칭.
  const countHitsMasked = (text: string, signals: readonly string[]) => {
    const sorted = [...new Set(signals)].sort((a, b) => b.length - a.length);
    let masked = text;
    let hits = 0;
    for (const s of sorted) {
      const idx = masked.indexOf(s);
      if (idx >= 0) {
        hits++;
        masked = masked.slice(0, idx) + " ".repeat(s.length) + masked.slice(idx + s.length);
      }
    }
    return hits;
  };
  const transactionalHits = countHitsMasked(lower, TRANSACTIONAL_SIGNALS);
  const informationalHits = countHitsMasked(lower, INFORMATIONAL_SIGNALS);

  // 정보탐색 신호는 1.5배 패널티 (구매의도를 강하게 낮춤)
  const netScore = transactionalHits - informationalHits * 1.5;

  let intentScore: number;
  let type: IntentResult["type"];

  if (netScore > 1) {
    intentScore = Math.min(100, 50 + netScore * 18);
    type = "transactional";
  } else if (netScore > 0) {
    intentScore = 55;
    type = "transactional";
  } else if (informationalHits > 0) {
    intentScore = Math.max(5, 40 - informationalHits * 12);
    type = "informational";
  } else {
    // 신호 없음 → 중립. 토큰이 많으면 구매 의도 소폭 높게 (구체적 = 구매 가능성)
    intentScore = Math.min(50, 30 + tokenCount * 4);
    type = "neutral";
  }

  // ─── 구체성 채점 ──────────────────────────────────────────────────
  // 토큰 수: 1→15점, 2→40점, 3→62점, 4+→78점 (log scale)
  const tokenScore = Math.round((Math.log(tokenCount + 1) / Math.log(5)) * 78);

  // FIX: includes() 더블카운트 방지 — 긴 패턴 우선, 매치된 구간은 마스킹하여 재매치 차단
  //       (예: "1인용" → "1인용"만 1회 hit, "1인" 추가 카운트 X)
  let modifierHits = 0;
  const sortedModifiers = [...new Set(SPECIFICITY_MODIFIERS)].sort((a, b) => b.length - a.length);
  let masked = lower;
  for (const m of sortedModifiers) {
    const idx = masked.indexOf(m);
    if (idx >= 0) {
      modifierHits++;
      // 동일 위치 재매치/부분문자열 재카운트 방지
      masked = masked.slice(0, idx) + " ".repeat(m.length) + masked.slice(idx + m.length);
    }
  }

  const specificityScore = Math.min(100, tokenScore + modifierHits * 8);
  const isLongTail = tokenCount >= 3;

  return { type, intentScore, specificityScore, isLongTail, tokenCount };
}

/** 구매 의도 배율 (KOS 계산 시 곱셈 인수) */
export function intentMultiplier(intentScore: number): number {
  // 점수 0→0.5배, 50→1.0배, 100→1.8배 (Li et al. 3.7× 검증 기반 보수적 설정)
  return 0.5 + (intentScore / 100) * 1.3;
}

/** 구체성 배율 (롱테일 보너스) */
export function specificityMultiplier(specificityScore: number): number {
  // 점수 0→0.7배, 100→1.2배 (Brynjolfsson 2.5× 기반 보수적 설정)
  return 0.7 + (specificityScore / 100) * 0.5;
}
