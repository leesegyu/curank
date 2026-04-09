/**
 * 피드 캐시 공유 모듈
 * feed route + profile route 양쪽에서 접근 가능
 * 프로필 변경 시 캐시 즉시 무효화
 */
import NodeCache from "node-cache";

export const feedCache    = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5분 캐시
export const productCache = new NodeCache({ stdTTL: 86400 }); // 24h

/** 특정 유저의 피드 캐시 삭제 */
export function invalidateFeedCache(userId: string): void {
  feedCache.del(`feed:${userId}`);
}
