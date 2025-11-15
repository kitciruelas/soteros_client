"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { apiRequest } from "../../../../utils/api"
import ExportPreviewModal from '../../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../../utils/exportUtils';
import ExportUtils from '../../../../utils/exportUtils';
import { useToast } from '../../../../components/base/Toast';

interface WelfareSettings {
  id?: number
  isActive: boolean
  title: string
  description: string
  messageWhenDisabled: string
  createdAt?: string
  updatedAt?: string
}

interface WelfareReport {
  report_id?: number | null;
  user_id: number;
  setting_id?: number | null;
  status?: 'safe' | 'needs_help' | null;
  additional_info?: string | null;
  submitted_at?: string | null;
  created_at?: string;
  user_name?: string;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

const exportReportColumns: ExportColumn[] = [
  { 
    key: 'first_name', 
    label: 'Name',
    format: (_: string, row: any) => {
      const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
      return fullName || row.user_name || 'N/A';
    }
  },
  { 
    key: 'email', 
    label: 'Email',
    format: (value: string, row: any) => value || row.user_email || 'N/A'
  },
  { 
    key: 'phone', 
    label: 'Phone',
    format: (value: string, row: any) => value || 'N/A'
  },
  { 
    key: 'address', 
    label: 'Address',
    format: (_: string, row: any) => {
      const addressParts = [];
      if (row.address) addressParts.push(row.address);
      if (row.city) addressParts.push(row.city);
      if (row.state) addressParts.push(row.state);
      if (row.zip_code) addressParts.push(row.zip_code);
      return addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
    }
  },
  { 
    key: 'status', 
    label: 'Status',
    format: (value: string, row: any) => {
      if (!value || !row.report_id) return 'No Report';
      return value === 'safe' ? 'Safe' : 'Needs Help';
    }
  },
  { 
    key: 'additional_info', 
    label: 'Additional Info',
    format: (value: string, row: any) => value || (row.report_id ? 'N/A' : '')
  },
  {
    key: 'submitted_at',
    label: 'Submitted At',
    format: (value: string, row: any) => {
      if (!value || !row.report_id) return 'N/A';
      return new Date(value).toLocaleString();
    }
  }
];

export default function WelfareReportsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<WelfareReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [selectedSettingForReports, setSelectedSettingForReports] = useState<WelfareSettings | null>(null)
  const [allSettings, setAllSettings] = useState<WelfareSettings[]>([])
  const [showReportsExportPreview, setShowReportsExportPreview] = useState(false)
  const [selectedSettingId, setSelectedSettingId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAllSettings = useCallback(async () => {
    try {
      const response = await apiRequest('/admin/welfare/settings?limit=1000')
      if (response.success) {
        const settingsArray = Array.isArray(response.settings) ? response.settings : (response.settings ? [response.settings] : [])
        setAllSettings(settingsArray)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }, [])

  const fetchReports = useCallback(async (settingId?: number, status?: string) => {
    try {
      setReportsLoading(true)
      console.log('Fetching welfare reports for setting ID:', settingId, 'status:', status)
      
      const params = new URLSearchParams()
      if (settingId) params.append('setting_id', settingId.toString())
      if (status && status !== '') params.append('status', status)
      
      const url = params.toString() ? `/admin/welfare/reports?${params.toString()}` : '/admin/welfare/reports'
      const response = await apiRequest(url)
      console.log('Welfare reports response:', response)
      
      if (response.success) {
        const reportsData = response.reports || []
        console.log('Loaded reports (all general_users):', reportsData.length)
        setReports(reportsData)
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error)
      showToast({ type: 'error', message: error.message || 'Failed to load welfare reports' })
    } finally {
      setReportsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAllSettings()
  }, [fetchAllSettings])

  useEffect(() => {
    if (allSettings.length > 0) {
      const settingId = searchParams.get('setting_id');
      const status = searchParams.get('status') || '';
      
      setSelectedSettingId(settingId || '');
      setSelectedStatus(status);
      
      const parsedSettingId = settingId ? parseInt(settingId) : undefined;
      fetchReports(parsedSettingId, status || undefined);
      
      if (settingId) {
        const setting = allSettings.find(s => s.id === parseInt(settingId));
        setSelectedSettingForReports(setting || null);
      } else {
        setSelectedSettingForReports(null);
      }
    }
  }, [allSettings.length, searchParams, fetchReports])

  const fetchAllReports = async () => {
    try {
      console.log('🔍 Fetching all welfare reports');

      const params = new URLSearchParams()
      if (selectedSettingId) params.append('setting_id', selectedSettingId)
      if (selectedStatus && selectedStatus !== '') params.append('status', selectedStatus)

      const url = params.toString() ? `/admin/welfare/reports?${params.toString()}` : '/admin/welfare/reports'
      const response = await apiRequest(url);

      if (response.success) {
        console.log('✅ Successfully fetched', response.reports?.length || 0, 'reports for export');
        return response.reports || [];
      } else {
        const errorMsg = response.message || 'Failed to fetch all welfare reports';
        console.error('❌ API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error fetching all welfare reports:', error);
      throw error;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString()
  }

  const getReportStatusColor = (status: string | null | undefined, hasReport: boolean) => {
    if (!hasReport || !status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800';
      case 'needs_help': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const getReportStatusIcon = (status: string | null | undefined, hasReport: boolean) => {
    if (!hasReport || !status) return 'ri-time-line';
    switch (status) {
      case 'safe': return 'ri-check-circle-line';
      case 'needs_help': return 'ri-error-warning-line';
      default: return 'ri-question-line';
    }
  }

  const getReportStatusText = (status: string | null | undefined, hasReport: boolean) => {
    if (!hasReport || !status) return 'No Report Submitted';
    return status === 'safe' ? 'Safe' : 'Needs Help';
  }

  const filteredReports = reports.filter(report => {
    const fullName = `${report.first_name || ''} ${report.last_name || ''}`.trim().toLowerCase();
    const email = (report.email || '').toLowerCase();
    const phone = (report.phone || '').toLowerCase();
    const address = [report.address, report.city, report.state, report.zip_code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           phone.includes(searchLower) ||
           address.includes(searchLower);
  });

  const safeCount = reports.filter(r => r.status === 'safe' && r.report_id).length;
  const needsHelpCount = reports.filter(r => r.status === 'needs_help' && r.report_id).length;
  const noReportCount = reports.filter(r => !r.report_id).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welfare Check Reports</h1>
          <p className="text-gray-600 mt-1">View all users and their welfare check submissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/admin/welfare')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Welfare
          </button>
          <button
            onClick={() => setShowReportsExportPreview(true)}
            disabled={filteredReports.length === 0}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              filteredReports.length === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title={filteredReports.length === 0 ? 'No data to export' : 'Export reports'}
          >
            <i className="ri-download-line mr-2"></i>
            Export Report ({filteredReports.length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-check-circle-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Safe Reports</p>
              <p className="text-xl font-bold text-gray-900">{safeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border-2 border-red-300 p-4 relative">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-error-warning-line text-red-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Needs Help</p>
              <p className="text-xl font-bold text-red-600">{needsHelpCount}</p>
            </div>
          </div>
          {needsHelpCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">{needsHelpCount}</span>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-time-line text-gray-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">No Report</p>
              <p className="text-xl font-bold text-gray-900">{noReportCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={selectedSettingId}
              onChange={(e) => {
                const settingId = e.target.value
                setSelectedSettingId(settingId)
                const parsedId = settingId ? parseInt(settingId) : undefined
                
                // Update URL params
                const params = new URLSearchParams()
                if (settingId) params.append('setting_id', settingId)
                if (selectedStatus && selectedStatus !== '') params.append('status', selectedStatus)
                
                const url = params.toString() ? `/admin/welfare/reports?${params.toString()}` : '/admin/welfare/reports'
                navigate(url, { replace: true })
                fetchReports(parsedId, selectedStatus || undefined)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Settings</option>
              {allSettings.map((setting) => (
                <option key={setting.id} value={setting.id}>
                  {setting.title}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                const status = e.target.value
                setSelectedStatus(status)
                
                // Update URL params
                const params = new URLSearchParams()
                if (selectedSettingId) params.append('setting_id', selectedSettingId)
                if (status && status !== '') params.append('status', status)
                
                const url = params.toString() ? `/admin/welfare/reports?${params.toString()}` : '/admin/welfare/reports'
                navigate(url, { replace: true })
                
                const parsedSettingId = selectedSettingId ? parseInt(selectedSettingId) : undefined
                fetchReports(parsedSettingId, status || undefined)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="safe">Safe</option>
              <option value="needs_help">Needs Help</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredReports.length} of {reports.length} users
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {reportsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
              <i className="ri-inbox-line text-4xl text-gray-400"></i>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || selectedStatus !== '' || selectedSettingId !== ''
                ? "No users match your current search and filter criteria. Try adjusting your search or filters."
                : "No users have been registered yet."}
            </p>
            {(searchTerm || selectedStatus !== '' || selectedSettingId !== '') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('');
                  setSelectedSettingId('');
                  const url = '/admin/welfare/reports';
                  navigate(url, { replace: true });
                  fetchReports(undefined, undefined);
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <i className="ri-refresh-line mr-2"></i>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReports.map((report, index) => {
              const hasReport = !!report.report_id;
              const isNeedsHelp = report.status === 'needs_help' && hasReport;
              return (
                <div 
                  key={report.user_id || report.report_id || index} 
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    isNeedsHelp ? 'bg-red-50 border-l-4 border-red-500' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className={`text-lg font-medium ${isNeedsHelp ? 'text-red-900 font-semibold' : 'text-gray-900'}`}>
                          {report.first_name || ''} {report.last_name || ''}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReportStatusColor(report.status, hasReport)}`}>
                          <i className={`mr-1 ${getReportStatusIcon(report.status, hasReport)}`}></i>
                          {getReportStatusText(report.status, hasReport)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                        <span>
                          <i className="ri-mail-line mr-1"></i>
                          {report.email || 'N/A'}
                        </span>
                        {report.phone && (
                          <span>
                            <i className="ri-phone-line mr-1"></i>
                            {report.phone}
                          </span>
                        )}
                        {hasReport && report.submitted_at && (
                          <span>
                            <i className="ri-time-line mr-1"></i>
                            {formatDate(report.submitted_at)}
                          </span>
                        )}
                      </div>
                      {(report.address || report.city || report.state || report.zip_code) && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Address:</p>
                          <p className="text-sm text-gray-600">
                            <i className="ri-map-pin-line mr-1"></i>
                            {[report.address, report.city, report.state, report.zip_code]
                              .filter(Boolean)
                              .join(', ') || 'N/A'}
                          </p>
                        </div>
                      )}
                      {hasReport && report.additional_info && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Additional Info:</p>
                          <p className="text-sm text-gray-600">{report.additional_info}</p>
                        </div>
                      )}
                      {!hasReport && (
                        <div className="flex items-center text-sm text-gray-400 mt-2">
                          <i className="ri-information-line mr-1"></i>
                          No welfare report submitted yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Preview Modal for Reports */}
      <ExportPreviewModal
        open={showReportsExportPreview}
        onClose={() => setShowReportsExportPreview(false)}
        onExportPDF={async () => {
          try {
            const allReports = await fetchAllReports();
            ExportUtils.exportToPDF(allReports, exportReportColumns, {
              filename: "welfare_reports_export",
              title: `Welfare Reports${selectedSettingForReports ? ` - ${selectedSettingForReports.title}` : ''}`,
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allReports.length} welfare reports exported to PDF successfully` });
            setShowReportsExportPreview(false);
          } catch (error) {
            console.error('PDF export failed:', error);
            showToast({ type: "error", message: "Failed to export welfare reports to PDF" });
          }
        }}
        onExportCSV={async () => {
          try {
            const allReports = await fetchAllReports();
            ExportUtils.exportToCSV(allReports, exportReportColumns, {
              filename: "welfare_reports_export",
              title: `Welfare Reports${selectedSettingForReports ? ` - ${selectedSettingForReports.title}` : ''}`,
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allReports.length} welfare reports exported to CSV successfully` });
            setShowReportsExportPreview(false);
          } catch (error) {
            console.error('CSV export failed:', error);
            showToast({ type: "error", message: "Failed to export welfare reports to CSV" });
          }
        }}
        onExportExcel={async () => {
          try {
            const allReports = await fetchAllReports();
            ExportUtils.exportToExcel(allReports, exportReportColumns, {
              filename: "welfare_reports_export",
              title: `Welfare Reports${selectedSettingForReports ? ` - ${selectedSettingForReports.title}` : ''}`,
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allReports.length} welfare reports exported to Excel successfully` });
            setShowReportsExportPreview(false);
          } catch (error) {
            console.error('Excel export failed:', error);
            showToast({ type: "error", message: "Failed to export welfare reports to Excel" });
          }
        }}
        data={filteredReports}
        columns={exportReportColumns.map((col) => ({ key: col.key, label: col.label }))}
        title={`Welfare Reports${selectedSettingForReports ? ` - ${selectedSettingForReports.title}` : ''} (${filteredReports.length})`}
      />
    </div>
  )
}
