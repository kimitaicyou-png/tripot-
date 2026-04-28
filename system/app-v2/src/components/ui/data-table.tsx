import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
};

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  empty,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  empty?: ReactNode;
  rowHref?: (row: T) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-10 text-center text-sm text-gray-700">
        {empty ?? '該当するデータがありません'}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={`px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium ${
                  c.align === 'right'
                    ? 'text-right'
                    : c.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={keyOf(row)}
              className={`${i > 0 ? 'border-t border-gray-200' : ''} ${
                rowHref ? 'hover:bg-gray-50 transition-colors' : ''
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 text-gray-900 ${
                    c.align === 'right'
                      ? 'text-right tabular-nums'
                      : c.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  }`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
