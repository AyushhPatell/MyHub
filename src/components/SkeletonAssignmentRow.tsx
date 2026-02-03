export default function SkeletonAssignmentRow() {
  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-card border border-gray-200 dark:border-white/10 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-input bg-gray-200 dark:bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-4/5" />
          <div className="flex gap-2">
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-24" />
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
