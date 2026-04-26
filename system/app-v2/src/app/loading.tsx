export default function Loading() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-ink animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-ink animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-ink animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </main>
  );
}
