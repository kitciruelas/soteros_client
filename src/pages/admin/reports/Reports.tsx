import React, { useState } from 'react';
import reportsApi from '../../../api/reportsApi';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'incidents' | 'evacuations' | 'resources' | 'activity' | 'response' | 'emergency' | 'team';
  status: 'available' | 'generating' | 'failed';
  lastGenerated?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

const Reports: React.FC = () => {
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const reports: Report[] = [
    {
      id: '1',
      name: 'Incident Summary Report',
      description: 'Comprehensive summary of all incidents including status, response times, and resolutions.',
      type: 'incidents',
      status: 'available',
      frequency: 'daily',
      lastGenerated: '2025-08-28'
    },
    {
      id: '2',
      name: 'Evacuation Center Status',
      description: 'Current status and historical data of evacuation centers including occupancy rates.',
      type: 'evacuations',
      status: 'generating',
      frequency: 'daily',
      lastGenerated: '2025-08-27'
    },
    {
      id: '3',
      name: 'Resource Allocation Report',
      description: 'Overview of resource distribution and utilization across different centers.',
      type: 'resources',
      status: 'available',
      frequency: 'weekly',
      lastGenerated: '2025-08-29'
    },
    {
      id: '4',
      name: 'Activity Logs Report',
      description: 'Detailed log of all system activities and user actions.',
      type: 'activity',
      status: 'available',
      frequency: 'daily',
      lastGenerated: '2025-08-29'
    },
    {
      id: '5',
      name: 'Emergency Response Times',
      description: 'Analysis of response times for different types of emergencies and locations.',
      type: 'response',
      status: 'available',
      frequency: 'weekly',
      lastGenerated: '2025-08-29'
    },
    {
      id: '6',
      name: 'Team Performance Report',
      description: 'Evaluation of team performance, response efficiency, and task completion rates.',
      type: 'team',
      status: 'failed',
      frequency: 'monthly',
      lastGenerated: '2025-08-28'
    },
    {
      id: '7',
      name: 'Emergency Preparedness Assessment',
      description: 'Assessment of current emergency preparedness levels and recommendations.',
      type: 'emergency',
      status: 'available',
      frequency: 'monthly',
      lastGenerated: '2025-08-25'
    }
  ];

  const filteredReports = selectedReportType === 'all'
    ? reports
    : reports.filter(report => report.type === selectedReportType);

  const handleGenerateReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const response = await reportsApi.generateReport({
        title: report.name,
        type: report.type,
        description: report.description,
        parameters: {
          dateRange,
          status: 'all'
        }
      });

      // If successful, get the generated file
      if (response.reportId) {
        const blob = await reportsApi.downloadReport(response.reportId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      // TODO: Add proper error notification
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const blob = await reportsApi.exportReports({
        format,
        type: selectedReportType,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emergency-reports-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting reports:', error);
      // TODO: Add proper error notification
      alert('Failed to export reports. Please try again.');
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Generate and manage various reports for emergency management operations.</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-600 text-sm font-medium">Total Reports</div>
          <div className="text-2xl font-bold text-blue-900">{reports.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-600 text-sm font-medium">Available Reports</div>
          <div className="text-2xl font-bold text-green-900">
            {reports.filter(r => r.status === 'available').length}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-yellow-600 text-sm font-medium">Generating</div>
          <div className="text-2xl font-bold text-yellow-900">
            {reports.filter(r => r.status === 'generating').length}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-red-600 text-sm font-medium">Failed</div>
          <div className="text-2xl font-bold text-red-900">
            {reports.filter(r => r.status === 'failed').length}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex gap-4 items-center">
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reports</option>
            <option value="incidents">Incidents</option>
            <option value="evacuations">Evacuations</option>
            <option value="resources">Resources</option>
            <option value="response">Response Times</option>
            <option value="emergency">Emergency Preparedness</option>
            <option value="team">Team Performance</option>
            <option value="activity">Activity Logs</option>
          </select>

          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'px-3 py-2 bg-blue-50 text-blue-600' : 'px-3 py-2 bg-white text-gray-600'}
            >
              <i className="ri-grid-line"></i>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'px-3 py-2 bg-blue-50 text-blue-600' : 'px-3 py-2 bg-white text-gray-600'}
            >
              <i className="ri-list-check"></i>
            </button>
          </div>

          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Export as Excel
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:border-blue-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {report.type}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  {report.frequency && (
                    <span className="text-xs text-gray-500">
                      Generated {report.frequency}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {report.lastGenerated && (
                      <span>Last generated: {report.lastGenerated}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={report.status === 'generating'}
                    className={`px-4 py-2 text-sm rounded-md focus:outline-none focus:ring-2 ${
                      report.status === 'generating'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {report.status === 'generating' ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Generated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{report.name}</div>
                      <div className="text-sm text-gray-500">{report.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{report.frequency || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{report.lastGenerated || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={report.status === 'generating'}
                      className={`px-4 py-2 text-sm rounded-md focus:outline-none focus:ring-2 ${
                        report.status === 'generating'
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                      }`}
                    >
                      {report.status === 'generating' ? 'Generating...' : 'Generate Report'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
