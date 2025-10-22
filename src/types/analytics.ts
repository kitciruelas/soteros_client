export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface PieChartDataPoint {
  status?: string;
  priority?: string;
  count: number;
}

export interface AnalyticsData {
  incidentTrends30Days: ChartDataPoint[];
  userTrends90Days: ChartDataPoint[];
  incidentStatus: PieChartDataPoint[];
  incidentPriority: PieChartDataPoint[];
}
