export default function DiscoverLoading() {
  return (
    <main className="flex flex-col flex-1 items-center px-4 py-8">
      <div className="w-full max-w-6xl">
        <div className="h-6 bg-gray-100 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-50 rounded w-72 mb-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-52 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-5 bg-gray-100 rounded w-32 mb-3" />
              <div className="h-10 bg-gray-50 rounded mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
