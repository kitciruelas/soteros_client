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
} from "recharts"

interface StackedDataPoint {
  name: string
  [key: string]: string | number
}

interface StackedBarChartProps {
  data: StackedDataPoint[]
  title: string
  stackKeys: string[]
  colors?: string[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-700 capitalize">{entry.dataKey}</span>
              </div>
              <span className="font-medium text-gray-900">{entry.value}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-1 mt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-700">Total</span>
              <span className="text-gray-900">{total}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-700 capitalize font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

const StackedBarChart: React.FC<StackedBarChartProps> = React.memo(
  ({
    data,
    title,
    stackKeys,
    colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"],
    height = 300,
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No data available</p>
              <p className="text-sm text-gray-500 mt-1">Chart data will appear here when available</p>
            </div>
          </div>
        </div>
      )
    }

    const totalDataPoints = data.length
    const maxValue = Math.max(...data.map((item) => stackKeys.reduce((sum, key) => sum + (Number(item[key]) || 0), 0)))

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {totalDataPoints} categories • Max: {maxValue}
            </p>
          </div>
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
              <CartesianGrid strokeDasharray="2 4" className="opacity-20" stroke="#e5e7eb" />

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
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />

              {stackKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={colors[index % colors.length]}
                  radius={index === stackKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  className="hover:opacity-80 transition-opacity duration-200"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={0.5}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  },
)

export default StackedBarChart
