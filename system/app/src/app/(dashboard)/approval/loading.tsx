export default function Loading() {
  return (
    <div className="p-4 max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="flex justify-between items-center mb-5">
        <div className="h-7 bg-gray-200 rounded w-28" />
        <div className="h-9 bg-gray-200 rounded-lg w-24" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}
