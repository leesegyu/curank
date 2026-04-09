/**
 * 온톨로지 학습 매핑 관리 (자동 확장)
 *
 * 흐름:
 *   1. classifyKeyword 실패 (온톨로지 matchKeywords에 없음)
 *   2. 네이버 쇼핑 API로 카테고리 역추적
 *   3. 매핑 결과를 메모리 캐시 + 로컬 JSON 파일에 영구 저장
 *   4. 다음 요청부터 classifyKeyword에서 학습 캐시 먼저 조회
 *
 * 저장 경로: /lib/ontology/data/learned-keywords.json
 * 구조: { "텀블러": { "path": "ss.health", "platform": "smartstore", "source": "naver_shopping" } }
 */

import * as fs from "fs";
import * as path from "path";
import type { Platform } from "./types";

export interface LearnedMapping {
  path:     string;    // 온톨로지 경로: "ss.health"
  platform: Platform;
  source:   "naver_shopping" | "manual";
  learnedAt: string;   // ISO timestamp
}

// ── JSON 파일 경로 ──────────────────────────────────────────────
const DATA_DIR  = path.join(process.cwd(), "lib", "ontology", "data");
const JSON_PATH = path.join(DATA_DIR, "learned-keywords.json");

// ── 메모리 캐시 (프로세스 수명 동안 유지) ─────────────────────────
let memoryCache: Map<string, LearnedMapping> | null = null;

/** JSON 파일에서 학습 매핑 로드 (최초 1회) */
function loadFromFile(): Map<string, LearnedMapping> {
  if (memoryCache) return memoryCache;

  memoryCache = new Map();
  try {
    if (fs.existsSync(JSON_PATH)) {
      const raw = fs.readFileSync(JSON_PATH, "utf-8");
      const data = JSON.parse(raw) as Record<string, LearnedMapping>;
      for (const [kw, mapping] of Object.entries(data)) {
        memoryCache.set(kw.toLowerCase(), mapping);
      }
    }
  } catch {
    // 파일 없거나 파싱 실패 → 빈 캐시로 시작
  }
  return memoryCache;
}

/** 학습 매핑 조회 */
export function getLearned(keyword: string): LearnedMapping | null {
  const cache = loadFromFile();
  return cache.get(keyword.toLowerCase()) ?? null;
}

/** 새 매핑 학습 (메모리 + 파일 저장) */
export function learnMapping(
  keyword: string,
  ontologyPath: string,
  platform: Platform,
  source: "naver_shopping" | "manual" = "naver_shopping"
): void {
  const cache = loadFromFile();
  const key = keyword.toLowerCase();

  // 이미 있으면 스킵
  if (cache.has(key)) return;

  const mapping: LearnedMapping = {
    path: ontologyPath,
    platform,
    source,
    learnedAt: new Date().toISOString(),
  };

  // 메모리에 저장
  cache.set(key, mapping);

  // JSON 파일에 영구 저장
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 기존 파일 읽기 + 병합
    let fileData: Record<string, LearnedMapping> = {};
    if (fs.existsSync(JSON_PATH)) {
      try {
        fileData = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
      } catch { /* 파일 손상 시 새로 시작 */ }
    }

    fileData[key] = mapping;
    fs.writeFileSync(JSON_PATH, JSON.stringify(fileData, null, 2), "utf-8");
  } catch {
    // 파일 쓰기 실패해도 메모리 캐시는 유지
  }
}

/** 전체 학습 매핑 수 */
export function getLearnedCount(): number {
  return loadFromFile().size;
}
