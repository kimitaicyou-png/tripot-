'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-components must be used inside <Tabs>');
  return ctx;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const setValue = (v: string) => {
    if (controlledValue === undefined) setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 border-b border-border ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  count,
}: {
  value: string;
  children: ReactNode;
  count?: number;
}) {
  const { value: active, setValue } = useTabs();
  const isActive = active === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setValue(value)}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        isActive ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      <span className="flex items-center gap-2">
        {children}
        {typeof count === 'number' && (
          <span className="text-xs font-normal text-subtle tabular-nums">{count}</span>
        )}
      </span>
      {isActive && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" aria-hidden="true" />
      )}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: active } = useTabs();
  if (active !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
