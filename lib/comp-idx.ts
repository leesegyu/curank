/**
 * compIdx (경쟁도) 정규화
 *
 * 외부 데이터 소스에서 받은 경쟁도 문자열을 시스템 표준 4단계로 변환.
 *
 * 실제 수집된 값 패턴:
 *   - Naver Ad API: "낮음" | "중간" | "높음"  (3단계, "중간"이 실제 반환값)
 *   - 쿠랭크 레거시: "낮음" | "보통" | "높음" | "매우 높음"  (4단계)
 *   - 공백 변형: "매우 높음" vs "매우높음"
 *
 * 문제:
 *   - 이전 코드는 "보통"만 인식 → Ad API "중간" 11,648개(7.8%)가 전부
 *     NEUTRAL fallback으로 다운그레이드되고 있었음
 *
 * 해결:
 *   - 모든 compIdx 소비 지점에서 이 함수를 거치도록 통일
 *   - "중간" → "보통"으로 정규화
 *   - 공백 변형 흡수
 *   - 알 수 없는 값은 "보통" fallback
 */

export type CompIdx = "낮음" | "보통" | "높음" | "매우 높음";

export function normalizeCompIdx(raw: string | null | undefined): CompIdx {
  if (!raw) return "보통";
  const trimmed = String(raw).trim();

  // Naver Ad API 실제 반환값: "중간" → 시스템 표준 "보통"
  if (trimmed === "중간") return "보통";

  // 공백 변형 흡수
  const noSpace = trimmed.replace(/\s+/g, "");
  if (noSpace === "매우높음") return "매우 높음";

  if (
    trimmed === "낮음" ||
    trimmed === "보통" ||
    trimmed === "높음" ||
    trimmed === "매우 높음"
  ) {
    return trimmed;
  }

  // 알 수 없는 값 → 안전한 중립값
  return "보통";
}
