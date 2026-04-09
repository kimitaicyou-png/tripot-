export default function Loading() {
  return (
    <div className="p-4 max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-7 bg-gray-200 rounded w-32" />
      <div className="h-10 bg-gray-200 rounded w-full" />
      <div className="h-12 bg-gray-100 rounded-xl w-full" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
}
