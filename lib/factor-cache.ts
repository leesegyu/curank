/**
 * factor-score / factor-score-batch 공유 L1 캐시
 * 두 엔드포인트가 같은 캐시 키 (`factor:{keyword}:{platform}`)를 사용하여
 * 한쪽에서 계산한 결과를 다른 쪽에서 재활용한다.
 */
import NodeCache from "node-cache";
import type { FactorScoreSet } from "./factor-model";

export const factorCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 120,
  maxKeys: 500,
});

export type { FactorScoreSet };
