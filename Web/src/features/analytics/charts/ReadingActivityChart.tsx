import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BookAnalyticsDto } from '@/api/types'
import { Surface } from '@/components/app/DesignSystem'
import { analyticsTooltipProps, focusedValueDomain, formatCount } from './chartUtils'
import { compactActivityPoints, readingActivityChartPoints } from './readingActivityData'

type ReadingActivityChartProps = {
  data: BookAnalyticsDto | undefined
}

export function ReadingActivityChart({ data }: ReadingActivityChartProps) {
  const points = data?.activity.points ?? []
  const baselineChapters = data?.activity.baselineChapters ?? 0
  const bucket = data?.scope.bucket ?? 'day'
  const chartPoints = readingActivityChartPoints(points, bucket, baselineChapters)
  const cumulativeDomain = focusedValueDomain(chartPoints.map((point) => point.cumulativeChapters))
  const displayPoints = compactActivityPoints(points, bucket, baselineChapters)
  const newestDisplayPoints = [...displayPoints].reverse()

  if (!points.length) {
    return (
      <div className="grid min-h-56 place-items-center text-sm text-slate-600">
        No reading activity in this time range.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="h-56 min-w-0" aria-label="Reading activity trend">
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
              formatter={(value, name) => [formatCount(Number(value)), activityLabel(name)]}
              labelFormatter={(label) => `Bucket ${label}`}
            />
            <Line
              dataKey="dailyChapters"
              name="dailyChapters"
              stroke="#75b69c"
              strokeWidth={2}
              yAxisId="daily"
              dot={{ r: 3 }}
            />
            <Line
              dataKey="cumulativeChapters"
              name="cumulativeChapters"
              stroke="#8b92d8"
              strokeWidth={2}
              yAxisId="cumulative"
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
                {formatCount(point.progressEvents)} events · {formatCount(point.booksTouched)} books
                touched
              </span>
            </div>
            <div className="mt-1 text-slate-600">
              Daily: {formatCount(point.dailyChapters)} chapters. Cumulative:{' '}
              {formatCount(point.cumulativeChapters)} chapters.
            </div>
          </Surface>
        ))}
      </div>
    </div>
  )
}

function activityLabel(name: unknown) {
  if (name === 'dailyChapters') {
    return 'Daily chapters advanced'
  }
  if (name === 'cumulativeChapters') {
    return 'Cumulative tracked chapters'
  }
  return String(name)
}
