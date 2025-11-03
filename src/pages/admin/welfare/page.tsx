"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { apiRequest } from "../../../utils/api"
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import { ConfirmModal } from '../../../components/base/Modal';
import type { ExportColumn } from '../../../utils/exportUtils';
import ExportUtils from '../../../utils/exportUtils';
import { useToast } from '../../../components/base/Toast';

interface WelfareSettings {
  id?: number
  isActive: boolean
  title: string
  description: string
  messageWhenDisabled: string
  createdAt?: string
  updatedAt?: string
}

interface WelfareStats {
  totalSettings: number;
  activeSettings: number;
  totalReports: number;
  safeReports: number;
  needsHelpReports: number;
  uniqueUsers: number;
}

// Export columns configuration
const exportColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { 
    key: 'isActive', 
    label: 'Status',
    format: (value: boolean) => value ? 'Active' : 'Inactive'
  },
  { key: 'messageWhenDisabled', label: 'Disabled Message' },
  {
    key: 'createdAt',
    label: 'Created At',
    format: (value: string) => value ? new Date(value).toLocaleString() : 'N/A'
  },
  {
    key: 'updatedAt',
    label: 'Updated At',
    format: (value: string) => value ? new Date(value).toLocaleString() : 'N/A'
  }
];

export default function AdminWelfareManagement() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<WelfareSettings[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingSettings, setEditingSettings] = useState<WelfareSettings | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<WelfareSettings | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stats, setStats] = useState<WelfareStats | null>(null)
  const [showExportPreview, setShowExportPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSettings, setTotalSettings] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showActivateConfirm, setShowActivateConfirm] = useState(false)
  const [settingToActivate, setSettingToActivate] = useState<WelfareSettings | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchStats()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Fetching welfare settings...')
      
      const params: any = {
        page: currentPage,
        limit: 20,
        search: searchTerm.trim()
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await apiRequest(`/admin/welfare/settings?${new URLSearchParams(params).toString()}`)
      console.log('Welfare settings response:', response)
      
      if (response.success) {
        // Handle both array and single object responses
        const settingsArray = Array.isArray(response.settings) ? response.settings : (response.settings ? [response.settings] : [])
        console.log('Loaded settings:', settingsArray)
        console.log('Settings count:', settingsArray.length)
        setSettings(settingsArray)
        setTotalSettings(settingsArray.length)
        setTotalPages(response.pagination?.totalPages || 1)
      } else {
        const errorMsg = response.message || 'Failed to load welfare settings'
        console.error('❌ API returned error:', errorMsg)
        setError(errorMsg)
      }
    } catch (error: any) {
      console.error('❌ Error fetching settings:', error)
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to fetch welfare settings. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check if the backend is running.';
        } else if (error.message.includes('Table not found')) {
          errorMessage = 'Welfare settings table not found. Please contact an administrator to set up the system.';
        } else if (error.message.includes('Database')) {
          errorMessage = 'Database connection error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiRequest('/admin/welfare/stats')
      
      if (response.success) {
        setStats(response.stats)
      }
    } catch (error) {
      console.error('Error fetching welfare stats:', error)
    }
  }

  const fetchAllSettings = async () => {
    try {
      const params: any = {
        limit: 1000000, // Very high limit to get all settings
        search: searchTerm.trim()
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      console.log('🔍 Fetching all welfare settings with params:', params);

      const response = await apiRequest(`/admin/welfare/settings?${new URLSearchParams(params).toString()}`);

      if (response.success) {
        const settingsArray = Array.isArray(response.settings) ? response.settings : (response.settings ? [response.settings] : [])
        console.log('✅ Successfully fetched', settingsArray.length, 'settings for export');
        return settingsArray;
      } else {
        const errorMsg = response.message || 'Failed to fetch all welfare settings';
        console.error('❌ API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error fetching all welfare settings:', error);
      throw error;
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchSettings();
    fetchStats();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  const handleAddSettings = () => {
    setEditingSettings({
      isActive: false,
      title: '',
      description: '',
      messageWhenDisabled: ''
    })
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  const handleEditSettings = (setting: WelfareSettings) => {
    if (!setting.id) {
      setMessage({ type: 'error', text: 'Cannot edit setting without ID. Please create a new setting instead.' })
      return
    }
    setEditingSettings({ ...setting })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const handleDeleteSettings = async (setting: WelfareSettings) => {
    if (!setting.id) {
      setMessage({ type: 'error', text: 'Cannot delete setting without ID' })
      return
    }

    try {
      setIsDeleting(true)
      console.log('Deleting welfare settings with ID:', setting.id)
      const response = await apiRequest('/admin/welfare/settings', {
        method: 'DELETE',
        body: JSON.stringify({ id: setting.id })
      })
      console.log('Delete settings response:', response)
      
      if (response.success) {
        showToast({ type: 'success', message: 'Welfare settings deleted successfully' })
        await fetchSettings()
        await fetchStats()
        setShowDeleteConfirm(false)
        setSelectedSetting(null)
      } else {
        showToast({ type: 'error', message: response.message || 'Failed to delete settings' })
      }
    } catch (error: any) {
      console.error('Error deleting settings:', error)
      showToast({ type: 'error', message: error.message || 'Failed to delete settings. Please check if the backend server is running.' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (setting: WelfareSettings) => {
    if (!setting.id) {
      setMessage({ type: 'error', text: 'Cannot toggle setting without ID' })
      return
    }

    // If trying to activate a setting, show confirmation first
    if (!setting.isActive) {
      const activeSettings = settings.filter(s => s.isActive && s.id !== setting.id)
      if (activeSettings.length > 0) {
        setSettingToActivate(setting)
        setShowActivateConfirm(true)
        return
      }
    }

    // Proceed with toggle
    await performToggle(setting)
  }

  const performToggle = async (setting: WelfareSettings) => {
    try {
      setIsSaving(true)
      const updatedSetting = {
        ...setting,
        isActive: !setting.isActive
      }
      console.log('Toggling active status for setting:', setting.id)
      console.log('Current setting:', setting)
      console.log('Updated setting:', updatedSetting)
      
      const response = await apiRequest('/admin/welfare/settings', {
        method: 'PUT',
        body: JSON.stringify(updatedSetting)
      })
      console.log('Toggle response:', response)
      
      if (response.success) {
        showToast({ type: 'success', message: `Setting ${!setting.isActive ? 'activated' : 'deactivated'} successfully` })
        await fetchSettings()
        await fetchStats()
      } else {
        showToast({ type: 'error', message: response.message || 'Failed to toggle setting status' })
      }
    } catch (error: any) {
      console.error('Error toggling setting:', error)
      showToast({ type: 'error', message: error.message || 'Failed to toggle setting status. Please check if the backend server is running.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmActivate = async () => {
    if (settingToActivate) {
      await performToggle(settingToActivate)
      setShowActivateConfirm(false)
      setSettingToActivate(null)
    }
  }

  const handleSaveSettings = async () => {
    if (!editingSettings) return

    // Validate that we have an ID for edit mode
    if (isEditMode && !editingSettings.id) {
      setMessage({ type: 'error', text: 'Cannot update setting without ID. Please create a new setting instead.' })
      return
    }

    try {
      setIsSaving(true)
      console.log(`${isEditMode ? 'Updating' : 'Creating'} welfare settings...`, editingSettings)
      console.log('Editing settings ID:', editingSettings.id)
      console.log('Is edit mode:', isEditMode)
      
      // Prepare the request body based on the mode
      let requestBody
      if (isEditMode) {
        // For PUT requests, include the ID
        requestBody = {
          id: editingSettings.id,
          isActive: editingSettings.isActive,
          title: editingSettings.title,
          description: editingSettings.description,
          messageWhenDisabled: editingSettings.messageWhenDisabled
        }
      } else {
        // For POST requests, exclude the ID
        requestBody = {
          isActive: editingSettings.isActive,
          title: editingSettings.title,
          description: editingSettings.description,
          messageWhenDisabled: editingSettings.messageWhenDisabled
        }
      }
      
      console.log('Request body:', requestBody)
      
      const response = await apiRequest('/admin/welfare/settings', {
        method: isEditMode ? 'PUT' : 'POST',
        body: JSON.stringify(requestBody)
      })
      console.log('Save settings response:', response)

      if (response.success) {
        showToast({ type: 'success', message: `Welfare settings ${isEditMode ? 'updated' : 'created'} successfully` })
        await fetchSettings()
        await fetchStats()
        setIsModalOpen(false)
        setEditingSettings(null)
      } else {
        showToast({ type: 'error', message: response.message || `Failed to ${isEditMode ? 'update' : 'create'} settings` })
      }
    } catch (error: any) {
      console.error('Error saving settings:', error)
      showToast({ type: 'error', message: error.message || `Failed to ${isEditMode ? 'update' : 'create'} settings. Please check if the backend server is running.` })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (editingSettings) {
      setEditingSettings(prev => {
        if (!prev) return null
        return {
      ...prev,
          [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }
      })
    } else {
      setSettings(prev => {
        if (Array.isArray(prev)) {
          return prev.map(setting => ({
            ...setting,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
        }
        return prev
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActiveStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getActiveStatusIcon = (isActive: boolean) => {
    return isActive ? 'ri-check-circle-line' : 'ri-close-circle-line'
  }

  // Filter settings based on search and filters
  const filteredSettings = settings.filter(setting => {
    const matchesSearch = searchTerm === '' || 
      setting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && setting.isActive) ||
      (statusFilter === 'disabled' && !setting.isActive)

    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welfare Check Management</h1>
          <p className="text-gray-600 mt-1">Manage welfare check system settings</p>
        </div>
        <div className="flex items-center space-x-3">
       
        
          <button
            onClick={handleAddSettings}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              isSaving
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title="Add new welfare settings"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <i className="ri-add-line mr-2"></i>
                Add Welfare
              </>
            )}
          </button>
          <button
            onClick={() => setShowExportPreview(true)}
            disabled={totalSettings === 0}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              totalSettings === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title={totalSettings === 0 ? 'No data to export' : 'Export all welfare settings with current filters'}
          >
            <i className="ri-download-line mr-2"></i>
            Export All ({totalSettings})
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
              <i className="ri-settings-3-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Settings</p>
              <p className="text-xl font-bold text-gray-900">{totalSettings}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-check-circle-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Settings</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.activeSettings || settings.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div 
          onClick={() => navigate('/admin/welfare/reports')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-purple-300 transition-colors"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-file-list-3-line text-purple-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.totalReports || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-line text-orange-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.uniqueUsers || 0}
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
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <i className="ri-filter-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 w-48 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredSettings.length} of {totalSettings} settings
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <i className={`mr-2 ${message.type === 'success' ? 'ri-check-circle-line' : 'ri-error-warning-line'}`}></i>
            {message.text}
          </div>
        </div>
      )}

      {/* Settings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {filteredSettings.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-settings-line text-4xl text-gray-300"></i>
              <p className="text-gray-500 mt-2">No welfare settings found</p>
              <button
                onClick={handleAddSettings}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="ri-add-line mr-2"></i>
                Add First Setting
              </button>
            </div>
          ) : (
            filteredSettings.map((setting) => (
              <div key={setting.id || 'default'} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {setting.title}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActiveStatusColor(setting.isActive)}`}>
                        <i className={`${getActiveStatusIcon(setting.isActive)} mr-1`}></i>
                        {setting.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {setting.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <i className="ri-star-fill mr-1"></i>
                          Currently Active
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{setting.description || 'No description provided'}</p>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>
                        <i className="ri-calendar-line mr-1"></i>
                        Created: {setting.createdAt ? formatDate(setting.createdAt) : 'Unknown'}
                      </span>
                      {setting.updatedAt && (
                        <span>
                          <i className="ri-time-line mr-1"></i>
                          Updated: {formatDate(setting.updatedAt)}
                        </span>
                      )}
                      {!setting.isActive && (
                        <span className="text-red-600">
                          <i className="ri-error-warning-line mr-1"></i>
                          Message: {setting.messageWhenDisabled}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {setting.id && (
                      <button
                        onClick={() => handleToggleActive(setting)}
                        disabled={isSaving}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          isSaving
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : setting.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        title={setting.isActive ? 'Deactivate this setting' : 'Activate this setting'}
                      >
                        <i className={`mr-1 ${setting.isActive ? 'ri-pause-line' : 'ri-play-line'}`}></i>
                        {setting.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/admin/welfare/reports?setting_id=${setting.id}`)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <i className="ri-eye-line mr-1"></i>
                      View Reports
                    </button>
                    <button
                      onClick={() => handleEditSettings(setting)}
                      disabled={!setting.id}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        !setting.id 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                      title={!setting.id ? 'Cannot edit setting without ID' : 'Edit setting'}
                    >
                      <i className="ri-edit-line mr-1"></i>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSetting(setting);
                        setShowDeleteConfirm(true);
                      }}
                      className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <i className="ri-delete-bin-line mr-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({totalSettings} total settings)
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

      {filteredSettings.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <i className="ri-settings-3-line text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No settings found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more results.</p>
        </div>
      )}

      {/* Settings Modal */}
      {isModalOpen && editingSettings && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditMode ? 'Edit Welfare' : 'Add Welfare'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingSettings(null)
                    setIsEditMode(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
                  </div>
            <div className="p-6">

              <div className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                    value={editingSettings.title}
                      onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Welfare title"
                    />
                  </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                    value={editingSettings.description}
                      onChange={handleInputChange}
                      rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Welfare description"
                    />
                  </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editingSettings.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Enable welfare check system
                  </label>
                </div>

                {!editingSettings.isActive && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message when disabled
                    </label>
                    <textarea
                      name="messageWhenDisabled"
                      value={editingSettings.messageWhenDisabled}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter message to show when system is disabled"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingSettings(null)
                  setIsEditMode(false)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isSaving
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Update Welfare' : 'Create Welfare'
                )}
              </button>
                    </div>
                  </div>
                </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { if (!isDeleting) { setShowDeleteConfirm(false); setSelectedSetting(null); } }}
        onConfirm={() => selectedSetting && handleDeleteSettings(selectedSetting)}
        title="Delete Welfare Settings"
        message={`Are you sure you want to delete the welfare check  for "${selectedSetting?.title}"? This action cannot be undone.`}
        confirmText="Delete Settings"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
        isLoading={isDeleting}
      />

      {/* Activate Confirmation Modal */}
      <ConfirmModal
        isOpen={showActivateConfirm}
        onClose={() => { setShowActivateConfirm(false); setSettingToActivate(null); }}
        onConfirm={handleConfirmActivate}
        title="Activate Welfare Setting"
        message={`Activating "${settingToActivate?.title}" will automatically deactivate the currently active welfare setting. Are you sure you want to continue?`}
        confirmText="Activate Setting"
        cancelText="Cancel"
        confirmVariant="primary"
        icon="ri-play-line"
        iconColor="text-blue-600"
        isLoading={isSaving}
      />

      {/* Export Preview Modal for Settings */}
      <ExportPreviewModal
        open={showExportPreview}
        onClose={() => setShowExportPreview(false)}
        onExportPDF={async () => {
          try {
            const allSettings = await fetchAllSettings();
            ExportUtils.exportToPDF(allSettings, exportColumns, {
              filename: "welfare_settings_export",
              title: "Welfare Settings Report",
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allSettings.length} welfare settings exported to PDF successfully` });
            setShowExportPreview(false);
          } catch (error) {
            console.error('PDF export failed:', error);
            showToast({ type: "error", message: "Failed to export welfare settings to PDF" });
          }
        }}
        onExportCSV={async () => {
          try {
            const allSettings = await fetchAllSettings();
            ExportUtils.exportToCSV(allSettings, exportColumns, {
              filename: "welfare_settings_export",
              title: "Welfare Settings Report",
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allSettings.length} welfare settings exported to CSV successfully` });
            setShowExportPreview(false);
          } catch (error) {
            console.error('CSV export failed:', error);
            showToast({ type: "error", message: "Failed to export welfare settings to CSV" });
          }
        }}
        onExportExcel={async () => {
          try {
            const allSettings = await fetchAllSettings();
            ExportUtils.exportToExcel(allSettings, exportColumns, {
              filename: "welfare_settings_export",
              title: "Welfare Settings Report",
              includeTimestamp: true,
            });
            showToast({ type: "success", message: `All ${allSettings.length} welfare settings exported to Excel successfully` });
            setShowExportPreview(false);
          } catch (error) {
            console.error('Excel export failed:', error);
            showToast({ type: "error", message: "Failed to export welfare settings to Excel" });
          }
        }}
        data={settings}
        columns={exportColumns.map((col) => ({ key: col.key, label: col.label }))}
        title={`Welfare Settings Report (${totalSettings})`}
      />

    </div>
  )
}