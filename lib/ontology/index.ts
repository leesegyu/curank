/**
 * 카테고리 온톨로지 통합 인터페이스
 *
 * 추천 알고리즘:
 *   - Wu-Palmer Similarity: LCA(최소공통조상) 깊이 기반 유사도 (0~1)
 *   - Facet 기반 롱테일: 형제/자식 노드 matchKeywords 교차 조합
 *   - classifyKeyword: 키워드 → 온톨로지 경로 매핑
 *   - getSimilarSeedKeywords: Wu-Palmer 유사도 기반 시드 키워드 반환
 *   - generateOntologyLongtails: 온톨로지 기반 실제 롱테일 키워드 생성
 */

import type { OntologyNode, Platform, CategoryWeights } from "./types";
import { SMARTSTORE_NODES } from "./smartstore";
import { COUPANG_NODES }    from "./coupang";
import { getLearned, learnMapping } from "./learned-mappings";

export type { OntologyNode, Platform, CategoryWeights } from "./types";
export { learnMapping } from "./learned-mappings";

// ── 플랫폼별 노드 접근 ──────────────────────────────────────────
const PLATFORM_NODES: Record<Platform, OntologyNode[]> = {
  smartstore: SMARTSTORE_NODES,
  coupang:    COUPANG_NODES,
};

export function getNodes(platform: Platform): OntologyNode[] {
  return PLATFORM_NODES[platform];
}

export function getAllNodes(): OntologyNode[] {
  return [...SMARTSTORE_NODES, ...COUPANG_NODES];
}

// ── 키워드 → 온톨로지 경로 매핑 ─────────────────────────────────
/**
 * 키워드를 온톨로지 경로로 분류 (3단계 폴백)
 *   1차: matchKeywords 직접 매칭
 *   2차: 학습 캐시 조회 (이전에 네이버 쇼핑으로 역추적한 결과)
 *   → 3차(자동 학습)는 keywords-graph API에서 수행 후 learnMapping() 호출
 */
export function classifyKeyword(
  keyword: string,
  platform?: Platform
): { path: string; platform: Platform } | null {
  const kw = keyword.toLowerCase().replace(/\s+/g, "");
  const platforms: Platform[] = platform ? [platform] : ["smartstore", "coupang"];

  // ── 1차: matchKeywords 직접 매칭 ──────────────────────────────
  // 매칭 품질 점수: (matchKeyword 길이 / 키워드 길이) × level
  // → "게"(1자) 가 "게이밍의자"(5자)에 매칭되면 비율 0.2 → 낮은 점수
  // → "의자"(2자) 가 "게이밍의자"(5자)에 매칭되면 비율 0.4 → 더 높은 점수
  // → "게이밍체어"(5자)가 정확히 매칭되면 비율 1.0 → 최고 점수
  let bestMatch: { path: string; platform: Platform; level: number; quality: number } | null = null;

  // 짧은 matchKeyword의 substring 오매칭 방지:
  // - 1글자 matchKeyword: 키워드와 완전 일치(kw === mkNorm)만 허용
  //   예: "게"는 "게" 검색 시에만 매칭, "게이밍의자"에는 매칭 안 됨
  // - 2글자 matchKeyword: 키워드 끝이 일치하거나 키워드와 동일할 때만
  //   예: "의자"는 "게이밍의자"(끝 일치) OK, "의자놀이"는 OK
  //   예: "차"는 "자동차"(끝 일치) 안 됨(1자), "녹차"(끝 일치)도 2자로 "차" 매칭 불가
  const MIN_SUBSTR_LEN = 2; // substring 매칭 최소 길이

  for (const p of platforms) {
    const nodes = PLATFORM_NODES[p];
    for (const node of nodes) {
      for (const mk of node.matchKeywords) {
        const mkNorm = mk.toLowerCase().replace(/\s+/g, "");

        let matched = false;

        if (kw === mkNorm) {
          // 완전 일치 — 항상 허용
          matched = true;
        } else if (mkNorm.length < MIN_SUBSTR_LEN) {
          // 1글자 matchKeyword는 완전 일치만 허용 (위에서 처리됨)
          matched = false;
        } else if (mkNorm.length <= 2) {
          // 2글자 matchKeyword: kw가 mkNorm으로 끝나거나 시작할 때만 (접두사/접미사)
          // 예: "의자" → "게이밍의자"(접미사 O), "의자커버"(접두사 O)
          // 역방향(mkNorm.includes(kw))은 kw도 2글자 이상일 때만 허용
          // → "차"(1자)가 "차돌"(2자)에 매칭되는 오류 방지
          if (kw.length >= MIN_SUBSTR_LEN) {
            matched = kw.endsWith(mkNorm) || kw.startsWith(mkNorm) || mkNorm.includes(kw);
          }
          // kw가 1글자이면 2글자 matchKeyword와 substring 매칭 불허 (위 exact match만)
        } else if (kw.length >= MIN_SUBSTR_LEN && (kw.includes(mkNorm) || mkNorm.includes(kw))) {
          // 3글자 이상 matchKeyword: 기존 substring 매칭 유지
          // 단, kw도 2글자 이상이어야 함 (1글자 kw의 false positive 방지)
          matched = true;
        }

        if (matched) {
          // 매칭 품질: matchKeyword 커버리지 비율 × level
          const coverage = Math.min(mkNorm.length, kw.length) / Math.max(mkNorm.length, kw.length);
          const quality = coverage * node.level;

          if (!bestMatch || quality > bestMatch.quality) {
            bestMatch = { path: node.id, platform: p, level: node.level, quality };
          }
        }
      }
    }
  }

  if (bestMatch) return { path: bestMatch.path, platform: bestMatch.platform };

  // ── 2차: 학습 캐시 조회 (이전 역추적 결과) ────────────────────
  const learned = getLearned(keyword);
  if (learned && (!platform || learned.platform === platform)) {
    return { path: learned.path, platform: learned.platform };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Wu-Palmer Similarity (논문: Wu & Palmer, ACL 1994)
//
// sim(a, b) = 2 × depth(LCA) / (depth(a) + depth(b))
//
// 장점: 트리 구조의 깊이를 반영 → 깊은 곳의 형제 노드가
//       얕은 곳의 형제 노드보다 더 유사하다고 판단
// 예: "캠핑용 삼겹살" ↔ "숙성 삼겹살" = 0.89 (같은 L3 아래)
//     "돼지고기" ↔ "소고기" = 0.67 (같은 L2 아래)
//     "식품" ↔ "패션" = 0.0 (다른 L1)
// ═══════════════════════════════════════════════════════════════

/** 경로의 깊이 (점 개수 + 1) */
function getDepth(path: string): number {
  return path.split(".").length;
}

/** 두 경로의 최소 공통 조상(LCA) 깊이 */
function getLCADepth(a: string, b: string): number {
  const aParts = a.split(".");
  const bParts = b.split(".");
  let common = 0;
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    if (aParts[i] === bParts[i]) common++;
    else break;
  }
  return common;
}

/**
 * Wu-Palmer Similarity (0~1)
 * 1.0 = 동일 노드, 0.0 = 완전 다른 L1
 */
export function wuPalmerSim(a: string, b: string): number {
  if (a === b) return 1.0;
  const lcaDepth = getLCADepth(a, b);
  if (lcaDepth === 0) return 0.0;
  // prefix(ss./cp.)만 공통이면 사실상 무관
  if (lcaDepth === 1) return 0.0;
  const depthA = getDepth(a);
  const depthB = getDepth(b);
  return (2 * lcaDepth) / (depthA + depthB);
}

/** 하위 호환: 트리 거리 (0~4) */
export function pathDistance(a: string, b: string): number {
  if (a === b) return 0;
  const aParts = a.split(".");
  const bParts = b.split(".");
  let commonDepth = 0;
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    if (aParts[i] === bParts[i]) commonDepth++;
    else break;
  }
  if (commonDepth <= 1) return 4;
  if (commonDepth === 2) return 3;
  if (commonDepth === 3) return 2;
  if (commonDepth === 4) return 1;
  return 0;
}

// ── 유사 시드 키워드 조회 (Wu-Palmer 기반) ──────────────────────
/**
 * Wu-Palmer 유사도로 가까운 노드의 시드 키워드 반환
 * @param minSim 최소 유사도 임계값 (0~1)
 * @param maxSim 최대 유사도 상한 (1.0이면 무제한, Row 분리에 사용)
 */
export function getSimilarSeedKeywords(
  paths: string[],
  platform: Platform,
  minSim = 0.4,
  limit = 20,
  maxSim = 1.0
): string[] {
  const nodes = PLATFORM_NODES[platform];

  if (paths.length === 0) {
    const all = nodes.flatMap((n) => n.seedKeywords);
    return shuffleArray(all).slice(0, limit);
  }

  const scored = new Map<string, number>();

  for (const node of nodes) {
    if (node.seedKeywords.length === 0) continue;

    let bestSim = 0;
    for (const p of paths) {
      const sim = wuPalmerSim(node.id, p);
      if (sim > bestSim) bestSim = sim;
    }

    // 유사도 범위 필터
    if (bestSim < minSim || bestSim > maxSim) continue;

    for (const kw of node.seedKeywords) {
      scored.set(kw, Math.max(scored.get(kw) ?? 0, bestSim));
    }
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([kw]) => kw)
    .slice(0, limit);
}

/** 특정 L1 카테고리의 시드 키워드 반환 */
export function getL1SeedKeywords(
  platform: Platform,
  l1Id: string,
  limit = 20
): string[] {
  const nodes = PLATFORM_NODES[platform];
  const kws: string[] = [];
  for (const node of nodes) {
    if (node.seedKeywords.length > 0 && node.id.startsWith(l1Id + ".")) {
      kws.push(...node.seedKeywords);
    }
  }
  return shuffleArray(kws).slice(0, limit);
}

/** category_weights JSONB 기반 피드 키워드 생성 */
export function generateFeedKeywords(
  weights: CategoryWeights,
  platform: Platform,
  limit = 20
): string[] {
  const platformWeights = weights[platform] ?? {};
  const entries = Object.entries(platformWeights).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return getSimilarSeedKeywords([], platform, 0.3, limit);
  }

  const topPaths = entries.slice(0, 5).map(([path]) => path);
  return getSimilarSeedKeywords(topPaths, platform, 0.4, limit);
}

// ═══════════════════════════════════════════════════════════════
// 온톨로지 기반 롱테일 키워드 생성 (Faceted Keyword Expansion)
//
// 원리: 온톨로지의 형제/자식 노드의 matchKeywords를 "속성 Facet"으로
//       취급하여 교차 조합 → 실제 검색 가능한 롱테일 키워드 생성
//
// 예: "삼겹살" (ss.food.meat.pork.belly)
//   형제 노드 matchKeywords:
//     belly_camping: ["캠핑", "바베큐", "아웃도어"]
//     belly_aged: ["숙성", "수비드", "드라이에이징"]
//     belly_seasoned: ["양념", "간장", "매콤"]
//     neck: ["목살", "항정살"]
//   → "숙성 캠핑용 삼겹살", "양념 대패 삼겹살", "국내산 벌집 삼겹살"
// ═══════════════════════════════════════════════════════════════

/**
 * 온톨로지 기반 롱테일 키워드 생성 (Faceted Keyword Expansion)
 *
 * 수식어 추출 전략:
 *   1. 자식 노드의 이름에서 핵심 키워드를 제거한 나머지 → 가장 정확한 수식어
 *      예: "삼겹살"의 자식 "캠핑용 삼겹살" → 수식어 "캠핑용"
 *   2. 현재 노드의 seedKeywords에서 핵심 키워드를 제거한 나머지
 *      예: seedKeyword "미니 수박 당도선별" → 수식어 "미니", "당도선별"
 *   3. 범용 규격어 (추천, 가성비, 대용량 등)
 *
 * 다른 제품(형제 노드)의 이름은 수식어로 사용하지 않음
 * → "닭가슴살 삼겹살", "청포도 수박" 같은 오류 방지
 */
export function generateOntologyLongtails(
  keyword: string,
  platform: Platform,
  limit = 15
): string[] {
  const classified = classifyKeyword(keyword, platform);
  if (!classified) return [];

  const nodes = PLATFORM_NODES[platform];
  const currentNode = nodes.find((n) => n.id === classified.path);
  if (!currentNode) return [];

  const coreKeyword = currentNode.matchKeywords[0] || keyword.split(" ").slice(0, 2).join(" ");

  // ── 수식어 수집 ──────────────────────────────────────────────
  const modifiers = extractModifiers(classified.path, nodes, coreKeyword);
  const specs = ["추천", "인기", "가성비", "프리미엄", "선물세트",
                 "대용량", "소포장", "1인분", "가정용", "국내산"];

  const longtails = new Set<string>();

  // 패턴 1: [수식어] + [핵심] — "숙성 삼겹살"
  for (const mod of modifiers) {
    longtails.add(`${mod} ${coreKeyword}`);
  }

  // 패턴 2: [핵심] + [규격] — "삼겹살 대용량"
  for (const spec of specs) {
    longtails.add(`${coreKeyword} ${spec}`);
  }

  // 패턴 3: [수식어1] + [수식어2] + [핵심] — "숙성 국내산 삼겹살"
  for (let i = 0; i < modifiers.length; i++) {
    for (let j = i + 1; j < modifiers.length; j++) {
      if (longtails.size >= limit * 3) break;
      longtails.add(`${modifiers[i]} ${modifiers[j]} ${coreKeyword}`);
    }
  }

  // 패턴 4: [수식어] + [핵심] + [규격] — "숙성 삼겹살 선물세트"
  for (const mod of modifiers.slice(0, 4)) {
    for (const spec of specs.slice(0, 4)) {
      if (longtails.size >= limit * 3) break;
      longtails.add(`${mod} ${coreKeyword} ${spec}`);
    }
  }

  longtails.delete(keyword);
  longtails.delete(coreKeyword);

  // 중복 단어가 포함된 키워드 제거 ("캠핑용 캠핑 삼겹살" 등)
  const cleaned = [...longtails].filter((kw) => {
    const words = kw.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        if (words[i].includes(words[j]) || words[j].includes(words[i])) return false;
      }
    }
    return true;
  });

  return shuffleArray(cleaned).slice(0, limit);
}

/**
 * 수식어 추출 (3가지 소스)
 * 1) 자식 노드 이름/matchKeywords에서 핵심 키워드 제거한 나머지
 * 2) 현재 노드 seedKeywords에서 핵심 키워드 제거한 나머지
 * 3) 같은 부모 아래 L4 변형 노드 (id가 현재 노드의 접두사로 시작하는 것만)
 */
function extractModifiers(
  path: string,
  nodes: OntologyNode[],
  coreKeyword: string
): string[] {
  const modifiers: string[] = [];
  const coreNorm = coreKeyword.replace(/\s/g, "");

  // ── 소스 1: 자식 노드에서 추출 ────────────────────────────────
  // 예: "삼겹살"(pork.belly)의 자식 belly_camping 이름 "캠핑용 삼겹살" → "캠핑용"
  const children = nodes.filter((n) => n.parent === path);
  for (const child of children) {
    // 노드 이름에서 핵심 키워드 제거
    const nameMods = removeCore(child.name, coreKeyword);
    modifiers.push(...nameMods);

    // matchKeywords에서 핵심 키워드 제거
    for (const mk of child.matchKeywords) {
      modifiers.push(...removeCore(mk, coreKeyword));
    }
  }

  // ── 소스 2: 같은 부모 아래 L4 변형 노드 (id 접두사 공유) ──────
  // 예: pork.belly → pork.belly_camping, pork.belly_aged (접두사 "pork.belly" 공유)
  const currentNode = nodes.find((n) => n.id === path);
  if (currentNode?.parent) {
    const variations = nodes.filter(
      (n) => n.parent === currentNode.parent && n.id !== path
           && n.id.startsWith(path.split(".").slice(0, -1).join(".") + "." + path.split(".").pop()!)
    );
    for (const v of variations) {
      modifiers.push(...removeCore(v.name, coreKeyword));
      for (const mk of v.matchKeywords) {
        modifiers.push(...removeCore(mk, coreKeyword));
      }
    }
  }

  // ── 소스 3: 현재 노드의 seedKeywords에서 추출 ─────────────────
  // 예: seedKeyword "미니 수박 당도선별" → "미니", "당도선별"
  const currentNodeObj = nodes.find((n) => n.id === path);
  if (currentNodeObj) {
    for (const seed of currentNodeObj.seedKeywords) {
      modifiers.push(...removeCore(seed, coreKeyword));
    }
  }

  // 중복 제거 + 빈 문자열/짧은 것 필터
  return [...new Set(modifiers)].filter((m) => m.length >= 2);
}

/** 문자열에서 핵심 키워드를 제거하고 남은 단어들 반환 */
function removeCore(text: string, coreKeyword: string): string[] {
  const coreWords = new Set(coreKeyword.split(/\s+/));
  const words = text.split(/\s+/).filter((w) => {
    // 핵심 키워드 단어와 동일하거나 포함 관계면 제거
    for (const cw of coreWords) {
      if (w === cw || w.includes(cw) || cw.includes(w)) return false;
    }
    return w.length >= 2;
  });
  return words;
}

/**
 * 여러 키워드에 대해 온톨로지 롱테일 일괄 생성
 * 피드 "추천 키워드" Row에서 사용
 */
export function generateBatchLongtails(
  keywords: string[],
  platform: Platform,
  limit = 15
): string[] {
  if (keywords.length === 0) return [];

  const perKeyword = Math.max(3, Math.ceil(limit / keywords.length));
  const allLongtails: string[] = [];
  const seen = new Set<string>();

  for (const kw of keywords) {
    const longtails = generateOntologyLongtails(kw, platform, perKeyword);
    for (const lt of longtails) {
      if (!seen.has(lt)) {
        seen.add(lt);
        allLongtails.push(lt);
      }
    }
  }

  return allLongtails.slice(0, limit);
}

// ── 글로벌 트렌딩 ──────────────────────────────────────────────
export const TRENDING_SEED_KEYWORDS: string[] = [
  "스탠딩 책상 전동 높이조절", "캠핑 그릴 소형 휴대용",
  "수면 마그네슘 보조제", "저소음 믹서기 블렌더",
  "탄소 플레이트 런닝화", "전기자전거 접이식 소형",
  "반려동물 GPS 트래커", "맨발 어싱 그라운딩 신발",
  "일회용 필름 카메라 레트로", "자동 물주기 스마트 화분",
  "차박 에어매트 SUV 전용", "스마트 조명 앱 조도조절",
  "콤부차 발효 음료 국내산", "비건 선크림 무기자차",
  "헬스 압박 레깅스 고탄력", "실내 텃밭 새싹 재배기",
  "AI 포켓 번역기 다국어", "테라피 마사지 볼 세트",
  "미니멀 슬림 지갑 가죽", "파워뱅크 태양광 접이식",
];

// ── 유틸리티 ────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
