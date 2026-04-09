function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function SnapshotBanner({ snapshotTime }: { snapshotTime: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-sm">&#9201;</span>
        <p className="text-sm text-amber-700">
          <span className="font-bold">{timeAgo(snapshotTime)}</span> 분석 결과입니다.
          <span className="text-amber-500 ml-1">현재 데이터와 다를 수 있어요.</span>
        </p>
      </div>
    </div>
  );
}
