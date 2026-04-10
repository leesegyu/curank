/**
 * 키워드 입력 검증 — 스팸/노이즈/빈값 차단
 * 모든 키워드 분석 API 엔드포인트 공통 사용
 *
 * 중요: JavaScript의 \w/\W는 ASCII 기준이라 한글/중문/일문이 \W에 매칭됨.
 * 유니코드 문자(한글/영문/숫자)를 포함한 키워드는 반드시 통과시켜야 함.
 */

export interface KeywordValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * "의미 있는 문자"로 간주할 유니코드 범위:
 * - 한글 (가-힣) + 한글 자모 (ㄱ-ㅎ, ㅏ-ㅣ)
 * - 영문 (a-z, A-Z)
 * - 숫자 (0-9)
 * - 한자 (CJK Unified) 기본 범위
 */
const MEANINGFUL_CHAR = /[\uAC00-\uD7A3a-zA-Z0-9\u3131-\u318E\u4E00-\u9FFF]/;

export function validateKeyword(
  keyword: string | null | undefined,
): KeywordValidationResult {
  if (!keyword || !keyword.trim()) {
    return { ok: false, error: "keyword 파라미터 필요" };
  }
  const k = keyword.trim();

  // 길이: 1~50자
  if (k.length < 1 || k.length > 50) {
    return { ok: false, error: "키워드는 1~50자 이내여야 합니다" };
  }

  // 의미 있는 문자(한글/영문/숫자/한자)가 하나도 없으면 차단
  // — 특수문자/이모지/공백만으로 구성된 키워드 차단
  if (!MEANINGFUL_CHAR.test(k)) {
    return { ok: false, error: "유효하지 않은 키워드" };
  }

  // 숫자만으로 구성 차단
  if (/^\d+$/.test(k)) {
    return { ok: false, error: "숫자만으로 구성된 키워드는 분석할 수 없습니다" };
  }

  // 같은 문자 4회 이상 반복만 차단 ("ㅋㅋㅋㅋ", "aaaa")
  // — 3회는 흔한 한국어 패턴("쫀득쫀득", "쿠쿠" 등)에 false positive 가능성
  if (/(.)\1{3,}/.test(k)) {
    return { ok: false, error: "유효하지 않은 키워드" };
  }

  return { ok: true };
}
