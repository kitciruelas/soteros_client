import React from "react"
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"

const COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#84cc16", // Lime
]

interface DataPoint {
  name: string
  count: number
}

interface PieChartProps {
  data: DataPoint[]
  title: string
  dataKey?: string
  nameKey?: string
  height?: number
  colors?: Record<string, string>
}

const PieChart: React.FC<PieChartProps> = React.memo(
  ({ data, title, dataKey = "count", nameKey = "name", height = 300, colors }) => {
    const total = data?.reduce((sum, item) => sum + (item[dataKey as keyof DataPoint] as number), 0) || 0
    const maxValue = data?.reduce((max, item) => Math.max(max, item[dataKey as keyof DataPoint] as number), 0) || 0
    const maxItem = data?.find((item) => item[dataKey as keyof DataPoint] === maxValue)

    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <div className="flex flex-col items-center justify-center" style={{ height }}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No data available</p>
          </div>
        </div>
      )
    }

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0]
        const percentage = ((data.value / total) * 100).toFixed(1)
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="font-medium text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-600">
              Value: <span className="font-medium text-gray-900">{data.value.toLocaleString()}</span>
            </p>
            <p className="text-sm text-gray-600">
              Percentage: <span className="font-medium text-gray-900">{percentage}%</span>
            </p>
          </div>
        )
      }
      return null
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Total: <span className="font-medium text-gray-900">{total.toLocaleString()}</span>
            </p>
            {maxItem && (
              <p className="text-xs text-gray-400">
                Largest: {maxItem[nameKey as keyof DataPoint]} ({maxValue.toLocaleString()})
              </p>
            )}
          </div>
        </div>

        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => (percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                outerRadius={Math.min(height * 0.35, 100)}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors?.[entry.name] || COLORS[index % COLORS.length]}
                    className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "14px",
                }}
                iconType="circle"
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  },
)

export default PieChart
