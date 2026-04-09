export function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{children}</span>
    </div>
  );
}
