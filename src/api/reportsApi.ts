import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://soteros-backend-q2yihjhchq-et.a.run.app';

export interface GenerateReportParams {
  title: string;
  type: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface ExportParams {
  format: 'pdf' | 'excel';
  type: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const reportsApi = {
  // Get all reports with filters
  getReports: async (params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const response = await axios.get(`${API_URL}/api/reports`, { params });
    return response.data;
  },

  // Generate a new report
  generateReport: async (params: GenerateReportParams) => {
    const response = await axios.post(`${API_URL}/api/reports/generate`, params);
    return response.data;
  },

  // Download a report
  downloadReport: async (reportId: string) => {
    const response = await axios.get(`${API_URL}/api/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Export reports
  exportReports: async (params: ExportParams) => {
    const response = await axios.post(`${API_URL}/api/reports/export`, params, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Delete a report
  deleteReport: async (reportId: string) => {
    const response = await axios.delete(`${API_URL}/api/reports/${reportId}`);
    return response.data;
  }
};

export default reportsApi;
