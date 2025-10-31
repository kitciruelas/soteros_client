import React, { useState, useEffect } from 'react';
import { ConfirmModal } from '../../../components/base/Modal';
import { useToast } from '../../../components/base/Toast';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../utils/exportUtils';
import ExportUtils from '../../../utils/exportUtils';
import { apiRequest } from '../../../utils/api';

interface Team {
  id: number;
  member_no?: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

const TeamsManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamIdToDelete, setTeamIdToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [formData, setFormData] = useState({
    member_no: '',
    name: '',
    description: ''
  });

  const [editingMemberCount, setEditingMemberCount] = useState<number | null>(null);
  const [editingMemberCountValue, setEditingMemberCountValue] = useState<string>('');

  // Helper function to get team status
  const getTeamStatus = (memberCount: number) => {
    if (memberCount >= 5) return { status: 'full', color: 'red', text: 'Full' };
    if (memberCount >= 3) return { status: 'optimal', color: 'green', text: 'Optimal' };
    return { status: 'understaffed', color: 'yellow', text: 'Understaffed' };
  };

  // Export configuration
  const exportColumns: ExportColumn[] = [
    { key: 'member_no', label: 'Member No' },
    { key: 'name', label: 'Team Name' },
    { key: 'description', label: 'Description' },
    {
      key: 'member_count',
      label: 'Members',
      format: (value) => `${value || 0}/5 members`
    },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (value) => ExportUtils.formatDate(value)
    },
    {
      key: 'updated_at',
      label: 'Updated Date',
      format: (value) => ExportUtils.formatDate(value)
    }
  ];

  // Export handlers
  const handleExportCSV = () => {
    try {
      ExportUtils.exportToCSV(filteredTeams, exportColumns, {
        filename: 'teams_export',
        title: 'Teams Management Report'
      });
      showToast({ type: 'success', message: 'Teams exported to CSV successfully' });
      setShowExportModal(false);
    } catch (error) {
      console.error('Export to CSV failed:', error);
      showToast({ type: 'error', message: 'Failed to export to CSV' });
    }
  };

  const handleExportExcel = () => {
    try {
      ExportUtils.exportToExcel(filteredTeams, exportColumns, {
        filename: 'teams_export',
        title: 'Teams Management Report'
      });
      showToast({ type: 'success', message: 'Teams exported to Excel successfully' });
      setShowExportModal(false);
    } catch (error) {
      console.error('Export to Excel failed:', error);
      showToast({ type: 'error', message: 'Failed to export to Excel' });
    }
  };

  const handleExportPDF = async () => {
    try {
      await ExportUtils.exportToPDF(filteredTeams, exportColumns, {
        filename: 'teams_export',
        title: 'Teams Management Report'
      });
      showToast({ type: 'success', message: 'Teams exported to PDF successfully' });
      setShowExportModal(false);
    } catch (error) {
      console.error('Export to PDF failed:', error);
      showToast({ type: 'error', message: 'Failed to export to PDF' });
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [currentPage]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
      });

      console.log('Fetching teams with params:', params.toString());
      const data = await apiRequest(`/teams?${params}`);
      
      console.log('Teams API response:', data);
      
      if (data.success) {
        setTeams(data.teams || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalTeams(data.pagination?.total || data.teams?.length || 0);
        console.log('Teams data set:', data.teams?.length || 0, 'teams');
      } else {
        setError(data.message || 'Failed to fetch teams');
        setTeams([]);
      }
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = () => {
    setSelectedTeam(null);
    setFormData({
      member_no: '',
      name: '',
      description: ''
    });
    setIsEditing(true);
    setShowTeamModal(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      member_no: team.member_no || '',
      name: team.name,
      description: team.description || ''
    });
    setIsEditing(true);
    setShowTeamModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedTeam 
        ? `/api/teams/${selectedTeam.id}`
        : '/api/teams';
      
      const method = selectedTeam ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowTeamModal(false);
        fetchTeams(); // Refresh the teams list
        showToast({ type: 'success', message: selectedTeam ? 'Team updated successfully' : 'Team added successfully' });
      } else {
        console.error('Failed to save team:', data.message);
        showToast({ type: 'error', message: 'Failed to save team' });
      }
    } catch (error) {
      console.error('Error saving team:', error);
      showToast({ type: 'error', message: 'Failed to save team' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleManageMembers = async (team: Team) => {
    setSelectedTeam(team);
    setShowMembersModal(true);
    
    // Fetch all staff members
    try {
      const data = await apiRequest('/staff');
      if (data.success) {
        setAllStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleAssignStaffToTeam = async (staffId: number, assign: boolean) => {
    if (!selectedTeam) return;
    
    // Check team size limit when adding members
    if (assign) {
      const currentTeamMembers = allStaff.filter(staff => staff.team_id === selectedTeam.id);
      if (currentTeamMembers.length >= 5) {
        showToast({ type: 'error', message: 'Team is at maximum capacity (5 members). Remove a member first.' });
        return;
      }
    }
    
    try {
      const data = await apiRequest(`/staff/${staffId}`, {
        method: 'PUT',
        body: JSON.stringify({
          team_id: assign ? selectedTeam.id : null
        }),
      });
      
      if (data.success) {
        // Refresh the teams list to update member counts
        fetchTeams();
        // Refresh the staff list
        const staffData = await apiRequest('/staff');
        if (staffData.success) {
          setAllStaff(staffData.staff || []);
        }
        showToast({ type: 'success', message: assign ? 'Member added to team' : 'Member removed from team' });
      } else {
        console.error('Failed to assign staff to team:', data.message);
        showToast({ type: 'error', message: `Failed to update member: ${data.message}` });
      }
    } catch (error) {
      console.error('Error assigning staff to team:', error);
      showToast({ type: 'error', message: 'Error assigning staff to team' });
    }
  };

  const requestDeleteTeam = (teamId: number) => {
    setTeamIdToDelete(teamId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTeam = async () => {
    if (teamIdToDelete == null) return;
    try {
      setIsDeleting(true);
      const data = await apiRequest(`/teams/${teamIdToDelete}`, {
        method: 'DELETE',
      });
      if (data.success) {
        fetchTeams();
        showToast({ type: 'success', message: 'Team deleted successfully' });
      } else {
        console.error('Failed to delete team:', data.message);
        showToast({ type: 'error', message: 'Failed to delete team' });
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      showToast({ type: 'error', message: 'Error deleting team' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setTeamIdToDelete(null);
    }
  };

  const handleMemberCountClick = (team: Team) => {
    setEditingMemberCount(team.id);
    setEditingMemberCountValue((team.member_count || 0).toString());
  };

  const handleMemberCountSave = async (teamId: number) => {
    try {
      const newCount = parseInt(editingMemberCountValue);
      if (isNaN(newCount) || newCount < 3 || newCount > 5) {
        showToast({ type: 'warning', message: 'Team size must be between 3 and 5 members' });
        return;
      }

      // Update the team's member count in the database
      const data = await apiRequest(`/teams/${teamId}/member-count`, {
        method: 'PUT',
        body: JSON.stringify({ member_count: newCount }),
      });

      if (data.success) {
        // Update the local state
        setTeams(prevTeams => 
          prevTeams.map(team => 
            team.id === teamId 
              ? { ...team, member_count: newCount }
              : team
          )
        );
        setEditingMemberCount(null);
        setEditingMemberCountValue('');
        showToast({ type: 'success', message: 'Member count updated' });
      } else {
        showToast({ type: 'error', message: `Failed to update member count` });
      }
    } catch (error) {
      console.error('Error updating member count:', error);
      showToast({ type: 'error', message: 'Error updating member count' });
    }
  };

  const handleMemberCountCancel = () => {
    setEditingMemberCount(null);
    setEditingMemberCountValue('');
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (team.member_no && team.member_no.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
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
          <h1 className="text-2xl font-bold text-gray-900">Teams Management</h1>
          <p className="text-gray-600 mt-1">Manage emergency response teams and personnel groups</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddTeam}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-team-line mr-2"></i>
            Add Team
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Export Team
          </button>
          
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-team-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Teams</p>
              <p className="text-xl font-bold text-gray-900">{teams.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-user-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-xl font-bold text-gray-900">
                {teams.reduce((total, team) => total + (team.member_count || 0), 0)}
              </p>
              <p className="text-xs text-gray-500">
                {teams.reduce((total, team) => total + (team.member_count || 0), 0) === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-team-line text-purple-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Optimal Teams</p>
              <p className="text-xl font-bold text-gray-900">
                {teams.filter(team => {
                  const count = team.member_count || 0;
                  return count >= 3 && count <= 5;
                }).length}
              </p>
              <p className="text-xs text-gray-500">
                {teams.filter(team => (team.member_count || 0) < 3).length} understaffed, {teams.filter(team => (team.member_count || 0) >= 5).length} full
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
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredTeams.length} of {teams.length} teams
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {team.member_no || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i className="ri-team-line text-blue-600"></i>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {team.description || 'No description'}
                    </div>
                  </td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                     <div className="text-sm text-gray-900">
                       {editingMemberCount === team.id ? (
                         <div className="flex items-center space-x-2">
                           <input
                             type="number"
                             min="3"
                             max="5"
                             value={editingMemberCountValue}
                             onChange={(e) => setEditingMemberCountValue(e.target.value)}
                             onBlur={() => handleMemberCountSave(team.id)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 handleMemberCountSave(team.id);
                               } else if (e.key === 'Escape') {
                                 handleMemberCountCancel();
                               }
                             }}
                             className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                             autoFocus
                           />
                           <span className="text-gray-500">
                             {parseInt(editingMemberCountValue) === 1 ? 'member' : 'members'}
                           </span>
                           <div className="flex space-x-1">
                             <button
                               onClick={() => handleMemberCountSave(team.id)}
                               className="text-green-600 hover:text-green-800 text-xs"
                               title="Save"
                             >
                               <i className="ri-check-line"></i>
                             </button>
                             <button
                               onClick={handleMemberCountCancel}
                               className="text-red-600 hover:text-red-800 text-xs"
                               title="Cancel"
                             >
                               <i className="ri-close-line"></i>
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div 
                           onClick={() => handleMemberCountClick(team)}
                           className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded-md transition-colors ${
                             (team.member_count || 0) >= 5 ? 'bg-red-50 text-red-700' : 
                             (team.member_count || 0) >= 3 ? 'bg-green-50 text-green-700' : 
                             'bg-yellow-50 text-yellow-700'
                           }`}
                           title={`Click to edit member count (3-5 members required)`}
                         >
                           <span className="font-medium">{team.member_count || 0}/5</span>
                           <span className="ml-1 text-xs">
                             {(team.member_count || 0) === 1 ? 'member' : 'members'}
                           </span>
                           {(team.member_count || 0) >= 5 && (
                             <i className="ri-error-warning-line ml-1 text-xs" title="Team at maximum capacity"></i>
                           )}
                           {(team.member_count || 0) < 3 && (
                             <i className="ri-alert-line ml-1 text-xs" title="Team below minimum size"></i>
                           )}
                         </div>
                       )}
                     </div>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(team.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Team"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleManageMembers(team)}
                        className="text-green-600 hover:text-green-900"
                        title="Manage Members"
                      >
                        <i className="ri-user-settings-line"></i>
                      </button>
                      <button
                        onClick={() => requestDeleteTeam(team.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Team"
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

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? (selectedTeam ? 'Edit Team' : 'Add New Team') : 'Team Details'}
              </h3>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Member No</label>
                      <input
                        type="text"
                        name="member_no"
                        value={formData.member_no}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter member number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter team name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter team description"
                      />
                    </div>
                  </>
                ) : (
                  selectedTeam && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Member No</label>
                        <p className="text-sm text-gray-900">{selectedTeam.member_no || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Team Name</label>
                        <p className="text-sm text-gray-900">{selectedTeam.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="text-sm text-gray-900">{selectedTeam.description || 'No description'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Created Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedTeam.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  )
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                {isEditing && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {selectedTeam ? 'Update Team' : 'Add Team'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members Management Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Team Members - {selectedTeam.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign or remove staff members from this team
              </p>
              <div className="mt-2 flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  (selectedTeam.member_count || 0) >= 5 ? 'bg-red-100 text-red-700' : 
                  (selectedTeam.member_count || 0) >= 3 ? 'bg-green-100 text-green-700' : 
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedTeam.member_count || 0}/5 members
                </div>
                {(selectedTeam.member_count || 0) >= 5 && (
                  <span className="text-xs text-red-600 flex items-center">
                    <i className="ri-error-warning-line mr-1"></i>
                    Team at maximum capacity
                  </span>
                )}
                {(selectedTeam.member_count || 0) < 3 && (
                  <span className="text-xs text-yellow-600 flex items-center">
                    <i className="ri-alert-line mr-1"></i>
                    Team below minimum size (3 members required)
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Team Members */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Current Team Members</h4>
                  <div className="space-y-2">
                    {allStaff.filter(staff => staff.team_id === selectedTeam.id).map(staff => (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{staff.name}</p>
                          <p className="text-sm text-gray-600">{staff.position}</p>
                        </div>
                        <button
                          onClick={() => handleAssignStaffToTeam(staff.id, false)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {allStaff.filter(staff => staff.team_id === selectedTeam.id).length === 0 && (
                      <p className="text-gray-500 text-sm">No members assigned to this team</p>
                    )}
                  </div>
                </div>

                {/* Available Staff */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Available Staff</h4>
                  <div className="space-y-2">
                    {allStaff.filter(staff => !staff.team_id).map(staff => (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{staff.name}</p>
                          <p className="text-sm text-gray-600">{staff.position}</p>
                          <p className="text-xs text-green-600">No team assigned</p>
                        </div>
                        <button
                          onClick={() => handleAssignStaffToTeam(staff.id, true)}
                          disabled={(selectedTeam.member_count || 0) >= 5}
                          className={`text-sm ${
                            (selectedTeam.member_count || 0) >= 5 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                          title={(selectedTeam.member_count || 0) >= 5 ? 'Team is at maximum capacity (5 members)' : 'Add to team'}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                    {allStaff.filter(staff => !staff.team_id).length === 0 && (
                      <p className="text-gray-500 text-sm">No available staff members</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { if (!isDeleting) { setShowDeleteConfirm(false); setTeamIdToDelete(null); } }}
        onConfirm={confirmDeleteTeam}
        title="Delete Team"
        message="Are you sure you want to delete this team? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
        isLoading={isDeleting}
      />

      <ExportPreviewModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        data={filteredTeams}
        columns={exportColumns.map(col => ({ key: col.key, label: col.label }))}
        title="Export Teams Data"
      />
    </div>
  );
};

export default TeamsManagement;
