/**
 * 진입 실행 가이드 — 규칙 기반 액션 플랜 생성
 *
 * STEP 1~4의 분석 결과를 종합해서 셀러가 즉시 실행 가능한
 * 3단계(준비→진입→성장) 액션 플랜을 도출한다.
 *
 * LLM 호출 없이 100% 규칙 기반.
 */

import type { AnalysisResult } from "./analyzer";
import type { TrendData } from "./datalab";

// ───────────────────────────────────────────────
// 타입 정의
// ───────────────────────────────────────────────

export interface ActionPlan {
  diagnosis: string;        // 시장 한 줄 진단
  strengthPoint: string;    // 이 키워드의 강점
  weaknessPoint: string;    // 경계해야 할 약점
  phases: ActionPhase[];    // 3단계
}

export interface ActionPhase {
  id: "prepare" | "entry" | "growth";
  label: string;            // "준비 단계"
  duration: string;         // "1주일"
  emoji: string;            // "📝"
  goal: string;             // "완벽한 상품 등록 셋업"
  keyFactors: string[];     // ["F1 상위 노출", "F2 구매 전환"]
  actions: ActionItem[];
  checklist: string[];      // KPI 체크리스트
}

export interface ActionItem {
  priority: "필수" | "권장" | "선택";
  title: string;
  description: string;
  hint?: string;            // 실제 데이터 기반 구체적 추천
  estimatedTime?: string;
}

/** snapKeywordsV2 요소에서 필요한 필드만 */
interface TopKeyword {
  keyword: string;
  monthlyVolume?: number;
  competitionLevel?: string;
  scoreChance?: number;
  scoreIntent?: number;
  scoreSpecificity?: number;
}

// ───────────────────────────────────────────────
// 메인 생성 함수
// ───────────────────────────────────────────────

export function generateActionPlan(
  result: AnalysisResult,
  trend: TrendData | null,
  topKeywords: TopKeyword[] | null | undefined,
  platform: "naver" | "coupang" = "naver",
): ActionPlan {
  const score = result.naverPlatformScore?.score ?? result.competitionScore ?? 50;
  const breakdown = result.naverPlatformScore?.breakdown ?? result.scoreBreakdown ?? {};
  const trendDir = trend?.direction ?? "안정";
  const avgPrice = result.priceStats?.avg ?? 0;
  const compLevel = result.competitionLevel ?? "보통";

  const supply = breakdown.supplyScore ?? 50;
  const coupangPen = breakdown.coupangPenetration ?? 0;
  const priceComp = breakdown.priceCompression ?? 0;

  const top = (topKeywords ?? []).slice(0, 5);
  // 시드 제거한 순수 수식어/롱테일만 추출 (hint 용)
  const topNames = top.map((k) => k.keyword).filter(Boolean);

  // ── 시장 진단 ──
  const diagnosis = getDiagnosis(score, compLevel);
  const strengthPoint = getStrengthPoint(score, trend, avgPrice, breakdown);
  const weaknessPoint = getWeaknessPoint(score, trend, breakdown);

  // ── Phase 1: 준비 (1주) ──
  const phase1: ActionPhase = {
    id: "prepare",
    label: "준비 단계",
    duration: "1주일",
    emoji: "📝",
    goal: "완벽한 상품 등록 셋업",
    keyFactors: ["F1 상위 노출", "F2 구매 전환"],
    actions: buildPhase1Actions(result, topNames, score, priceComp, avgPrice),
    checklist: [
      "상품명 25자 내 핵심 키워드 3개 이상 포함",
      "태그 10개 이상 설정",
      "대표 이미지 고품질 (1000×1000px 이상)",
      "가격 범위 적정 (평균 ±20%)",
      "카테고리 정확히 설정",
    ],
  };

  // ── Phase 2: 진입 (2주) ──
  const phase2: ActionPhase = {
    id: "entry",
    label: "진입 단계",
    duration: "2주",
    emoji: "🚀",
    goal: "초기 리뷰 확보 + 검색 노출",
    keyFactors: ["F1 상위 노출", "F5 진입 난이도"],
    actions: buildPhase2Actions(result, score, coupangPen, compLevel),
    checklist: [
      "리뷰 10개 이상 확보",
      "평점 4.5 이상 유지",
      "대표 키워드 1~2페이지 진입",
      "광고 CTR 2% 이상",
      "상세페이지 체류시간 30초 이상",
    ],
  };

  // ── Phase 3: 성장 (3주+) ──
  const phase3: ActionPhase = {
    id: "growth",
    label: "성장 단계",
    duration: "3주 이후",
    emoji: "📈",
    goal: "판매 안정화 + 라인업 확대",
    keyFactors: ["F3 시장 성장", "F4 수익성"],
    actions: buildPhase3Actions(result, trend, topNames, score),
    checklist: [
      "월 매출 목표 설정 (100만원+)",
      "리뷰 50개 이상",
      "리오더율(재구매율) 20% 이상",
      "세부 유형 상품 라인업 3종 이상",
      "시즌 대응 상품 준비 완료",
    ],
  };

  return {
    diagnosis,
    strengthPoint,
    weaknessPoint,
    phases: [phase1, phase2, phase3],
  };
}

// ───────────────────────────────────────────────
// 진단 로직
// ───────────────────────────────────────────────

function getDiagnosis(score: number, compLevel: string): string {
  if (score >= 75) return `매우 포화된 레드오션 시장 (경쟁 ${compLevel})`;
  if (score >= 50) return `중간 경쟁 시장, 차별화 필요 (경쟁 ${compLevel})`;
  if (score >= 25) return `적정 경쟁 시장, 진입 기회 충분 (경쟁 ${compLevel})`;
  return `경쟁 적은 블루오션 (경쟁 ${compLevel})`;
}

function getStrengthPoint(
  score: number,
  trend: TrendData | null,
  avgPrice: number,
  breakdown: { supplyScore?: number },
): string {
  if (trend?.direction === "상승") return "🔥 검색 트렌드 상승 중 (성장 시장)";
  if (score < 30) return "📭 상품 공급 부족 — 진입 여유";
  if (avgPrice >= 30000) return `💰 평균 객단가 높음 (${avgPrice.toLocaleString()}원)`;
  if (avgPrice >= 15000) return `💰 객단가 적정 (${avgPrice.toLocaleString()}원)`;
  if ((breakdown.supplyScore ?? 50) < 40) return "📦 상품 수 부족 (진입 여유)";
  return "⚡ 기본 수요 확보";
}

function getWeaknessPoint(
  score: number,
  trend: TrendData | null,
  breakdown: { coupangPenetration?: number; priceCompression?: number },
): string {
  if ((breakdown.coupangPenetration ?? 0) >= 50)
    return `⚠️ 쿠팡 침투율 높음 (${breakdown.coupangPenetration}%)`;
  if ((breakdown.priceCompression ?? 0) >= 60)
    return "💸 가격 경쟁 심함 (출혈 경쟁 주의)";
  if (trend?.direction === "하락") return "📉 검색 하락세 — 시즌성 주의";
  if (score >= 75) return "🏭 상품 포화 (단독 키워드 진입 어려움)";
  if (score >= 50) return "⚔️ 경쟁자 다수 — 차별화 필요";
  return "📋 시장 데이터 부족";
}

// ───────────────────────────────────────────────
// Phase 1: 준비 단계
// ───────────────────────────────────────────────

function buildPhase1Actions(
  result: AnalysisResult,
  topNames: string[],
  score: number,
  priceComp: number,
  avgPrice: number,
): ActionItem[] {
  const actions: ActionItem[] = [];
  const keyword = result.keyword;

  // 1. 상품명 작성 — 필수
  const top2 = topNames.slice(0, 2).filter((k) => k !== keyword);
  const nameHint = top2.length > 0
    ? `"${keyword}" + "${top2.join(" + ")}" 조합 / 예: "${keyword} ${top2[0]?.replace(keyword, "").trim() || ""}"`
    : `"${keyword}"을 상품명 앞 25자 이내 배치`;
  actions.push({
    priority: "필수",
    title: "상품명 키워드 최적화",
    description: "상품명 앞 25자에 핵심 키워드 2~3개 배치. 네이버 쇼핑 검색 알고리즘은 앞쪽 키워드에 가중치를 높게 부여합니다.",
    hint: nameHint,
    estimatedTime: "30분",
  });

  // 2. 태그 10개 이상 — 필수
  const tagSample = topNames.slice(0, 8).filter((k) => k !== keyword).slice(0, 5).join(", ");
  actions.push({
    priority: "필수",
    title: "태그 10개 이상 설정",
    description: "태그는 키워드 매칭의 핵심. 10개 이상 설정해야 검색 커버리지가 확보됩니다.",
    hint: tagSample ? `추천 태그: ${tagSample}...` : `시드 "${keyword}" 관련 태그 10개 이상`,
    estimatedTime: "20분",
  });

  // 3. 가격 책정 — 조건부
  if (priceComp >= 60) {
    actions.push({
      priority: "필수",
      title: "차별화 가격 전략",
      description: "가격 경쟁이 심한 시장. 단품 할인보다 2+1, 사은품, 프리미엄 패키지로 객단가를 높이는 전략이 효과적입니다.",
      hint: avgPrice > 0
        ? `평균가 ${avgPrice.toLocaleString()}원 기준 — 단품 가격 인하 대신 번들/프리미엄 패키지 권장`
        : "번들 구성 + 사은품 전략",
      estimatedTime: "1시간",
    });
  } else if (avgPrice > 0) {
    const low = Math.round(avgPrice * 0.8);
    const high = Math.round(avgPrice * 1.2);
    actions.push({
      priority: "권장",
      title: "가격 범위 설정",
      description: "평균 가격대 ±20% 범위로 설정하여 가격 경쟁력 확보.",
      hint: `${low.toLocaleString()}원 ~ ${high.toLocaleString()}원 (평균 ${avgPrice.toLocaleString()}원)`,
      estimatedTime: "15분",
    });
  }

  // 4. 롱테일 전략 — 레드오션일 때 필수
  if (score >= 75) {
    const longtail = topNames.slice(0, 3).join(", ");
    actions.push({
      priority: "필수",
      title: "롱테일 키워드로 먼저 진입",
      description: "메인 키워드는 경쟁이 치열합니다. 3~4단어 조합 롱테일로 먼저 판매 실적을 쌓고, 메인 키워드 순위를 점진적으로 올리세요.",
      hint: longtail ? `시작 키워드: ${longtail}` : "세부 유형/수식어 조합 활용",
      estimatedTime: "30분",
    });
  }

  // 5. 카테고리 정확히 설정 — 권장
  actions.push({
    priority: "권장",
    title: "카테고리 정확히 매칭",
    description: "잘못된 카테고리 = 검색 노출 큰 손실. 네이버 쇼핑에서 같은 키워드로 검색해 상위 상품의 카테고리를 확인하세요.",
    hint: `네이버 쇼핑에서 "${keyword}" 검색 → 1페이지 상품 카테고리 확인`,
    estimatedTime: "10분",
  });

  return actions;
}

// ───────────────────────────────────────────────
// Phase 2: 진입 단계
// ───────────────────────────────────────────────

function buildPhase2Actions(
  result: AnalysisResult,
  score: number,
  coupangPen: number,
  compLevel: string,
): ActionItem[] {
  const actions: ActionItem[] = [];

  // 1. 초기 리뷰 10개 — 필수
  actions.push({
    priority: "필수",
    title: "초기 리뷰 10개 확보",
    description: "리뷰 10개가 전환율의 분기점. 초기에 빠르게 확보해야 1페이지 노출 가능성이 급상승합니다.",
    hint: "지인 구매 (3~5개) + 블로그 체험단 (5개) + 프로모션 쿠폰 배포",
    estimatedTime: "2주",
  });

  // 2. 광고 집행 — 경쟁 수준에 따라
  if (score >= 50) {
    const budget = score >= 75 ? "10~15만원" : "5~10만원";
    actions.push({
      priority: "필수",
      title: "초기 광고 집행",
      description: `경쟁이 치열한 시장(${compLevel})이므로 광고로 초기 노출 확보가 필수입니다.`,
      hint: `네이버 쇼핑 검색광고 ${budget} / 7일 집행 권장`,
      estimatedTime: "1시간",
    });
  } else {
    actions.push({
      priority: "권장",
      title: "소규모 광고 테스트",
      description: "경쟁이 심하지 않아 유기적 노출 중심이지만, 초기 가속화를 위해 소규모 광고 테스트 권장.",
      hint: "네이버 쇼핑 검색광고 3~5만원 / 7일",
      estimatedTime: "1시간",
    });
  }

  // 3. 쿠팡 침투율 높으면 네이버 집중
  if (coupangPen >= 50) {
    actions.push({
      priority: "필수",
      title: "네이버 쇼핑 집중 전략",
      description: `검색 결과의 ${coupangPen}%를 쿠팡이 차지하는 시장입니다. 가격 경쟁 대신 네이버 쇼핑 상세페이지 스토리텔링, 체험단 후기, 브랜드 신뢰도로 승부하세요.`,
      hint: "체험단 후기 + 사용법 영상 + 원산지/인증 사진 등",
      estimatedTime: "3일",
    });
  }

  // 4. 상세페이지 최적화 — 권장
  actions.push({
    priority: "권장",
    title: "상세페이지 완성도 높이기",
    description: "체류시간 30초 이상 유지하면 네이버 쇼핑 알고리즘이 상품을 양질로 판단합니다. 스크롤해도 계속 궁금증을 유발하는 구성이 핵심.",
    hint: "첫 화면: 핵심 가치 / 중간: 스펙·인증 / 하단: FAQ·후기",
    estimatedTime: "3~4시간",
  });

  // 5. 성과 모니터링 — 권장
  actions.push({
    priority: "권장",
    title: "일일 성과 모니터링",
    description: "검색 노출 순위, 클릭률, 전환율을 매일 체크. 문제 발견 시 즉시 대응.",
    hint: "네이버 스마트스토어 센터 → 통계 → 검색엔진/상품 성과",
    estimatedTime: "매일 15분",
  });

  return actions;
}

// ───────────────────────────────────────────────
// Phase 3: 성장 단계
// ───────────────────────────────────────────────

function buildPhase3Actions(
  result: AnalysisResult,
  trend: TrendData | null,
  topNames: string[],
  score: number,
): ActionItem[] {
  const actions: ActionItem[] = [];

  // 1. 실적 기반 최적화 — 필수
  actions.push({
    priority: "필수",
    title: "실적 데이터 기반 최적화",
    description: "판매 데이터로 상품명·태그·가격을 지속 조정. 전환율 낮은 태그는 제거, 높은 키워드는 강조.",
    hint: "주 1회 통계 확인 → 하위 30% 태그 제거 → 상위 키워드로 교체",
    estimatedTime: "주 1회",
  });

  // 2. 트렌드 상승 시 — 광고 확대
  if (trend?.direction === "상승") {
    actions.push({
      priority: "권장",
      title: "상승 트렌드 공격 공략",
      description: "검색량이 늘어나는 시기 — 광고 예산을 늘려 점유율을 빠르게 확보하세요.",
      hint: "기존 광고 예산 1.5~2배 증액, 롱테일 키워드 확장",
      estimatedTime: "1시간",
    });
  } else if (trend?.direction === "하락") {
    actions.push({
      priority: "권장",
      title: "하락 시즌 마무리 전략",
      description: "검색 하락세 — 재고 소진 및 다음 시즌 상품 준비가 우선.",
      hint: "프로모션 할인으로 재고 회전 가속 + 다음 시즌 카테고리 조사",
      estimatedTime: "2~3일",
    });
  }

  // 3. 세부 유형 확장 — 선택
  if (topNames.length >= 3) {
    const lineup = topNames.slice(0, 3).join(", ");
    actions.push({
      priority: "선택",
      title: "세부 유형 상품 라인업 확대",
      description: "기존 키워드 성공 후, 세부 유형(흑수박/애플수박 등)으로 상품을 추가 등록하여 판매 포트폴리오 확대.",
      hint: `추천 라인업: ${lineup}`,
      estimatedTime: "상품당 2~3시간",
    });
  }

  // 4. 리오더율 관리 — 권장
  actions.push({
    priority: "권장",
    title: "재구매 유도",
    description: "리오더율 20% 이상이 핵심 목표. 재구매 쿠폰, 정기배송 옵션, 알림톡 리타겟팅 활용.",
    hint: "첫 구매 2주 후 쿠폰 발송, 톡톡 친구 유도",
    estimatedTime: "초기 1시간 설정",
  });

  // 5. 레드오션이면 카테고리 다각화 — 선택
  if (score >= 75) {
    actions.push({
      priority: "선택",
      title: "연관 카테고리 진출",
      description: "단일 키워드의 경쟁이 극심합니다. 연관 카테고리로 확장하여 리스크 분산.",
      hint: "STEP 3 '연관 키워드 발견' 카드에서 형제 카테고리 후보 검토",
      estimatedTime: "1~2주",
    });
  }

  return actions;
}
