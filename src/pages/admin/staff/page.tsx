import React, { useState, useEffect } from 'react';
import ExportUtils from '../../../utils/exportUtils';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../utils/exportUtils';
import { useToast } from '../../../components/base/Toast';
import PhoneInput, { formatPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { apiRequest } from '../../../utils/api';

// Philippine mobile number validation function
const validatePhilippineMobile = (value: string): boolean => {
  if (!value) return false;

  // Handle E.164 format from PhoneInput (+639XXXXXXXXX)
  if (value.startsWith('+63')) {
    const cleanNumber = value.replace(/\D/g, '');
    return /^639\d{9}$/.test(cleanNumber); // 639 followed by 9 digits
  }

  // Handle local format (09XXXXXXXXX)
  if (value.startsWith('09')) {
    const cleanNumber = value.replace(/\D/g, '');
    return /^09\d{9}$/.test(cleanNumber); // 09 followed by 9 digits
  }

  // Handle international format without + (639XXXXXXXXX)
  const cleanNumber = value.replace(/\D/g, '');
  if (cleanNumber.startsWith('639') && cleanNumber.length === 12) {
    return /^639\d{9}$/.test(cleanNumber);
  }

  // Handle local format without spaces/dashes
  if (cleanNumber.startsWith('9') && cleanNumber.length === 10) {
    return /^9\d{9}$/.test(cleanNumber);
  }

  return false;
};

interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: 'active' | 'inactive';
  availability: 'available' | 'busy' | 'off-duty';
  last_login: string | null;
  created_at: string;
  updated_at: string;
  team_id?: number;
  team_name?: string;
  team_member_no?: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
  member_count?: number;
}

// Department to Team mapping
const departmentTeamMapping: { [key: string]: number[] } = {
  'MDRRMO': [1], // MDRRMO Team
  'PNP': [3], // PNP Team
  'BFP': [2], // BFP Team
  'RHU I': [4], // RHU I Team
  'MSWDO': [5], // MSWDO Team
  'PRC': [6], // PRC Team
};

// Department to Availability mapping
const departmentAvailabilityMapping: { [key: string]: string } = {
  'MDRRMO': 'available', // Always ready for MDRRMO operations
  'PNP': 'available', // Always ready for PNP operations
  'BFP': 'available', // Always ready for BFP operations
  'RHU I': 'available', // Always ready for RHU I operations
  'MSWDO': 'available', // Always ready for MSWDO operations
  'PRC': 'available', // Always ready for PRC operations
};

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTeamAssignmentModal, setShowTeamAssignmentModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const { showToast } = useToast();
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [updatingStatusStaffId, setUpdatingStatusStaffId] = useState<number | null>(null);
  const [updatingAvailabilityStaffId, setUpdatingAvailabilityStaffId] = useState<number | null>(null);

  useEffect(() => {
    fetchStaff();
    fetchTeams();
  }, [currentPage, searchTerm, statusFilter, availabilityFilter, roleFilter, teamFilter]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        status: statusFilter,
        availability: availabilityFilter,
        role: roleFilter,
        team_id: teamFilter,
      });

      console.log('Fetching staff with params:', params.toString());
      const data = await apiRequest(`/staff?${params}`);
      
      console.log('Staff API response:', data);
      
      if (data.success) {
        setStaff(data.staff || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalStaff(data.pagination?.total || 0);
        console.log('Staff data set:', data.staff?.length || 0, 'members');
      } else {
        setError(data.message || 'Failed to fetch staff');
        setStaff([]);
      }
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      console.log('Fetching teams...');
      const data = await apiRequest('/teams');
      
      console.log('Teams API response:', data);
      
      if (data.success) {
        setTeams(data.teams || []);
        console.log('Teams data set:', data.teams?.length || 0, 'teams');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };


  const handleStatusChange = async (staffId: number, newStatus: Staff['status']) => {
    try {
      setUpdatingStatusStaffId(staffId);
      const data = await apiRequest(`/staff/${staffId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });

      if (data.success) {
        setStaff(prev => prev.map(member =>
          member.id === staffId ? { ...member, status: newStatus } : member
        ));
        showToast({ type: 'success', message: 'Staff status updated' });
      } else {
        console.error('Failed to update staff status:', data.message);
        showToast({ type: 'error', message: 'Failed to update staff status' });
      }
    } catch (error) {
      console.error('Error updating staff status:', error);
      showToast({ type: 'error', message: 'Error updating staff status' });
    } finally {
      setUpdatingStatusStaffId(null);
    }
  };

  const handleAvailabilityChange = async (staffId: number, newAvailability: Staff['availability']) => {
    try {
      setUpdatingAvailabilityStaffId(staffId);
      const data = await apiRequest(`/staff/${staffId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ availability: newAvailability }),
      });

      if (data.success) {
        setStaff(prev => prev.map(member =>
          member.id === staffId ? { ...member, availability: newAvailability } : member
        ));
        showToast({ type: 'success', message: 'Staff availability updated' });
      } else {
        console.error('Failed to update staff availability:', data.message);
        showToast({ type: 'error', message: 'Failed to update staff availability' });
      }
    } catch (error) {
      console.error('Error updating staff availability:', error);
      showToast({ type: 'error', message: 'Error updating staff availability' });
    } finally {
      setUpdatingAvailabilityStaffId(null);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    availability: 'available',
    team_id: ''
  });

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      availability: 'available',
      team_id: ''
    });
    setIsEditing(true);
    setShowStaffModal(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      position: staffMember.position,
      department: staffMember.department,
      availability: staffMember.availability,
      team_id: staffMember.team_id?.toString() || ''
    });
    setIsEditing(true);
    setShowStaffModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (formData.phone && !validatePhilippineMobile(formData.phone)) {
      showToast({ type: 'error', message: 'Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)' });
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = selectedStaff 
        ? `/staff/${selectedStaff.id}`
        : '/staff';
      
      const method = selectedStaff ? 'PUT' : 'POST';
      
      // Prepare the data - convert empty string team_id to null
      const requestData: any = {
        ...formData,
        team_id: formData.team_id === '' ? null : parseInt(formData.team_id),
        availability: formData.availability
      };
      
      console.log('Sending staff data:', requestData);
      
      const data = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(requestData),
      });
      
      if (data.success) {
        setShowStaffModal(false);
        fetchStaff(); // Refresh the staff list
        showToast({ type: 'success', message: selectedStaff ? 'Staff updated successfully' : 'Staff added successfully. Login credentials have been sent via email.' });
      } else {
        console.error('Failed to save staff:', data.message);
        showToast({ type: 'error', message: 'Failed to save staff' });
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      showToast({ type: 'error', message: 'Error saving staff' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignTeam = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowTeamAssignmentModal(true);
  };

  const handleTeamAssignment = async (teamId: string) => {
    if (!selectedStaff) return;
    
    // Check team size limit when assigning to a team
    if (teamId !== '') {
      try {
        setIsAssigningTeam(true);
        // Fetch current team members count
        const teamData = await apiRequest(`/teams/${teamId}`);
        
        if (teamData.success && teamData.team) {
          const currentMemberCount = teamData.team.member_count || 0;
          if (currentMemberCount >= 5) {
            showToast({ type: 'error', message: 'Team is at maximum capacity (5 members). Choose a different team.' });
            setIsAssigningTeam(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking team capacity:', error);
        showToast({ type: 'error', message: 'Error checking team capacity' });
        setIsAssigningTeam(false);
        return;
      }
    }
    
    try {
      const data = await apiRequest(`/staff/${selectedStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...selectedStaff,
          team_id: teamId === '' ? null : parseInt(teamId)
        }),
      });
      
      if (data.success) {
        setShowTeamAssignmentModal(false);
        fetchStaff(); // Refresh the staff list
        showToast({ type: 'success', message: 'Staff assigned to team' });
      } else {
        console.error('Failed to assign staff to team:', data.message);
        showToast({ type: 'error', message: 'Failed to assign staff to team' });
      }
    } catch (error) {
      console.error('Error assigning staff to team:', error);
      showToast({ type: 'error', message: 'Error assigning staff to team' });
    } finally {
      setIsAssigningTeam(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesRole = roleFilter === 'all' || member.position === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusColor = (status: Staff['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (availability: Staff['availability']) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'off-duty': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder-gray-500"
            placeholder="Enter staff name"
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder-gray-500"
            placeholder="Enter email address"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <PhoneInput
            international
            defaultCountry="PH"
            value={formData.phone}
            onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
            className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            inputClassName="w-full py-4 px-4 border-0 focus:ring-0 focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 disabled:bg-gray-100"
            buttonClassName="px-3 py-4 border-r border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            dropdownClassName="bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto"
            placeholder="Enter phone number"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder-gray-500"
            placeholder="Enter position"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
            required
            disabled={isSubmitting}
          >
            <option value="">Select Department</option>
            <option value="MDRRMO">MDRRMO</option>
            <option value="PNP">PNP</option>
            <option value="BFP">BFP</option>
            <option value="RHU I">RHU I</option>
            <option value="MSWDO">MSWDO</option>
            <option value="PRC">PRC</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
          <select
            name="team_id"
            value={formData.team_id}
            onChange={handleInputChange}
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
            disabled={isSubmitting}
          >
            <option value="">No Team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>
      

    </>
  );

  const renderViewFields = () => (
    selectedStaff && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <p className="text-sm text-gray-900">{selectedStaff.name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="text-sm text-gray-900">{selectedStaff.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <p className="text-sm text-gray-900">{formatPhoneNumber(selectedStaff.phone) || selectedStaff.phone}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Position</label>
          <p className="text-sm text-gray-900">{selectedStaff.position}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <p className="text-sm text-gray-900">{selectedStaff.department}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Availability</label>
          <p className="text-sm text-gray-900">{selectedStaff.availability.replace('-', ' ').toUpperCase()}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Team</label>
          <p className="text-sm text-gray-900">{selectedStaff.team_name || 'No Team'}</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Created Date</label>
          <p className="text-sm text-gray-900">
            {new Date(selectedStaff.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Export columns definition
  const exportColumns: ExportColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'position', label: 'Position' },
    { key: 'department', label: 'Department' },
    { key: 'availability', label: 'Availability' },
    { key: 'team_name', label: 'Team' },
  ];

  // Export handler
  const handleExport = async (type: 'csv' | 'pdf' | 'excel' | 'json') => {
    const exportData = filteredStaff.map(s => ({ ...s }));
    const options = {
      filename: 'Staff_Export',
      title: 'Staff List',
      logoUrl: '/images/partners/MDRRMO.png',
      includeTimestamp: true,
    };
    switch (type) {
      case 'csv':
        ExportUtils.exportToCSV(exportData, exportColumns, options);
        break;
      case 'pdf':
        setShowExportPreview(true);
        break;
      case 'excel':
        ExportUtils.exportToExcel(exportData, exportColumns, options);
        break;
      case 'json':
        ExportUtils.exportToJSON(exportData, options);
        break;
      default:
        break;
    }
  };

  // Confirm export to PDF after preview
  const handleConfirmExportPDF = async () => {
    const exportData = filteredStaff.map(s => ({ ...s }));
    // Build dynamic title based on filters
    let title = 'Staff Roster';
    const filterParts = [];
    if (searchTerm.trim()) filterParts.push(`Search: "${searchTerm.trim()}"`);
    if (statusFilter !== 'all') filterParts.push(`Status: ${statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    if (roleFilter !== 'all') filterParts.push(`Role: ${roleFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    if (teamFilter !== 'all') {
      const teamObj = teams.find(t => t.id.toString() === teamFilter);
      filterParts.push(`Team: ${teamObj ? teamObj.name : teamFilter}`);
    }
    if (filterParts.length > 0) {
      title += ' (' + filterParts.join(', ') + ')';
    }
    const options = {
      filename: 'Staff_Export',
      title,
      includeTimestamp: true,
    };
    await ExportUtils.exportToPDF(exportData, exportColumns, options);
    setShowExportPreview(false);
  };

  return (
  <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage emergency response staff and personnel</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddStaff}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-user-add-line mr-2"></i>
            Add Staff
          </button>
          <div className="relative inline-block">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Export Staff"
              onClick={() => handleExport('pdf')}
            >
              <i className="ri-download-line mr-2"></i>
              Export Staff
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10 hidden group-hover:block">
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleExport('csv')}>Export as CSV</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleExport('excel')}>Export as Excel</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleExport('json')}>Export as JSON</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-team-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-xl font-bold text-gray-900">{staff.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-check-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Staff</p>
              <p className="text-xl font-bold text-gray-900">
                {staff?.filter(s => s.status === 'active').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-unfollow-line text-yellow-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Busy</p>
              <p className="text-xl font-bold text-gray-900">
                {staff.filter(s => s.availability === 'busy').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-building-2-line text-purple-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Departments</p>
              <p className="text-xl font-bold text-gray-900">
                {new Set(staff.map(s => s.department)).size}
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
                placeholder="Search staff..."
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
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="off-duty">Off Duty</option>
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Availability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <i className="ri-user-search-line text-4xl text-gray-400"></i>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">No staff members found</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        {searchTerm || statusFilter !== 'all' || availabilityFilter !== 'all' || teamFilter !== 'all'
                          ? "No staff members match your current search and filter criteria. Try adjusting your search or filters."
                          : "No staff members have been added yet."}
                      </p>
                      {(searchTerm || statusFilter !== 'all' || availabilityFilter !== 'all' || teamFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setAvailabilityFilter('all');
                            setTeamFilter('all');
                          }}
                          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                        >
                          <i className="ri-refresh-line mr-2"></i>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i className="ri-user-line text-blue-600"></i>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {member.team_name ? (
                        <div>
                          <div>{member.team_name}</div>
                          {member.team_member_no && (
                            <div className="text-xs text-gray-500">#{member.team_member_no}</div>
                          )}
                        </div>
                      ) : (
                        'No Team'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatPhoneNumber(member.phone) || member.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(member.status)}`}>
                      {member.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {updatingAvailabilityStaffId === member.id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-xs text-gray-500">Updating...</span>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAvailabilityColor(member.availability)}`}>
                        {member.availability.replace('-', ' ').toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditStaff(member)}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit Staff"
                        disabled={isSubmitting || updatingStatusStaffId !== null}
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleAssignTeam(member)}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Assign to Team"
                        disabled={isAssigningTeam || updatingStatusStaffId !== null}
                      >
                        <i className="ri-team-line"></i>
                      </button>
                      {updatingStatusStaffId === member.id ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <select
                          value={member.status}
                          onChange={(e) => handleStatusChange(member.id, e.target.value as Staff['status'])}
                          className="text-xs border border-gray-300 rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Change Status"
                          disabled={updatingStatusStaffId !== null}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? (selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member') : 'Staff Details'}
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                {isEditing ? (
                  renderFormFields()
                ) : (
                  renderViewFields()
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                {isEditing && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {selectedStaff ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      selectedStaff ? 'Update Staff' : 'Add Staff'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Assignment Modal */}
      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showExportPreview}
        onClose={() => setShowExportPreview(false)}
        onExportPDF={handleConfirmExportPDF}
        onExportCSV={() => handleExport('csv')}
        onExportExcel={() => handleExport('excel')}
        data={filteredStaff}
        columns={exportColumns}
      />
      {showTeamAssignmentModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Assign Staff to Team
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign {selectedStaff.name} to a team
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Team</label>
                <p className="text-sm text-gray-900">
                  {selectedStaff.team_name || 'No team assigned'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
                {isAssigningTeam ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-600">Assigning team...</span>
                  </div>
                ) : (
                  <select
                    onChange={(e) => handleTeamAssignment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Team</option>
                    {teams.map(team => {
                      const memberCount = team.member_count || 0;
                      const isFull = memberCount >= 5;
                      return (
                        <option 
                          key={team.id} 
                          value={team.id}
                          disabled={isFull}
                        >
                          {team.name} ({memberCount}/5 members){isFull ? ' - FULL' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Teams with 5 members are at maximum capacity
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowTeamAssignmentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAssigningTeam}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;