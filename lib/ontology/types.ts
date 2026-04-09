/**
 * 카테고리 온톨로지 공통 타입
 * 쿠팡/스마트스토어 각각 독립 트리, 공통 인터페이스
 */

export type Platform = "smartstore" | "coupang";

export interface OntologyNode {
  /** 점 표기 경로: "food.meat.pork.belly" */
  id: string;
  /** 한국어 이름: "삼겹살" */
  name: string;
  /** 계층 깊이 1~4 */
  level: 1 | 2 | 3 | 4;
  /** 부모 경로 (L1은 null) */
  parent: string | null;
  /** 이 노드로 분류되는 매칭 키워드 */
  matchKeywords: string[];
  /** 이 노드에서 피드 카드로 노출할 시드 키워드 */
  seedKeywords: string[];
}

/** 유저별 카테고리 가중치 (users.category_weights JSONB 구조) */
export interface CategoryWeights {
  smartstore: Record<string, number>; // { "food.meat.pork": 5.2, ... }
  coupang:    Record<string, number>;
  updated_at: string;                 // ISO timestamp
}
