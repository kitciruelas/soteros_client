import React from "react"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface DataPoint {
  date: string
  count: number
}

interface LineChartProps {
  data: DataPoint[]
  title: string
  color?: string
  height?: number
}

const LineChart: React.FC<LineChartProps> = React.memo(({ data, title, color = "#3b82f6", height = 300 }) => {
  const formatDate = (dateString: string) => {
    // Check if dateString is valid
    if (!dateString || typeof dateString !== 'string') {
      return 'Invalid Date'
    }

    // If it's not a date format (e.g., incident type names like "medical", "fire"), return as-is
    const commonIncidentTypes = ['medical', 'fire', 'accident', 'security', 'other']
    if (commonIncidentTypes.includes(dateString.toLowerCase())) {
      // Capitalize first letter
      return dateString.charAt(0).toUpperCase() + dateString.slice(1)
    }

    // Handle YYYY-MM format for monthly data
    if (dateString.includes("-") && dateString.split("-").length === 2) {
      const [year, month] = dateString.split("-")
      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short" })
    }

    // Handle YEARWEEK format (e.g., "202452" for week 52 of 2024)
    if (/^\d{6}$/.test(dateString)) {
      const year = Number.parseInt(dateString.substring(0, 4))
      const week = Number.parseInt(dateString.substring(4, 6))
      // Calculate the first day of the week (Monday)
      const firstDayOfYear = new Date(year, 0, 1)
      const days = (week - 1) * 7
      const firstDayOfWeek = new Date(firstDayOfYear.getTime() + days * 24 * 60 * 60 * 1000)
      // Adjust to Monday if it's not already
      const dayOfWeek = firstDayOfWeek.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(firstDayOfWeek.getTime() + mondayOffset * 24 * 60 * 60 * 1000)

      return `Week ${week} (${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
    }

    // Handle YYYY-MM-DD format for daily data
    if (dateString.includes("-") && dateString.split("-").length === 3) {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    // Handle regular date format as fallback
    const date = new Date(dateString)
    // If date is invalid, return the original string (might be a label like incident type)
    if (isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const totalCount = data?.reduce((sum, item) => sum + item.count, 0) || 0
  const averageCount = data?.length ? Math.round(totalCount / data.length) : 0
  const maxCount = data?.reduce((max, item) => Math.max(max, item.count), 0) || 0
  const trend =
    data?.length >= 2
      ? data[data.length - 1].count > data[0].count
        ? "up"
        : data[data.length - 1].count < data[0].count
          ? "down"
          : "stable"
      : "stable"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const data = payload[0]?.payload
      const formattedDate = formatDate(label)

      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="text-sm font-medium text-gray-900 mb-1">{formattedDate}</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm text-gray-600">
              {data?.display_unit === 'days' ? 'Days:' : 'Hours:'}
            </span>
            <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>
          </div>
          {/* Display Count and Minutes for response time chart (average by type) */}
          {data?.incident_count !== undefined && data?.avg_response_time_minutes !== undefined && (
            <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
              <span className="font-semibold">Count: {data.incident_count}</span>
              {' '}
              <span className="font-semibold">
                Response Time:{' '}
                {data.avg_response_time_minutes < 60
                  ? `${data.avg_response_time_minutes.toLocaleString()} Minutes`
                  : data.avg_response_time_hours && parseFloat(data.avg_response_time_hours) >= 24
                    ? `${data.avg_response_time_days?.toLocaleString() || Math.floor(parseFloat(data.avg_response_time_hours) / 24).toLocaleString()} Days`
                    : `${parseFloat(data.avg_response_time_hours || '0').toFixed(1)} Hours`
                }
              </span>
            </p>
          )}
          {/* Display individual incident details */}
          {data?.incident_id !== undefined && data?.response_time_minutes !== undefined && (
            <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200 space-y-1">
              <p>
                <span className="font-semibold">Incident ID:</span> #{data.incident_id}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {data.incident_type}
              </p>
              <p>
                <span className="font-semibold">Response Time:</span>{' '}
                {data.response_time_minutes < 60 
                  ? `${data.response_time_minutes.toLocaleString()} Minutes`
                  : data.response_time_hours >= 24
                    ? `${data.response_time_days?.toLocaleString() || Math.floor(data.response_time_hours / 24).toLocaleString()} Days`
                    : `${data.response_time_hours.toFixed(1)} Hours`
                }
              </p>
              {data.status && (
                <p>
                  <span className="font-semibold">Status:</span> {data.status}
                </p>
              )}
            </div>
          )}
          {averageCount > 0 && !data?.incident_count && (
            <p className="text-xs text-gray-500 mt-1">
              {value > averageCount
                ? `+${value - averageCount} above avg`
                : value < averageCount
                  ? `${averageCount - value} below avg`
                  : "At average"}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-gray-500 font-medium">No data available</p>
            <p className="text-sm text-gray-400 mt-1">Data trends will appear here when available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Total: <span className="font-medium text-gray-900">{totalCount.toLocaleString()}</span>
            </span>
            <span>
              Avg: <span className="font-medium text-gray-900">{averageCount.toLocaleString()}</span>
            </span>
            <span>
              Peak: <span className="font-medium text-gray-900">{maxCount.toLocaleString()}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {trend === "up" && (
            <>
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-green-600 font-medium">Trending up</span>
            </>
          )}
          {trend === "down" && (
            <>
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
              <span className="text-red-600 font-medium">Trending down</span>
            </>
          )}
          {trend === "stable" && (
            <>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
              <span className="text-gray-600 font-medium">Stable</span>
            </>
          )}
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              fontSize={12}
              stroke="#6b7280"
              tickLine={{ stroke: "#d1d5db" }}
              reversed={false}
            />
            <YAxis
              fontSize={12}
              stroke="#6b7280"
              tickLine={{ stroke: "#d1d5db" }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={3}
              dot={{
                fill: color,
                strokeWidth: 2,
                r: 4,
                className: "drop-shadow-sm",
              }}
              activeDot={{
                r: 7,
                fill: color,
                stroke: "#ffffff",
                strokeWidth: 2,
                className: "drop-shadow-md",
              }}
              className="drop-shadow-sm"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default LineChart
