/**
 * 키워드 형태 판별 유틸
 *
 * 쿠랭크의 추천 키워드를 "형태"별로 분류하여,
 * 수식어 조합(예: "수박 추천")과 그 외(합성어, 브랜드, 파생어)를 구분.
 */

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
 * 키워드 목록에서 수식어 조합만 추출
 */
export function filterModifierCombinations<T extends { keyword: string }>(
  items: T[],
  seed: string,
): T[] {
  return items.filter((item) => isModifierCombination(item.keyword, seed));
}

/**
 * 키워드 목록에서 수식어 조합을 제외 (비수식어만 남김)
 */
export function excludeModifierCombinations<T extends { keyword: string }>(
  items: T[],
  seed: string,
): T[] {
  return items.filter((item) => !isModifierCombination(item.keyword, seed));
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
