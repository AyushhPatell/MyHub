export default function SkeletonCard() {
  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-card border border-gray-200 dark:border-white/10 p-4 animate-pulse">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-200 dark:bg-white/10 rounded-t-card" />
      <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
    </div>
  );
}
