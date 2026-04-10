#!/usr/bin/env npx tsx
/**
 * coupang-deal-bot.ts — 쿠팡 딜 스크래핑 + 텔레그램 자동 발송
 *
 * 목적: 쿠팡 파트너스 API 승인 조건(누적 수수료 15만원) 달성을 위한 딜 봇
 *
 * 동작:
 * 1. 쿠팡 베스트/타임딜 페이지 스크래핑
 * 2. 할인율 30% 이상 필터
 * 3. 중복 제거 (최근 24h 발송 이력 체크)
 * 4. 텔레그램 채널로 발송
 *
 * 크론 (로컬):
 *   0 7,12,21 * * * cd /Users/segyu/Desktop/curank && npx tsx scripts/coupang-deal-bot.ts >> /tmp/coupang-bot.log 2>&1
 *
 * 환경변수:
 *   TELEGRAM_BOT_TOKEN   — @BotFather에서 발급
 *   TELEGRAM_CHAT_ID     — 채널 ID (@channelname 또는 -100xxxxxxxxx)
 *   COUPANG_PARTNERS_ID  — (승인 후) 파트너스 추적 ID
 */

import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PARTNERS_ID = process.env.COUPANG_PARTNERS_ID || ""; // 승인 전 빈 값
const MIN_DISCOUNT = 30; // 최소 할인율 %
const MAX_PER_RUN = 5; // 한 번에 최대 발송 개수
const HISTORY_FILE = "/tmp/coupang-deal-history.json";

interface Deal {
  title: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  url: string;
  imageUrl?: string;
  productId: string;
}

interface History {
  productIds: string[];
  lastRun: string;
}

async function loadHistory(): Promise<History> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    const h = JSON.parse(raw) as History;
    // 7일 이상 된 이력은 폐기
    const weekAgo = Date.now() - 7 * 86400_000;
    if (new Date(h.lastRun).getTime() < weekAgo) {
      return { productIds: [], lastRun: new Date().toISOString() };
    }
    return h;
  } catch {
    return { productIds: [], lastRun: new Date().toISOString() };
  }
}

async function saveHistory(h: History): Promise<void> {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(h, null, 2));
}

/**
 * 쿠팡 베스트 페이지 스크래핑
 * 여러 카테고리의 베스트 상품 수집
 */
async function scrapeCoupangBest(): Promise<Deal[]> {
  const deals: Deal[] = [];
  const categories = [
    { name: "식품", id: "194182" },
    { name: "생활용품", id: "178154" },
    { name: "디지털/가전", id: "1001" },
    { name: "홈인테리어", id: "11900" },
  ];

  for (const cat of categories) {
    try {
      const url = `https://www.coupang.com/np/categories/${cat.id}?sorter=bestAsc`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });

      if (!res.ok) {
        console.warn(`[${cat.name}] HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      // 간단한 정규식 파싱 (cheerio 없이)
      // <li class="baby-product-item" ...> 상품 블록 추출
      const itemRegex = /<li[^>]*class="[^"]*baby-product-item[^"]*"[^>]*data-product-id="(\d+)"[\s\S]*?<\/li>/g;
      const matches = html.matchAll(itemRegex);

      for (const m of matches) {
        const block = m[0];
        const productId = m[1];

        const titleMatch = block.match(/class="name"[^>]*>([^<]+)</);
        const priceMatch = block.match(/class="price-value"[^>]*>([\d,]+)/);
        const originalMatch = block.match(/class="base-price"[^>]*>([\d,]+)/);
        const discountMatch = block.match(/class="discount-percentage"[^>]*>(\d+)/);

        if (!titleMatch || !priceMatch) continue;

        const title = titleMatch[1].trim();
        const salePrice = parseInt(priceMatch[1].replace(/,/g, ""), 10);
        const originalPrice = originalMatch
          ? parseInt(originalMatch[1].replace(/,/g, ""), 10)
          : salePrice;
        const discount = discountMatch
          ? parseInt(discountMatch[1], 10)
          : Math.round(((originalPrice - salePrice) / originalPrice) * 100);

        if (discount < MIN_DISCOUNT) continue;

        deals.push({
          title,
          originalPrice,
          salePrice,
          discount,
          productId,
          url: `https://www.coupang.com/vp/products/${productId}`,
        });
      }

      // 속도 제한 준수 (5초 간격)
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.warn(`[${cat.name}] 스크래핑 실패:`, err instanceof Error ? err.message : err);
    }
  }

  // 할인율 내림차순 정렬
  deals.sort((a, b) => b.discount - a.discount);
  return deals;
}

/**
 * 파트너스 추적 URL 생성 (승인 후)
 * 승인 전: 일반 쿠팡 URL 반환
 */
function buildTrackUrl(productUrl: string): string {
  if (!PARTNERS_ID) return productUrl;
  // 쿠팡 파트너스 deep link 형식 (승인 후 실제 포맷으로 교체)
  return `${productUrl}?lptag=${PARTNERS_ID}`;
}

/**
 * 텔레그램 메시지 포맷 (MarkdownV2 특수문자 이스케이프)
 */
function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function formatDeal(deal: Deal): string {
  const title = escapeMd(deal.title);
  const salePrice = deal.salePrice.toLocaleString();
  const originalPrice = deal.originalPrice.toLocaleString();
  const url = buildTrackUrl(deal.url);

  return [
    `🔥 *${title}*`,
    ``,
    `💰 ~${originalPrice}원~ → *${salePrice}원*`,
    `🎯 할인율 *${deal.discount}%*`,
    ``,
    `👉 [쿠팡에서 보기](${url})`,
  ].join("\n");
}

async function sendTelegram(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("⚠️  TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정 — dry run");
    console.log(text);
    console.log("---");
    return false;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("텔레그램 발송 실패:", res.status, err);
    return false;
  }
  return true;
}

async function main() {
  console.log(`[${new Date().toISOString()}] 쿠팡 딜 봇 시작`);

  const history = await loadHistory();
  const sentSet = new Set(history.productIds);

  const deals = await scrapeCoupangBest();
  console.log(`  → ${deals.length}개 딜 수집`);

  // 중복 제거
  const fresh = deals.filter((d) => !sentSet.has(d.productId));
  console.log(`  → ${fresh.length}개 신규 딜 (중복 제외)`);

  const toSend = fresh.slice(0, MAX_PER_RUN);
  let sent = 0;

  for (const deal of toSend) {
    const msg = formatDeal(deal);
    const ok = await sendTelegram(msg);
    if (ok) {
      sent++;
      history.productIds.push(deal.productId);
      // 텔레그램 rate limit 회피 (2초 간격)
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  history.lastRun = new Date().toISOString();
  await saveHistory(history);

  console.log(`  → ${sent}개 발송 완료`);
  console.log(`[${new Date().toISOString()}] 완료`);
}

main().catch((e) => {
  console.error("딜 봇 실패:", e);
  process.exit(1);
});
