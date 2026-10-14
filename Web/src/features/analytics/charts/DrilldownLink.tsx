import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { booksHref, mergeAnalyticsQuery } from './chartUtils'

export function DrilldownLink({
  children,
  className = '',
  query,
}: {
  children: ReactNode
  className?: string
  query: string
}) {
  const [searchParams] = useSearchParams()
  const mergedQuery = mergeAnalyticsQuery(searchParams, query)

  return (
    <Link
      className={`ui-drilldown-link ${className}`}
      title={`Open books filtered by ${mergedQuery}`}
      to={booksHref(mergedQuery)}
    >
      {children}
      <span aria-hidden="true" className="text-xs">
        ↗
      </span>
    </Link>
  )
}
