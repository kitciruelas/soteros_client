import React from "react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts"

interface DataPoint {
  name: string
  count: number
}

interface StackedDataPoint {
  name: string
  [key: string]: string | number
}

interface BarChartProps {
  data: DataPoint[] | StackedDataPoint[]
  title: string
  dataKey?: string
  color?: string | { [key: string]: string }  // Can be a single color or a color map
  height?: number
  stacked?: boolean
  stackKeys?: string[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-1">
          {data?.timeLabel || label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value.toLocaleString()}`}
          </p>
        ))}
        {/* Display Count and Minutes for response time chart */}
        {data?.incident_count !== undefined && data?.avg_response_time_minutes !== undefined && (
          <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
            <span className="font-semibold">Count: {data.incident_count}</span>
            {' '}
            <span className="font-semibold">Minutes: {data.avg_response_time_minutes.toLocaleString()}</span>
          </p>
        )}
        {data?.formattedTime && (
          <p className="text-xs text-gray-500 mt-1">
            Time: {data.formattedTime}
          </p>
        )}
        {data?.sampleDateTime && (
          <p className="text-xs text-blue-600 mt-1">
            Latest: {data.sampleDateTime}
          </p>
        )}
        {data?.dateRange && (
          <p className="text-xs text-green-600 mt-1">
            Consecutive Dates: {data.dateRange}
          </p>
        )}
        {data?.timeRange && (
          <p className="text-xs text-purple-600 mt-1">
            Time Range: {data.timeRange}
          </p>
        )}
      </div>
    )
  }
  return null
}

const BarChart: React.FC<BarChartProps> = React.memo(
  ({ data, title, dataKey = "count", color = "#3b82f6", height = 300, stacked = false, stackKeys = [] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No data available</p>
              <p className="text-gray-400 text-sm mt-1">Data will appear here when available</p>
            </div>
          </div>
        </div>
      )
    }

    const stackColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"]
    
    // Helper function to get color for each data point
    const getBarColor = (entry: any) => {
      if (typeof color === 'object' && color !== null) {
        // Color is a map object
        return color[entry.name] || color[entry.name.toLowerCase()] || '#6C757D';
      }
      // Color is a string
      return color as string;
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
            {data.length} {data.length === 1 ? "item" : "items"}
          </span>
        </div>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                fontSize={12}
                tick={{ fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                fontSize={12}
                tick={{ fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              {stacked && stackKeys.length > 0 && <Legend />}

              {stacked && stackKeys.length > 0 ? (
                stackKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="stack"
                    fill={stackColors[index % stackColors.length]}
                    radius={index === stackKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))
              ) : (
                <Bar
                  dataKey={dataKey}
                  fill={typeof color === 'string' ? color : undefined}
                  radius={[4, 4, 0, 0]}
                  className="hover:opacity-80 transition-opacity duration-200"
                >
                  {typeof color === 'object' && color !== null && (data as DataPoint[]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))}
                </Bar>
              )}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  },
)

BarChart.displayName = "BarChart"

export default BarChart
