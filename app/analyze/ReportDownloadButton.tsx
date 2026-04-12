"use client";

import { useState } from "react";

/**
 * 쿠랭크 PDF 보고서 — 황금농부 디자인 모방
 * 다크 네이비 + 골드 악센트, 기-승-전-결 스토리텔링
 * NanumGothic 한국어 폰트, jsPDF 클라이언트 렌더링
 */
export default function ReportDownloadButton({ keyword, platform }: { keyword: string; platform: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?keyword=${encodeURIComponent(keyword)}&platform=${platform}`);
      const data = await res.json();

      if (data.upgrade) {
        alert("PDF 다운로드는 유료 플랜 오픈 후 이용 가능합니다.");
        return;
      }
      if (data.error) { alert(data.error); return; }

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ─── 폰트 로드 ───
      const [regBuf, boldBuf] = await Promise.all([
        fetch("/fonts/NanumGothic-Regular.ttf").then(r => r.arrayBuffer()),
        fetch("/fonts/NanumGothic-Bold.ttf").then(r => r.arrayBuffer()),
      ]);
      const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };
      doc.addFileToVFS("NanumGothic-Regular.ttf", toBase64(regBuf));
      doc.addFont("NanumGothic-Regular.ttf", "NanumGothic", "normal");
      doc.addFileToVFS("NanumGothic-Bold.ttf", toBase64(boldBuf));
      doc.addFont("NanumGothic-Bold.ttf", "NanumGothic", "bold");
      doc.setFont("NanumGothic", "normal");

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 16; // margin
      const CW = W - M * 2;
      let y = 0;

      // ─── 색상 팔레트 (황금농부 스타일) ───
      const NAVY = [26, 26, 46] as const;       // #1a1a2e
      const NAVY_LIGHT = [35, 35, 60] as const; // 카드 배경
      const GOLD = [212, 168, 83] as const;      // #d4a853
      const WHITE = [255, 255, 255] as const;
      const CREAM = [245, 240, 228] as const;    // #f5f0e4
      const GRAY_LIGHT = [200, 200, 210] as const;
      const GRAY_MID = [140, 140, 160] as const;
      const GREEN = [34, 197, 94] as const;
      const RED = [239, 68, 68] as const;
      const BLUE = [96, 165, 250] as const;

      const platformLabel = platform === "naver" ? "스마트스토어" : "쿠팡";
      const dateStr = new Date(data.analyzedAt).toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });

      // ─── 유틸 ───
      function darkPage() {
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, W, H, "F");
      }

      function addFooter() {
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY_MID);
        doc.setFontSize(6);
        doc.text(`쿠랭크 키워드 분석 리포트  |  curank.kr`, M, H - 6);
        doc.text(`${doc.getNumberOfPages()}`, W - M, H - 6, { align: "right" });
      }

      function newDarkPage() {
        addFooter();
        doc.addPage();
        darkPage();
        y = M;
      }

      function checkPage(need: number) {
        if (y + need > H - 16) newDarkPage();
      }

      function stepBadge(stepNum: number, x: number, badgeY: number) {
        doc.setFillColor(...GOLD);
        doc.roundedRect(x, badgeY, 18, 10, 2, 2, "F");
        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...NAVY);
        doc.setFontSize(7);
        doc.text(`STEP ${stepNum}`, x + 9, badgeY + 7, { align: "center" });
      }

      function sectionHeader(stepNum: number, subtitle: string, title: string) {
        checkPage(22);
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GOLD);
        doc.setFontSize(7);
        doc.text(subtitle.toUpperCase(), M, y + 4);
        y += 8;

        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...WHITE);
        doc.setFontSize(13);
        doc.text(title, M, y + 5);

        stepBadge(stepNum, W - M - 18, y - 4);
        y += 10;

        // 골드 구분선
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.5);
        doc.line(M, y, W - M, y);
        y += 6;
      }

      function cardBox(cardH: number): number {
        checkPage(cardH + 4);
        doc.setFillColor(...NAVY_LIGHT);
        doc.roundedRect(M, y, CW, cardH, 3, 3, "F");
        return y;
      }

      function bulletText(text: string, bx: number, by: number, color: readonly [number, number, number] = CREAM) {
        doc.setTextColor(...GOLD);
        doc.setFontSize(7);
        doc.text("*", bx, by);
        doc.setTextColor(...color);
        doc.setFont("NanumGothic", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(text, CW - (bx - M) - 10);
        doc.text(lines, bx + 4, by);
        return lines.length * 4;
      }

      function highlightWord(text: string, bx: number, by: number) {
        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.text(text, bx, by);
        doc.setFont("NanumGothic", "normal");
      }

      // ═══════════════════════════════════════════════════
      // PAGE 1: 표지 (황금농부 스타일)
      // ═══════════════════════════════════════════════════
      darkPage();

      // 브랜드 배지
      const badgeW = 46;
      doc.setFillColor(...NAVY_LIGHT);
      doc.roundedRect(W / 2 - badgeW / 2, 60, badgeW, 10, 3, 3, "F");
      doc.setFont("NanumGothic", "bold");
      doc.setTextColor(...GOLD);
      doc.setFontSize(8);
      doc.text("쿠랭크 분석 리포트", W / 2, 67, { align: "center" });

      // 메인 타이틀
      doc.setFont("NanumGothic", "bold");
      doc.setTextColor(...WHITE);
      doc.setFontSize(28);
      doc.text(keyword, W / 2, 100, { align: "center" });

      doc.setTextColor(...GOLD);
      doc.setFontSize(16);
      doc.text("키워드 분석 보고서", W / 2, 115, { align: "center" });

      // 서브타이틀
      doc.setTextColor(...GRAY_LIGHT);
      doc.setFontSize(9);
      doc.text(`${platformLabel}에서 이 키워드로 성공하기 위한 전략`, W / 2, 130, { align: "center" });

      // 골드 구분선
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.line(W / 2 - 20, 140, W / 2 + 20, 140);

      // STEP 개요 박스
      const steps = [
        { num: "STEP 1", label: "현재 상황\n파악" },
        { num: "STEP 2", label: "문제\n진단" },
        { num: "STEP 3", label: "해결 방안\n탐색" },
        { num: "STEP 4", label: "최종 후보\n비교" },
        { num: "STEP 5", label: "결론 &\n제안" },
      ];
      const stepBoxW = (CW - 8) / 5;
      const stepBoxY = 155;

      doc.setFillColor(...NAVY_LIGHT);
      doc.roundedRect(M, stepBoxY - 4, CW, 28, 3, 3, "F");

      steps.forEach((s, i) => {
        const sx = M + 4 + i * stepBoxW;
        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GOLD);
        doc.setFontSize(7);
        doc.text(s.num, sx + stepBoxW / 2, stepBoxY + 4, { align: "center" });
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY_LIGHT);
        doc.setFontSize(6.5);
        const lines = s.label.split("\n");
        lines.forEach((l, li) => {
          doc.text(l, sx + stepBoxW / 2, stepBoxY + 11 + li * 4, { align: "center" });
        });
      });

      // 날짜 + 플랫폼
      doc.setTextColor(...GRAY_MID);
      doc.setFontSize(7);
      doc.text(`${dateStr}  |  ${platformLabel}`, W / 2, 200, { align: "center" });

      addFooter();

      // ═══════════════════════════════════════════════════
      // PAGE 2: STEP 1 — 기 (현재 상황 파악)
      // ═══════════════════════════════════════════════════
      doc.addPage();
      darkPage();
      y = M;

      sectionHeader(1, "MARKET OVERVIEW", "현재 상황 파악");

      // 시장 요약 카드
      const s1h = 38;
      cardBox(s1h);
      const s1y = y + 6;

      const compLevel = data.competitionLevel ?? "-";
      const totalCount = data.totalCount ? data.totalCount.toLocaleString() + "개" : "-";
      const avgPrice = data.priceStats?.avg ? Math.round(data.priceStats.avg).toLocaleString() + "원" : "-";
      const minPrice = data.priceStats?.min ? Math.round(data.priceStats.min).toLocaleString() + "원" : "-";
      const maxPrice = data.priceStats?.max ? Math.round(data.priceStats.max).toLocaleString() + "원" : "-";
      const trendDir = data.trendDirection ?? "안정";

      // 4칸 그리드
      const colW = CW / 4;
      const metrics = [
        { label: "경쟁 강도", value: `${compLevel} (${data.competitionScore ?? "-"}점)` },
        { label: "판매 중 상품", value: totalCount },
        { label: "평균 가격", value: avgPrice },
        { label: "검색 추세", value: trendDir === "상승" ? "상승 추세" : trendDir === "하락" ? "하락 추세" : "안정적" },
      ];
      metrics.forEach((m, i) => {
        const mx = M + 6 + i * colW;
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY_MID);
        doc.setFontSize(7);
        doc.text(m.label, mx, s1y);
        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...WHITE);
        doc.setFontSize(10);
        doc.text(m.value, mx, s1y + 7);
      });

      // 가격 범위
      doc.setTextColor(...GRAY_MID);
      doc.setFont("NanumGothic", "normal");
      doc.setFontSize(7);
      doc.text(`가격 범위: ${minPrice} ~ ${maxPrice}`, M + 6, s1y + 18);

      // 트렌드 시각화
      if (data.trendData?.length > 0) {
        doc.setTextColor(...GOLD);
        doc.setFontSize(7);
        doc.text("최근 검색량 추이", M + 6, s1y + 26);
        const tData = data.trendData.slice(-6);
        const maxR = Math.max(...tData.map((d: { ratio: number }) => d.ratio), 1);
        const barW = (CW - 20) / tData.length - 2;
        tData.forEach((d: { period: string; ratio: number }, i: number) => {
          const bx = M + 8 + i * (barW + 2);
          const bh = (d.ratio / maxR) * 10;
          const color: [number, number, number] = trendDir === "상승" ? [...GREEN] : trendDir === "하락" ? [...RED] : [...GRAY_MID];
          doc.setFillColor(...color);
          doc.roundedRect(bx, s1y + 28 + 10 - bh, barW, bh, 0.5, 0.5, "F");
        });
      }

      y += s1h + 6;

      // 핵심 인사이트
      checkPage(20);
      const insight1 = trendDir === "상승"
        ? `"${keyword}" 검색량이 상승 추세입니다. 지금이 진입 적기일 수 있습니다.`
        : trendDir === "하락"
        ? `"${keyword}" 검색량이 하락 중입니다. 신중한 접근이 필요합니다.`
        : `"${keyword}" 검색량이 안정적입니다. 꾸준한 수요가 있는 시장입니다.`;

      doc.setFillColor(...NAVY_LIGHT);
      doc.roundedRect(M, y, CW, 12, 2, 2, "F");
      doc.setTextColor(...GOLD);
      doc.setFontSize(7);
      doc.text("* 핵심 인사이트", M + 6, y + 5);
      doc.setTextColor(...CREAM);
      doc.setFontSize(7.5);
      doc.text(insight1, M + 6, y + 10);
      y += 16;

      // ═══════════════════════════════════════════════════
      // STEP 2 — 승 (문제 진단)
      // ═══════════════════════════════════════════════════
      sectionHeader(2, "PROBLEM DIAGNOSIS", "문제 진단");

      // Factor Score 표시
      if (data.factorScore) {
        const fs = data.factorScore as { factors?: { key: string; label: string; score: number }[] };
        if (fs.factors) {
          const fh = 6 + fs.factors.length * 7 + 4;
          cardBox(fh);
          let fy = y + 6;

          doc.setFont("NanumGothic", "bold");
          doc.setTextColor(...GOLD);
          doc.setFontSize(8);
          doc.text("판매 성공 6 Factor 진단", M + 6, fy);
          fy += 6;

          fs.factors.forEach((f) => {
            const barMaxW = CW - 60;
            const barFillW = (f.score / 100) * barMaxW;

            doc.setFont("NanumGothic", "normal");
            doc.setTextColor(...GRAY_LIGHT);
            doc.setFontSize(7);
            doc.text(f.label, M + 6, fy + 3);

            // 배경 바
            doc.setFillColor(50, 50, 70);
            doc.roundedRect(M + 38, fy, barMaxW, 4, 1, 1, "F");
            // 채움 바
            const barColor: [number, number, number] = f.score >= 65 ? [...GREEN] : f.score >= 40 ? [...GOLD] : [...RED];
            doc.setFillColor(...barColor);
            doc.roundedRect(M + 38, fy, barFillW, 4, 1, 1, "F");

            doc.setTextColor(...WHITE);
            doc.setFontSize(7);
            doc.text(`${f.score}`, M + 40 + barMaxW, fy + 3);
            fy += 7;
          });

          y += fh + 4;
        }
      }

      // 경쟁 위협 + 브랜드 분포
      if (data.competitorThreat || data.brandDistribution) {
        checkPage(20);
        const ct = data.competitorThreat as { level?: string; description?: string } | null;
        if (ct?.level) {
          doc.setFillColor(...NAVY_LIGHT);
          doc.roundedRect(M, y, CW, 12, 2, 2, "F");
          bulletText(`경쟁 위협도: ${ct.level}${ct.description ? ` — ${ct.description}` : ""}`, M + 6, y + 8);
          y += 16;
        }
      }

      // ═══════════════════════════════════════════════════
      // STEP 3 — 전 (해결 방안 탐색)
      // ═══════════════════════════════════════════════════
      newDarkPage();
      sectionHeader(3, "SOLUTION DISCOVERY", "해결 방안 탐색");

      // 추천 키워드 (V2)
      const v2kws = data.keywordsV2 as { keyword: string; score: number }[] | null;
      if (v2kws && v2kws.length > 0) {
        const kh = 8 + v2kws.length * 6 + 4;
        cardBox(kh);
        let ky = y + 6;

        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.text("AI 추천 키워드 TOP 5", M + 6, ky);
        ky += 6;

        v2kws.forEach((kw, i) => {
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...WHITE);
          doc.setFontSize(8);
          doc.text(`${i + 1}. ${kw.keyword}`, M + 8, ky + 3);
          doc.setTextColor(...GOLD);
          doc.setFontSize(7);
          doc.text(`${kw.score}점`, M + CW - 20, ky + 3);
          ky += 6;
        });

        y += kh + 4;
      }

      // 변형 키워드
      const variants = data.keywordsVariant as { keyword: string }[] | null;
      if (variants && variants.length > 0) {
        checkPage(18);
        const vh = 8 + Math.min(variants.length, 5) * 5 + 4;
        cardBox(vh);
        let vy = y + 6;

        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.text("세부 유형 키워드", M + 6, vy);
        vy += 6;

        variants.slice(0, 5).forEach((v) => {
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...CREAM);
          doc.setFontSize(7.5);
          doc.text(`* ${v.keyword}`, M + 8, vy + 3);
          vy += 5;
        });

        y += vh + 4;
      }

      // 시즌 기회
      const seasonKws = data.keywordsSeasonOpp as { keyword: string; phase?: string; upsidePercent?: number; peakMonth?: number }[] | null;
      if (seasonKws && seasonKws.length > 0) {
        checkPage(18);
        const sh = 8 + seasonKws.length * 6 + 4;
        cardBox(sh);
        let sy = y + 6;

        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.text("시즌 기회 키워드", M + 6, sy);
        sy += 6;

        seasonKws.forEach((s) => {
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...WHITE);
          doc.setFontSize(7.5);
          const phase = s.phase === "rising" ? "상승 초입" : s.phase === "rising_fast" ? "급상승" : "";
          doc.text(`* ${s.keyword}`, M + 8, sy + 3);
          if (phase) {
            doc.setTextColor(...GREEN);
            doc.text(`[${phase}]`, M + 8 + doc.getTextWidth(`* ${s.keyword}  `), sy + 3);
          }
          if (s.upsidePercent) {
            doc.setTextColor(...GOLD);
            doc.text(`+${s.upsidePercent}%`, M + CW - 24, sy + 3);
          }
          sy += 6;
        });

        y += sh + 4;
      }

      // ═══════════════════════════════════════════════════
      // STEP 4 — 전 (최종 후보 비교)
      // ═══════════════════════════════════════════════════
      const aggData = data.factorAggregated as { keyword: string; overallScore?: number; factors?: { label: string; score: number }[] }[] | null;
      if (aggData && aggData.length > 0) {
        checkPage(30);
        sectionHeader(4, "FINAL COMPARISON", "최종 후보 비교");

        const ah = 8 + aggData.length * 7 + 4;
        cardBox(ah);
        let ay = y + 6;

        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.text("종합 점수 TOP 5", M + 6, ay);
        ay += 7;

        aggData.forEach((a, i) => {
          doc.setFont("NanumGothic", "normal");
          const tc = i === 0 ? GOLD : WHITE;
          doc.setTextColor(tc[0], tc[1], tc[2]);
          doc.setFontSize(8);
          doc.text(`${i + 1}위  ${a.keyword}`, M + 8, ay + 3);
          if (a.overallScore) {
            doc.setTextColor(...GOLD);
            doc.text(`${a.overallScore}점`, M + CW - 20, ay + 3);
          }
          ay += 7;
        });

        y += ah + 4;
      }

      // ═══════════════════════════════════════════════════
      // STEP 5 — 결 (쿠랭크의 결론 & 제안)
      // ═══════════════════════════════════════════════════
      newDarkPage();
      sectionHeader(5, "CURANK RECOMMENDATION", "쿠랭크의 제안");

      const combos: { strategy: string; title: string; tags: string[]; reasoning: string; highlightFactor: string }[] = data.conclusion ?? [];

      if (combos.length > 0) {
        // 도입 문구
        checkPage(16);
        doc.setFillColor(...NAVY_LIGHT);
        doc.roundedRect(M, y, CW, 14, 2, 2, "F");
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...CREAM);
        doc.setFontSize(8);
        const introLines = doc.splitTextToSize(
          `위 분석 결과를 종합하여, "${keyword}" 키워드로 ${platformLabel}에 진입할 때 가장 효과적인 상품 제목과 태그 조합을 ${combos.length}가지 전략으로 제안합니다.`,
          CW - 12
        );
        doc.text(introLines, M + 6, y + 6);
        y += 18;

        // 각 제안안 카드
        const strategyEmoji: Record<string, string> = {
          "상위 노출 집중": "1",
          "구체 니즈 타겟": "2",
          "기회 분석 진입": "3",
          "최종 후보 Top": "4",
          "세부 유형 특화": "5",
          "크리에이티브": "6",
          "검색량 기반 노출": "7",
        };

        combos.forEach((combo, idx) => {
          const titleLines = doc.splitTextToSize(combo.title || "", CW - 16);
          const tagText = (combo.tags ?? []).map((t: string) => `#${t}`).join("  ");
          const tagLines = doc.splitTextToSize(tagText || " ", CW - 16);
          const reasonLines = doc.splitTextToSize(combo.reasoning || "", CW - 16);
          const ch = 14 + titleLines.length * 4.5 + 5 + tagLines.length * 4 + 4 + reasonLines.length * 3.5 + 6;

          checkPage(ch + 6);

          // 카드 배경
          doc.setFillColor(...NAVY_LIGHT);
          doc.roundedRect(M, y, CW, ch, 3, 3, "F");

          // 골드 왼쪽 악센트 바
          doc.setFillColor(...GOLD);
          doc.roundedRect(M, y, 3, ch, 1.5, 1.5, "F");

          // 전략 번호 + 이름
          const sNum = strategyEmoji[combo.strategy] ?? String(idx + 1);
          doc.setFont("NanumGothic", "bold");
          doc.setTextColor(...GOLD);
          doc.setFontSize(9);
          doc.text(`${String.fromCharCode(64 + parseInt(sNum))}안. ${combo.strategy}`, M + 8, y + 8);

          let cy = y + 14;

          // 제목 (큰 글씨, 핵심)
          doc.setFont("NanumGothic", "bold");
          doc.setTextColor(...WHITE);
          doc.setFontSize(10);
          doc.text(titleLines, M + 8, cy);
          cy += titleLines.length * 4.5 + 4;

          // 태그
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...BLUE);
          doc.setFontSize(7.5);
          doc.text(tagLines, M + 8, cy);
          cy += tagLines.length * 4 + 3;

          // 근거
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...GRAY_MID);
          doc.setFontSize(7);
          doc.text(reasonLines, M + 8, cy);

          y += ch + 5;
        });
      }

      // ═══════════════════════════════════════════════════
      // 마무리 — CTA
      // ═══════════════════════════════════════════════════
      checkPage(30);
      y += 6;

      doc.setFillColor(...NAVY_LIGHT);
      doc.roundedRect(M, y, CW, 22, 3, 3, "F");

      doc.setFont("NanumGothic", "bold");
      doc.setTextColor(...GOLD);
      doc.setFontSize(9);
      doc.text("지금 바로 시작하세요", M + 6, y + 8);

      doc.setFont("NanumGothic", "normal");
      doc.setTextColor(...CREAM);
      doc.setFontSize(7.5);
      doc.text("위 제안안을 복사하여 상품 등록 시 바로 적용할 수 있습니다.", M + 6, y + 14);
      doc.text("더 많은 추천 키워드와 실시간 분석은 curank.kr에서 확인하세요.", M + 6, y + 19);

      addFooter();

      doc.save(`쿠랭크_${keyword}_분석보고서.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`PDF 생성 중 오류가 발생했습니다.\n${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
      style={{ background: "linear-gradient(135deg, #d4a853, #b8860b)" }}
    >
      {loading ? "PDF 생성 중..." : "분석 보고서 PDF 다운로드"}
    </button>
  );
}
