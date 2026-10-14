import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BookAnalyticsDto, BookAnalyticsLibraryGrowthPointDto } from '@/api/types'
import { Surface } from '@/components/app/DesignSystem'
import { analyticsTooltipProps, fieldQuery, focusedValueDomain, formatCount } from './chartUtils'
import { DrilldownLink } from './DrilldownLink'
import { compactGrowthPoints, libraryGrowthChartPoints } from './libraryGrowthData'

type LibraryGrowthChartProps = {
  data: BookAnalyticsDto | undefined
}

export function LibraryGrowthChart({ data }: LibraryGrowthChartProps) {
  const points = data?.libraryGrowth.points ?? []
  const openingCount = data?.libraryGrowth.openingCount ?? 0
  const bucket = data?.scope.bucket ?? 'day'
  const chartPoints = libraryGrowthChartPoints(points, bucket)
  const cumulativeDomain = focusedValueDomain(chartPoints.map((point) => point.cumulativeBooks))
  const displayPoints = compactGrowthPoints(points, bucket)
  const newestDisplayPoints = [...displayPoints].reverse()

  if (!points.length) {
    return (
      <div className="grid min-h-56 place-items-center text-center text-sm text-slate-600">
        <div>
          <div>No library growth points in this time range.</div>
          <div className="mt-1">Opening count: {formatCount(openingCount)} books.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">
        Opening count: {formatCount(openingCount)} books. Buckets with 0 additions stay in the
        series so import jumps remain visible.
      </p>
      <div className="h-56 min-w-0" aria-label="Library growth trend">
        <ResponsiveContainer>
          <LineChart data={chartPoints}>
            <XAxis dataKey="date" tickLine={false} />
            <YAxis allowDecimals={false} tickLine={false} yAxisId="daily" />
            <YAxis
              allowDecimals={false}
              domain={cumulativeDomain}
              orientation="right"
              tickLine={false}
              yAxisId="cumulative"
            />
            <Tooltip
              {...analyticsTooltipProps}
              formatter={(value, name) => [formatCount(Number(value)), growthLabel(name)]}
              labelFormatter={(label) => `Bucket ${label}`}
            />
            <Line
              dataKey="cumulativeBooks"
              name="cumulativeBooks"
              stroke="#8b92d8"
              strokeWidth={2}
              yAxisId="cumulative"
              dot={{ r: 3 }}
            />
            <Line
              dataKey="booksAdded"
              name="booksAdded"
              stroke="#d1aa6e"
              strokeWidth={2}
              yAxisId="daily"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {newestDisplayPoints.map((point) => (
          <Surface as="div" className="px-3 py-2 text-sm" key={point.label}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-slate-950">{point.label}</span>
              <span className="text-slate-700">
                +{formatCount(point.booksAdded)} added · {formatCount(point.cumulativeBooks)}{' '}
                cumulative
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-slate-600">{typeSummary(point)}</div>
          </Surface>
        ))}
      </div>
    </div>
  )
}

function typeSummary(point: BookAnalyticsLibraryGrowthPointDto & { endExclusive?: string }) {
  if (!point.byType.length) {
    return <span>No additions by type.</span>
  }

  return point.byType.map((item) => (
    <DrilldownLink
      key={item.type}
      query={`${fieldQuery('type', item.type)} created:>=${point.date} created:<${point.endExclusive ?? point.date}`}
    >
      {item.type}: {formatCount(item.bookCount)}
    </DrilldownLink>
  ))
}

function growthLabel(name: unknown) {
  if (name === 'cumulativeBooks') {
    return 'Cumulative books'
  }
  if (name === 'booksAdded') {
    return 'Books added'
  }
  return String(name)
}
