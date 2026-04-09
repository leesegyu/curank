"use client";

import KeywordProductCard from "./KeywordProductCard";
import KeywordTextCard from "./KeywordTextCard";
import type { FeedItem, FeedRow as FeedRowType } from "@/app/api/feed/route";

interface Props {
  title:       string;
  subtitle:    string;
  icon:        string;
  items:       FeedItem[];
  displayType?: FeedRowType["displayType"];
}

export default function FeedRow({ title, subtitle, icon, items, displayType }: Props) {
  if (items.length === 0) return null;

  const isKeywordOnly = displayType === "keyword_only";
  const Card = isKeywordOnly ? KeywordTextCard : KeywordProductCard;

  return (
    <section className="mb-10">
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
        </div>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1 ml-9">{subtitle}</p>
        )}
      </div>

      {isKeywordOnly ? (
        /* 키워드 텍스트 카드: 가로 wrap 레이아웃 */
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <Card key={`${item.keyword}-${i}`} item={item} />
          ))}
        </div>
      ) : (
        <>
          {/* 모바일: 가로 스크롤 */}
          <div className="sm:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3" style={{ width: `${items.length * 200 + (items.length - 1) * 12}px` }}>
              {items.map((item, i) => (
                <div key={`${item.keyword}-${i}`} className="w-[200px] flex-shrink-0">
                  <Card item={item} />
                </div>
              ))}
            </div>
          </div>
          {/* 데스크탑: 그리드 */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((item, i) => (
              <Card key={`${item.keyword}-${i}`} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
