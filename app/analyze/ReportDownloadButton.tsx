"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 쿠랭크 PDF 보고서 — 추천 키워드 중심, 고정 템플릿, GPT 미사용, 비용 $0
 * NanumGothic 한국어 폰트, 01-clean-card 디자인 기반
 */
export default function ReportDownloadButton({ keyword, platform }: { keyword: string; platform: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?keyword=${encodeURIComponent(keyword)}&platform=${platform}`);
      const data = await res.json();

      if (data.upgrade) {
        alert("PDF 다운로드는 유료 플랜 오픈 후 이용 가능합니다. 서비스 개선 중이니 조금만 기다려주세요!");
        return;
      }
      if (data.error) { alert(data.error); return; }

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ─── 한국어 폰트 로드 ───
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
      const M = 18;
      const CW = W - M * 2;
      let y = 0;

      // ─── 색상 ───
      const BLUE = [59, 130, 246] as const;
      const INDIGO = [99, 102, 241] as const;
      const GRAY50 = [249, 250, 251] as const;
      const GRAY100 = [243, 244, 246] as const;
      const GRAY400 = [156, 163, 175] as const;
      const GRAY600 = [75, 85, 99] as const;
      const GRAY900 = [17, 24, 39] as const;
      const GREEN = [34, 197, 94] as const;
      const RED = [239, 68, 68] as const;
      const AMBER = [245, 158, 11] as const;
      const PURPLE = [139, 92, 246] as const;

      function addFooter() {
        doc.setFillColor(...GRAY50);
        doc.rect(0, H - 10, W, 10, "F");
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY400);
        doc.setFontSize(6);
        doc.text("쿠랭크 키워드 분석 리포트 | curank.kr", M, H - 4);
        doc.text(`${doc.getNumberOfPages()}페이지`, W - M - 12, H - 4);
      }

      function checkPage(need: number) {
        if (y + need > H - 18) {
          addFooter();
          doc.addPage();
          y = 18;
        }
      }

      function sectionTitle(title: string, color: readonly [number, number, number] = BLUE) {
        checkPage(14);
        doc.setFillColor(...color);
        doc.rect(M, y, 2.5, 8, "F");
        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GRAY900);
        doc.setFontSize(11);
        doc.text(title, M + 6, y + 6);
        doc.setFont("NanumGothic", "normal");
        y += 13;
      }

      // ═══════════════════════════════════════════
      // 헤더
      // ═══════════════════════════════════════════
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, W, 40, "F");
      doc.setFillColor(...INDIGO);
      doc.rect(W * 0.55, 0, W * 0.45, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("NanumGothic", "bold");
      doc.setFontSize(20);
      doc.text("쿠랭크", M, 16);
      doc.setFont("NanumGothic", "normal");
      doc.setFontSize(8);
      doc.text("키워드 분석 리포트", M, 23);

      doc.setFontSize(13);
      doc.setFont("NanumGothic", "bold");
      doc.text(keyword, M, 34);
      doc.setFont("NanumGothic", "normal");

      const dateStr = new Date(data.analyzedAt).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      doc.setFontSize(7);
      doc.text(dateStr, W - M - doc.getTextWidth(dateStr), 34);

      const platformLabel = platform === "naver" ? "스마트스토어" : "쿠팡";
      doc.setFontSize(7);
      doc.text(platformLabel, W - M - doc.getTextWidth(platformLabel), 23);

      y = 48;

      // ═══════════════════════════════════════════
      // 시장 요약 (컴팩트 1줄 박스)
      // ═══════════════════════════════════════════
      const summaryBoxH = 14;
      doc.setFillColor(...GRAY50);
      doc.setDrawColor(...GRAY100);
      doc.roundedRect(M, y, CW, summaryBoxH, 2, 2, "FD");

      doc.setFont("NanumGothic", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY400);
      doc.text("시장 요약", M + 4, y + 5);

      doc.setFontSize(8);
      doc.setTextColor(...GRAY900);
      const compLevel = data.competitionLevel ?? "-";
      const totalCount = data.totalCount ? data.totalCount.toLocaleString() + "개" : "-";
      const avgPrice = data.priceStats?.avg ? data.priceStats.avg.toLocaleString() + "원" : "-";
      const trendDir = data.trendDirection ?? "안정";
      doc.setFont("NanumGothic", "bold");
      doc.text(`경쟁: ${compLevel}(${data.competitionScore ?? "-"})`, M + 4, y + 11);
      doc.setFont("NanumGothic", "normal");
      doc.text(`|  상품 ${totalCount}  |  평균가 ${avgPrice}  |  추세: ${trendDir}`, M + 50, y + 11);

      y += summaryBoxH + 6;

      // ═══════════════════════════════════════════
      // ⭐ 추천 제목 + 태그 조합 (메인 섹션)
      // ═══════════════════════════════════════════
      const combos: { strategy: string; title: string; tags: string[]; reasoning: string; highlightFactor: string }[] = data.conclusion ?? [];

      if (combos.length > 0) {
        sectionTitle("추천 상품 제목 & 태그", INDIGO);

        // 안내 문구
        checkPage(8);
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY600);
        doc.setFontSize(7);
        doc.text("AI가 분석한 최적의 상품 제목과 태그 조합입니다. 복사하여 바로 사용하세요.", M + 4, y);
        y += 7;

        const strategyColors: Record<string, readonly [number, number, number]> = {
          ranking: BLUE,
          conversion: GREEN,
          growth: AMBER,
          profitability: PURPLE,
          entryBarrier: [...INDIGO] as const,
          crossPlatform: [...RED] as const,
        };

        combos.forEach((combo, idx) => {
          // 카드 높이 계산
          const titleLines = doc.splitTextToSize(combo.title, CW - 16);
          const tagText = combo.tags.map(t => `#${t}`).join("  ");
          const tagLines = doc.splitTextToSize(tagText, CW - 16);
          const reasonLines = doc.splitTextToSize(combo.reasoning, CW - 16);
          const cardH = 12 + titleLines.length * 4.5 + 6 + tagLines.length * 4 + 4 + reasonLines.length * 3.5 + 6;

          checkPage(cardH + 4);

          // 카드 배경
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...GRAY100);
          doc.roundedRect(M, y, CW, cardH, 2, 2, "FD");

          // 전략 태그
          const accentColor = strategyColors[combo.highlightFactor] ?? BLUE;
          doc.setFillColor(...accentColor);
          doc.roundedRect(M + 4, y + 3, 3, 6, 1, 1, "F");

          doc.setFont("NanumGothic", "bold");
          doc.setTextColor(...(accentColor as [number, number, number]));
          doc.setFontSize(8);
          doc.text(`전략 ${idx + 1}. ${combo.strategy}`, M + 10, y + 8);

          let cy = y + 14;

          // 제목
          doc.setFont("NanumGothic", "bold");
          doc.setTextColor(...GRAY900);
          doc.setFontSize(9);
          doc.text(titleLines, M + 8, cy);
          cy += titleLines.length * 4.5 + 4;

          // 태그
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...BLUE);
          doc.setFontSize(7.5);
          doc.text(tagLines, M + 8, cy);
          cy += tagLines.length * 4 + 3;

          // 해석
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...GRAY400);
          doc.setFontSize(6.5);
          doc.text(reasonLines, M + 8, cy);

          y += cardH + 4;
        });
      } else {
        // 결론 없는 경우
        sectionTitle("추천 상품 제목 & 태그", INDIGO);
        checkPage(12);
        doc.setFillColor(...GRAY50);
        doc.roundedRect(M, y, CW, 10, 2, 2, "F");
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY600);
        doc.setFontSize(8);
        doc.text("결론이 아직 생성되지 않았습니다. 분석 페이지에서 결론을 먼저 생성해주세요.", M + 4, y + 6);
        y += 14;
      }

      y += 4;

      // ═══════════════════════════════════════════
      // 트렌드 차트
      // ═══════════════════════════════════════════
      if (data.trendData && data.trendData.length > 0) {
        sectionTitle("검색 트렌드", GREEN);

        const trendLabel = trendDir === "상승" ? "상승 추세" : trendDir === "하락" ? "하락 추세" : "안정적";
        doc.setFont("NanumGothic", "bold");
        doc.setTextColor(...GRAY900);
        doc.setFontSize(8);
        doc.text(`추세: ${trendLabel}`, M + 4, y);
        y += 5;

        checkPage(22);
        const tData = data.trendData.slice(-6);
        const maxR = Math.max(...tData.map((d: { ratio: number }) => d.ratio), 1);
        const barW = CW / tData.length - 2;
        tData.forEach((d: { period: string; ratio: number }, i: number) => {
          const x = M + i * (barW + 2);
          const barH = (d.ratio / maxR) * 14;
          const color: [number, number, number] = trendDir === "상승" ? [...GREEN] : trendDir === "하락" ? [...RED] : [...GRAY400];
          doc.setFillColor(...color);
          doc.roundedRect(x, y + 14 - barH, barW, barH, 1, 1, "F");
          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...GRAY400);
          doc.setFontSize(5);
          doc.text(d.period?.slice(5) ?? "", x + barW / 2, y + 18, { align: "center" });
        });
        y += 24;
      }

      // ═══════════════════════════════════════════
      // 검색자 인구통계
      // ═══════════════════════════════════════════
      if (data.demographics) {
        sectionTitle("검색자 인구통계", PURPLE);

        if (data.demographics.hasGenderData) {
          const m = data.demographics.maleRatio ?? 0;
          const f = data.demographics.femaleRatio ?? 0;

          doc.setFont("NanumGothic", "normal");
          doc.setTextColor(...GRAY600);
          doc.setFontSize(7);
          doc.text(`남성 ${m}%`, M + 4, y);
          doc.text(`여성 ${f}%`, M + CW - doc.getTextWidth(`여성 ${f}%`) - 4, y);
          y += 3;

          checkPage(8);
          doc.setFillColor(96, 165, 250);
          doc.roundedRect(M + 4, y, CW * m / 100 - 1, 4, 1, 1, "F");
          doc.setFillColor(244, 114, 182);
          doc.roundedRect(M + 4 + CW * m / 100, y, CW * f / 100 - 1, 4, 1, 1, "F");
          y += 8;
        }

        if (data.demographics.hasAgeData && data.demographics.ageGroups) {
          checkPage(30);
          const ages = data.demographics.ageGroups as { age: string; ratio: number }[];
          const maxAge = Math.max(...ages.map(a => a.ratio), 1);
          const COLORS = [[139,92,246],[96,165,250],[14,165,233],[6,182,212],[20,184,166],[34,197,94]];

          ages.forEach((ag, i) => {
            checkPage(6);
            doc.setFont("NanumGothic", "normal");
            doc.setTextColor(...GRAY600);
            doc.setFontSize(7);
            doc.text(ag.age, M + 4, y + 3);
            const bw = (ag.ratio / maxAge) * (CW - 30);
            doc.setFillColor(...(COLORS[i % COLORS.length] as [number, number, number]));
            doc.roundedRect(M + 22, y, bw, 3.5, 1, 1, "F");
            doc.setTextColor(...GRAY400);
            doc.setFontSize(6);
            doc.text(`${ag.ratio}%`, M + 24 + bw, y + 3);
            y += 5.5;
          });
        }
        y += 4;
      }

      // ═══════════════════════════════════════════
      // 진입 전략
      // ═══════════════════════════════════════════
      if (data.advice) {
        sectionTitle("진입 전략", AMBER);
        checkPage(15);
        doc.setFillColor(...GRAY50);
        doc.roundedRect(M, y, CW, 14, 2, 2, "F");
        doc.setFont("NanumGothic", "normal");
        doc.setTextColor(...GRAY600);
        doc.setFontSize(8);
        const adviceLines = doc.splitTextToSize(data.advice, CW - 8);
        doc.text(adviceLines, M + 4, y + 5);
        y += Math.max(14, adviceLines.length * 4 + 6);
        y += 3;
      }

      // ═══════════════════════════════════════════
      // 안내
      // ═══════════════════════════════════════════
      checkPage(16);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(M, y, CW, 12, 2, 2, "F");
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(M, y, CW, 12, 2, 2, "S");
      doc.setFont("NanumGothic", "bold");
      doc.setTextColor(...BLUE);
      doc.setFontSize(8);
      doc.text("Tip", M + 4, y + 5);
      doc.setFont("NanumGothic", "normal");
      doc.setTextColor(...GRAY600);
      doc.setFontSize(7);
      doc.text("더 많은 추천 키워드와 상세 분석은 curank.kr에서 확인하세요.", M + 14, y + 5);
      doc.text("키워드 전체 목록은 CSV로 다운로드 가능합니다.", M + 14, y + 9);

      // ═══════════════════════════════════════════
      // 푸터
      // ═══════════════════════════════════════════
      addFooter();

      doc.save(`쿠랭크_${keyword}_리포트.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
      style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
    >
      {loading ? "PDF 생성 중..." : "분석 결과 PDF 다운로드"}
    </button>
  );
}
