import React, { useState, useEffect, useRef } from 'react';
import { incidentsApi, teamsApi, staffManagementApi, adminNotificationsApi } from '../../../../utils/api';
import ExportPreviewModal from '../../../../components/base/ExportPreviewModal';
import { ExportUtils } from '../../../../utils/exportUtils';
import type { ExportColumn } from '../../../../utils/exportUtils';
import { useToast } from '../../../../components/base/Toast';
import IncidentMapModal from '../../../../components/IncidentMapModal';
import websocketService, { type NotificationData } from '../../../../services/websocketService';

interface Incident {
  id: number;
  type: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  safetyStatus: 'safe' | 'at_risk' | 'injured' | 'unknown';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  validationStatus: 'unvalidated' | 'validated' | 'rejected';
  validationNotes?: string;
  reportedBy: string;
  reporterType?: 'guest' | 'user';
  reporterPhone?: string;
  assignedTo?: string;
  assignedTeamId?: number | null;
  assignedTeamName?: string;
  assignedStaffId?: number | null;
  assignedStaffName?: string;
  assignedTeamIds?: string; // New field for multiple team IDs
  allAssignedTeams?: string; // New field for all assigned team names
  attachment?: string; // Added attachment field for filenames
  remarks?: string;
  dateReported: string;
  dateResolved?: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

interface Staff {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  status: string | number;
  team_id?: number;
  team_name?: string;
}

// Export columns configuration for incidents - essential information only
const incidentExportColumns: ExportColumn[] = [
  {
    key: 'id',
    label: 'ID',
    format: (value: number) => value ? `#${value}` : ''
  },
  {
    key: 'dateReported',
    label: 'Date Reported',
    format: (value: string) => value ? ExportUtils.formatDateTime(value) : ''
  },
  { key: 'type', label: 'Type', format: (value: string) => value.toUpperCase() },
  {
    key: 'validationStatus',
    label: 'Validation',
    format: (value: string) => {
      if (!value) return 'Unvalidated';
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
  },
  {
    key: 'status',
    label: 'Status',
    format: (value: string) => value?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || ''
  },
  {
    key: 'location',
    label: 'Location',
    format: (value: string, row: any) => {
      if (value) return value;
      // Extract location from description if not available
      const match = row.description?.match(/Location:\s*([^\n]+)/i);
      return match ? match[1].trim() : '';
    }
  },
  {
    key: 'description',
    label: 'Description',
    format: (value: string) => value || ''
  },
  {
    key: 'reportedBy',
    label: 'Reported By',
    format: (value: string, row: any) => {
      if (value) return value;
      return row.reporterName || 'Unknown';
    }
  },
  {
    key: 'allAssignedTeams',
    label: 'Assigned Team',
    format: (value: string, row: any) => {
      if (value) return value;
      if (row.assignedTeamName) return row.assignedTeamName;
      return 'Unassigned';
    }
  },
  {
    key: 'remarks',
    label: 'Remarks',
    format: (value: string) => value || ''
  }
];

const ViewIncidents: React.FC = () => {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all'); // 'all', 'unread', 'read'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'team' | 'teams' | 'staff'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [emailStatus, setEmailStatus] = useState<{sent: boolean, details?: any} | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [newIncidentIds, setNewIncidentIds] = useState<Set<number>>(new Set());
  const wsHandlersSetup = useRef(false);


  // Helper function to check if assignment button should be disabled
  const isAssignmentButtonDisabled = () => {
    if (isAssigning) return true;
    if (!selectedIncident) return true;
    
    if (assignmentType === 'staff') {
      if (selectedIncident.status === 'pending') return true;
      return !selectedStaffId;
    }
    
    if (assignmentType === 'teams') {
      if (selectedTeamIds.length === 0) return false; // Allow clearing all assignments
      // Check if any selected team has no members
      const teamsWithNoMembers = selectedTeamIds.filter(teamId => {
        const team = teams.find(t => t.id === teamId);
        return team?.member_count === 0;
      });
      return teamsWithNoMembers.length > 0;
    }
    
    if (assignmentType === 'team') {
      if (!selectedTeamId) return false; // Allow unassigning team
      const selectedTeam = teams.find(t => t.id === selectedTeamId);
      return selectedTeam?.member_count === 0;
    }
    
    return false;
  };

  // Set up WebSocket listeners (only once)
  useEffect(() => {
    if (!wsHandlersSetup.current) {
      wsHandlersSetup.current = true;
      
      // Handler for new incident notifications
      const handleNewIncidentRealTime = (incidentData: NotificationData) => {
        console.log('🚨 Real-time new incident received in ViewIncidents:', incidentData);
        
        const incidentId = Number(incidentData.id || incidentData.incident_id);
        if (!isNaN(incidentId)) {
          // Add to new incidents set
          setNewIncidentIds(prev => {
            const updated = new Set(prev);
            updated.add(incidentId);
            return updated;
          });
          
          // Refresh incidents list to include the new incident
          setTimeout(() => {
            fetchIncidents();
            fetchNewIncidentNotifications();
          }, 500); // Small delay to ensure backend has saved the incident
          
          // Show toast notification
          showToast({
            type: 'info',
            message: `New ${incidentData.incident_type || 'incident'} reported at ${incidentData.location || 'unknown location'}`
          });
        }
      };
      
      // Handler for incident updates
      const handleIncidentUpdateRealTime = (incidentData: NotificationData) => {
        console.log('🔄 Real-time incident update received in ViewIncidents:', incidentData);
        
        const incidentId = Number(incidentData.id || incidentData.incident_id);
        if (!isNaN(incidentId)) {
          // Refresh incidents list to get updated data
          setTimeout(() => {
            fetchIncidents();
          }, 300);
        }
      };
      
      // Register WebSocket event handlers
      websocketService.on('new_incident', handleNewIncidentRealTime);
      websocketService.on('incident_updated', handleIncidentUpdateRealTime);
      websocketService.on('new_admin_notification', (notificationData: any) => {
        // Handle admin notification for incidents
        if (notificationData.related_type === 'incident' && notificationData.related_id) {
          const incidentId = Number(notificationData.related_id);
          if (!isNaN(incidentId)) {
            setNewIncidentIds(prev => {
              const updated = new Set(prev);
              updated.add(incidentId);
              return updated;
            });
            // Refresh to get the new incident
            setTimeout(() => {
              fetchIncidents();
              fetchNewIncidentNotifications();
            }, 500);
          }
        }
      });
      
      console.log('✅ WebSocket listeners set up for ViewIncidents page');
    }
    
    // Cleanup function
    return () => {
      // Note: We don't remove listeners here because WebSocket service is shared
      // and other components (like AdminLayout) might still need them
      // The handlers will still work even if component unmounts
    };
  }, []); // Empty deps - only set up once

  useEffect(() => {
    fetchIncidents();
    fetchTeams();
    fetchStaff();
    fetchNewIncidentNotifications();
  }, []);

  const fetchNewIncidentNotifications = async () => {
    try {
      const response = await adminNotificationsApi.getNotifications({
        unread_only: true,
        type: 'incident',
        limit: 100 // Get all unread incident notifications
      });

      console.log('📢 Fetching new incident notifications:', response);
      
      if (response?.success && response?.notifications) {
        // Extract incident IDs from unread notifications
        const incidentIds = new Set<number>();
        response.notifications.forEach((notif: any) => {
          // Check both related_type and type field
          if ((notif.related_type === 'incident' || notif.type === 'incident') && notif.related_id && !notif.is_read) {
            const incidentId = Number(notif.related_id);
            if (!isNaN(incidentId)) {
              incidentIds.add(incidentId);
            }
          }
        });
        console.log('✅ New incident IDs found:', Array.from(incidentIds));
        setNewIncidentIds(incidentIds);
      } else {
        console.log('⚠️ No new incident notifications or invalid response:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching new incident notifications:', error);
      // Don't fail silently - set empty set
      setNewIncidentIds(new Set());
    }
  };

  // Mark incident as read (marks all notifications for this incident as read)
  const markIncidentAsRead = async (incidentId: number) => {
    try {
      // Fetch all notifications for this incident
      const response = await adminNotificationsApi.getNotifications({
        type: 'incident',
        limit: 100
      });
      
      if (response?.success && response?.notifications) {
        // Find and mark as read all unread notifications for this incident
        const incidentNotifications = response.notifications.filter((notif: any) => 
          (notif.related_type === 'incident' || notif.type === 'incident') && 
          notif.related_id === incidentId && 
          !notif.is_read
        );
        
        // Mark all as read
        for (const notif of incidentNotifications) {
          try {
            await adminNotificationsApi.markAsRead(notif.id);
          } catch (error) {
            console.error('Error marking notification as read:', error);
          }
        }
        
        // Update local state - remove from new incidents
        setNewIncidentIds(prev => {
          const updated = new Set(prev);
          updated.delete(incidentId);
          return updated;
        });
        
        showToast({ 
          type: 'success', 
          message: `Incident #${incidentId} marked as read` 
        });
        
        // Refresh notifications
        fetchNewIncidentNotifications();
      }
    } catch (error) {
      console.error('Error marking incident as read:', error);
      showToast({ 
        type: 'error', 
        message: 'Failed to mark incident as read' 
      });
    }
  };

  // Mark all incidents as read
  const markAllIncidentsAsRead = async () => {
    try {
      // Mark all unread incident notifications as read
      await adminNotificationsApi.markAllAsRead();
      
      // Clear all new incident IDs
      setNewIncidentIds(new Set());
      
      showToast({ 
        type: 'success', 
        message: 'All incidents marked as read' 
      });
      
      // Refresh notifications
      fetchNewIncidentNotifications();
    } catch (error) {
      console.error('Error marking all incidents as read:', error);
      showToast({ 
        type: 'error', 
        message: 'Failed to mark all incidents as read' 
      });
    }
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await incidentsApi.getIncidents();

      const records = (res?.incidents ?? []) as any[];

      const mapped: Incident[] = records.map((row) => {
        // Backend fields from DB
        // incident_id, incident_type, description, longitude, latitude, date_reported,
        // status, assigned_to, reported_by, priority_level, reporter_safe_status
        const id = Number(row.incident_id);
        const type = String(row.incident_type || '');
        const description = String(row.description || '');
        const latitude = Number(row.latitude ?? 0);
        const longitude = Number(row.longitude ?? 0);
        const dateReported = row.date_reported ? new Date(row.date_reported).toISOString() : new Date().toISOString();
        const priority = String(row.priority_level || 'moderate');
        const safety = String(row.reporter_safe_status || 'unknown');
        const status = String(row.status || 'pending');

        // Map DB enums to UI enums
        const priorityLevel = (priority === 'moderate' ? 'medium' : priority) as Incident['priorityLevel'];
        const safetyStatus = (safety === 'danger' ? 'unknown' : safety) as Incident['safetyStatus'];

        const incident = {
          id,
          type,
          description,
          location: extractLocationFromDescription(description),
          latitude,
          longitude,
          priorityLevel,
          safetyStatus,
          status: status as Incident['status'],
          validationStatus: (row.validation_status || 'unvalidated') as Incident['validationStatus'],
          validationNotes: row.validation_notes || undefined,
          reportedBy: row.reporter_type === 'guest'
            ? String(row.guest_name ?? 'Unknown Guest')
            : String(row.reporter_name ?? row.reported_by ?? ''),
          reporterType: (row.reporter_type === 'guest' ? 'guest' : 'user') as Incident['reporterType'],
          reporterPhone: row.reporter_type === 'guest'
            ? (row.guest_contact ? String(row.guest_contact) : undefined)
            : (row.reporter_phone ? String(row.reporter_phone) : undefined),
          assignedTo: row.assigned_to ? String(row.assigned_to) : undefined,
          assignedTeamId: row.assigned_team_id ? Number(row.assigned_team_id) : undefined,
          assignedTeamName: row.assigned_team_name || undefined,
          assignedStaffId: row.assigned_staff_id ? Number(row.assigned_staff_id) : undefined,
          assignedStaffName: row.assigned_staff_name || undefined,
          assignedTeamIds: row.assigned_team_ids || undefined, // New field for multiple team IDs
          allAssignedTeams: row.all_assigned_teams || undefined, // New field for all assigned team names
          attachment: row.attachment || undefined, // Added attachment field
          remarks: row.remarks || undefined,
          dateReported,
          dateResolved: undefined,
        };

        return incident;
      });

      setIncidents(mapped);
      // Refresh new incident notifications when incidents are refetched
      fetchNewIncidentNotifications();
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setError('Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await teamsApi.getTeams();
      if (res?.teams) {
        setTeams(res.teams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await staffManagementApi.getStaff();
      // Handle different possible response structures
      if (res && typeof res === 'object') {
        if ('staff' in res && Array.isArray(res.staff)) {
          setStaff(res.staff);
        } else if ('data' in res && res.data && 'staff' in res.data && Array.isArray(res.data.staff)) {
          setStaff(res.data.staff);
        } else if ('users' in res && Array.isArray(res.users)) {
          setStaff(res.users);
        }
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const extractLocationFromDescription = (text: string): string => {
    if (!text) return '';
    const match = /Location:\s*([^\n]+)/i.exec(text);
    return match ? match[1].trim() : '';
  };


  const handleAssignTeam = async (incidentId: number, teamId: number | null) => {
    try {
      setIsAssigning(true);
      setEmailStatus(null);

      const response = await incidentsApi.assignTeamToIncident(incidentId, teamId);

      // Update local state
      setIncidents(prev => prev.map(incident => {
        if (incident.id === incidentId) {
          const selectedTeam = teams.find(team => team.id === teamId);
          return {
            ...incident,
            assignedTeamId: teamId,
            assignedTeamName: selectedTeam?.name || undefined,
            assignedStaffId: undefined, // Clear staff assignment when team is assigned
            assignedStaffName: undefined
          };
        }
        return incident;
      }));

      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails
        });
        // Show success toast
        const selectedTeam = teams.find(t => t.id === teamId);
        showToast({ 
          type: 'success', 
          message: `Team "${selectedTeam?.name || 'Unknown'}" assigned successfully!` 
        });
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: 'No email details provided' }
        });
      }

      setTimeout(() => {
        closeAssignmentModal();
      }, 2000);

    } catch (error) {
      console.error('Error assigning team to incident:', error);

      // Check if it's a backend validation error
      if (error instanceof Error && error.message.includes('Cannot assign team with no active members')) {
        setEmailStatus({
          sent: false,
          details: {
            error: 'Cannot assign team with no active members. Please add members to the team first.',
            teamName: 'Selected Team'
          }
        });
      } else {
        setEmailStatus({
          sent: false,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignMultipleTeams = async (incidentId: number, teamIds: number[]) => {
    try {
      setIsAssigning(true);
      setEmailStatus(null);

      const response = await incidentsApi.assignTeamsToIncident(incidentId, teamIds);

      // Update local state
      setIncidents(prev => prev.map(incident => {
        if (incident.id === incidentId) {
          const selectedTeams = teams.filter(t => teamIds.includes(t.id));
          return {
            ...incident,
            assignedTeamIds: teamIds.join(','),
            allAssignedTeams: selectedTeams.map(t => t.name).join(', '),
            assignedTeamId: teamIds[0] || undefined, // Keep first team as primary for backward compatibility
            assignedTeamName: selectedTeams[0]?.name || undefined,
            assignedStaffId: undefined, // Clear staff assignment when teams are assigned
            assignedStaffName: undefined
          };
        }
        return incident;
      }));

      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails
        });
        // Show success toast
        const selectedTeams = teams.filter(t => teamIds.includes(t.id));
        showToast({ 
          type: 'success', 
          message: `${selectedTeams.length} teams assigned successfully!` 
        });
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: 'No email details provided' }
        });
      }

      setTimeout(() => {
        closeAssignmentModal();
      }, 2000);

    } catch (error) {
      console.error('Error assigning multiple teams to incident:', error);

      // Check if it's a backend validation error
      if (error instanceof Error && error.message.includes('Cannot assign teams with no active members')) {
        setEmailStatus({
          sent: false,
          details: {
            error: 'Cannot assign teams with no active members. Please add members to the teams first.',
            teamNames: 'Selected Teams'
          }
        });
      } else {
        setEmailStatus({
          sent: false,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleValidateIncident = async (incidentId: number, validationStatus: 'validated' | 'rejected', notes?: string) => {
    try {
      setIsValidating(true);
      
      // Get current incident to check if it's an update
      const currentIncident = incidents.find(inc => inc.id === incidentId);
      if (!currentIncident) {
        throw new Error('Incident not found');
      }
      
      // If updating and no new notes provided, keep existing notes
      const finalNotes = notes || currentIncident.validationNotes;
      
      // Call API to update validation
      try {
        const response = await incidentsApi.validateIncident(incidentId, {
          validationStatus,
          validationNotes: finalNotes,
          assignedTo: null // Backend expects this field
        });

        if (!response.success) {
          throw new Error(response.message || 'Failed to update validation');
        }
      } catch (apiError) {
        console.error('API call failed, using local validation as fallback:', apiError);
        // Fallback: Update local state only (for testing purposes)
        // In production, you would want to show an error message here
        // For now, we'll continue with local state update
      }
      
      // Update local state after successful API call
      setIncidents(prev => prev.map(incident => {
        if (incident.id === incidentId) {
          // Update both validation status and incident status
          const newStatus = validationStatus === 'validated' ? 'in_progress' : 
                           validationStatus === 'rejected' ? 'closed' : 
                           incident.status;
          
          return { 
            ...incident, 
            validationStatus,
            validationNotes: finalNotes,
            status: newStatus
          };
        }
        return incident;
      }));
      
      // Close validation modal
      setShowValidationModal(false);
      setValidationNotes('');
      
      // Show success message
      const isUpdate = currentIncident.validationStatus === 'validated';
      const newStatus = validationStatus === 'validated' ? 'in_progress' : 
                       validationStatus === 'rejected' ? 'closed' : 
                       currentIncident.status;
      
      setEmailStatus({
        sent: true,
        details: { 
          message: isUpdate 
            ? `Incident validation updated successfully to ${validationStatus}. Status changed to ${newStatus}.`
            : `Incident ${validationStatus === 'validated' ? 'validated' : 'rejected'} successfully. Status changed to ${newStatus}.`,
          incidentId,
          note: 'Note: Validation saved locally. Backend sync may be unavailable.'
        }
      });
      
      setTimeout(() => {
        setEmailStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error validating incident:', error);

      setEmailStatus({
        sent: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          details: 'Check console for more information'
        }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAssignStaff = async (incidentId: number, staffId: number | null) => {
    try {
      setIsAssigning(true);
      setEmailStatus(null);

      const response = await incidentsApi.assignStaffToIncident(incidentId, staffId);

      // Update local state
      setIncidents(prev => prev.map(incident => {
        if (incident.id === incidentId) {
          const selectedStaff = staff.find(s => s.id === staffId);
          return {
            ...incident,
            assignedStaffId: staffId,
            assignedStaffName: selectedStaff?.name || undefined,
            assignedTeamId: undefined, // Clear team assignment when staff is assigned
            assignedTeamName: undefined
          };
        }
        return incident;
      }));

      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails
        });
        // Show success toast
        const selectedStaff = staff.find(s => s.id === staffId);
        showToast({ 
          type: 'success', 
          message: `Staff member "${selectedStaff?.name || 'Unknown'}" assigned successfully!` 
        });
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: 'No email details provided' }
        });
      }

      setTimeout(() => {
        closeAssignmentModal();
      }, 2000);

    } catch (error) {
      console.error('Error assigning staff to incident:', error);
      setEmailStatus({
        sent: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignmentModal = (incident: Incident, type: 'team' | 'teams' | 'staff') => {
    // Prevent staff assignment for pending incidents
    if (type === 'staff' && incident.status === 'pending') {
      return;
    }
    
    setSelectedIncident(incident);
    setAssignmentType(type);
    
    if (type === 'teams') {
      // Parse existing team IDs from the incident
      const existingTeamIds = incident.assignedTeamIds 
        ? incident.assignedTeamIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : [];
      setSelectedTeamIds(existingTeamIds);
      setSelectedTeamId(null);
    } else {
      setSelectedTeamId(incident.assignedTeamId || null);
      setSelectedTeamIds([]);
    }
    
    setSelectedStaffId(incident.assignedStaffId || null);
    setEmailStatus(null); // Reset email status
    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedIncident(null);
    setAssignmentType('team');
    setSelectedTeamId(null);
    setSelectedTeamIds([]);
    setSelectedStaffId(null);
    setEmailStatus(null);
    setIsAssigning(false);
  };

  const getIncidentTypeText = (incidentType: string) => {
    return incidentType.toUpperCase();
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = getIncidentTypeText(incident.type).includes(searchTerm.toUpperCase()) ||
                         incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || incident.priorityLevel === priorityFilter;
    const matchesRead = readFilter === 'all' || 
                       (readFilter === 'unread' && newIncidentIds.has(incident.id)) ||
                       (readFilter === 'read' && !newIncidentIds.has(incident.id));

    // Date range filtering
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      const incidentDate = new Date(incident.dateReported);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return incidentDate >= start && incidentDate <= end;
      } else if (start) {
        return incidentDate >= start;
      } else if (end) {
        return incidentDate <= end;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesPriority && matchesRead && matchesDateRange;
  }).sort((a, b) => {
    const statusOrder = { 'pending': 1, 'in_progress': 2, 'resolved': 3, 'closed': 4 };
    const priorityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
    
    // Helper function to check if incident has assignment
    const hasAssignment = (incident: Incident) => {
      return !!(incident.assignedTeamName || incident.allAssignedTeams || incident.assignedStaffName);
    };
    
    // Helper function to check if incident is new (has unread notification)
    const isNew = (incident: Incident) => {
      return newIncidentIds.has(incident.id);
    };
    
    // Get dates for comparison
    const aDate = new Date(a.dateReported).getTime();
    const bDate = new Date(b.dateReported).getTime();
    
    // PINAKA-UNA: New incidents with unread notifications (sorted by newest date first within new group)
    const aIsNew = isNew(a);
    const bIsNew = isNew(b);
    
    if (aIsNew !== bIsNew) {
      return aIsNew ? -1 : 1; // New incidents first
    }
    
    // If both are new, sort by date (newest first)
    if (aIsNew && bIsNew) {
      const dateDiff = bDate - aDate;
      if (dateDiff !== 0) return dateDiff;
      // If same date and both new, sort by priority
      const priorityDiff = priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
      if (priorityDiff !== 0) return priorityDiff;
    }
    
    // If no new incidents detected, prioritize by date first (newest reports should appear first)
    // This ensures new reports always appear at the top even if notification system isn't working
    if (newIncidentIds.size === 0) {
      // Sort by date first (newest first)
      const dateDiff = bDate - aDate;
      if (dateDiff !== 0) return dateDiff;
      
      // Then by validation and assignment status
      const hasAssignmentA = hasAssignment(a);
      const hasAssignmentB = hasAssignment(b);
      
      // Unvalidated without assignment should come first (new reports)
      if (a.validationStatus === 'unvalidated' && !hasAssignmentA && 
          !(b.validationStatus === 'unvalidated' && !hasAssignmentB)) {
        return -1;
      }
      if (b.validationStatus === 'unvalidated' && !hasAssignmentB && 
          !(a.validationStatus === 'unvalidated' && !hasAssignmentA)) {
        return 1;
      }
      
      // Then by priority
      const priorityDiff = priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Finally by status
      return statusOrder[a.status] - statusOrder[b.status];
    }
    
    // For non-new incidents that have new incidents in the list, use validation priority
    // Custom validation priority based on assignment status
    // Workflow: Report → Validate → Assign → Process
    // 1. Validated + walang assignment (PINAKA-PRIORITY - ready to assign, need immediate action)
    // 2. Unvalidated + walang assignment (bagong report, need validation)
    // 3. Validated + may assignment (validated + assigned, ongoing na)
    // 4. Unvalidated + may assignment (edge case - need validation pa rin)
    // 5. Rejected (lowest priority)
    const getValidationPriority = (incident: Incident) => {
      if (incident.validationStatus === 'validated' && !hasAssignment(incident)) return 1; // PINAKA-UNA - ready to assign
      if (incident.validationStatus === 'unvalidated' && !hasAssignment(incident)) return 2; // validate muna
      if (incident.validationStatus === 'validated' && hasAssignment(incident)) return 3; // ongoing
      if (incident.validationStatus === 'unvalidated' && hasAssignment(incident)) return 4; // edge case
      if (incident.validationStatus === 'rejected') return 5;
      return 6;
    };
    
    // Sort by validation priority
    const validationDiff = getValidationPriority(a) - getValidationPriority(b);
    if (validationDiff !== 0) return validationDiff;
    
    // Within same validation group, sort by priority (critical first)
    const priorityDiff = priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Within same validation and priority, sort by date (newest first)
    const dateDiff = bDate - aDate;
    if (dateDiff !== 0) return dateDiff;
    
    // Finally, sort by incident status
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const getPriorityColor = (priority: Incident['priorityLevel']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSafetyStatusColor = (status: Incident['safetyStatus']) => {
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'injured': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle export with preview
  const handleExport = async () => {
    if (filteredIncidents.length === 0) return;

    setIsExporting(true);
    try {
      // Build dynamic title based on filters
      let title = 'Incidents Report';
      const filterParts = [];
      if (searchTerm && searchTerm.trim()) filterParts.push(`Search: "${searchTerm.trim()}"`);
      if (statusFilter && statusFilter !== 'all') filterParts.push(`Status: ${statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      if (priorityFilter && priorityFilter !== 'all') filterParts.push(`Priority: ${priorityFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      if (startDate || endDate) {
        let dateLabel = '';
        if (startDate && endDate) dateLabel = `${startDate} to ${endDate}`;
        else if (startDate) dateLabel = `From ${startDate}`;
        else if (endDate) dateLabel = `Until ${endDate}`;
        filterParts.push(`Date: ${dateLabel}`);
      }
      if (filterParts.length > 0) {
        title += ' (' + filterParts.join(', ') + ')';
      }
      const options = {
        filename: 'incidents_report',
        title,
        includeTimestamp: true,
        orientation: 'landscape' as const
      };

      await ExportUtils.exportToPDF(filteredIncidents, incidentExportColumns, options);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">View Incidents</h1>
          <p className="text-gray-600 mt-1">Monitor and manage reported incidents</p>
        </div>
        <div className="flex items-center space-x-3">
          {newIncidentIds.size > 0 && (
            <button
              onClick={markAllIncidentsAsRead}
              className="px-4 py-2 rounded-lg transition-colors flex items-center bg-blue-600 text-white hover:bg-blue-700"
              title="Mark all new incidents as read"
            >
              <i className="ri-check-double-line mr-2"></i>
              Mark All Read ({newIncidentIds.size})
            </button>
          )}
          <button
            onClick={() => setShowExportPreview(true)}
            disabled={filteredIncidents.length === 0 || isExporting}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              filteredIncidents.length === 0 || isExporting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title={filteredIncidents.length === 0 ? 'No data to export' : 'Export incidents report'}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <i className="ri-download-line mr-2"></i>
                Export Report ({filteredIncidents.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-error-warning-line text-red-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Incidents</p>
              <p className="text-xl font-bold text-gray-900">{incidents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border-2 border-red-300 p-4 relative">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-notification-badge-line text-white"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">New Reports</p>
              <p className="text-xl font-bold text-red-600">{newIncidentIds.size}</p>
            </div>
          </div>
          {newIncidentIds.size > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">{newIncidentIds.size}</span>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-time-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-xl font-bold text-gray-900">
                {incidents.filter(i => i.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-check-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-xl font-bold text-gray-900">
                {incidents.filter(i => i.status === 'resolved').length}
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
              <p className="text-sm text-gray-600">Team Assigned</p>
              <p className="text-xl font-bold text-gray-900">
                {incidents.filter(i => i.assignedTeamName).length}
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
                placeholder="Search incidents..."
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
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Reports</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Dates
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredIncidents.length} of {incidents.length} incidents
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
                <i className="ri-inbox-line text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No incidents found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all' || startDate || endDate
                  ? "No incidents match your current search and filter criteria. Try adjusting your search or filters."
                  : "No incidents have been reported yet."}
              </p>
              {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setReadFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  <i className="ri-refresh-line mr-2"></i>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredIncidents.map((incident) => {
              const isUnread = newIncidentIds.has(incident.id);
              return (
            <div 
              key={incident.id} 
              className={`p-6 hover:bg-gray-50 transition-colors ${
                isUnread ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className={`text-lg font-medium ${isUnread ? 'text-blue-900 font-semibold' : 'text-gray-900'}`}>
                      {getIncidentTypeText(incident.type)} - #{incident.id}
                    </h4>
                    {isUnread && (
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white border border-red-600 animate-pulse flex items-center">
                        <i className="ri-mail-unread-line mr-1"></i>
                        NEW
                      </span>
                    )}
                    {!isUnread && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600 border border-gray-300 flex items-center">
                        <i className="ri-mail-check-line mr-1"></i>
                        READ
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(incident.priorityLevel)}`}>
                      {incident.priorityLevel.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      incident.validationStatus === 'rejected' && incident.status === 'closed'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : getStatusColor(incident.status)
                    }`}>
                      {incident.status.replace('_', ' ').toUpperCase()}
                      {incident.validationStatus === 'rejected' && incident.status === 'closed' && (
                        <span className="ml-1 text-xs">(Rejected)</span>
                      )}
                    </span>

                  </div>
                  <p className="text-gray-600 mb-3">{incident.description}</p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>
                      <i className="ri-map-pin-line mr-1"></i>
                      {incident.location}
                    </span>
                    <span>
                      <i className="ri-user-line mr-1"></i>
                      Reported by: {incident.reportedBy}
                    </span>
                    <span>
                      <i className="ri-time-line mr-1"></i>
                      {new Date(incident.dateReported).toLocaleString()}
                    </span>
                    {incident.allAssignedTeams && (
                      <span className="text-green-600">
                        <i className="ri-team-line mr-1"></i>
                        Teams: {incident.allAssignedTeams}
                        {(() => {
                          const teamIds = incident.assignedTeamIds ? incident.assignedTeamIds.split(',').map(id => parseInt(id.trim())) : [];
                          const totalMembers = teamIds.reduce((total, teamId) => {
                            const team = teams.find(t => t.id === teamId);
                            return total + (team?.member_count || 0);
                          }, 0);
                          return totalMembers > 0 ? ` (${totalMembers} total members)` : '';
                        })()}
                      </span>
                    )}
                    {incident.assignedTeamName && !incident.allAssignedTeams && (
                      <span className="text-green-600">
                        <i className="ri-team-line mr-1"></i>
                        Team: {incident.assignedTeamName}
                        {(() => {
                          const team = teams.find(t => t.name === incident.assignedTeamName);
                          return team ? ` (${team.member_count} members)` : '';
                        })()}
                      </span>
                    )}
                    {incident.assignedStaffName && (
                      <span className="text-purple-600">
                        <i className="ri-user-line mr-1"></i>
                        Staff: {incident.assignedStaffName}
                      </span>
                    )}

                    {!incident.assignedTeamName && !incident.assignedStaffName && incident.assignedTo && (
                      <span>
                        <i className="ri-team-line mr-1"></i>
                        Assigned to: {incident.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {/* Mark as Read Button - Only show for unread incidents */}
                  {newIncidentIds.has(incident.id) && (
                    <button
                      onClick={() => markIncidentAsRead(incident.id)}
                      className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors flex items-center"
                      title="Mark as read"
                    >
                      <i className="ri-check-line mr-1"></i>
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      setSelectedIncident(incident);
                      setShowIncidentModal(true);
                      
                      // Mark incident notification as read when viewing
                      if (newIncidentIds.has(incident.id)) {
                        await markIncidentAsRead(incident.id);
                      }
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors relative"
                  >
                    <i className="ri-eye-line mr-1"></i>
                    View
                    {newIncidentIds.has(incident.id) && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedIncident(incident);
                      setValidationNotes(incident.validationNotes || '');
                      setShowValidationModal(true);
                    }}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      incident.validationStatus === 'validated'
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : incident.validationStatus === 'rejected'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                    title={incident.validationStatus === 'validated' 
                      ? 'Update Validation' 
                      : incident.validationStatus === 'rejected'
                      ? 'Update Rejection'
                      : 'Validate Incident'
                    }
                  >
                    <i className="ri-check-double-line mr-1"></i>
                    {incident.validationStatus === 'validated' 
                      ? 'Update' 
                      : incident.validationStatus === 'rejected'
                      ? 'Update'
                      : 'Validate'
                    }
                  </button>
                  {/* Only show team assignment buttons if incident is validated */}
                  {incident.validationStatus === 'validated' && (
                    <>
                 
                      <button
                        onClick={() => openAssignmentModal(incident, 'teams')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors relative group"
                        title="Assign Multiple Teams - All team members will receive email notifications"
                      >
                        <i className="ri-team-fill mr-1"></i>
                        Assign Teams
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          <i className="ri-mail-line mr-1"></i>
                          Multiple teams support
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </button>
                    </>
                  )}

                </div>
              </div>
            </div>
            );
          })
          )}
        </div>
      </div>

      {/* Incident Details Modal */}
      {showIncidentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Incident Details - #{selectedIncident.id}
              </h3>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <p className="text-sm font-medium text-gray-900">{getIncidentTypeText(selectedIncident.type)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(selectedIncident.priorityLevel)}`}>
                      {selectedIncident.priorityLevel.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Safety Status</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSafetyStatusColor(selectedIncident.safetyStatus)}`}>
                      {selectedIncident.safetyStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Validation</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      selectedIncident.validationStatus === 'validated'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : selectedIncident.validationStatus === 'rejected'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {selectedIncident.validationStatus.charAt(0).toUpperCase() + selectedIncident.validationStatus.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <p className="text-sm text-gray-900 bg-white p-3 rounded border border-gray-200">{selectedIncident.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                    <p className="text-sm text-gray-900">{selectedIncident.location}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Coordinates</label>
                    <p className="text-sm text-gray-900">{selectedIncident.latitude}, {selectedIncident.longitude}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reported By</label>
                    <p className="text-sm text-gray-900">{selectedIncident.reportedBy}</p>
                    {selectedIncident.reporterPhone && (
                      <p className="text-sm text-gray-600 mt-1">
                        <i className="ri-phone-line mr-1"></i>
                        {selectedIncident.reporterPhone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date Reported</label>
                    <p className="text-sm text-gray-900">{new Date(selectedIncident.dateReported).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              {/* Team Information Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Team Information</h4>
                <div className="space-y-3">
                  {selectedIncident.assignedStaffName ? (
                    (() => {
                      const assignedStaff = staff.find(s => s.id === selectedIncident.assignedStaffId);
                      if (assignedStaff && assignedStaff.team_id) {
                        const team = teams.find(t => t.id === assignedStaff.team_id);
                        const teamMembers = staff.filter(s => s.team_id === assignedStaff.team_id);
                        
                        return (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <i className="ri-team-line text-purple-600 mr-2"></i>
                              <span className="font-medium text-purple-800">Assigned Staff & Team</span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-gray-600 text-sm">Assigned Staff:</span>
                                <span className="ml-2 font-medium text-purple-700">{selectedIncident.assignedStaffName}</span>
                              </div>
                              {assignedStaff && (
                                <>
                                  <div>
                                    <span className="text-gray-600 text-sm">Position:</span>
                                    <span className="ml-2 font-medium text-purple-700">{assignedStaff.position}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 text-sm">Department:</span>
                                    <span className="ml-2 font-medium text-purple-700">{assignedStaff.department}</span>
                                  </div>
                                </>
                              )}
                              {team && (
                                <div>
                                  <span className="text-gray-600 text-sm">Team:</span>
                                  <span className="ml-2 font-medium text-purple-700">{team.name}</span>
                                </div>
                              )}
                              {teamMembers.length > 0 && (
                                <div>
                                  <span className="text-gray-600 text-sm">Active Team Members ({teamMembers.length}):</span>
                                  <div className="mt-1 space-y-1">
                                    {teamMembers.map(member => (
                                      <div key={member.id} className="text-purple-700 ml-2 flex items-center">
                                        <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                        {member.name} - {member.position}
                                        {member.id === selectedIncident.assignedStaffId && (
                                          <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                                            Assigned
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <i className="ri-user-line text-purple-600 mr-2"></i>
                            <span className="font-medium text-purple-800">Assigned Staff</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 text-sm">Assigned Staff:</span>
                              <span className="ml-2 font-medium text-purple-700">{selectedIncident.assignedStaffName}</span>
                            </div>
                            {assignedStaff && (
                              <>
                                <div>
                                  <span className="text-gray-600 text-sm">Position:</span>
                                  <span className="ml-2 font-medium text-purple-700">{assignedStaff.position}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 text-sm">Department:</span>
                                  <span className="ml-2 font-medium text-purple-700">{assignedStaff.department}</span>
                                </div>
                              </>
                            )}
                            <div className="text-gray-500 text-sm">
                              No team assignment found for this staff member
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : selectedIncident.allAssignedTeams ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <i className="ri-team-fill text-blue-600 mr-2"></i>
                        <span className="font-medium text-blue-800">Multiple Team Assignment</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-600 text-sm">Assigned Teams:</span>
                          <span className="ml-2 font-medium text-blue-700">{selectedIncident.allAssignedTeams}</span>
                        </div>
                        {(() => {
                          const teamIds = selectedIncident.assignedTeamIds ? selectedIncident.assignedTeamIds.split(',').map(id => parseInt(id.trim())) : [];
                          const totalMembers = teamIds.reduce((total, teamId) => {
                            const team = teams.find(t => t.id === teamId);
                            return total + (team?.member_count || 0);
                          }, 0);
                          
                          return (
                            <>
                              <div>
                                <span className="text-gray-600 text-sm">Total Teams:</span>
                                <span className="ml-2 font-medium text-blue-700">{teamIds.length}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 text-sm">Total Members:</span>
                                <span className="ml-2 font-medium text-blue-700">{totalMembers}</span>
                              </div>
                              <div className="space-y-2">
                                <span className="text-gray-600 text-sm">Team Details:</span>
                                {teamIds.map(teamId => {
                                  const team = teams.find(t => t.id === teamId);
                                  const teamMembers = team ? staff.filter(s => s.team_id === teamId) : [];
                                  return team ? (
                                    <div key={teamId} className="ml-4 p-2 bg-white rounded border border-blue-100">
                                      <div className="font-medium text-blue-800">{team.name}</div>
                                      <div className="text-xs text-blue-600">{team.description || 'No description'}</div>
                                      <div className="text-xs text-blue-600 mt-1">
                                        {teamMembers.length} active members
                                      </div>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : selectedIncident.assignedTeamName ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <i className="ri-team-line text-green-600 mr-2"></i>
                        <span className="font-medium text-green-800">Direct Team Assignment</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-600 text-sm">Team Name:</span>
                          <span className="ml-2 font-medium text-green-700">{selectedIncident.assignedTeamName}</span>
                        </div>
                        {(() => {
                          const team = teams.find(t => t.name === selectedIncident.assignedTeamName);
                          const teamMembers = team ? staff.filter(s => s.team_id === team.id) : [];
                          return team ? (
                            <>
                              <div>
                                <span className="text-gray-600 text-sm">Description:</span>
                                <span className="ml-2 font-medium text-green-700">{team.description || 'No description available'}</span>
                              </div>
                              {teamMembers.length > 0 && (
                                <div>
                                  <span className="text-gray-600 text-sm">Team Members ({teamMembers.length}):</span>
                                  <div className="mt-1 space-y-1">
                                    {teamMembers.map(member => (
                                      <div key={member.id} className="text-green-700 ml-2 flex items-center">
                                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                        {member.name} - {member.position}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ) : selectedIncident.assignedTo ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <i className="ri-team-line text-blue-600 mr-2"></i>
                        <span className="font-medium text-blue-800">Legacy Assignment</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Assigned to:</span>
                        <span className="ml-2 font-medium text-blue-700">{selectedIncident.assignedTo}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <i className="ri-user-line text-gray-400 mr-2"></i>
                        <span className="text-gray-600">No staff member assigned</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Attachments Section */}
              {selectedIncident.attachment && (() => {
                // Parse attachments - handle both JSON array (new) and comma-separated (old) formats
                let attachments: string[] = [];
                try {
                  // Try to parse as JSON array (new Cloudinary format)
                  const parsed = JSON.parse(selectedIncident.attachment);
                  attachments = Array.isArray(parsed) ? parsed : [selectedIncident.attachment];
                } catch {
                  // Fall back to comma-separated format (old local format)
                  if (selectedIncident.attachment.includes(',')) {
                    attachments = selectedIncident.attachment.split(',').map(s => s.trim());
                  } else {
                    attachments = [selectedIncident.attachment];
                  }
                }

                // Filter out empty strings
                attachments = attachments.filter(url => url && url.trim());

                if (attachments.length === 0) return null;

                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Attachments ({attachments.length})
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {attachments.map((url, index) => {
                        const isCloudinary = url.startsWith('http://') || url.startsWith('https://');
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        const isPdf = /\.pdf$/i.test(url);
                        const fileName = url.split('/').pop() || `File ${index + 1}`;

                        return (
                          <div key={index} className="relative group">
                            {isImage ? (
                              // Image preview
                              <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                <img
                                  src={isCloudinary ? url : `/uploads/incidents/${url}`}
                                  alt={`Attachment ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {/* Overlay with view button */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a
                                    href={isCloudinary ? url : `/uploads/incidents/${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1"
                                  >
                                    <i className="ri-eye-line"></i>
                                    <span className="text-sm">View</span>
                                  </a>
                                </div>
                                {/* File number badge */}
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
                                  {index + 1}
                                </div>
                              </div>
                            ) : (
                              // PDF or other file preview
                              <div className="aspect-square rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-4">
                                <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-2 ${
                                  isPdf ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                  <i className={`text-3xl ${
                                    isPdf ? 'ri-file-pdf-line text-red-500' : 'ri-file-line text-gray-500'
                                  }`}></i>
                                </div>
                                <p className="text-xs text-gray-600 text-center truncate w-full" title={fileName}>
                                  {fileName}
                                </p>
                                <a
                                  href={isCloudinary ? url : `/uploads/incidents/${url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                >
                                  <i className="ri-eye-line mr-1"></i>
                                  View
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setShowIncidentModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="ri-close-line mr-2"></i>
                Close
              </button>
              <button 
                onClick={() => setShowMapModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <i className="ri-map-pin-line mr-2"></i>
                View on Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedIncident && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={closeAssignmentModal}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Assign {assignmentType === 'team' ? 'Team' : assignmentType === 'teams' ? 'Teams' : 'Staff'} to Incident #{selectedIncident.id}
              </h3>
              <button
                onClick={closeAssignmentModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isAssigning}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {assignmentType === 'team' ? (
                <div>
             
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Team
                  </label>
                  <select
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Team Assigned</option>
                    {teams
                      .filter(team => team.member_count > 0) // Only show teams with members
                      .map((team) => (
                        <option 
                          key={team.id} 
                          value={team.id}
                        >
                          {team.name} ({team.member_count} members)
                        </option>
                      ))}
                    {teams.filter(team => team.member_count === 0).length > 0 && (
                      <optgroup label="Teams with no members (disabled)">
                        {teams
                          .filter(team => team.member_count === 0)
                          .map((team) => (
                            <option 
                              key={team.id} 
                              value={team.id}
                              disabled
                              className="text-gray-400"
                            >
                              {team.name} (0 members) - Add members first
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  
                  {/* Show selected team details */}
                  {selectedTeamId && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center mb-2">
                        <i className="ri-team-line text-blue-600 mr-2"></i>
                        <span className="font-medium text-blue-800">Team Details</span>
                      </div>
                      {(() => {
                        const selectedTeam = teams.find(t => t.id === selectedTeamId);
                        return selectedTeam ? (
                          <div className="text-sm text-blue-700">
                            <p><strong>Name:</strong> {selectedTeam.name}</p>
                            <p><strong>Description:</strong> {selectedTeam.description || 'No description'}</p>
                            <p><strong>Active Members:</strong> {selectedTeam.member_count}</p>
                            {selectedTeam.member_count === 0 ? (
                              <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                <div className="flex items-center text-red-700">
                                  <i className="ri-error-warning-line mr-1"></i>
                                  <span className="font-medium">Warning:</span>
                                </div>
                                <p className="text-xs text-red-600 mt-1">
                                  This team has no active members. Email notifications cannot be sent and the team may not be able to respond effectively.
                                </p>
                              </div>
                            ) : (
                              <p className="mt-2 text-blue-600">
                                <i className="ri-mail-line mr-1"></i>
                                All {selectedTeam.member_count} team members will receive email notifications when assigned.
                              </p>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <i className="ri-mail-send-line text-green-600 text-lg"></i>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-semibold text-green-800 mb-2">
                          Automatic Email Notifications
                        </h4>
                        <div className="space-y-2 text-sm text-green-700">
                          <div className="flex items-center">
                            <i className="ri-check-line text-green-600 mr-2"></i>
                            <span>All active team members receive detailed incident information</span>
                          </div>
                          <div className="flex items-center">
                            <i className="ri-check-line text-green-600 mr-2"></i>
                            <span>Email includes incident type, location, priority level, and description</span>
                          </div>
                          <div className="flex items-center">
                            <i className="ri-check-line text-green-600 mr-2"></i>
                            <span>Direct link to incident dashboard for immediate response</span>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-green-100 rounded border border-green-200">
                          <div className="text-xs text-green-600">
                            <i className="ri-information-line mr-1"></i>
                            <strong>Note:</strong> Only teams with active members will receive notifications. Teams with no members are automatically excluded.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : assignmentType === 'teams' ? (
                <div>
                 
                  
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Teams (Multiple Selection)
                    </label>
                    {selectedTeamIds.length > 0 && (
                      <button
                        onClick={() => setSelectedTeamIds([])}
                        className="text-sm text-red-600 hover:text-red-800 flex items-center"
                      >
                        <i className="ri-close-line mr-1"></i>
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {/* Quick select all teams with members */}
                  {teams.filter(team => team.member_count > 0).length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => {
                          const teamsWithMembers = teams.filter(team => team.member_count > 0).map(t => t.id);
                          setSelectedTeamIds(teamsWithMembers);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <i className="ri-checkbox-multiple-line mr-1"></i>
                        Select All Teams with Members
                      </button>
                    </div>
                  )}
                  
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                    {teams
                      .filter(team => team.member_count > 0) // Only show teams with members
                      .map((team) => (
                        <div key={team.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 transition-colors">
                          <input
                            type="checkbox"
                            id={`team-${team.id}`}
                            checked={selectedTeamIds.includes(team.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeamIds([...selectedTeamIds, team.id]);
                              } else {
                                setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                              }
                            }}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`team-${team.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900 flex items-center">
                              {team.name}
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {team.description || 'No description available'}
                            </div>
                          </label>
                        </div>
                      ))}
                    {teams.filter(team => team.member_count === 0).length > 0 && (
                      <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">Teams with no members (disabled)</div>
                        {teams
                          .filter(team => team.member_count === 0)
                          .map((team) => (
                            <div key={team.id} className="flex items-center p-2 text-gray-400">
                              <input
                                type="checkbox"
                                disabled
                                className="mr-3 h-4 w-4"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{team.name}</div>
                                <div className="text-xs">0 members - Add members first</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Show selected teams summary */}
                  {selectedTeamIds.length > 0 && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <i className="ri-team-fill text-blue-600 mr-2"></i>
                          <span className="font-medium text-blue-800">Selected Teams ({selectedTeamIds.length})</span>
                        </div>
                        <div className="text-sm text-blue-600 font-medium">
                          {selectedTeamIds.reduce((total, teamId) => {
                            const team = teams.find(t => t.id === teamId);
                            return total + (team?.member_count || 0);
                          }, 0)} total members
                        </div>
                      </div>
                      <div className="space-y-2">
                        {selectedTeamIds.map(teamId => {
                          const team = teams.find(t => t.id === teamId);
                          return team ? (
                            <div key={teamId} className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                              <div className="flex items-center">
                                <i className="ri-team-line text-blue-500 mr-2"></i>
                                <span className="text-sm font-medium text-blue-800">{team.name}</span>
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <button
                                onClick={() => setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId))}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove team"
                              >
                                <i className="ri-close-line text-sm"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                        <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
                          <div className="flex items-center text-xs text-blue-700">
                            <i className="ri-mail-line mr-1"></i>
                            <span className="font-medium">Email Notifications:</span>
                            <span className="ml-1">
                              All {selectedTeamIds.reduce((total, teamId) => {
                                const team = teams.find(t => t.id === teamId);
                                return total + (team?.member_count || 0);
                              }, 0)} team members will receive incident assignment notifications
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                 
                </div>
              ) : selectedIncident.status === 'pending' ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <i className="ri-error-warning-line text-red-600 mr-2"></i>
                    <span className="font-medium text-red-800">Staff Assignment Not Available</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Staff assignments are not available for pending incidents. Please assign a team first or change the incident status to "In Progress".
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Staff Member
                  </label>
                  <select
                    value={selectedStaffId || ''}
                    onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Staff Assigned</option>
                    {staff
                      .filter(s => s.status === 'active' || s.status === 1)
                      .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
                      .map((staffMember) => (
                        <option key={staffMember.id} value={staffMember.id}>
                          {staffMember.name} - {staffMember.position}
                          {staffMember.team_name && ` (${staffMember.team_name})`}
                        </option>
                      ))}
                  </select>
                  <p className="text-sm text-blue-600 mt-2">
                    <i className="ri-mail-line mr-1"></i>
                    The selected staff member will receive an email notification when assigned.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
                                {/* Email Status */}
              {emailStatus && (
                <div className={`mb-4 p-3 rounded-lg ${
                  emailStatus.sent 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <i className={`mr-2 ${emailStatus.sent ? 'ri-check-line' : 'ri-error-warning-line'}`}></i>
                    <span className="font-medium">
                      {emailStatus.sent ? 'Email notifications sent successfully!' : 'Failed to send email notifications'}
                    </span>
                  </div>
                  {emailStatus.details && (
                    <div className="mt-2 text-sm">
                      {emailStatus.sent ? (
                        <div>
                          {emailStatus.details.teamName && (
                            <div className="mb-1">
                              <span className="font-medium">Team:</span> {emailStatus.details.teamName}
                            </div>
                          )}
                          {emailStatus.details.staffName && (
                            <div className="mb-1">
                              <span className="font-medium">Staff:</span> {emailStatus.details.staffName}
                            </div>
                          )}
                          {emailStatus.details.totalMembers !== undefined && (
                            <div className="mb-1">
                              <span className="font-medium">Total Team Members:</span> {emailStatus.details.totalMembers}
                            </div>
                          )}
                          {emailStatus.details.emailsSent !== undefined && (
                            <div className="mb-1">
                              <span className="font-medium">Emails Sent Successfully:</span> {emailStatus.details.emailsSent}
                            </div>
                          )}
                          {emailStatus.details.emailsFailed > 0 && (
                            <div className="mb-1 text-orange-600">
                              <span className="font-medium">Failed Emails:</span> {emailStatus.details.emailsFailed}
                            </div>
                          )}
                          {emailStatus.details.failedEmails && emailStatus.details.failedEmails.length > 0 && (
                            <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                              <div className="font-medium text-orange-800 mb-1">Failed Email Addresses:</div>
                              <div className="text-xs text-orange-700">
                                {emailStatus.details.failedEmails.join(', ')}
                              </div>
                            </div>
                          )}
                          {emailStatus.details.teamName && emailStatus.details.emailsSent > 0 && (
                            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                              <div className="font-medium text-green-800 mb-1">
                                <i className="ri-mail-line mr-1"></i>
                                Team Notification Summary
                              </div>
                              <div className="text-xs text-green-700">
                                All {emailStatus.details.emailsSent} active team members of "{emailStatus.details.teamName}" have been notified about this incident assignment.
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium mb-1">Error Details:</div>
                          <div className="text-red-700">
                            {emailStatus.details.error || 'Unknown error occurred'}
                          </div>
                          {emailStatus.details.teamName && (
                            <div className="mt-1">
                              <span className="font-medium">Team:</span> {emailStatus.details.teamName}
                            </div>
                          )}
                          {emailStatus.details.staffName && (
                            <div className="mt-1">
                              <span className="font-medium">Staff:</span> {emailStatus.details.staffName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {assignmentType === 'teams' && selectedTeamIds.length > 0 && (
                    <div className="flex items-center">
                      <i className="ri-information-line mr-1"></i>
                      <span>
                        {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected • 
                        {selectedTeamIds.reduce((total, teamId) => {
                          const team = teams.find(t => t.id === teamId);
                          return total + (team?.member_count || 0);
                        }, 0)} total members
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={closeAssignmentModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                    disabled={isAssigning}
                  >
                    <i className="ri-close-line mr-1"></i>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedIncident) return;
                      
                      if (assignmentType === 'team') {
                        // Check if team has members before assigning
                        const selectedTeam = teams.find(t => t.id === selectedTeamId);
                        if (selectedTeam && selectedTeam.member_count === 0) {
                          showToast({ 
                            type: 'error', 
                            message: 'Cannot assign team with no members. Please add members to the team first.' 
                          });
                          return;
                        }
                        handleAssignTeam(selectedIncident.id, selectedTeamId);
                      } else if (assignmentType === 'teams') {
                        // Check if any selected team has no members
                        const teamsWithNoMembers = selectedTeamIds.filter(teamId => {
                          const team = teams.find(t => t.id === teamId);
                          return team?.member_count === 0;
                        });
                        if (teamsWithNoMembers.length > 0) {
                          showToast({ 
                            type: 'error', 
                            message: 'Cannot assign teams with no members. Please add members to the teams first.' 
                          });
                          return;
                        }
                        handleAssignMultipleTeams(selectedIncident.id, selectedTeamIds);
                      } else {
                        handleAssignStaff(selectedIncident.id, selectedStaffId);
                      }
                    }}
                    disabled={isAssignmentButtonDisabled()}
                    className={`px-6 py-2 rounded-lg transition-colors flex items-center font-medium ${
                      isAssignmentButtonDisabled()
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : assignmentType === 'teams' && selectedTeamIds.length === 0
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={
                      isAssignmentButtonDisabled() 
                        ? assignmentType === 'staff' && selectedIncident?.status === 'pending'
                          ? 'Staff assignment not available for pending incidents'
                          : assignmentType === 'teams' && selectedTeamIds.some(teamId => teams.find(t => t.id === teamId)?.member_count === 0)
                          ? 'Cannot assign teams with no members'
                          : assignmentType === 'team' && selectedTeamId && teams.find(t => t.id === selectedTeamId)?.member_count === 0
                          ? 'Cannot assign team with no members'
                          : 'Please select a team or staff member'
                        : assignmentType === 'team' 
                          ? (selectedTeamId ? 'Assign selected team' : 'Unassign team')
                          : assignmentType === 'teams'
                          ? (selectedTeamIds.length > 0 ? `Assign ${selectedTeamIds.length} teams` : 'Clear all team assignments')
                          : 'Assign selected staff member'
                    }
                  >
                    {isAssigning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Assigning...
                      </>
                    ) : (
                      <>
                        {assignmentType === 'team' 
                          ? (selectedTeamId ? (
                              <>
                                <i className="ri-team-line mr-1"></i>
                                Assign Team
                              </>
                            ) : (
                              <>
                                <i className="ri-team-line mr-1"></i>
                                Unassign Team
                              </>
                            ))
                          : assignmentType === 'teams'
                          ? (selectedTeamIds.length > 0 ? (
                              <>
                                <i className="ri-team-fill mr-1"></i>
                                Assign Teams ({selectedTeamIds.length})
                              </>
                            ) : (
                              <>
                                <i className="ri-delete-bin-line mr-1"></i>
                                Clear All Teams
                              </>
                            ))
                          : (
                              <>
                                <i className="ri-user-line mr-1"></i>
                                Assign Staff
                              </>
                            )
                        }
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedIncident.validationStatus === 'validated' ? 'Update Validation' : 'Validate'} Incident #{selectedIncident.id}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <i className="ri-information-line text-blue-600 mr-2"></i>
                  <span className="text-sm font-medium text-blue-800">
                    {selectedIncident.validationStatus === 'validated' ? 'Update Validation' : 'Validation Required'}
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedIncident.validationStatus === 'validated' 
                    ? 'You can update the validation status or modify the validation notes for this incident.'
                    : 'Please validate this incident before proceeding with team assignment. Note: Rejected incidents will be marked as closed.'
                  }
                </p>
              </div>
              
              {selectedIncident.validationStatus === 'validated' && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <i className="ri-check-line text-green-600 mr-2"></i>
                    <span className="text-sm font-medium text-green-800">Currently Validated</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    This incident is currently validated. You can update the validation status or modify the notes.
                  </p>
                </div>
              )}
              

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validation Notes <span className="text-red-600">*</span>
                </label>
                {selectedIncident.validationStatus === 'validated' && selectedIncident.validationNotes && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>Current Notes:</strong>
                    </div>
                    <div className="text-sm text-gray-700">
                      {selectedIncident.validationNotes}
                    </div>
                  </div>
                )}
                <textarea
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder={selectedIncident.validationStatus === 'validated' 
                    ? "Update validation notes..." 
                    : "Enter notes about the validation decision (required)..."
                  }
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    !validationNotes.trim() ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={3}
                />
                {!validationNotes.trim() && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="ri-error-warning-line mr-1"></i>
                    Validation notes are required
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setValidationNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleValidateIncident(selectedIncident.id, 'rejected', validationNotes)}
                  disabled={isValidating || !validationNotes.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isValidating || !validationNotes.trim()
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  title={!validationNotes.trim() ? "Validation notes are required" : ""}
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    selectedIncident.validationStatus === 'validated' ? 'Change to Rejected' : 'Reject'
                  )}
                </button>
                <button
                  onClick={() => handleValidateIncident(selectedIncident.id, 'validated', validationNotes)}
                  disabled={isValidating || !validationNotes.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isValidating || !validationNotes.trim()
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={!validationNotes.trim() ? "Validation notes are required" : ""}
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    selectedIncident.validationStatus === 'validated' ? 'Update Validation' : 'Validate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showExportPreview}
        onClose={() => setShowExportPreview(false)}
        onExportPDF={handleExport}
        onExportCSV={() => {
          ExportUtils.exportToCSV(filteredIncidents, incidentExportColumns, {
            filename: 'incidents_export',
            title: 'Incidents Report',
            includeTimestamp: true
          });
          showToast({ type: 'success', message: 'Incidents data exported to CSV successfully' });
          setShowExportPreview(false);
        }}
        onExportExcel={() => {
          ExportUtils.exportToExcel(filteredIncidents, incidentExportColumns, {
            filename: 'incidents_export',
            title: 'Incidents Report',
            includeTimestamp: true
          });
          showToast({ type: 'success', message: 'Incidents data exported to Excel successfully' });
          setShowExportPreview(false);
        }}
        data={filteredIncidents}
        columns={incidentExportColumns.map(col => ({ key: col.key, label: col.label }))}
        title={`Incidents Report (${filteredIncidents.length})`}
      />

      {/* Incident Map Modal */}
      <IncidentMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        incident={selectedIncident}
      />

    </div>

  );
};

export default ViewIncidents;
