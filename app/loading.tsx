export default function HomeLoading() {
  return (
    <main className="flex flex-col flex-1 items-center px-4 py-8">
      <div className="w-full max-w-6xl flex items-center justify-between mb-6">
        <span
          className="text-2xl font-black tracking-tight"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          쿠랭크
        </span>
      </div>
      <div className="w-full max-w-xl text-center mb-8">
        <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
      <div className="w-full max-w-6xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-100 rounded-xl w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
