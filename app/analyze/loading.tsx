export default function AnalyzeLoading() {
  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <span
          className="text-2xl font-black"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          쿠랭크
        </span>
      </div>
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-100 rounded-2xl w-64" />
        <div className="h-6 bg-gray-50 rounded-xl w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    </main>
  );
}
