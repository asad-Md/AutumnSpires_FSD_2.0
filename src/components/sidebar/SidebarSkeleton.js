export default function SidebarSkeleton() {
  return (
    <div className="w-64 bg-black/20 h-screen flex flex-col relative animate-pulse">
      <div className="p-4 flex flex-col gap-4">
        {/* Header skeleton */}
        <div className="h-8  rounded-2xl w-3/4"></div>

        {/* Tab switcher skeleton */}
        <div className="h-10 bg-white/10 rounded-4xl"></div>

        {/* Search skeleton */}
        <div className="h-10 bg-white/10 rounded-2xl"></div>

        {/* Add friend button skeleton */}
        <div className="h-10 bg-white/10 rounded-2xl"></div>
      </div>

      {/* Friends list skeleton */}
      <div className="flex-1 px-2 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-4xl bg-white/5"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-2/3"></div>
              <div className="h-2 bg-white/10 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>

      {/* User profile skeleton */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/10 rounded w-3/4"></div>
            <div className="h-2 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
