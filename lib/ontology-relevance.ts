/**
 * 온톨로지 기반 연관도 점수 (Ontology Relevance Score)
 *
 * 기존: graphWeight 단일 값 → log 스케일
 * 개선: 5개 factor 가중합
 *
 *   F1 Wu-Palmer 유사도 (35%) — 온톨로지 트리 구조 유사도
 *   F2 분류 깊이 (20%) — 매칭된 노드가 깊을수록 정밀한 연관
 *   F3 그래프 연결 강도 (20%) — 키워드 그래프 BFS weight
 *   F4 학습 매핑 신뢰도 (15%) — 실데이터(네이버 역추적) 기반이면 가산
 *   F5 키워드 토큰 겹침 (10%) — 두 키워드 간 공통 단어 비율
 */

import { classifyKeyword, wuPalmerSim } from "./ontology";
import { getLearned } from "./ontology/learned-mappings";

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function logNorm(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(value + 1) / Math.log10(maxValue + 1)) * 100));
}

/** 두 키워드 간 공통 토큰 비율 (0~1) */
function tokenOverlap(a: string, b: string): number {
  const tokA = new Set(a.replace(/[^가-힣a-zA-Z0-9]/g, " ").split(/\s+/).filter(Boolean));
  const tokB = new Set(b.replace(/[^가-힣a-zA-Z0-9]/g, " ").split(/\s+/).filter(Boolean));
  if (tokA.size === 0 || tokB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokA) if (tokB.has(t)) overlap++;
  return overlap / Math.max(tokA.size, tokB.size);
}

export interface RelevanceResult {
  score: number;          // 0~100
  factors: {
    wuPalmer: number;     // F1
    classDepth: number;   // F2
    graphWeight: number;  // F3
    learnedTrust: number; // F4
    tokenOverlap: number; // F5
  };
}

/**
 * 온톨로지 기반 연관도 산출
 *
 * @param seedKeyword   원본 분석 키워드
 * @param targetKeyword 추천 키워드
 * @param graphWeight   기존 그래프 BFS weight (0 이상)
 */
export function calcOntologyRelevance(
  seedKeyword: string,
  targetKeyword: string,
  graphWeight: number = 0,
): RelevanceResult {
  // ── F1: Wu-Palmer 유사도 (35%) ──
  const seedClass = classifyKeyword(seedKeyword);
  const targetClass = classifyKeyword(targetKeyword);

  let wuPalmer = 0;
  if (seedClass && targetClass) {
    // 같은 플랫폼 내에서 비교
    if (seedClass.platform === targetClass.platform) {
      wuPalmer = wuPalmerSim(seedClass.path, targetClass.path);
    } else {
      // 다른 플랫폼이면 경로 접미사 비교 (ss.food.meat → cp.food.meat 이면 유사)
      const seedSuffix = seedClass.path.split(".").slice(1).join(".");
      const targetSuffix = targetClass.path.split(".").slice(1).join(".");
      if (seedSuffix && targetSuffix) {
        // 접미사 공통 깊이 기반 근사
        const sParts = seedSuffix.split(".");
        const tParts = targetSuffix.split(".");
        let common = 0;
        for (let i = 0; i < Math.min(sParts.length, tParts.length); i++) {
          if (sParts[i] === tParts[i]) common++;
          else break;
        }
        wuPalmer = common / Math.max(sParts.length, tParts.length);
      }
    }
  }
  const f1 = clamp(wuPalmer * 100);

  // ── F2: 분류 깊이 (20%) ──
  // L4=100, L3=75, L2=50, L1=25, 미분류=0
  let classDepth = 0;
  if (targetClass) {
    const depth = targetClass.path.split(".").length;
    classDepth = clamp(Math.min(depth, 4) * 25);
  }
  const f2 = classDepth;

  // ── F3: 그래프 연결 강도 (20%) ──
  // log 스케일, 기존과 동일하지만 정규화 범위 조정
  const f3 = logNorm(graphWeight, 50); // weight 50 = 100점

  // ── F4: 학습 매핑 신뢰도 (15%) ──
  // 분류 신뢰도 × 의미적 관련성 결합:
  //   - F1(Wu-Palmer) = 0 이면 아무리 분류가 정확해도 무관한 카테고리 → 0점
  //   - matchKeywords 직접 매칭이 네이버 역추적보다 신뢰도 높음
  let learnedTrust = 0;
  if (targetClass && wuPalmer > 0) {
    // 의미적으로 관련 있을 때만 분류 신뢰도 반영
    const learned = getLearned(targetKeyword);
    if (learned) {
      learnedTrust = 80; // 네이버 역추적 기반
    } else {
      learnedTrust = 100; // matchKeywords 직접 매칭 (더 신뢰)
    }
  }
  const f4 = learnedTrust;

  // ── F5: 키워드 토큰 겹침 (10%) ──
  const overlap = tokenOverlap(seedKeyword, targetKeyword);
  const f5 = clamp(overlap * 100);

  // ── 가중합 ──
  const score = clamp(
    f1 * 0.35 + f2 * 0.20 + f3 * 0.20 + f4 * 0.15 + f5 * 0.10
  );

  // ── 크로스 카테고리 패널티 ──
  // 시드와 타겟이 모두 온톨로지 분류 가능하지만 L1이 완전히 다르면
  // (Wu-Palmer = 0) 점수를 강하게 억제 → "수박"에 "생수"/"계란" 방지
  // 토큰 겹침이 약간 있어도 (한 글자 공유 등) L1이 다르면 차단
  if (seedClass && targetClass && wuPalmer === 0) {
    // 온톨로지상 L1 완전 다름 → overlap이 있어도 최대 5점
    return {
      score: Math.min(score, 5),
      factors: {
        wuPalmer: f1,
        classDepth: f2,
        graphWeight: f3,
        learnedTrust: f4,
        tokenOverlap: f5,
      },
    };
  }

  return {
    score,
    factors: {
      wuPalmer: f1,
      classDepth: f2,
      graphWeight: f3,
      learnedTrust: f4,
      tokenOverlap: f5,
    },
  };
}
