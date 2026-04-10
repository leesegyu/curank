/**
 * 키워드 입력 검증 — 스팸/노이즈/빈값 차단
 * 모든 키워드 분석 API 엔드포인트 공통 사용
 */

export interface KeywordValidationResult {
  ok: boolean;
  error?: string;
}

export function validateKeyword(
  keyword: string | null | undefined
): KeywordValidationResult {
  if (!keyword || !keyword.trim()) {
    return { ok: false, error: "keyword 파라미터 필요" };
  }
  const k = keyword.trim();
  if (k.length < 2 || k.length > 50) {
    return { ok: false, error: "키워드는 2~50자 이내여야 합니다" };
  }
  // 같은 문자 3회 이상 반복 ("aaa", "ㅋㅋㅋ")
  if (/(.)\1{2,}/.test(k)) {
    return { ok: false, error: "유효하지 않은 키워드" };
  }
  // 특수문자/공백만
  if (/^[\s\W]+$/.test(k)) {
    return { ok: false, error: "유효하지 않은 키워드" };
  }
  // 숫자만
  if (/^\d+$/.test(k)) {
    return { ok: false, error: "숫자만으로 구성된 키워드는 분석할 수 없습니다" };
  }
  return { ok: true };
}
