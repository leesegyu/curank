// 비동기 서버 컴포넌트: 인구통계 데이터 (느림, Suspense로 분리)
import { getKeywordDemographics, DemographicData, AgeGroup } from "@/lib/datalab";

function GenderBar({ maleRatio, femaleRatio }: { maleRatio: number; femaleRatio: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>남성 {maleRatio}%</span>
        <span>여성 {femaleRatio}%</span>
      </div>
      <div className="flex h-4 rounded-full overflow-hidden">
        <div className="bg-blue-400 transition-all" style={{ width: `${maleRatio}%` }} />
        <div className="bg-pink-400 transition-all" style={{ width: `${femaleRatio}%` }} />
      </div>
    </div>
  );
}

function AgeBar({ ageGroups, hasData }: { ageGroups: AgeGroup[]; hasData: boolean }) {
  if (!hasData) {
    return (
      <p className="text-xs text-gray-400 py-2">검색량 부족으로 연령 데이터를 제공할 수 없습니다.</p>
    );
  }
  const COLORS = [
    "bg-violet-400", "bg-blue-400", "bg-sky-400", "bg-cyan-500",
    "bg-teal-400", "bg-green-400", "bg-lime-400", "bg-yellow-400",
    "bg-amber-400", "bg-orange-400", "bg-red-400",
  ];
  const maxRatio = Math.max(...ageGroups.map((g) => g.ratio), 1);
  return (
    <div className="space-y-1">
      {ageGroups.map((g, i) => (
        <div key={g.code} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16 shrink-0">{g.age}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`${COLORS[i]} h-2.5 rounded-full transition-all`}
              style={{ width: `${(g.ratio / maxRatio) * 100}%` }}
            />
          </div>
          <span className={`text-xs font-bold w-9 text-right ${g.ratio >= maxRatio * 0.8 ? "text-gray-900" : "text-gray-500"}`}>
            {g.ratio}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function DemographicsSection({ keyword, preloaded }: { keyword: string; preloaded?: DemographicData | null }) {
  const demo = preloaded ?? await getKeywordDemographics(keyword);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-700">검색자 성별 / 연령 분석</p>
          <p className="text-[11px] text-gray-400 mt-0.5">내 상품을 누가 찾는지 알면, 상세페이지 문구와 광고 타겟을 정확히 맞출 수 있어요</p>
        </div>
        {demo.usedKeyword !== keyword && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            &ldquo;{demo.usedKeyword}&rdquo; 기준 데이터
          </span>
        )}
      </div>
      <div className="space-y-5">
        <div>
          <p className="text-xs text-gray-400 mb-2">성별</p>
          {demo.hasGenderData ? (
            <GenderBar maleRatio={demo.maleRatio} femaleRatio={demo.femaleRatio} />
          ) : (
            <p className="text-xs text-gray-400 py-1">검색량 부족으로 성별 데이터를 제공할 수 없습니다.</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2">연령별 검색 비율</p>
          <AgeBar ageGroups={demo.ageGroups} hasData={demo.hasAgeData} />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">네이버 검색 기준 · 최근 3개월 평균</p>
    </div>
  );
}

// 로딩 스켈레톤
export function DemographicsSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-700">검색자 성별 / 연령 분석</p>
        <span className="text-xs text-gray-400 animate-pulse">분석 중...</span>
      </div>
      <div className="space-y-4">
        {/* 성별 스켈레톤 */}
        <div>
          <div className="h-3 w-8 bg-gray-100 rounded mb-2" />
          <div className="h-4 bg-gray-100 rounded-full animate-pulse" />
        </div>
        {/* 연령 스켈레톤 */}
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-16 h-3 bg-gray-100 rounded" />
              <div
                className="flex-1 h-2.5 bg-gray-100 rounded-full animate-pulse"
                style={{ opacity: 1 - i * 0.1 }}
              />
              <div className="w-9 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-300 mt-3">분석 중...</p>
    </div>
  );
}
