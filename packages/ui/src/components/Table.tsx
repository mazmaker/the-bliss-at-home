import { HTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export interface Column<T> {
  key: string
  label: string
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[]
  data: T[]
  keyField: string
  emptyMessage?: string
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  emptyMessage = 'ไม่พบข้อมูล',
  className,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn('text-center py-12 text-stone-500', className)}>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full', className)}>
        <thead>
          <tr className="border-b border-stone-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn('px-4 py-3 text-left text-sm font-semibold text-stone-700', column.className)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row[keyField]} className="border-b border-stone-100 hover:bg-stone-50 transition">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 text-sm text-stone-600', column.className)}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
