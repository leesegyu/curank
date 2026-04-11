/**
 * 키워드 형태 판별 유틸
 *
 * 쿠랭크의 추천 키워드를 "형태"별로 분류:
 * - 순수 범용 수식어 조합 (예: "수박 추천", "수박 가성비") → 수식어 전용 카드로
 * - 도메인 가치 있는 longtail (예: "국내산 수박", "수박 1kg") → 기존 카드 유지
 * - 합성어/파생어 (예: "흑수박", "수박화채") → 기존 카드 유지
 *
 * 핵심 원칙: "시드+추가토큰" 형태라도 도메인 가치가 있으면 절대 제거하지 않는다.
 * 범용 수식어 화이트리스트에 있는 토큰만 "범용 조합"으로 간주.
 */

/**
 * 진짜 범용 수식어 화이트리스트
 * 어느 카테고리에서나 같은 의미로 쓰이고, 도메인 정보가 없는 수식어들.
 *
 * 여기에 해당 = 수식어 전용 카드로 이동
 * 여기에 미해당 = 도메인 가치가 있음 → 기존 카드에 유지
 */
const GENERIC_MODIFIER_TOKENS = new Set<string>([
  // 평가/순위 (범용)
  "추천", "인기", "순위", "랭킹", "베스트", "top", "리뷰", "후기", "비교", "판매량", "평가",
  // 가격/할인 (범용)
  "가성비", "저렴한", "저렴", "최저가", "할인", "특가", "세일", "쿠폰", "싼곳", "가격",
  // 인구통계 (너무 범용, 거의 의미 없음)
  "가정용", "사무용", "남성용", "여성용", "아동용", "아이용",
  // 구매 행위 (범용)
  "구매", "주문", "쇼핑", "직구",
]);


/** 공백/대소문자 정규화 */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** 토큰 분리 (공백 기준) */
function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

/**
 * 시드가 공백 분리된 토큰으로 키워드에 포함되는지
 *
 * - "수박 추천"에서 시드 "수박" → 토큰 ["수박", "추천"]에 "수박" 존재 → true
 * - "흑수박"에서 시드 "수박" → 토큰 ["흑수박"]에 "수박" 없음 → false
 * - "수박화채"에서 시드 "수박" → 토큰 ["수박화채"]에 "수박" 없음 → false
 * - "미니 수박 1kg"에서 시드 "수박" → 토큰 ["미니","수박","1kg"]에 "수박" 있음 → true
 * - "아이폰 15"에서 시드 "아이폰 15" → 시드 토큰 ["아이폰","15"] 모두 포함 → true
 */
export function hasSeedAsToken(keyword: string, seed: string): boolean {
  const kwTokens = tokenize(keyword);
  const seedTokens = tokenize(seed);
  if (seedTokens.length === 0 || kwTokens.length === 0) return false;
  return seedTokens.every((st) => kwTokens.includes(st));
}

/**
 * "시드 + 수식어" 구조 판별
 *
 * true (수식어 조합):
 *   - "수박 추천" (시드 "수박")
 *   - "수박 가성비 대용량" (시드 "수박")
 *   - "가성비 수박 1kg" (시드 "수박")
 *   - "아이폰 15 케이스" (시드 "아이폰 15")
 *
 * false (비수식어):
 *   - "흑수박" — 합성어 (시드 "수박"이 토큰으로 없음)
 *   - "참외" — 다른 품목 (시드 "수박" 자체 없음)
 *   - "수박" — 시드 그 자체 (추가 토큰 없음)
 *   - "수박화채" — 파생 상품명 (시드가 토큰으로 분리 안 됨)
 *   - "엘지 수박" — 시드가 토큰으로 있지만 "브랜드+시드"는 수식어 조합으로 볼 수도 있음
 *                   → 공격적으로 true 처리 (브랜드도 수식어로 취급)
 */
export function isModifierCombination(keyword: string, seed: string): boolean {
  const kwTokens = tokenize(keyword);
  const seedTokens = tokenize(seed);

  if (seedTokens.length === 0 || kwTokens.length === 0) return false;

  // 시드가 공백 분리 토큰으로 완전히 포함되어야 함
  if (!seedTokens.every((st) => kwTokens.includes(st))) return false;

  // 추가 토큰(시드가 아닌 토큰)이 1개 이상 있어야 수식어 조합
  const seedSet = new Set(seedTokens);
  const extras = kwTokens.filter((t) => !seedSet.has(t));
  return extras.length > 0;
}

/**
 * 키워드 목록에서 수식어 조합만 추출 (넓은 판별)
 * @deprecated 대부분 경우 filterPureGenericModifiers() 사용 권장
 */
export function filterModifierCombinations<T extends { keyword: string }>(
  items: T[],
  seed: string,
): T[] {
  return items.filter((item) => isModifierCombination(item.keyword, seed));
}

/**
 * 키워드 목록에서 수식어 조합을 제외 (넓은 판별)
 * @deprecated 너무 공격적 — 도메인 가치 있는 longtail까지 제거함.
 * excludePureGenericModifiers() 사용 권장
 */
export function excludeModifierCombinations<T extends { keyword: string }>(
  items: T[],
  seed: string,
): T[] {
  return items.filter((item) => !isModifierCombination(item.keyword, seed));
}

/**
 * "순수 범용 수식어 조합" 여부
 *
 * 조건:
 * 1) 시드가 토큰으로 포함되어야 함
 * 2) 추가 토큰(시드 외)이 1개 이상 있어야 함
 * 3) 추가 토큰이 **전부** GENERIC_MODIFIER_TOKENS에 속해야 함
 *
 * 예시 (시드 "수박"):
 *   "수박 추천"        → true  (["추천"] 전부 generic)
 *   "수박 가성비"      → true  (["가성비"] 전부 generic)
 *   "수박 가성비 추천" → true  (["가성비","추천"] 전부 generic)
 *   "수박 1kg"         → false ("1kg"은 non-generic, 도메인 가치)
 *   "국내산 수박"      → false ("국내산"은 non-generic)
 *   "국내산 수박 추천" → false ("국내산"이 non-generic이라 전부 generic 아님)
 *   "수박 선물세트"    → false ("선물세트"는 non-generic, 시즌/카테고리 가치)
 *   "흑수박"           → false (시드가 토큰으로 없음)
 *   "수박"             → false (추가 토큰 없음)
 */
export function isPureGenericModifier(keyword: string, seed: string): boolean {
  const kwTokens = tokenize(keyword);
  const seedTokens = tokenize(seed);

  if (seedTokens.length === 0 || kwTokens.length === 0) return false;
  if (!seedTokens.every((st) => kwTokens.includes(st))) return false;

  const seedSet = new Set(seedTokens);
  const extras = kwTokens.filter((t) => !seedSet.has(t));
  if (extras.length === 0) return false;

  return extras.every((e) => GENERIC_MODIFIER_TOKENS.has(e));
}

/** 순수 범용 수식어 조합만 추출 */
export function filterPureGenericModifiers<T extends { keyword: string }>(
  items: T[],
  seed: string,
): T[] {
  return items.filter((item) => isPureGenericModifier(item.keyword, seed));
}

/** 순수 범용 수식어 조합 제외 (도메인 가치 있는 longtail은 유지) */
export function excludePureGenericModifiers<T extends { keyword: string }>(
  items: T[],
  seed: string,
): T[] {
  return items.filter((item) => !isPureGenericModifier(item.keyword, seed));
}

/**
 * 키워드 후보 정제 (추천 카드용)
 *
 * - 앞뒤 공백/특수문자 제거
 * - 내부에 "/" 포함 시 거부 (네이버 자동완성 카테고리 토큰, 온톨로지 슬래시 그룹 등)
 * - 첫 글자가 의미 있는 문자(한글/영문/숫자)가 아니면 거부
 * - 길이 1자 또는 51자 이상 거부
 *
 * @returns 정제된 키워드 또는 null(거부됨)
 */
export function sanitizeCandidateKeyword(raw: string): string | null {
  if (!raw) return null;
  // 앞뒤 공백 + 앞쪽 비-의미 문자 트리밍
  let s = raw.trim().replace(/^[^\uAC00-\uD7A3a-zA-Z0-9\u3131-\u318E\u4E00-\u9FFF]+/, "");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  // 슬래시 포함 거부 (예: "탄산/사이다", "음료수/주스")
  if (s.includes("/")) return null;
  // 의미 있는 문자 전무 거부
  if (!/[\uAC00-\uD7A3a-zA-Z0-9\u3131-\u318E\u4E00-\u9FFF]/.test(s)) return null;
  // 길이
  if (s.length < 2 || s.length > 50) return null;
  return s;
}

/**
 * 어순 무관 토큰 정규화 키 생성 (중복 제거용)
 * "수박 추천" === "추천 수박"
 */
export function tokenSortKey(keyword: string): string {
  return tokenize(keyword).slice().sort().join(" ");
}

/**
 * 어순 무관 중복 제거
 */
export function dedupeByTokens<T extends { keyword: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = tokenSortKey(item.keyword);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
