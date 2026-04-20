'use client';

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}
