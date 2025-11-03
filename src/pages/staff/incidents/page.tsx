"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getAuthState } from "../../../utils/auth"
import { incidentsApi, teamsApi, staffManagementApi } from "../../../utils/api"

import ExportPreviewModal from "../../../components/base/ExportPreviewModal"
import type { ExportColumn } from "../../../utils/exportUtils"
import ExportUtils from "../../../utils/exportUtils"
import { useToast } from "../../../components/base/Toast"

interface Incident {
  incident_id: number
  incident_type: string
  description: string
  location: string
  latitude: number | string
  longitude: number | string
  priority_level: string
  reporter_safe_status: string
  status: string
  reported_by: string | null
  reporter_name: string
  reporter_phone?: string
  guest_name?: string
  guest_id?: number
  guest_contact?: string
  reporter_type?: "guest" | "user"
  attachment?: string | null
  remarks?: string | null
  assigned_team_id?: number | null
  assigned_team_name?: string
  assigned_team_ids?: string // Comma-separated list of team IDs
  all_assigned_teams?: string // Comma-separated list of team names
  assigned_staff_id?: number | null
  assigned_staff_name?: string
  date_reported: string
  date_resolved?: string
  assignment_type?: "individual" | "team" | "teams" | "unknown"
  resolvedLocation?: string
}

interface Team {
  id: number
  name: string
  description: string
  member_count: number
}

const StaffIncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [availableStaff, setAvailableStaff] = useState<any[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all") // 'all', 'individual', 'team'
  const [viewMode, setViewMode] = useState<"active" | "history">("active") // 'active' for unresolved, 'history' for resolved
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [assignmentType, setAssignmentType] = useState<"team" | "staff">("team")
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; details?: any } | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string>("")
  const [updateNotes, setUpdateNotes] = useState<string>("")
  const [showExportModal, setShowExportModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const { showToast } = useToast()
  const [locationCache, setLocationCache] = useState<{ [key: string]: string }>({})
  const [geocodingInProgress, setGeocodingInProgress] = useState<{ [key: string]: boolean }>({})

  const authState = getAuthState()
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id
  const currentStaffTeamId = authState.userData?.assigned_team_id

  console.log("🔐 Auth state:", authState)
  console.log("👤 Current staff ID:", currentStaffId)
  console.log("👥 Current staff team ID:", currentStaffTeamId)

  useEffect(() => {
    // Only fetch if we have both staff ID and authentication
    if (currentStaffId && authState.isAuthenticated) {
      fetchIncidents()
      fetchTeams()
      fetchAvailableStaff()
    } else if (!authState.isAuthenticated) {
      console.warn('⚠️ User is not authenticated - skipping data fetch');
    } else if (!currentStaffId) {
      console.warn('⚠️ No staff ID available - skipping data fetch');
    }
  }, [currentStaffId, authState.isAuthenticated])

  useEffect(() => {
    filterIncidents()
  }, [incidents, searchTerm, statusFilter, assignmentFilter, viewMode])

  // Format assignment for export
  const formatAssignment = (incident: Incident) => {
    if (incident.all_assigned_teams) {
      return incident.all_assigned_teams
    }
    if (incident.assigned_team_name) {
      return incident.assigned_team_name
    }
    if (incident.assigned_staff_name) {
      return incident.assigned_staff_name
    }
    return "No assignment"
  }

  // Format reporter name for export (handles both regular users and guests)
  const formatReporterName = (value: string, incident: Incident) => {
    if (incident.reporter_type === "guest") {
      return incident.guest_name || "Unknown Guest"
    }
    return value || incident.reporter_name || "Unknown Reporter"
  }

  // Export columns configuration
  const exportColumns: ExportColumn[] = [
    { key: "incident_id", label: "Incident ID" },
    { key: "description", label: "Description" },
    { key: "reporter_name", label: "Reporter Name", format: (value, incident) => formatReporterName(value, incident) },
    { key: "assignment", label: "Assigned Team", format: (value, incident) => formatAssignment(incident) },
    { key: "remarks", label: "Notes", format: (value) => value || "No notes" },
    { key: "date_reported", label: "Date Reported", format: (value) => ExportUtils.formatDateTime(value) },
    { key: "updated_at", label: "Date Resolved", format: (value) => (value ? ExportUtils.formatDateTime(value) : "") },
  ]

  // Export functions
  const handleExportPDF = async () => {
    try {
      await ExportUtils.exportToPDF(filteredIncidents, exportColumns, {
        filename: "staff_incidents",
        title: "Staff Incidents Report",
        includeTimestamp: true,
      })
      showToast({
        type: "success",
        title: "Export Successful",
        message: "PDF export completed successfully",
        durationMs: 3000
      })
      setShowExportModal(false)
    } catch (error) {
      console.error("PDF export failed:", error)
      showToast({
        type: "error",
        title: "Export Failed",
        message: "Failed to export PDF. Please try again.",
        durationMs: 5000
      })
    }
  }

  const handleExportCSV = () => {
    try {
      ExportUtils.exportToCSV(filteredIncidents, exportColumns, {
        filename: "staff_incidents",
        includeTimestamp: true,
      })
      showToast({
        type: "success",
        title: "Export Successful",
        message: "CSV export completed successfully",
        durationMs: 3000
      })
      setShowExportModal(false)
    } catch (error) {
      console.error("CSV export failed:", error)
      showToast({
        type: "error",
        title: "Export Failed",
        message: "Failed to export CSV. Please try again.",
        durationMs: 5000
      })
    }
  }

  const handleExportExcel = () => {
    try {
      ExportUtils.exportToExcel(filteredIncidents, exportColumns, {
        filename: "staff_incidents",
        includeTimestamp: true,
      })
      showToast({
        type: "success",
        title: "Export Successful",
        message: "Excel export completed successfully",
        durationMs: 3000
      })
      setShowExportModal(false)
    } catch (error) {
      console.error("Excel export failed:", error)
      showToast({
        type: "error",
        title: "Export Failed",
        message: "Failed to export Excel. Please try again.",
        durationMs: 5000
      })
    }
  }

  const fetchIncidents = async () => {
    try {
      // Check authentication before making request
      const currentAuthState = getAuthState()
      if (!currentAuthState.isAuthenticated) {
        console.error("❌ User is not authenticated - cannot fetch incidents")
        return
      }

      console.log("🔍 Fetching incidents for staff ID:", currentStaffId)

      // Use the new staff-specific endpoint
      if (!currentStaffId) {
        console.error("❌ No staff ID available")
        return
      }
      const response = await incidentsApi.getStaffIncidents(Number(currentStaffId))

      if (response.success && response.incidents) {
        console.log("📋 Staff incidents response:", response)
        console.log("👤 Staff info:", response.staffInfo)
        console.log("📊 Assignment stats:", response.assignmentStats)

        // Geocode locations for each incident
        const incidentsWithLocations = await Promise.all(
          response.incidents.map(async (incident: any) => {
            try {
              const locationName = await getLocationName(incident.latitude, incident.longitude)
              return {
                ...incident,
                resolvedLocation: locationName,
              }
            } catch (error) {
              console.error("Error geocoding incident location:", error)
              return {
                ...incident,
                resolvedLocation: `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`,
              }
            }
          }),
        )

        setIncidents(incidentsWithLocations)

        // Update team ID from the response if available
        if (response.staffInfo?.teamId && !currentStaffTeamId) {
          console.log("🔄 Updating team ID from response:", response.staffInfo.teamId)
          // Note: In a real app, you might want to update the auth state here
        }
      }
    } catch (error) {
      console.error("Error fetching staff incidents:", error)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getTeams()
      if (response.success && response.teams) {
        setTeams(response.teams)
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const fetchAvailableStaff = async () => {
    try {
      const response = await staffManagementApi.getStaff({ status: "active" })
      if (response.success && response.data?.users) {
        setAvailableStaff(response.data.users)
      }
    } catch (error) {
      console.error("Error fetching available staff:", error)
    }
  }

  // Geocoding function to convert coordinates to location names
  const getLocationName = async (latitude: number | string, longitude: number | string): Promise<string> => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const cacheKey = `${lat},${lng}`

    // Check cache first
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey]
    }

    // Set geocoding in progress
    setGeocodingInProgress((prev) => ({ ...prev, [cacheKey]: true }))

    try {
      // Use our backend proxy for geocoding - use full API URL
      const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://soteros-backend.onrender.com/api');
      const token = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo') || '{}').token : null;
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `${API_BASE_URL}/geocoding/reverse?lat=${lat}&lon=${lng}`,
        { headers }
      )

      if (!response.ok) {
        console.error('Geocoding API error:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('Geocoding API error:', data.message);
        throw new Error(data.message || 'Geocoding failed');
      }

      const locationName = data.data || "Unknown Location";

      // Cache the result
      setLocationCache((prev) => ({
        ...prev,
        [cacheKey]: locationName,
      }));

      return locationName;
    } catch (error) {
      console.error("Error geocoding coordinates:", error)
    } finally {
      // Clear geocoding in progress
      setGeocodingInProgress((prev) => ({ ...prev, [cacheKey]: false }))
    }

    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }

  const filterIncidents = () => {
    let filtered = incidents

    // View mode filter (first priority)
    if (viewMode === "active") {
      // Show only unresolved incidents: pending and in_progress
      filtered = filtered.filter((incident) => incident.status === "pending" || incident.status === "in_progress")
    } else if (viewMode === "history") {
      // Show only resolved incidents: resolved and closed
      filtered = filtered.filter((incident) => incident.status === "resolved" || incident.status === "closed")
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (incident) =>
          getIncidentTypeText(incident.incident_type).includes(searchTerm.toUpperCase()) ||
          incident.incident_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter (only applies within the view mode)
    if (statusFilter !== "all") {
      filtered = filtered.filter((incident) => incident.status === statusFilter)
    }

    // Assignment filter
    if (assignmentFilter !== "all") {
      if (assignmentFilter === "individual") {
        filtered = filtered.filter((incident) => incident.assigned_staff_id === currentStaffId)
      } else if (assignmentFilter === "team") {
        filtered = filtered.filter((incident) => {
          // Check single team assignment
          if (incident.assigned_team_id === currentStaffTeamId) {
            return true;
          }
          // Check multiple team assignments
          if (incident.assigned_team_ids && currentStaffTeamId) {
            const teamIds = incident.assigned_team_ids.split(',').map(id => Number(id.trim()));
            return teamIds.includes(currentStaffTeamId);
          }
          return false;
        });
      }
    }
    
    // If no assignment filter, still show incidents assigned to staff's team
    if (assignmentFilter === "all" && currentStaffTeamId) {
      filtered = filtered.filter((incident) => {
        // Check single team assignment
        if (incident.assigned_team_id === currentStaffTeamId) {
          return true;
        }
        // Check multiple team assignments
        if (incident.assigned_team_ids) {
          const teamIds = incident.assigned_team_ids.split(',').map(id => Number(id.trim()));
          return teamIds.includes(currentStaffTeamId);
        }
        // Check individual assignment
        if (incident.assigned_staff_id === currentStaffId) {
          return true;
        }
        return false;
      });
    }

    setFilteredIncidents(filtered)
  }

  const handleAssignTeam = async (incidentId: number, teamId: number | null) => {
    try {
      setIsAssigning(true)
      setEmailStatus(null)

      console.log("🔄 Assigning team to incident:", { incidentId, teamId })

      const response = await incidentsApi.assignTeamToIncident(incidentId, teamId)

      console.log("✅ Team assignment response:", response)

      // Update local state
      setIncidents((prev) =>
        prev.map((incident) => {
          if (incident.incident_id === incidentId) {
            const selectedTeam = teams.find((team) => team.id === teamId)
            return {
              ...incident,
              assigned_team_id: teamId,
              assigned_team_name: selectedTeam?.name || undefined,
              assigned_staff_id: undefined, // Clear staff assignment when team is assigned
              assigned_staff_name: undefined,
            }
          }
          return incident
        }),
      )

      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails,
        })
        console.log("📧 Email notifications sent successfully:", response.emailDetails)
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: "No email details provided" },
        })
        console.log("⚠️ Email notifications failed:", response.emailDetails)
      }

      setTimeout(() => {
        setShowAssignmentModal(false)
        setEmailStatus(null)
      }, 3000)
    } catch (error) {
      console.error("❌ Error assigning team to incident:", error)
      setEmailStatus({
        sent: false,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleAssignStaff = async (incidentId: number, staffId: number | null) => {
    try {
      setIsAssigning(true)
      setEmailStatus(null)

      console.log("🔄 Assigning staff to incident:", { incidentId, staffId })

      const response = await incidentsApi.assignStaffToIncident(incidentId, staffId)

      console.log("✅ Staff assignment response:", response)

      // Update local state
      setIncidents((prev) =>
        prev.map((incident) => {
          if (incident.incident_id === incidentId) {
            return {
              ...incident,
              assigned_staff_id: staffId,
              assigned_staff_name: staffId ? "Assigned Staff" : undefined,
              assigned_team_id: undefined, // Clear team assignment when staff is assigned
              assigned_team_name: undefined,
            }
          }
          return incident
        }),
      )

      // Show email status
      if (response?.emailSent) {
        setEmailStatus({
          sent: true,
          details: response.emailDetails,
        })
        console.log("📧 Email notification sent successfully:", response.emailDetails)
      } else {
        setEmailStatus({
          sent: false,
          details: response.emailDetails || { error: "No email details provided" },
        })
        console.log("⚠️ Email notification failed:", response.emailDetails)
      }

      setTimeout(() => {
        setShowAssignmentModal(false)
        setEmailStatus(null)
      }, 3000)
    } catch (error) {
      console.error("❌ Error assigning staff to incident:", error)
      setEmailStatus({
        sent: false,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUpdateIncident = async (incidentId: number, status: string, notes: string) => {
    try {
      setIsUpdating(true)
      setEmailStatus(null)

      // Check authentication before making request
      const currentAuthState = getAuthState()
      if (!currentAuthState.isAuthenticated || currentAuthState.userType !== 'staff') {
        console.error("❌ User is not authenticated as staff - cannot update incident")
        showToast({
          type: "error",
          title: "Authentication Required",
          message: "Please log in again to update incidents.",
          durationMs: 5000
        })
        return
      }

      // Validate that notes (remarks) is not empty
      if (!notes || !notes.trim()) {
        showToast({
          type: "error",
          title: "Remarks Required",
          message: "Remarks are required when updating incident status.",
          durationMs: 4000
        })
        setIsUpdating(false)
        return
      }

      console.log("🔄 Updating incident:", { incidentId, status, notes })

      // Call the update API
      const response = await incidentsApi.updateIncidentStatus(incidentId, { status, notes })

      console.log("✅ Update response:", response)

      if (!response.success) {
        throw new Error(response.message || 'Failed to update incident')
      }

      // Update local state with both status and remarks
      setIncidents((prev) =>
        prev.map((incident) => {
          if (incident.incident_id === incidentId) {
            return {
              ...incident,
              status: status,
              remarks: notes, // Also update remarks field
            }
          }
          return incident
        }),
      )

      // Show success toast
      showToast({
        type: "success",
        title: "Incident Updated",
        message: "Incident updated successfully.",
        durationMs: 3000
      })

      // Close modal
      setTimeout(() => {
        setShowUpdateModal(false)
        setUpdateStatus("")
        setUpdateNotes("")
      }, 1000)
    } catch (error) {
      console.error("❌ Error updating incident:", error)

      // Show error notification with detailed message
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to update incident. Please try again."
      
      // Check if it's an authentication error
      if (errorMessage.includes('Authentication') || errorMessage.includes('token') || errorMessage.includes('401')) {
        showToast({
          type: "error",
          title: "Authentication Failed",
          message: "Please log in again to update incidents.",
          durationMs: 5000
        })
      } else {
        showToast({
          type: "error",
          title: "Update Failed",
          message: errorMessage,
          durationMs: 5000
        })
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "moderate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200"
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getIncidentTypeText = (incidentType: string) => {
    return incidentType.toUpperCase()
  }

  const getAssignmentType = (incident: Incident) => {
    // Use the assignment_type from backend if available, otherwise fallback to logic
    if (incident.assignment_type) {
      return incident.assignment_type
    }

    if (incident.assigned_staff_id === currentStaffId) {
      return "individual"
    } else if (incident.assigned_team_ids) {
      // Check if current team is in the list of assigned teams
      const teamIds = incident.assigned_team_ids.split(',').map(id => Number(id.trim()))
      if (currentStaffTeamId && teamIds.includes(currentStaffTeamId)) {
        return "teams"
      }
    } else if (incident.assigned_team_id === currentStaffTeamId) {
      return "team"
    }
    return "unknown"
  }

  const getAssignmentBadge = (incident: Incident) => {
    const assignmentType = getAssignmentType(incident)
    if (assignmentType === "individual") {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
          Individual
        </span>
      )
    } else if (assignmentType === "teams") {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
          Multiple Teams
        </span>
      )
    } else if (assignmentType === "team") {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
          Team
        </span>
      )
    }
    return null
  }

  const openIncidentModal = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowIncidentModal(true)
  }

  const closeIncidentModal = () => {
    setShowIncidentModal(false)
    setSelectedIncident(null)
  }

  const openAssignmentModal = (incident: Incident) => {
    setSelectedIncident(incident)
    setAssignmentType("team")
    setSelectedTeamId(incident.assigned_team_id || null)
    setSelectedStaffId(incident.assigned_staff_id || null)
    setShowAssignmentModal(true)
  }

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false)
    setSelectedIncident(null)
    setSelectedTeamId(null)
    setSelectedStaffId(null)
    setEmailStatus(null)
  }

  const openUpdateModal = (incident: Incident) => {
    // Prevent opening update modal for resolved or closed incidents
    if (incident.status === "resolved" || incident.status === "closed") {
      showToast({
        type: "error",
        title: "Cannot Update",
        message: "Resolved and closed incidents cannot be modified.",
        durationMs: 4000
      })
      return
    }

    setSelectedIncident(incident)
    setUpdateStatus(incident.status)
    setUpdateNotes("")
    setShowUpdateModal(true)
  }

  const closeUpdateModal = () => {
    setShowUpdateModal(false)
    setSelectedIncident(null)
    setUpdateStatus("")
    setUpdateNotes("")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {viewMode === "active" ? "Active Incidents" : "Incident History"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {viewMode === "active"
                  ? "Manage incidents assigned to you individually or to your team"
                  : "View all resolved and closed incidents"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <i className="ri-download-line mr-2"></i>
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="border-b border-gray-200">
            <nav
              className="flex flex-col sm:flex-row sm:space-x-8 px-3 sm:px-4 md:px-6 space-y-1 sm:space-y-0"
              aria-label="Tabs"
            >
              <button
                onClick={() => setViewMode("active")}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  viewMode === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="ri-alert-line mr-2"></i>
                Active Incidents
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-800">
                  {incidents.filter((i) => i.status === "pending" || i.status === "in_progress").length}
                </span>
              </button>
              <button
                onClick={() => setViewMode("history")}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  viewMode === "history"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="ri-history-line mr-2"></i>
                Incident History
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-800">
                  {incidents.filter((i) => i.status === "resolved" || i.status === "closed").length}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 md:py-6">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          {/* Mobile Filter Toggle and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 lg:mb-0">
            {/* Search - Always visible */}
            <div className="flex-1 lg:max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>

            {/* Mobile Filter Toggle Button */}
            <div className="flex items-center justify-between lg:hidden">
              <span className="text-sm text-gray-600">
                {filteredIncidents.length} of {incidents.length} incidents
              </span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <i className={`mr-2 ${showFilters ? "ri-filter-off-line" : "ri-filter-line"}`}></i>
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>

            {/* Desktop Results Count */}
            <div className="hidden lg:flex items-center text-sm text-gray-600">
              {filteredIncidents.length} of {incidents.length} incidents
            </div>
          </div>

          {/* Filters - Hidden on mobile unless toggled, always visible on desktop */}
          <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 lg:pt-6 border-t border-gray-200 lg:border-t-0">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="all">All {viewMode === "active" ? "Active" : "History"} Statuses</option>
                  {viewMode === "active" ? (
                    <>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                    </>
                  ) : (
                    <>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </>
                  )}
                </select>
              </div>

             
            </div>
          </div>
        </div>

        {/* Incidents List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {viewMode === "active" ? "Active Incidents" : "Incident History"}
              </h3>
              <div className="text-sm text-gray-500">
                Showing {filteredIncidents.length} of{" "}
                {viewMode === "active"
                  ? incidents.filter((i) => i.status === "pending" || i.status === "in_progress").length
                  : incidents.filter((i) => i.status === "resolved" || i.status === "closed").length}{" "}
                {viewMode === "active" ? "active" : "resolved"} incidents
              </div>
            </div>
          </div>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <i
                className={`text-3xl sm:text-4xl mb-3 sm:mb-4 ${
                  viewMode === "active" ? "ri-inbox-line text-gray-400" : "ri-history-line text-green-400"
                }`}
              ></i>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {viewMode === "active" ? "No active incidents" : "No incident history"}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
                {viewMode === "active"
                  ? incidents.filter((i) => i.status === "pending" || i.status === "in_progress").length === 0
                    ? "You don't have any active incidents at the moment."
                    : "No active incidents match your current filters."
                  : incidents.filter((i) => i.status === "resolved" || i.status === "closed").length === 0
                    ? "You haven't resolved any incidents yet."
                    : "No resolved incidents match your current filters."}
              </p>
              {viewMode === "active" &&
                incidents.filter((i) => i.status === "pending" || i.status === "in_progress").length === 0 && (
                  <div className="mt-3 sm:mt-4">
                    <div className="text-xs text-gray-400">
                      <i className="ri-information-line mr-1"></i>
                      Active incidents will appear here when assigned to you or your team
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <>
              {/* Card-based Layout for All Incidents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6">
                {filteredIncidents.map((incident) => (
                  <div
                    key={incident.incident_id}
                    className={`bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-lg ${
                      incident.status === "resolved" || incident.status === "closed"
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {/* Header with Incident ID and Status */}
                    <div className="p-3 sm:p-4 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              incident.status === "resolved" || incident.status === "closed"
                                ? "bg-green-500"
                                : incident.status === "in_progress"
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            }`}
                          ></div>
                          <div>
                            <span className="text-sm font-semibold text-gray-900">#{incident.incident_id}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1.5 sm:space-y-2">
                          <span
                            className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(incident.priority_level)}`}
                          >
                            <i className="ri-flag-line mr-1"></i>
                            {incident.priority_level.charAt(0).toUpperCase() + incident.priority_level.slice(1)}
                          </span>
                          <span
                            className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(incident.status)}`}
                          >
                            {getStatusText(incident.status)}
                          </span>
                        </div>
                      </div>

                      {/* Incident Type and Description */}
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                          {getIncidentTypeText(incident.incident_type)}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {incident.description}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4 space-y-3">
                      {/* Location */}
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <i className="ri-map-pin-line text-red-600 text-xs sm:text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</div>
                          <div className="text-xs sm:text-sm text-gray-900 break-words">
                            {geocodingInProgress[`${incident.latitude},${incident.longitude}`] ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                                <span className="text-gray-500">Loading location...</span>
                              </div>
                            ) : (
                              incident.resolvedLocation || incident.location
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assignment */}
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <i className="ri-team-line text-blue-600 text-xs sm:text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Assignment
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {getAssignmentBadge(incident)}
                            {incident.all_assigned_teams ? (
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs sm:text-sm text-gray-700 font-medium break-words">
                                  {incident.all_assigned_teams}
                                </span>
                                {incident.assigned_team_ids && (
                                  <span className="text-xs text-gray-500">
                                    {incident.assigned_team_ids.split(',').length} teams assigned
                                  </span>
                                )}
                              </div>
                            ) : incident.assigned_team_name ? (
                              <span className="text-xs sm:text-sm text-gray-700 font-medium break-words">
                                {incident.assigned_team_name}
                              </span>
                            ) : null}
                            {incident.assigned_staff_name && (
                              <span className="text-xs sm:text-sm text-gray-700 font-medium break-words">
                                {incident.assigned_staff_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Date and Reporter */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-gray-100 space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                          <i className="ri-time-line text-gray-400"></i>
                          <div className="text-xs text-gray-500">
                            <div className="font-medium">{new Date(incident.date_reported).toLocaleDateString()}</div>
                            <div>
                              {new Date(incident.date_reported).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="ri-user-line text-gray-400"></i>
                          {incident.reporter_type === "guest" ? (
                            <div className="text-xs text-gray-500">
                              <div className="font-medium">{incident.guest_name || "Unknown Guest"}</div>
                              <div className="text-gray-400">ID: {incident.guest_id || "N/A"}</div>
                              {incident.guest_contact && (
                                <div className="text-gray-400 break-all">📞 {incident.guest_contact}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              <div className="font-medium">{incident.reporter_name}</div>
                              {incident.reporter_phone && (
                                <div className="text-gray-400 break-all">📞 {incident.reporter_phone}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => openIncidentModal(incident)}
                          className="w-full inline-flex items-center justify-center px-3 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                        >
                          <i className="ri-eye-line mr-2"></i>
                          View Details
                        </button>
                        <button
                          onClick={() => openUpdateModal(incident)}
                          disabled={incident.status === "resolved" || incident.status === "closed"}
                          className={`w-full inline-flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                            incident.status === "resolved" || incident.status === "closed"
                              ? "text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                              : "text-green-600 hover:text-green-900 hover:bg-green-50 border-green-200"
                          }`}
                        >
                          <i className="ri-edit-line mr-2"></i>
                          {incident.status === "resolved" || incident.status === "closed" ? "Completed" : "Update"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Incident Detail Modal */}
      {showIncidentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <i className="ri-alert-line text-lg sm:text-xl"></i>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">Incident #{selectedIncident.incident_id}</h2>
                    <p className="text-blue-100 text-xs sm:text-sm">{getIncidentTypeText(selectedIncident.incident_type)}</p>
                  </div>
                </div>
                <button
                  onClick={closeIncidentModal}
                  className="text-white hover:text-blue-100 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
                >
                  <i className="ri-close-line text-lg sm:text-xl"></i>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[calc(90vh-80px)] bg-gray-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Left Column */}
                <div className="space-y-4 sm:space-y-5">
                  {/* Description */}
                  <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-file-text-line text-blue-600 text-lg"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">Description</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base pl-14">{selectedIncident.description}</p>
                  </div>

                  {/* Location */}
                  <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-map-pin-line text-red-600 text-lg"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">Location</h3>
                    </div>
                    <div className="pl-14">
                      <p className="text-gray-800 mb-2 text-sm sm:text-base font-medium break-words">
                        {selectedIncident.resolvedLocation || selectedIncident.location}
                      </p>
                      {selectedIncident.resolvedLocation &&
                        selectedIncident.resolvedLocation !== selectedIncident.location && (
                          <div className="mt-2 p-2 bg-gray-100 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 font-mono break-all">
                              <span className="font-semibold">Coordinates:</span> {Number(selectedIncident.latitude).toFixed(4)},{" "}
                              {Number(selectedIncident.longitude).toFixed(4)}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-team-line text-green-600 text-lg"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">Assignment</h3>
                    </div>
                    <div className="pl-14 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getAssignmentBadge(selectedIncident)}
                      </div>
                      {selectedIncident.assigned_team_name && (
                        <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <i className="ri-team-line text-blue-600"></i>
                          <span className="text-sm font-medium text-gray-800 break-words">
                            {selectedIncident.assigned_team_name}
                          </span>
                        </div>
                      )}
                      {selectedIncident.assigned_staff_name && (
                        <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
                          <i className="ri-user-line text-purple-600"></i>
                          <span className="text-sm font-medium text-gray-800 break-words">
                            {selectedIncident.assigned_staff_name}
                          </span>
                        </div>
                      )}
                      {selectedIncident.all_assigned_teams && (
                        <div className="flex flex-col space-y-1 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Multiple Teams</span>
                          <span className="text-sm font-medium text-gray-800 break-words">
                            {selectedIncident.all_assigned_teams}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4 sm:space-y-5">
                  {/* Priority & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-flag-line text-orange-600 text-lg"></i>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg">Priority</h3>
                      </div>
                      <div className="pl-14">
                        <span
                          className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-full border ${getPriorityColor(selectedIncident.priority_level)}`}
                        >
                          {selectedIncident.priority_level.charAt(0).toUpperCase() +
                            selectedIncident.priority_level.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-time-line text-purple-600 text-lg"></i>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg">Status</h3>
                      </div>
                      <div className="pl-14">
                        <span
                          className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-full border ${getStatusColor(selectedIncident.status)}`}
                        >
                          {getStatusText(selectedIncident.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-user-line text-indigo-600 text-lg"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">Reporter</h3>
                    </div>
                    <div className="pl-14">
                      {selectedIncident.reporter_type === "guest" ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <i className="ri-user-line text-indigo-600"></i>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {selectedIncident.guest_name || "Unknown Guest"}
                              </div>
                              <div className="text-xs text-indigo-600 font-medium">Guest Reporter</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Guest ID</div>
                              <div className="text-sm font-medium text-gray-900">{selectedIncident.guest_id || "N/A"}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Incident ID</div>
                              <div className="text-sm font-medium text-gray-900">#{selectedIncident.incident_id}</div>
                            </div>
                            <div className="col-span-2 bg-gray-50 p-2 rounded-lg">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</div>
                              <div className="text-sm font-medium text-gray-900 break-all">
                                {selectedIncident.guest_contact || "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <i className="ri-user-line text-indigo-600"></i>
                            </div>
                            <div className="text-gray-800 font-bold text-base">
                              {selectedIncident.reporter_name}
                            </div>
                          </div>
                          {selectedIncident.reporter_phone && (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <i className="ri-phone-line text-gray-600"></i>
                              <span className="text-sm font-medium text-gray-700 break-all">
                                {selectedIncident.reporter_phone}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-calendar-line text-gray-600 text-lg"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">Timeline</h3>
                    </div>
                    <div className="pl-14 space-y-3">
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-sm font-medium text-gray-600">Reported:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {new Date(selectedIncident.date_reported).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Time:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {new Date(selectedIncident.date_reported).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {selectedIncident.date_resolved && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100 pt-3 border-t-2 border-green-200">
                          <span className="text-sm font-medium text-gray-600">Resolved:</span>
                          <span className="text-sm font-bold text-green-700">
                            {new Date(selectedIncident.date_resolved).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selectedIncident.attachment && (() => {
                // Parse attachments - handle both JSON array (new Cloudinary format) and comma-separated (old) formats
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
                  <div className="bg-white rounded-xl p-4 md:p-5 mt-4 md:mt-6 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-attachment-line text-amber-600 text-lg"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                        Attachments <span className="text-sm font-normal text-gray-500">({attachments.length})</span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                      {attachments.map((url, index) => {
                        const isCloudinary = url.startsWith('http://') || url.startsWith('https://');
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        const isPdf = /\.pdf$/i.test(url);
                        const fileName = url.split('/').pop() || `File ${index + 1}`;
                        const imageUrl = isCloudinary ? url : `/uploads/incidents/${url}`;
                        const fileUrl = isCloudinary ? url : `/uploads/incidents/${url}`;

                        return (
                          <div key={index} className="relative group">
                            {isImage ? (
                              // Image preview
                              <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                <img
                                  src={imageUrl}
                                  alt={`Attachment ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = "/images/placeholder-image.png"
                                  }}
                                />
                                {/* Overlay with view button */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a
                                    href={fileUrl}
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
                                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-2 ${
                                  isPdf ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                  <i className={`text-2xl sm:text-3xl ${
                                    isPdf ? 'ri-file-pdf-line text-red-500' : 'ri-file-line text-gray-500'
                                  }`}></i>
                                </div>
                                <p className="text-xs text-gray-600 text-center truncate w-full" title={fileName}>
                                  {fileName}
                                </p>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                >
                                  <i className="ri-download-line mr-1"></i>
                                  Download
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

              {/* Remarks */}
              {selectedIncident.remarks && (
                <div className="bg-white rounded-xl p-4 md:p-5 mt-4 md:mt-6 shadow-sm border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-chat-1-line text-blue-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Staff Remarks</h3>
                  </div>
                  <div className="pl-14">
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-base whitespace-pre-wrap bg-white p-3 rounded-lg border border-blue-100">
                      {selectedIncident.remarks}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white px-4 sm:px-6 md:px-8 py-4 md:py-5 border-t border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    closeIncidentModal()
                    openUpdateModal(selectedIncident)
                  }}
                  disabled={selectedIncident.status === "resolved" || selectedIncident.status === "closed"}
                  className={`w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                    selectedIncident.status === "resolved" || selectedIncident.status === "closed"
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                      : "bg-green-600 text-white hover:bg-green-700 hover:shadow-md"
                  }`}
                >
                  <i className="ri-edit-line mr-2"></i>
                  {selectedIncident.status === "resolved" || selectedIncident.status === "closed"
                    ? "Incident Completed"
                    : "Update Incident"}
                </button>
                <button
                  onClick={closeIncidentModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                >
                  <i className="ri-close-line mr-2"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-[95vw] sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Reassign Incident #{selectedIncident.incident_id}
                </h2>
                <button onClick={closeAssignmentModal} className="text-gray-400 hover:text-gray-600 p-1">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="team"
                        checked={assignmentType === "team"}
                        onChange={(e) => setAssignmentType(e.target.value as "team" | "staff")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Team Assignment</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="staff"
                        checked={assignmentType === "staff"}
                        onChange={(e) => setAssignmentType(e.target.value as "team" | "staff")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Individual Staff Assignment</span>
                    </label>
                  </div>
                </div>

                {assignmentType === "team" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
                    <select
                      value={selectedTeamId || ""}
                      onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    >
                      <option value="">Clear Assignment</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.member_count} members)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {assignmentType === "staff" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff</label>
                    <select
                      value={selectedStaffId || ""}
                      onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    >
                      <option value="">Clear Assignment</option>
                      {availableStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} - {staff.position}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {emailStatus && (
                  <div
                    className={`p-3 rounded-md ${
                      emailStatus.sent
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}
                  >
                    <div className="flex items-center">
                      <i className={`mr-2 ${emailStatus.sent ? "ri-check-line" : "ri-error-warning-line"}`}></i>
                      <span className="text-sm font-medium">
                        {emailStatus.sent ? "Email notifications sent successfully" : "Email notifications failed"}
                      </span>
                    </div>
                    {emailStatus.details && (
                      <div className="mt-2 text-xs space-y-1">
                        {emailStatus.details.error && <div>Error: {emailStatus.details.error}</div>}
                        {emailStatus.details.teamName && <div>Team: {emailStatus.details.teamName}</div>}
                        {emailStatus.details.totalMembers && <div>Members: {emailStatus.details.totalMembers}</div>}
                        {emailStatus.details.emailsSent && <div>Sent: {emailStatus.details.emailsSent}</div>}
                        {emailStatus.details.emailsFailed && <div>Failed: {emailStatus.details.emailsFailed}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={closeAssignmentModal}
                  className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedIncident) return

                    if (assignmentType === "team") {
                      handleAssignTeam(selectedIncident.incident_id, selectedTeamId)
                    } else {
                      handleAssignStaff(selectedIncident.incident_id, selectedStaffId)
                    }
                  }}
                  disabled={isAssigning}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center text-sm font-medium ${
                    isAssigning
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isAssigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    "Assign"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Incident Modal */}
      {showUpdateModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-[95vw] sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Update Incident #{selectedIncident.incident_id}
                </h2>
                <button onClick={closeUpdateModal} className="text-gray-400 hover:text-gray-600 p-1">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <div className="text-sm text-gray-900 mb-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedIncident.status)}`}
                    >
                      {getStatusText(selectedIncident.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Enter remarks about this status update..."
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Please provide details about this status update
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={closeUpdateModal}
                  className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedIncident) return
                    handleUpdateIncident(selectedIncident.incident_id, updateStatus, updateNotes)
                  }}
                  disabled={isUpdating || !updateStatus || !updateNotes.trim()}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center text-sm font-medium ${
                    isUpdating || !updateStatus || !updateNotes.trim()
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    "Update Incident"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        data={filteredIncidents.map((incident) => ({
          ...incident,
          assignment: formatAssignment(incident),
          updated_at: incident.date_resolved,
        }))}
        columns={exportColumns.map((col) => ({ key: col.key, label: col.label }))}
        title="Export Staff Incidents"
      />

    </div>
  )
}

export default StaffIncidentsPage
