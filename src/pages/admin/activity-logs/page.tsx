import React, { useState, useEffect } from 'react';
import { activityLogsApi } from '../../../utils/api';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../utils/exportUtils';
import ExportUtils from '../../../utils/exportUtils';
import { useToast } from '../../../components/base/Toast';

interface ActivityLog {
  id: number;
  user_type: 'admin' | 'staff' | 'user' | 'unknown';
  user_name: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
  admin_id?: number; 
  staff_id?: number;
  general_user_id?: number;
}

interface ActivityLogsResponse {
  success: boolean;
  logs: ActivityLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLogs: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

interface ActivityLogStats {
  userTypeDistribution: Array<{ user_type: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  recentHighImpact: ActivityLog[];
}

// Export columns configuration
const exportColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  {
    key: 'user_type',
    label: 'User Type',
    format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
  },
  { key: 'user_name', label: 'User Name' },
  {
    key: 'action',
    label: 'Action',
    format: (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  },
  { key: 'details', label: 'Details' },
  { key: 'ip_address', label: 'IP Address' },
  {
    key: 'created_at',
    label: 'Date & Time',
    format: (value: string) => new Date(value).toLocaleString()
  }
];



const ActivityLogs: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);

  useEffect(() => {
    fetchActivityLogs();
    fetchActivityStats();
  }, [currentPage, searchTerm, timeFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timeFilter]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: 20,
        search: searchTerm.trim()
      };

      if (timeFilter !== 'all') {
        const now = new Date();
        if (timeFilter === 'today') {
          const today = now.toISOString().split('T')[0];
          params.date_from = today;
          params.date_to = today;
        } else if (timeFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          params.date_from = weekAgo.toISOString().split('T')[0];
          params.date_to = now.toISOString().split('T')[0];
        } else if (timeFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          params.date_from = monthAgo.toISOString().split('T')[0];
          params.date_to = now.toISOString().split('T')[0];
        }
      }



      console.log('🔍 Fetching activity logs with params:', params);
      
      const response = await activityLogsApi.getLogs(params);
      
      if (response.success) {
        setLogs(response.logs);
        setTotalPages(response.pagination.totalPages);
        setTotalLogs(response.pagination.totalLogs);
        console.log('✅ Successfully fetched', response.logs.length, 'logs');
      } else {
        const errorMsg = response.message || 'Failed to fetch activity logs';
        console.error('❌ API returned error:', errorMsg);
        setError(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error fetching activity logs:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to fetch activity logs. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check if the backend is running.';
        } else if (error.message.includes('Table not found')) {
          errorMessage = 'Activity logs table not found. Please contact an administrator to set up the system.';
        } else if (error.message.includes('Database')) {
          errorMessage = 'Database connection error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      setStatsLoading(true);
      const response = await activityLogsApi.getLogStats();
      
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAllActivityLogs = async () => {
    try {
      const params: any = {
        limit: 1000000, // Very high limit to get all logs
        search: searchTerm.trim()
      };

      if (timeFilter !== 'all') {
        const now = new Date();
        if (timeFilter === 'today') {
          const today = now.toISOString().split('T')[0];
          params.date_from = today;
          params.date_to = today;
        } else if (timeFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          params.date_from = weekAgo.toISOString().split('T')[0];
          params.date_to = now.toISOString().split('T')[0];
        } else if (timeFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          params.date_from = monthAgo.toISOString().split('T')[0];
          params.date_to = now.toISOString().split('T')[0];
        }
      }

      console.log('🔍 Fetching all activity logs with params:', params);

      const response = await activityLogsApi.getLogs(params);

      if (response.success) {
        console.log('✅ Successfully fetched', response.logs.length, 'logs for export');
        return response.logs;
      } else {
        const errorMsg = response.message || 'Failed to fetch all activity logs';
        console.error('❌ API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error fetching all activity logs:', error);
      throw error;
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchActivityLogs();
    fetchActivityStats();
  };

  // Export functionality is now handled by ExportButton component

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Export functions
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const exportData = await fetchAllActivityLogs();
      // Build dynamic title based on filters
      let title = 'Activity Logs';
      const filterParts = [];
      if (searchTerm.trim()) filterParts.push(`Search: "${searchTerm.trim()}"`);
      if (timeFilter !== 'all') {
        const label = timeFilter === 'today' ? 'Today' : timeFilter === 'week' ? 'Last Week' : timeFilter === 'month' ? 'Last Month' : timeFilter;
        filterParts.push(`Time: ${label}`);
      }
      if (filterParts.length > 0) {
        title += ' (' + filterParts.join(', ') + ')';
      } else {
        title += ' Export';
      }
      const options = {
        filename: 'activity-logs',
        title,
        includeTimestamp: true
      };

      switch (format) {
        case 'pdf':
          await ExportUtils.exportToPDF(exportData, exportColumns, options);
          break;
        case 'csv':
          ExportUtils.exportToCSV(exportData, exportColumns, options);
          break;
        case 'excel':
          ExportUtils.exportToExcel(exportData, exportColumns, options);
          break;
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
      // Optionally show user feedback here
    } finally {
      setShowExportPreview(false);
    }
  };

  // Confirm export to PDF after preview
  const handleConfirmExportPDF = () => handleExport('pdf');



  const getUserTypeColor = (userType: ActivityLog['user_type']) => {
    switch (userType) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return 'ri-add-circle-line';
    if (action.includes('update')) return 'ri-edit-line';
    if (action.includes('delete')) return 'ri-delete-bin-line';
    if (action.includes('login')) return 'ri-login-circle-line';
    if (action.includes('logout')) return 'ri-logout-circle-line';
    if (action.includes('alert')) return 'ri-notification-3-line';
    if (action.includes('incident')) return 'ri-error-warning-line';
    return 'ri-information-line';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">Monitor system activities and user actions</p>
        </div>
        <div className="flex items-center space-x-3">
             <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-refresh-line mr-2"></i>
            Refresh
          </button>
          <button
            onClick={() => setShowExportPreview(true)}
            disabled={totalLogs === 0}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              totalLogs === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title={totalLogs === 0 ? 'No data to export' : 'Export all activity logs with current filters'}
          >
            <i className="ri-download-line mr-2"></i>
            Export All ({totalLogs})
          </button>
       
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <i className="ri-error-warning-line text-red-400 mr-3 mt-0.5"></i>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-history-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Activities</p>
              <p className="text-xl font-bold text-gray-900">{totalLogs}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-admin-line text-red-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Admin Actions</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.userTypeDistribution.find(s => s.user_type === 'admin')?.count || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-team-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Staff Actions</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.userTypeDistribution.find(s => s.user_type === 'staff')?.count || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">User Actions</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.userTypeDistribution.find(s => s.user_type === 'user')?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
        <div className="relative">
  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
  <input
    type="text"
    placeholder="Search activities..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>

<div className="relative">
  <i className="ri-time-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
  <select
    value={timeFilter}
    onChange={(e) => setTimeFilter(e.target.value)}
    className="pl-10 pr-4 py-2 w-48 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="all">All Time</option>
    <option value="today">Today</option>
    <option value="week">Last Week</option>
    <option value="month">Last Month</option>
  </select>
</div>

        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {logs.length} of {totalLogs} activities
        </div>
      </div>

      {/* Activity Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <i className={`${getActionIcon(log.action)} text-gray-600`}></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUserTypeColor(log.user_type)}`}>
                        {log.user_type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{log.user_name}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{log.details}</p>
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                      <span>
                        <i className="ri-time-line mr-1"></i>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      {log.ip_address && (
                        <span>
                          <i className="ri-computer-line mr-1"></i>
                          {log.ip_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({totalLogs} total activities)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <i className="ri-history-line text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more results.</p>
        </div>
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showExportPreview}
        onClose={() => setShowExportPreview(false)}
        onExportPDF={async () => {
          try {
            const allLogs = await fetchAllActivityLogs();
            ExportUtils.exportToPDF(allLogs, exportColumns, {
              filename: "activity_logs_export",
              title: "Activity Logs Report",
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allLogs.length} activity logs exported to PDF successfully` });
            setShowExportPreview(false);
          } catch (error) {
            console.error('PDF export failed:', error);
            showToast({ type: "error", message: "Failed to export activity logs to PDF" });
          }
        }}
        onExportCSV={async () => {
          try {
            const allLogs = await fetchAllActivityLogs();
            ExportUtils.exportToCSV(allLogs, exportColumns, {
              filename: "activity_logs_export",
              title: "Activity Logs Report",
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allLogs.length} activity logs exported to CSV successfully` });
            setShowExportPreview(false);
          } catch (error) {
            console.error('CSV export failed:', error);
            showToast({ type: "error", message: "Failed to export activity logs to CSV" });
          }
        }}
        onExportExcel={async () => {
          try {
            const allLogs = await fetchAllActivityLogs();
            ExportUtils.exportToExcel(allLogs, exportColumns, {
              filename: "activity_logs_export",
              title: "Activity Logs Report",
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allLogs.length} activity logs exported to Excel successfully` });
            setShowExportPreview(false);
          } catch (error) {
            console.error('Excel export failed:', error);
            showToast({ type: "error", message: "Failed to export activity logs to Excel" });
          }
        }}
        data={logs}
        columns={exportColumns.map((col) => ({ key: col.key, label: col.label }))}
        title={`Activity Logs Report (${totalLogs})`}
      />

    </div>
  );
};

export default ActivityLogs;
