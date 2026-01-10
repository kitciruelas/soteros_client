"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../components/base/Button"
import Card from "../../components/base/Card"
import Navbar from "../../components/Navbar"
import { getAuthState, type UserData } from "../../utils/auth"
import { getAuthToken } from "../../utils/api"

interface TimelineEvent {
  id: string
  stage: string
  status: string
  timestamp: string
  description: string
  assignedTo?: string
  notes?: string
}

interface IncidentReport {
  incident_id: string
  incident_type: string
  description: string
  location: string
  latitude?: number
  longitude?: number
  priority_level: string
  reporter_safe_status: string
  status: string
  date_reported: string
  updated_at: string
  assigned_team_name?: string
  assigned_staff_name?: string
  reporter_name?: string
  validation_status?: string
  validation_notes?: string
  remarks?: string
  assigned_to?: string
  timeline?: TimelineEvent[]
}

// Extended UserData interface for this component
interface ExtendedUserData {
  userId?: number
  user_id?: number
  id?: string | number
  firstName?: string
  lastName?: string
  email?: string
  userType?: string
  [key: string]: any
}

const PRIORITY_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MODERATE: "moderate",
  MEDIUM: "medium",
  LOW: "low",
} as const

const STATUS_TYPES = {
  RESOLVED: "resolved",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
  CLOSED: "closed",
} as const

const SAFETY_STATUS = {
  SAFE: "safe",
  INJURED: "injured",
  UNKNOWN: "unknown",
} as const

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function HistoryReportPage() {
  const navigate = useNavigate()
  const [userData, setUserData] = useState<ExtendedUserData | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, string>>({})
  const [locationCache, setLocationCache] = useState<{ [key: string]: string }>({})
  const [geocodingInProgress, setGeocodingInProgress] = useState<{ [key: string]: boolean }>({})

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredReports = useMemo(() => {
    return incidentReports.filter((report) => {
      const matchesStatus = filterStatus === "all" || report.status?.toLowerCase() === filterStatus.toLowerCase()
      const matchesSearch =
        !debouncedSearchTerm ||
        report.incident_type?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (report.location && report.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      return matchesStatus && matchesSearch
    })
  }, [incidentReports, filterStatus, debouncedSearchTerm])

  const summaryStats = useMemo(
    () => ({
      total: filteredReports.length,
      resolved: filteredReports.filter((r) => r.status === STATUS_TYPES.RESOLVED).length,
      inProgress: filteredReports.filter((r) => r.status === STATUS_TYPES.IN_PROGRESS).length,
      critical: filteredReports.filter((r) => r.priority_level === PRIORITY_LEVELS.CRITICAL).length,
    }),
    [filteredReports],
  )

  useEffect(() => {
    const authState = getAuthState()
    console.log("Auth state in History Report:", authState)
    if (!authState.isAuthenticated) {
      navigate("/auth/login")
      return
    }
    console.log("User data in History Report:", authState.userData)
    setUserData(authState.userData as ExtendedUserData)
    setIsAuthenticated(true)

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState()
      if (!newAuthState.isAuthenticated) {
        navigate("/auth/login")
        return
      }
      setIsAuthenticated(newAuthState.isAuthenticated)
      setUserData(newAuthState.userData)
    }

    window.addEventListener("storage", handleAuthStateChange)
    window.addEventListener("authStateChanged", handleAuthStateChange)

    return () => {
      window.removeEventListener("storage", handleAuthStateChange)
      window.removeEventListener("authStateChanged", handleAuthStateChange)
    }
  }, [navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchIncidentReports()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const geocodeReports = async () => {
      const reportsToGeocode = incidentReports.filter(
        (report) => report.latitude && report.longitude && !report.location,
      )

      for (const report of reportsToGeocode) {
        const coordKey = `${report.latitude},${report.longitude}`
        if (!geocodedLocations[coordKey] && !geocodingInProgress[coordKey]) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const address = await geocodeCoordinates(report.latitude!, report.longitude!)
            setGeocodedLocations((prev) => ({ ...prev, [coordKey]: address }))
          } catch (error) {
            console.error("Geocoding failed for", coordKey, error)
          }
        }
      }
    }

    if (incidentReports.length > 0) {
      geocodeReports()
    }
  }, [incidentReports, geocodedLocations, geocodingInProgress])

  const fetchIncidentReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const authState = getAuthState()
      const userData = authState.userData as ExtendedUserData
      let userId = userData?.userId || userData?.user_id || userData?.id

      console.log("🔍 Auth state:", authState)
      console.log("🔍 User data for ID extraction:", userData)
      console.log("🔍 Extracted userId:", userId)

      if (!userId) {
        const storageKeys = ["userInfo", "user", "admin", "staff"]
        for (const key of storageKeys) {
          const storedData = localStorage.getItem(key) || sessionStorage.getItem(key)
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData)
              userId =
                parsedData.userId || parsedData.user_id || parsedData.id || parsedData.admin_id || parsedData.staff_id
              if (userId) {
                console.log(`✅ Found userId ${userId} in storage key: ${key}`)
                break
              }
            } catch (e) {
              console.error(`Error parsing ${key} from storage:`, e)
            }
          }
        }
      }

      if (!userId) {
        throw new Error("User ID not found. Please try logging in again.")
      }

      console.log("✅ Final userId for API call:", userId)

      // Health check with timeout
      const healthController = new AbortController()
      const healthTimeout = setTimeout(() => healthController.abort(), 5000)

      try {
        console.log("🔍 Checking backend health...")
        const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://soteros-backend.onrender.com/api');
        const healthCheck = await fetch(`${apiBaseUrl}/health`, {
          signal: healthController.signal,
        })
        clearTimeout(healthTimeout)

        if (!healthCheck.ok) {
          throw new Error(`Backend health check failed: ${healthCheck.status} ${healthCheck.statusText}`)
        }
        console.log("✅ Backend health check passed")
      } catch (healthError) {
        clearTimeout(healthTimeout)
        console.error("❌ Backend health check failed:", healthError)
        throw new Error("Cannot connect to backend server. Please ensure the server is running.")
      }

      // Fetch incidents with timeout
      const fetchController = new AbortController()
      const fetchTimeout = setTimeout(() => fetchController.abort(), 10000)

      console.log(`🔍 Fetching incidents for user ID: ${userId}`)
      
      // Get the correct API base URL
      const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://soteros-backend.onrender.com/api');
      const apiUrl = `${apiBaseUrl}/incidents/user/${userId}`;
      
      console.log(`🔍 API URL: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
          },
        signal: fetchController.signal,
      })

      clearTimeout(fetchTimeout)

      console.log("📡 Response status:", response.status, response.statusText)

      if (!response.ok) {
        let errorText
        try {
          errorText = await response.text()
          console.error("Response body (text):", errorText)

          if (errorText.trim().startsWith("{") || errorText.trim().startsWith("[")) {
            const errorJson = JSON.parse(errorText)
            throw new Error(errorJson.message || `HTTP error! status: ${response.status}`)
          } else {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
          }
        } catch (parseError) {
          console.error("Error parsing response:", parseError)
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
        }
      }

      const data = await response.json()
      console.log("✅ API response data:", data)

      if (data.success && data.incidents) {
        const reportsWithTimeline = data.incidents.map((incident: IncidentReport) => ({
          ...incident,
          timeline: generateTimelineFromIncident(incident),
        }))

        setIncidentReports(reportsWithTimeline)
        console.log(`✅ Successfully loaded ${reportsWithTimeline.length} incident reports`)
      } else {
        throw new Error(data.message || "Failed to fetch incidents")
      }
    } catch (err) {
      console.error("❌ Error fetching incident reports:", err)
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch incident reports. Please try again later.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateTimelineFromIncident = useCallback((incident: IncidentReport): TimelineEvent[] => {
    const timeline: TimelineEvent[] = []
    
    const reportedDate = incident.date_reported
    const updatedDate = incident.updated_at || incident.date_reported

    // Always start with the reported date
    timeline.push({
      id: `${incident.incident_id}-1`,
      stage: "Reported",
      status: "Submitted",
      timestamp: reportedDate,
      description: `Incident report submitted: ${incident.incident_type}`,
      notes: "Initial report received and logged",
    })

    // Add validation stage - use actual updated_at timestamp
    if (incident.validation_status && incident.validation_status !== "unvalidated") {
      timeline.push({
        id: `${incident.incident_id}-2`,
        stage: "Validation",
        status: incident.validation_status === "validated" ? "Validated" : "Rejected",
        timestamp: updatedDate, // Use actual updated_at timestamp
        description: `Report ${incident.validation_status} by admin team`,
        assignedTo: incident.validation_status === "validated" ? "Valid by Admin Team" : "Invalid by Admin Team",
        notes: incident.validation_notes || "Priority level confirmed",
      })
    }

    // Add assignment stage - use actual updated_at timestamp
    if (incident.assigned_team_name || incident.assigned_staff_name) {
      timeline.push({
        id: `${incident.incident_id}-3`,
        stage: "Assigned",
        status: "Assigned",
        timestamp: updatedDate, // Use actual updated_at timestamp
        description: `Incident assigned to ${incident.assigned_team_name || incident.assigned_staff_name}`,
        assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
        notes: "Response team notified and dispatched",
      })
    }

    // Add status-based stages - use actual updated_at timestamp
    if (incident.status && incident.status !== "pending") {
      if (
        [STATUS_TYPES.IN_PROGRESS, "investigation", STATUS_TYPES.RESOLVED, STATUS_TYPES.CLOSED].includes(
          incident.status as any,
        )
      ) {
        timeline.push({
          id: `${incident.incident_id}-4`,
          stage: "In Progress",
          status: "In Progress",
          timestamp: updatedDate, // Use actual updated_at timestamp
          description: "Response team dispatched and investigation started",
          assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
          notes: "Team arrived at scene and began assessment",
        })
      }

      if (incident.status === STATUS_TYPES.RESOLVED) {
        timeline.push({
          id: `${incident.incident_id}-6`,
          stage: "Resolution",
          status: "Resolved",
          timestamp: updatedDate, // Use actual updated_at timestamp
          description: "Incident successfully resolved and contained",
          assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
          notes: "All immediate threats addressed and situation stabilized",
        })
      }

      if (incident.status === STATUS_TYPES.CLOSED) {
        timeline.push({
          id: `${incident.incident_id}-7`,
          stage: "Closed",
          status: "Closed",
          timestamp: updatedDate, // Use actual updated_at timestamp
          description: "Incident officially closed and case completed",
          assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
          notes: "All documentation completed and follow-up scheduled",
        })
      }
    }

    // Add current stage if different from last timeline event
    const currentStage = getCurrentStage(incident.status)
    const lastTimelineEvent = timeline[timeline.length - 1]

    if (lastTimelineEvent && lastTimelineEvent.stage !== currentStage) {
      timeline.push({
        id: `${incident.incident_id}-current`,
        stage: currentStage,
        status:
          incident.status?.replace("_", " ").charAt(0).toUpperCase() + incident.status?.replace("_", " ").slice(1) ||
          "Current",
        timestamp: updatedDate, // Use actual updated_at for current stage
        description: `Currently at ${currentStage} stage`,
        assignedTo: incident.assigned_team_name || incident.assigned_staff_name,
        notes: "Latest status update",
      })
    }

    return timeline
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority?.toLowerCase()) {
      case PRIORITY_LEVELS.CRITICAL:
        return "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200"
      case PRIORITY_LEVELS.HIGH:
        return "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-200"
      case PRIORITY_LEVELS.MODERATE:
      case PRIORITY_LEVELS.MEDIUM:
        return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200"
      case PRIORITY_LEVELS.LOW:
        return "bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case STATUS_TYPES.RESOLVED:
        return "bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200"
      case STATUS_TYPES.IN_PROGRESS:
      case "in progress":
        return "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200"
      case STATUS_TYPES.PENDING:
        return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200"
      case STATUS_TYPES.CLOSED:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
    }
  }, [])

  const getSafetyStatusColor = useCallback((safetyStatus: string) => {
    switch (safetyStatus?.toLowerCase()) {
      case SAFETY_STATUS.SAFE:
        return "bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200"
      case SAFETY_STATUS.INJURED:
        return "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200"
      case SAFETY_STATUS.UNKNOWN:
        return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
    }
  }, [])

  const getStageColor = useCallback((stage: string) => {
    switch (stage.toLowerCase()) {
      case "reported":
        return "bg-blue-500"
      case "validation":
        return "bg-yellow-500"
      case "assigned":
        return "bg-purple-500"
      case "in progress":
        return "bg-orange-500"
      case "resolution":
      case "resolved":
        return "bg-green-500"
      case "closed":
        return "bg-indigo-500"
      case "follow-up":
      case "monitoring":
        return "bg-teal-500"
      default:
        return "bg-gray-500"
    }
  }, [])

  const getCurrentStage = useCallback((status: string): string => {
    switch (status?.toLowerCase()) {
      case STATUS_TYPES.PENDING:
        return "Reported"
      case STATUS_TYPES.IN_PROGRESS:
      case "in progress":
        return "In Progress"
      case STATUS_TYPES.RESOLVED:
        return "Resolution"
      case STATUS_TYPES.CLOSED:
        return "Closed"
      default:
        return "Reported"
    }
  }, [])

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid Date"
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Invalid Date"
    }
  }, [])

  const toggleReportExpansion = useCallback((reportId: string) => {
    setExpandedReports((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(reportId)) {
        newExpanded.delete(reportId)
      } else {
        newExpanded.add(reportId)
      }
      return newExpanded
    })
  }, [])

  const geocodeCoordinates = useCallback(
    async (latitude: number, longitude: number): Promise<string> => {
      const lat = Number(latitude)
      const lng = Number(longitude)
      const cacheKey = `${lat},${lng}`

      if (locationCache[cacheKey]) {
        return locationCache[cacheKey]
      }

      setGeocodingInProgress((prev) => ({ ...prev, [cacheKey]: true }))

      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(10000), // 10 second timeout
          },
        )

        if (response.ok) {
          const data = await response.json()

          const locationParts = []
          if (data.road) locationParts.push(data.road)
          else if (data.locality && !data.locality.includes("Barangay")) locationParts.push(data.locality)

          if (data.locality && data.locality.includes("Barangay")) locationParts.push(data.locality)
          else if (data.suburb && data.suburb.toLowerCase().includes("barangay")) locationParts.push(data.suburb)

          if (data.county && data.county !== data.locality && data.county !== data.suburb)
            locationParts.push(data.county)
          if (data.city && data.city !== data.county && data.city !== data.locality && data.city !== data.suburb)
            locationParts.push(data.city)

          if (locationParts.length > 0) {
            const locationName = locationParts.join(", ")
            setLocationCache((prev) => ({ ...prev, [cacheKey]: locationName }))
            return locationName
          }
        }

        // Fallback to backend proxy
        try {
          const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://soteros-backend.onrender.com/api');
          const proxyResponse = await fetch(`${apiBaseUrl}/geocode?lat=${lat}&lon=${lng}`, {
            signal: AbortSignal.timeout(10000),
          })
          if (proxyResponse.ok) {
            const proxyData = await proxyResponse.json()
            if (proxyData.display_name) {
              const parts = proxyData.display_name.split(", ")
              const locationName = parts.slice(0, 3).join(", ")
              setLocationCache((prev) => ({ ...prev, [cacheKey]: locationName }))
              return locationName
            }
          }
        } catch (proxyError) {
          console.log("Backend proxy geocoding failed, using coordinate format")
        }

        // Final fallback
        const latDir = lat >= 0 ? "N" : "S"
        const lngDir = lng >= 0 ? "E" : "W"
        const locationName = `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`
        setLocationCache((prev) => ({ ...prev, [cacheKey]: locationName }))
        return locationName
      } catch (error) {
        console.error("Geocoding error:", error)
        const locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        setLocationCache((prev) => ({ ...prev, [cacheKey]: locationName }))
        return locationName
      } finally {
        setGeocodingInProgress((prev) => ({ ...prev, [cacheKey]: false }))
      }
    },
    [locationCache],
  )

  const handleNewReport = useCallback(() => {
    navigate("/incident-report")
  }, [navigate])


  const clearFilters = useCallback(() => {
    setSearchTerm("")
    setFilterStatus("all")
  }, [])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData as UserData} />

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <i className="ri-file-list-3-line text-2xl"></i>
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold">Report History</h1>
                      <p className="text-blue-100 text-lg">
                        Track and manage your incident reports
                      </p>
                    </div>
                  </div>
                  <p className="text-blue-100 text-base max-w-2xl">
                    View detailed timelines, track progress, and monitor the status of all your reported incidents with comprehensive analytics.
                  </p>
                </div>
               
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Section */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="ri-search-line mr-2 text-blue-500"></i>
                  Search Reports
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="ri-search-line text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by incident type, description, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white text-base transition-all duration-200 placeholder-gray-400"
                  />
                  {debouncedSearchTerm !== searchTerm && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  )}
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <i className="ri-close-line text-lg"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Section */}
              <div className="lg:w-80">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="ri-filter-line mr-2 text-blue-500"></i>
                  Filter by Status
                </label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white text-base transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="resolved">✅ Resolved</option>
                    <option value="in_progress">🔄 In Progress</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="closed">🔒 Closed</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <i className="ri-arrow-down-s-line text-gray-400"></i>
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(searchTerm || filterStatus !== "all") && (
                <div className="flex items-end">
                  <Button
                    onClick={clearFilters}
                    className="px-6 py-4 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                  >
                    <i className="ri-refresh-line mr-2"></i>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Active Filters Display */}
            {(searchTerm || filterStatus !== "all") && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      <i className="ri-search-line"></i>
                      "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm("")}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  )}
                  {filterStatus !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <i className="ri-filter-line"></i>
                      {filterStatus.replace("_", " ").charAt(0).toUpperCase() + filterStatus.replace("_", " ").slice(1)}
                      <button
                        onClick={() => setFilterStatus("all")}
                        className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                      >
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Enhanced Reports List */}
        {isLoading ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <div className="p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Reports</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Fetching your incident reports and preparing the timeline view...
                </p>
                <div className="mt-6 flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Connecting to backend server</span>
                </div>
              </div>
            </div>
          </Card>
        ) : error ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <div className="p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-error-warning-line text-3xl text-red-500"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Unable to Load Reports</h3>
                <p className="text-red-600 mb-8 text-lg font-medium max-w-lg mx-auto">{error}</p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={fetchIncidentReports}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    <i className="ri-refresh-line mr-2"></i>
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    <i className="ri-restart-line mr-2"></i>
                    Refresh Page
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <div className="p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-file-list-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  {searchTerm || filterStatus !== "all" ? "No Matching Reports" : "No Reports Found"}
                </h3>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  {searchTerm || filterStatus !== "all"
                    ? "No incident reports match your current search and filter criteria. Try adjusting your filters or search terms."
                    : "You haven't created any incident reports yet."}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {searchTerm || filterStatus !== "all" && (
                    <Button
                      onClick={clearFilters}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                    >
                      <i className="ri-refresh-line mr-2"></i>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredReports.map((report) => (
              <Card
                key={report.incident_id}
                className="hover:shadow-xl transition-all duration-300 border-0 bg-white/90 backdrop-blur-sm overflow-hidden group"
              >
                <div className="relative">
                  <div className="p-6 lg:p-8">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                              {report.incident_type}
                            </h3>
                            <p className="text-gray-700 text-base leading-relaxed line-clamp-2">
                              {report.description}
                            </p>
                          </div>
                          
                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getStatusColor(report.status)}`}
                            >
                              <i className="ri-checkbox-circle-line mr-1"></i>
                              {report.status?.replace("_", " ").charAt(0).toUpperCase() +
                                report.status?.replace("_", " ").slice(1)}
                            </span>
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getSafetyStatusColor(report.reporter_safe_status)}`}
                            >
                              <i className="ri-shield-check-line mr-1"></i>
                              {report.reporter_safe_status?.charAt(0).toUpperCase() +
                                report.reporter_safe_status?.slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Location Section */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <i className="ri-map-pin-line text-blue-600"></i>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 text-sm mb-1">Location</h4>
                                <div className="text-gray-700 text-base">
                                  {report.location && report.location.trim() !== "" ? (
                                    report.location
                                  ) : report.latitude && report.longitude ? (
                                    geocodingInProgress[`${report.latitude},${report.longitude}`] ? (
                                      <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                                        <span className="text-gray-500">Loading location...</span>
                                      </div>
                                    ) : (
                                      locationCache[`${report.latitude},${report.longitude}`] ||
                                      `${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}`
                                    )
                                  ) : (
                                    "Location not specified"
                                  )}
                                </div>
                                {report.latitude && report.longitude && (
                                  <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border">
                                    Lat: {Number(report.latitude).toFixed(6)}, Lng: {Number(report.longitude).toFixed(6)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {report.latitude && report.longitude && (
                              <button
                                onClick={() => {
                                  const lat = Number(report.latitude)
                                  const lng = Number(report.longitude)
                                  const url = `https://www.google.com/maps?q=${lat},${lng}`
                                  window.open(url, "_blank")
                                }}
                                className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-all duration-200 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 hover:scale-105"
                              >
                                <i className="ri-map-line mr-2"></i>
                                <span className="hidden sm:inline">View on Map</span>
                                <span className="sm:hidden">Map</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Assignment Info */}
                        {(report.assigned_team_name || report.assigned_staff_name) && (
                          <div className="flex items-center text-sm text-gray-600 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            <i className="ri-user-line mr-3 text-green-600"></i>
                            <span className="font-medium">Assigned to:</span>
                            <span className="ml-2 font-semibold text-green-700">
                              {report.assigned_team_name || report.assigned_staff_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <i className="ri-time-line mr-2 text-blue-500"></i>
                            <span className="font-medium">Reported:</span>
                            <span className="ml-2">{formatDate(report.date_reported)}</span>
                          </div>
                          <div className="flex items-center">
                            <i className="ri-refresh-line mr-2 text-green-500"></i>
                            <span className="font-medium">Updated:</span>
                            <span className="ml-2">{formatDate(report.updated_at)}</span>
                          </div>
                        </div>

                        {/* Notes Section */}
                        {(report.validation_notes || report.remarks) && (
                          <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[300px]">
                            {report.validation_notes && (
                              <div className="flex items-start bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <i className="ri-chat-1-line mr-2 mt-0.5 text-blue-500"></i>
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-blue-700 block mb-1">Admin Notes:</span>
                                  <span className="text-sm text-blue-800 italic">"{report.validation_notes}"</span>
                                </div>
                              </div>
                            )}

                            {report.remarks && (
                              <div className="flex items-start bg-green-50 p-3 rounded-lg border border-green-200">
                                <i className="ri-file-edit-line mr-2 mt-0.5 text-green-500"></i>
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-green-700 block mb-1">Staff Remarks:</span>
                                  <span className="text-sm text-green-800 italic">"{report.remarks}"</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Toggle */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => toggleReportExpansion(report.incident_id)}
                        className="flex items-center justify-center w-full px-6 py-3 text-blue-600 hover:text-blue-700 font-semibold transition-all duration-200 hover:bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 group"
                      >
                        <i
                          className={`ri-arrow-down-s-line mr-2 transition-transform duration-200 ${
                            expandedReports.has(report.incident_id) ? "rotate-180" : ""
                          }`}
                        ></i>
                        {expandedReports.has(report.incident_id) ? "Hide Timeline" : "View Detailed Timeline"}
                        <i className="ri-time-line ml-2"></i>
                      </button>
                    </div>

                  {/* Enhanced Timeline */}
                  {expandedReports.has(report.incident_id) && report.timeline && (
                    <div className="mt-8 pt-8 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-2xl font-bold text-gray-900 flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <i className="ri-time-line text-blue-600 text-xl"></i>
                          </div>
                          Incident Timeline
                        </h4>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Total Stages</div>
                          <div className="text-2xl font-bold text-blue-600">{report.timeline?.length || 0}</div>
                        </div>
                      </div>

                      {/* Current Stage Summary */}
                      <div className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white shadow-lg">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                              <i className="ri-pulse-line text-2xl"></i>
                            </div>
                            <div>
                              <h5 className="text-xl font-bold mb-1">Current Stage</h5>
                              <p className="text-blue-100 text-lg">
                                {getCurrentStage(report.status)} -{" "}
                                {report.status?.replace("_", " ").charAt(0).toUpperCase() +
                                  report.status?.replace("_", " ").slice(1)}
                              </p>
                            </div>
                          </div>
                          <div className="text-left lg:text-right">
                            <div className="text-blue-200 text-sm mb-1">Last Updated</div>
                            <div className="text-white text-lg font-semibold">{formatDate(report.updated_at)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Timeline Events */}
                      <div className="relative">
                        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-indigo-200 to-blue-300 rounded-full"></div>

                        <div className="space-y-6">
                          {report.timeline?.map((event, index) => {
                            const isCurrentStage = event.id.includes("current")
                            const isLast = index === (report.timeline?.length || 0) - 1

                            return (
                              <div key={event.id} className="relative flex items-start group">
                                {/* Timeline Dot */}
                                <div className="relative z-10 flex-shrink-0">
                                  <div
                                    className={`w-6 h-6 rounded-full ${getStageColor(event.stage)} border-4 border-white shadow-lg flex items-center justify-center ${
                                      isCurrentStage ? "ring-4 ring-blue-300 ring-offset-2 animate-pulse" : ""
                                    }`}
                                  >
                                    {isCurrentStage ? (
                                      <i className="ri-pulse-line text-white text-xs"></i>
                                    ) : (
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                  </div>
                                  {!isLast && (
                                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-blue-300 to-blue-400"></div>
                                  )}
                                </div>

                                {/* Event Content */}
                                <div className="ml-6 flex-1 min-w-0">
                                  <div
                                    className={`rounded-2xl p-6 border-2 transition-all duration-300 group-hover:shadow-lg ${
                                      isCurrentStage
                                        ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-lg"
                                        : "bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                                    }`}
                                  >
                                    {/* Event Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                      <div className="flex items-center space-x-3">
                                        <span
                                          className={`px-4 py-2 rounded-full text-sm font-bold text-white shadow-sm ${getStageColor(event.stage)} ${
                                            isCurrentStage ? "ring-2 ring-blue-300" : ""
                                          }`}
                                        >
                                          {event.stage}
                                          {isCurrentStage && <span className="ml-2 animate-pulse">●</span>}
                                        </span>
                                        <span
                                          className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${
                                            isCurrentStage
                                              ? "bg-blue-100 text-blue-700 border-blue-300"
                                              : "bg-gray-100 text-gray-700 border-gray-300"
                                          }`}
                                        >
                                          {event.status}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium text-gray-600 mb-1">Timestamp</div>
                                        <div className="text-sm font-semibold text-gray-800">{formatDate(event.timestamp)}</div>
                                      </div>
                                    </div>

                                    {/* Event Description */}
                                    <p className="text-gray-700 text-base leading-relaxed mb-4 font-medium">
                                      {event.description}
                                    </p>

                                    {/* Assignment Info */}
                                    {event.assignedTo && (
                                      <div className="flex items-center text-sm text-gray-600 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <i className="ri-user-line mr-2 text-green-600"></i>
                                        <span className="font-medium">Assigned to:</span>
                                        <span className="ml-2 font-semibold text-green-700">{event.assignedTo}</span>
                                      </div>
                                    )}

                                    {/* Event Notes */}
                                    {event.notes && (
                                      <div
                                        className={`p-4 rounded-xl border-l-4 ${
                                          isCurrentStage
                                            ? "text-blue-800 bg-blue-50 border-blue-400"
                                            : "text-gray-700 bg-gray-50 border-gray-300"
                                        }`}
                                      >
                                        <div className="flex items-start">
                                          <i className="ri-chat-1-line mr-2 mt-0.5 text-blue-500"></i>
                                          <div>
                                            <div className="text-xs font-semibold text-gray-600 mb-1">Notes:</div>
                                            <div className="text-sm italic">{event.notes}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Current Stage Indicator */}
                                    {isCurrentStage && (
                                      <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-200 rounded-xl">
                                        <div className="flex items-center text-blue-700 font-semibold">
                                          <i className="ri-information-line mr-2"></i>
                                          <span>This is the current stage of your incident</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

  
      </div>
    </div>
  )
}
