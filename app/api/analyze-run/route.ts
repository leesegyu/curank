import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { consumeUsage, getUsage } from "@/lib/usage";
import { unifiedSearch, fetchNaverScoreData } from "@/lib/search";
import { analyze } from "@/lib/analyzer";
import { getKeywordTrend, getKeywordDemographics } from "@/lib/datalab";
import { trackEvent } from "@/lib/events";
import { createClient } from "@supabase/supabase-js";
import type { SearchPlatform } from "@/components/PlatformSelector";
import { saveSnapshot } from "@/lib/snapshot";
import { getPlanLimits, isAdmin } from "@/lib/usage";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.AUTH_URL || "http://localhost:3000";
const TIMEOUT_MS = 55 * 1000; // 55초 (Vercel Hobby 60초 제한 대응)

/**
 * SSE 스트리밍 분석 API — 전체 10단계 실시간 진행
 *
 *  1) 사용량 확인
 *  2) 상품 데이터 수집
 *  3) 경쟁 분석
 *  4) 트렌드 분석
 *  5) 인구통계 분석
 *  6) Blue Ocean + 크리에이티브 키워드 추천 (병렬)
 *  7) AI 심화 + 판매 성공 지표 추천 (병렬)
 *  8) 그래프 기반 추천
 *  9) 결론 생성
 * 10) 최종 검증 → 완료
 */
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") || "naver") as SearchPlatform;

  if (!keyword) {
    return new Response("keyword required", { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }

  const userId = session.user.id as string;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const TOTAL = 10;
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 차감 복구 헬퍼
      async function refundIfNew(existingEvent: unknown, currentUsage: { used: number } | null) {
        if (!existingEvent) {
          await supabaseAdmin
            .from("users")
            .update({ monthly_usage: Math.max(0, (currentUsage?.used ?? 1) - 1) })
            .eq("id", userId);
          return await getUsage(userId);
        }
        return null;
      }

      try {
        // ── Step 1: 사용량 확인 ──
        send({ step: 1, total: TOTAL, label: "사용량 확인 중...", progress: 3 });

        const now = new Date();
        const monthStart = `${now.toISOString().slice(0, 7)}-01T00:00:00`;
        const { data: existingEvent } = await supabaseAdmin
          .from("user_events")
          .select("id")
          .eq("user_id", userId)
          .eq("event_type", "analyze")
          .eq("keyword", keyword)
          .gte("created_at", monthStart)
          .limit(1)
          .single();

        let usage: { used: number; limit: number; remaining: number; plan: string } | null = null;
        if (existingEvent) {
          usage = await getUsage(userId);
          send({ step: 1, total: TOTAL, label: "기존 분석 재조회 (횟수 차감 없음)", progress: 5, usage, reuse: true });
        } else {
          const result = await consumeUsage(userId);
          if (!result.ok) {
            send({ step: 1, total: TOTAL, label: "한도 초과", progress: 100, error: "LIMIT_EXCEEDED", usage: result.usage });
            controller.close();
            return;
          }
          usage = result.usage;
          send({ step: 1, total: TOTAL, label: "사용량 확인 완료", progress: 5, usage });
        }

        trackEvent(userId, "analyze", keyword, { source: "home" });

        // 영구 분석 이력 저장
        supabaseAdmin
          .from("analysis_history")
          .upsert(
            { user_id: userId, keyword, platform, analyzed_at: new Date().toISOString() },
            { onConflict: "user_id,keyword,platform" }
          )
          .then(async () => {
            const planLimits = isAdmin(userId) ? { historyMax: 50 } : getPlanLimits(usage?.plan ?? "free");
            const { data: rows } = await supabaseAdmin
              .from("analysis_history")
              .select("id, analyzed_at")
              .eq("user_id", userId)
              .order("analyzed_at", { ascending: false });
            if (rows && rows.length > planLimits.historyMax) {
              const deleteIds = rows.slice(planLimits.historyMax).map((r) => r.id);
              await supabaseAdmin.from("analysis_history").delete().in("id", deleteIds);
            }
          });

        // ── Step 2: 상품 데이터 수집 ──
        send({ step: 2, total: TOTAL, label: "상품 데이터 수집 중...", progress: 10 });
        const [searchRaw, naverScoreRaw] = await Promise.allSettled([
          unifiedSearch(keyword, platform),
          fetchNaverScoreData(keyword),
        ]);

        let searchData = searchRaw.status === "fulfilled" ? searchRaw.value : null;
        const naverScore = naverScoreRaw.status === "fulfilled" ? naverScoreRaw.value : null;

        // 검색 실패 시 1회 재시도
        if (!searchData) {
          console.error(`[analyze-run] unifiedSearch failed for "${keyword}":`, searchRaw.status === "rejected" ? searchRaw.reason : "null result");
          try {
            searchData = await unifiedSearch(keyword, platform);
          } catch (retryErr) {
            console.error(`[analyze-run] retry also failed:`, retryErr);
          }
        }

        if (!searchData) {
          // 필수 데이터 실패 → 차감 복구
          const refunded = await refundIfNew(existingEvent, usage);
          send({
            step: 2, total: TOTAL,
            label: refunded ? "상품 데이터 수집 실패. 횟수가 복구되었습니다." : "상품 데이터 수집 실패.",
            progress: 100, error: "SEARCH_FAILED", ...(refunded ? { usage: refunded } : {}),
          });
          controller.close();
          return;
        }
        send({ step: 2, total: TOTAL, label: "상품 데이터 수집 완료", progress: 18 });

        // ── Step 3: 경쟁 분석 ──
        send({ step: 3, total: TOTAL, label: "경쟁 강도 분석 중...", progress: 22 });
        const result = analyze(searchData, naverScore);
        send({ step: 3, total: TOTAL, label: "경쟁 분석 완료", progress: 28, score: result.competitionScore, level: result.competitionLevel });

        // ── Step 4: 트렌드 분석 ──
        send({ step: 4, total: TOTAL, label: "트렌드 분석 중...", progress: 32 });
        const trendRaw = await getKeywordTrend(keyword).catch(() => null);
        const trendDirection = trendRaw?.direction ?? "안정";
        send({ step: 4, total: TOTAL, label: "트렌드 분석 완료", progress: 38, trendDirection });

        // ── Step 5: 인구통계 분석 ──
        let demographicsData = null;
        if (trendRaw && trendRaw.data.length > 0) {
          send({ step: 5, total: TOTAL, label: "검색자 성별/연령 분석 중...", progress: 42 });
          demographicsData = await getKeywordDemographics(keyword).catch(() => null);
          send({ step: 5, total: TOTAL, label: "인구통계 분석 완료", progress: 48 });
        } else {
          send({ step: 5, total: TOTAL, label: "트렌드 데이터 부족 — 인구통계 건너뜀", progress: 48 });
        }

        // ── Step 6~9: 키워드 추천 + 결론 (타임아웃 적용) ──
        const abortCtrl = new AbortController();
        const timeout = setTimeout(() => abortCtrl.abort(), TIMEOUT_MS);
        const fetchOpt = { signal: abortCtrl.signal };
        const kw = encodeURIComponent(keyword);

        try {
          // ── Step 6: Blue Ocean + 크리에이티브 (병렬) ──
          send({ step: 6, total: TOTAL, label: "Blue Ocean + 크리에이티브 키워드 탐색 중...", progress: 52 });
          const [blueOcean, creative] = await Promise.allSettled([
            fetch(`${BASE_URL}/api/keywords?keyword=${kw}`, fetchOpt).then(r => r.json()),
            fetch(`${BASE_URL}/api/keywords-creative?keyword=${kw}&platform=${platform}`, fetchOpt).then(r => r.json()),
          ]);
          const blueOceanData = blueOcean.status === "fulfilled" ? blueOcean.value : null;
          const creativeData = creative.status === "fulfilled" ? creative.value : null;
          const hasBlueOcean = !!blueOceanData?.keywords?.length;
          const hasCreative = !!creativeData?.keywords?.length;
          send({
            step: 6, total: TOTAL, progress: 60,
            label: hasBlueOcean && hasCreative ? "Blue Ocean + 크리에이티브 완료"
              : hasBlueOcean || hasCreative ? "키워드 추천 완료 (일부 누락)"
              : "키워드 추천 (실패)",
          });

          // ── Step 7: AI 심화 + 판매 성공 지표 (병렬) ──
          send({ step: 7, total: TOTAL, label: "AI 심화 분석 + 판매 성공 지표 분석 중...", progress: 64 });
          const [kosV2, factor] = await Promise.allSettled([
            fetch(`${BASE_URL}/api/keywords-v2?keyword=${kw}`, fetchOpt).then(r => r.json()),
            fetch(`${BASE_URL}/api/factor-score?keyword=${kw}&platform=${platform}`, fetchOpt).then(r => r.json()),
          ]);
          const kosV2Data = kosV2.status === "fulfilled" ? kosV2.value : null;
          const factorData = factor.status === "fulfilled" ? factor.value : null;
          const hasKosV2 = !!kosV2Data?.keywords?.length;
          const hasFactor = !!factorData?.factors?.length;
          send({
            step: 7, total: TOTAL, progress: 74,
            label: hasKosV2 && hasFactor ? "AI 심화 + 판매 지표 완료"
              : hasKosV2 || hasFactor ? "분석 완료 (일부 누락)"
              : "AI 심화 분석 (실패)",
          });

          // ── Step 8: 그래프 추천 ──
          send({ step: 8, total: TOTAL, label: "연관 키워드 그래프 분석 중...", progress: 78 });
          const graphRaw = await fetch(`${BASE_URL}/api/keywords-graph?keyword=${kw}`, fetchOpt).then(r => r.json()).catch(() => null);
          const hasGraph = graphRaw?.keywords?.length > 0;
          send({
            step: 8, total: TOTAL, progress: 84,
            label: hasGraph ? "그래프 추천 완료" : "그래프 추천 (일부 실패)",
          });

          // ── Step 9: 결론 생성 ──
          send({ step: 9, total: TOTAL, label: "결론 생성 중...", progress: 88 });
          const conclusionRaw = await fetch(`${BASE_URL}/api/conclusion?keyword=${kw}&platform=${platform}&generate=true`, fetchOpt).then(r => r.json()).catch(() => null);
          const hasConclusion = !!conclusionRaw?.conclusion;
          send({
            step: 9, total: TOTAL, progress: 94,
            label: hasConclusion ? "결론 생성 완료" : "결론 생성 (건너뜀)",
          });

          // ── Step 10: 최종 검증 ──
          const hasAnyKeywordResult = hasBlueOcean || hasKosV2 || hasGraph || hasCreative;

          if (!hasAnyKeywordResult && !result) {
            // 핵심 결과가 전혀 없음 → 시스템 오류
            const refunded = await refundIfNew(existingEvent, usage);
            send({
              step: 10, total: TOTAL, progress: 100,
              label: refunded ? "분석 결과를 생성하지 못했습니다. 횟수가 복구되었습니다." : "분석 결과를 생성하지 못했습니다.",
              error: "NO_RESULTS", ...(refunded ? { usage: refunded } : {}),
            });
            controller.close();
            return;
          }

          // 부분 실패 — 핵심 데이터(추천 키워드)만 판정, factor-score는 보조 데이터
          const partial = !hasBlueOcean || !hasKosV2 || !hasGraph || !hasCreative;

          // 스냅샷 저장 (결과 보기 시 즉시 로드 — 키워드 추천 포함)
          saveSnapshot(userId, keyword, platform, {
            result,
            trend: trendRaw,
            naverScoreData: naverScore,
            demographics: demographicsData,
            keywordsV1: blueOceanData?.keywords ?? null,
            keywordsV2: kosV2Data?.keywords ?? null,
            keywordsCreative: creativeData?.keywords ?? null,
            keywordsGraph: graphRaw?.keywords ?? null,
            factorScore: factorData ?? null,
          }).catch(() => {});

          send({
            step: 10,
            total: TOTAL,
            label: partial ? "분석 완료 (일부 데이터 누락)" : "모든 분석 완료!",
            progress: 100,
            done: true,
            partial,
            summary: {
              keyword,
              platform,
              score: result.competitionScore,
              level: result.competitionLevel,
              totalProducts: result.totalCount,
              trendDirection,
              usage,
            },
          });
        } catch (abortErr) {
          const isTimeout = abortCtrl.signal.aborted;
          const refunded = await refundIfNew(existingEvent, usage);
          send({
            step: 10, total: TOTAL, progress: 100,
            label: isTimeout
              ? (refunded ? "분석 시간이 초과되었습니다 (10분). 횟수가 복구되었습니다." : "분석 시간이 초과되었습니다 (10분).")
              : (refunded ? "분석 중 오류가 발생했습니다. 횟수가 복구되었습니다." : "분석 중 오류가 발생했습니다."),
            error: isTimeout ? "TIMEOUT" : "ANALYSIS_ERROR",
            ...(refunded ? { usage: refunded } : {}),
          });
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        send({ step: 0, total: TOTAL, label: "오류 발생", progress: 100, error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
