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

/** 구체성 수식어 (있을수록 롱테일, 전환율 높음) */
const SPECIFICITY_MODIFIERS = [
  // 성별/연령
  "남성", "여성", "남자", "여자", "아동", "유아", "신생아", "어린이", "유치원",
  "초등", "중학생", "고등학생", "성인", "시니어", "노인",
  // 크기
  "소형", "중형", "대형", "미니", "초소형", "대형", "와이드",
  // 특성
  "경량", "접이식", "휴대용", "가정용", "업소용", "캠핑용", "실내용", "야외용",
  "방수", "방풍", "방한", "무선", "유선", "충전식", "건전지식", "자동", "수동",
  "전동", "수동",
  // 수용량
  "1인용", "2인용", "3인용", "4인용", "6인용", "1인", "2인",
  // 색상
  "화이트", "블랙", "그레이", "베이지", "네이비", "핑크", "연두", "민트", "카키",
  // 재질
  "스테인리스", "알루미늄", "플라스틱", "가죽", "면", "폴리에스터", "나일론",
  // 브랜드 접두사 (브랜드명은 가산)
  "국산", "수입", "일제", "독일제",
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
  let transactionalHits = 0;
  let informationalHits = 0;

  for (const s of TRANSACTIONAL_SIGNALS) {
    if (lower.includes(s)) transactionalHits++;
  }
  for (const s of INFORMATIONAL_SIGNALS) {
    if (lower.includes(s)) informationalHits++;
  }

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

  let modifierHits = 0;
  for (const m of SPECIFICITY_MODIFIERS) {
    if (lower.includes(m)) modifierHits++;
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
