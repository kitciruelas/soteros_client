import React, { useState, useEffect, useRef } from 'react';
import { userManagementApi } from '../../../utils/api';
import Modal, { ConfirmModal } from '../../../components/base/Modal';
import { useToast } from '../../../components/base/Toast';
import ExportButton from '../../../components/base/ExportButton';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import ExportUtils, { type ExportColumn } from '../../../utils/exportUtils';
import { getAuthState } from '../../../utils/auth';

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  user_type: 'CITIZEN';
  profile_picture: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: {
    users: User[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
  error?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [allUsersForExport, setAllUsersForExport] = useState<User[]>([]);
  const [showExportPreview, setShowExportPreview] = useState(false);

  // Define export columns
  const exportColumns: ExportColumn[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'user_type', label: 'User Type', format: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'address',
      label: 'Address',
      format: (value: any, row: any) => {
        const parts = [];
        if (value) parts.push(value);
        if (row.city) parts.push(row.city);
        if (row.state) parts.push(row.state);
        return parts.join(', ') || '';
      }
    },
  ];

  useEffect(() => {
    fetchUsers();
    fetchAllUsersForExportData();
  }, [statusFilter, userTypeFilter]);

  // Fetch all users for export
  const fetchAllUsersForExportData = async () => {
    try {
      const allUsers = await fetchAllUsersForExport();
      setAllUsersForExport(allUsers);
    } catch (error) {
      console.error('Error fetching all users for export:', error);
      // Fallback to current users if fetch fails
      setAllUsersForExport(users);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  // Remove filtering in fetchUsers, just set users from API response
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 10,
        status: statusFilter,
        barangay: userTypeFilter // Using barangay param for user_type filter
      };

      const response = await userManagementApi.getUsers(params) as ApiResponse;

      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.total);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users for export (without pagination)
  const fetchAllUsersForExport = async (): Promise<User[]> => {
    try {
      const params = {
        page: 1,
        limit: 1000, // Large limit to get all users
        status: statusFilter,
        barangay: userTypeFilter
      };

      const response = await userManagementApi.getUsers(params) as ApiResponse;

      if (response.success && response.data) {
        return response.data.users;
      } else {
        throw new Error(response.message || 'Failed to fetch users for export');
      }
    } catch (error) {
      console.error('Error fetching users for export:', error);
      throw error;
    }
  };

  const handleStatusChange = async (userId: number, newStatus: number) => {
    // Get previous status before updating
    const previousStatus = users.find(u => u.user_id === userId)?.status;
    
    try {
      setUpdatingStatus(userId);
      
      // Optimistic update - update UI immediately
      setUsers(prev => prev.map(user =>
        user.user_id === userId ? { ...user, status: newStatus } : user
      ));
      setAllUsersForExport(prev => prev.map(user =>
        user.user_id === userId ? { ...user, status: newStatus } : user
      ));
      
      // Update selectedUser in modal if it's the same user
      if (selectedUser && selectedUser.user_id === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }

      // Get current admin id from auth state
      const authState = getAuthState();
      const adminId = authState.userData?.admin_id;

      await userManagementApi.updateUserStatus(userId, newStatus, adminId);

      showToast({ type: 'success', message: 'User status updated' });
    } catch (error) {
      console.error('Error updating user status:', error);
      
      // Revert optimistic update on error
      if (previousStatus !== undefined) {
        setUsers(prev => prev.map(user =>
          user.user_id === userId ? { ...user, status: previousStatus } : user
        ));
        setAllUsersForExport(prev => prev.map(user =>
          user.user_id === userId ? { ...user, status: previousStatus } : user
        ));
        
        // Revert selectedUser in modal if it's the same user
        if (selectedUser && selectedUser.user_id === userId) {
          setSelectedUser({ ...selectedUser, status: previousStatus });
        }
      }
      
      setError('Failed to update user status');
      showToast({ type: 'error', message: 'Failed to update user status' });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const requestDeleteUser = (userId: number) => {
    setUserIdToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (userIdToDelete == null) return;
    try {
      setDeleting(true);
      await userManagementApi.deleteUser(userIdToDelete);
      
      // Remove from UI lists immediately (backend does soft delete - sets status to 0)
      setUsers(prev => prev.filter(user => user.user_id !== userIdToDelete));
      setAllUsersForExport(prev => prev.filter(user => user.user_id !== userIdToDelete));
      
      // Update total count
      setTotalUsers(prev => Math.max(0, prev - 1));
      
      showToast({ type: 'success', message: 'User deleted successfully' });
      setShowDeleteConfirm(false);
      setUserIdToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
      showToast({ type: 'error', message: 'Failed to delete user' });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportPreview = () => {
    setShowExportPreview(true);
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      // Build dynamic export title based on filters
      let filterTitle = 'Users Data Export';
      const filterParts = [];
      if (searchTerm) filterParts.push(`Search: "${searchTerm}"`);
      if (statusFilter && statusFilter !== 'all') filterParts.push(`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`);
      if (userTypeFilter && userTypeFilter !== 'all') filterParts.push(`Type: ${userTypeFilter.charAt(0).toUpperCase() + userTypeFilter.slice(1)}`);
      if (filterParts.length) filterTitle += ` (${filterParts.join(', ')})`;

      const options = {
        filename: 'users_export',
        title: filterTitle,
        includeTimestamp: true,
        logoUrl: '/images/partners/MDRRMO.png'
      };

      switch (format) {
        case 'pdf':
          await ExportUtils.exportToPDF(allUsersForExport, exportColumns, options);
          break;
        case 'csv':
          ExportUtils.exportToCSV(allUsersForExport, exportColumns, options);
          break;
        case 'excel':
          ExportUtils.exportToExcel(allUsersForExport, exportColumns, options);
          break;
      }

      showToast({ type: 'success', message: 'Users data exported successfully' });
      setShowExportPreview(false);
    } catch (error) {
      console.error('Export error:', error);
      showToast({ type: 'error', message: 'Failed to export users data' });
    }
  };

  const handleExportConfirm = () => handleExport('pdf');

  const handleExportCancel = () => {
    setShowExportPreview(false);
  };

  const getStatusColor = (status: number) => {
    if (status === 1) return 'bg-green-100 text-green-800';
    if (status === 0) return 'bg-gray-100 text-gray-800';
    if (status === -1) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: number) => {
    if (status === 1) return 'Active';
    if (status === 0) return 'Inactive';
    if (status === -1) return 'Suspended';
    return 'Unknown';
  };

  // Filter users from allUsersForExport based on searchTerm and filters
  const filteredUsers = allUsersForExport.filter(user => {
    const lowerSearch = searchTerm.toLowerCase();
    if (searchTerm.trim() === '') return true;
    return (
      user.first_name.toLowerCase().includes(lowerSearch) ||
      user.last_name.toLowerCase().includes(lowerSearch) ||
      user.email.toLowerCase().includes(lowerSearch) ||
      user.name.toLowerCase().includes(lowerSearch)
    );
  });

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage registered users and their access</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPreview}
            disabled={loading || allUsersForExport.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
              <i className="ri-download-line mr-2"></i>
            Export Users ({allUsersForExport.length})
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <i className="ri-error-warning-line text-red-500 mr-2"></i>
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-xl font-bold text-gray-900">{totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-check-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredUsers.filter(u => u.status === 1).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-unfollow-line text-gray-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive Users</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredUsers.filter(u => u.status === 0 || u.status === -1).length}
              </p>
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {totalUsers} users
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile Picture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        {user.profile_picture ? (
                          <img 
                            src={user.profile_picture} 
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <i className="ri-user-line text-blue-600"></i>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">{user.user_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.profile_picture ? 'Uploaded' : 'Not uploaded'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full uppercase ${getStatusColor(user.status)}`}>
                      {getStatusText(user.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <i className="ri-eye-line"></i>
                      </button>
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.user_id, parseInt(e.target.value))}
                        disabled={updatingStatus === user.user_id}
                        className={`text-xs border border-gray-300 rounded px-2 py-1 ${
                          updatingStatus === user.user_id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                      {updatingStatus === user.user_id && (
                        <div className="inline-block ml-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      <button
                        onClick={() => requestDeleteUser(user.user_id)}
                        className="text-red-600 hover:text-red-900 ml-2"
                        title="Delete User"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title=""
          size="lg"
        >
          <div className="max-w-4xl mx-auto">
            {/* Header Section with Profile Picture and Basic Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  {selectedUser.profile_picture ? (
                    <img
                      src={selectedUser.profile_picture}
                      alt="Profile"
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg">
                      <i className="ri-user-line text-3xl sm:text-5xl text-gray-400"></i>
                    </div>
                  )}
                </div>

                {/* User Basic Information */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h2>
                  <p className="text-gray-600 mb-3 break-words">{selectedUser.email}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedUser.status)}`}>
                      <i className="ri-circle-fill text-xs mr-1"></i>
                      {getStatusText(selectedUser.status)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <i className="ri-user-line mr-1"></i>
                      {selectedUser.user_type}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="ri-user-settings-line text-blue-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>
              <div className="space-y-6">
                {/* Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">First Name</label>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.first_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Name</label>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.last_name}</p>
                  </div>
                </div>

                {/* Contact Information Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email Address</label>
                    <p className="text-sm font-medium text-gray-900 break-words">{selectedUser.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone Number</label>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information Card */}
            {(selectedUser.address || selectedUser.city || selectedUser.state || selectedUser.zip_code) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <i className="ri-map-pin-line text-green-600"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.address && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Street Address</label>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.address}</p>
                    </div>
                  )}
                  {selectedUser.city && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">City</label>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.city}</p>
                    </div>
                  )}
                  {selectedUser.state && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">State/Province</label>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.state}</p>
                    </div>
                  )}
                  {selectedUser.zip_code && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ZIP Code</label>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.zip_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showExportPreview}
        onClose={handleExportCancel}
        onExportPDF={() => handleExport('pdf')}
        onExportCSV={() => handleExport('csv')}
        onExportExcel={() => handleExport('excel')}
        data={allUsersForExport}
        columns={exportColumns}
        title={(() => {
          let filterTitle = 'Users Data Export';
          const filterParts = [];
          if (searchTerm) filterParts.push(`Search: "${searchTerm}"`);
          if (statusFilter && statusFilter !== 'all') filterParts.push(`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`);
          if (userTypeFilter && userTypeFilter !== 'all') filterParts.push(`Type: ${userTypeFilter.charAt(0).toUpperCase() + userTypeFilter.slice(1)}`);
          if (filterParts.length) filterTitle += ` (${filterParts.join(', ')})`;
          return filterTitle;
        })()}
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { 
          if (!deleting) {
            setShowDeleteConfirm(false); 
            setUserIdToDelete(null);
          }
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
        isLoading={deleting}
      />
    </div>
  );
};

export default UserManagement;
