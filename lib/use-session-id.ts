"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY    = "curank_session_id";
const SESSION_TS_KEY = "curank_session_ts";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30분 비활동 = 새 세션

function generateUUID(): string {
  return crypto.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * 30분 비활동 시 새 세션 UUID 발급.
 * localStorage 기반, SSR-safe.
 * @returns 현재 세션 ID
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const now   = Date.now();
  const lastTs = Number(localStorage.getItem(SESSION_TS_KEY) ?? 0);
  const expired = now - lastTs > SESSION_TTL_MS;

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId || expired) {
    sessionId = generateUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  localStorage.setItem(SESSION_TS_KEY, String(now));
  return sessionId;
}

/** 페이지 로드 시 세션 갱신 훅 */
export function useSessionId(): string {
  const idRef = useRef<string>("");

  useEffect(() => {
    idRef.current = getOrCreateSessionId();
  }, []);

  return idRef.current;
}
