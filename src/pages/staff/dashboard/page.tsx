"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getAuthState } from "../../../utils/auth"
import { incidentsApi, alertsApi, evacuationCentersApi, staffDashboardApi } from "../../../utils/api"
import L from "leaflet"

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Custom icon for incidents
const incidentIcon = L.divIcon({
  html: `
    <div style="
      background-color: #ef4444;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <i class="ri-alert-line" style="color: white; font-size: 10px;"></i>
    </div>
  `,
  className: "incident-marker",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
})

// Custom icons for different evacuation center statuses
const createEvacuationIcon = (status: "open" | "full" | "closed") => {
  const color = status === "open" ? "#10b981" : status === "full" ? "#ef4444" : "#6b7280"

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="ri-building-2-line" style="color: white; font-size: 12px;"></i>
      </div>
    `,
    className: "custom-evacuation-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

interface Incident {
  incident_id: number
  incident_type: string
  description: string
  location: string
  status: string
  priority_level: string
  date_reported: string
  latitude?: number
  longitude?: number
}

interface Alert {
  id: number
  alert_type: string
  alert_severity: string
  title: string
  description: string
  message?: string
  latitude: number
  longitude: number
  radius_km: number
  status: string
  priority?: string
  recipients?: string[]
  location_text?: string
  sent_at?: string
  created_at: string
  updated_at: string
}

interface EvacuationCenter {
  center_id: number
  name: string
  latitude: number
  longitude: number
  capacity: number
  current_occupancy: number
  status: "open" | "full" | "closed"
  contact_person: string
  contact_number: string
  last_updated: string
}

interface DashboardStats {
  totalIncidents: number
  pendingIncidents: number
  inProgressIncidents: number
  resolvedIncidents: number
  criticalIncidents: number
  highPriorityIncidents: number
}

const StaffDashboardPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    pendingIncidents: 0,
    inProgressIncidents: 0,
    resolvedIncidents: 0,
    criticalIncidents: 0,
    highPriorityIncidents: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [evacuationCenters, setEvacuationCenters] = useState<EvacuationCenter[]>([])
  const [allIncidents, setAllIncidents] = useState<Incident[]>([])

  const authState = getAuthState()
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id

  console.log("🔐 Auth state:", authState)
  console.log("👤 Current staff ID:", currentStaffId)

  useEffect(() => {
    if (currentStaffId) {
      fetchStats()
      fetchIncidents()
      fetchEvacuationCenters()
      fetchAlerts()
    }

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [currentStaffId])

  useEffect(() => {
    // Show last 5 incidents from all incidents, sorted by date
    const sortedIncidents = [...allIncidents].sort(
      (a, b) => new Date(b.date_reported).getTime() - new Date(a.date_reported).getTime(),
    )
    setRecentIncidents(sortedIncidents.slice(0, 5))
  }, [allIncidents])

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      console.log("🔍 Fetching incidents assigned to staff ID:", currentStaffId)
      const response = await incidentsApi.getStaffIncidents(Number(currentStaffId))

      if (response.success && response.incidents) {
        console.log("📋 Assigned incidents:", response.incidents)
        setAllIncidents(response.incidents)
        // All incidents returned are already assigned to this staff member
        setIncidents(response.incidents)
        // Calculate stats from assigned incidents
        calculateStatsFromIncidents(response.incidents)
      }
    } catch (error) {
      console.error("Error fetching incidents:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvacuationCenters = async () => {
    try {
      const response = await evacuationCentersApi.getCenters()
      if (response.success && response.data) {
        setEvacuationCenters(response.data)
      }
    } catch (error) {
      console.error("Error fetching evacuation centers:", error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await alertsApi.getAlerts()
      if (response.success && response.alerts) {
        setAlerts(response.alerts)
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    }
  }

  const calculateStatsFromIncidents = (incidents: Incident[]) => {
    const stats: DashboardStats = {
      totalIncidents: incidents.length,
      pendingIncidents: incidents.filter((i) => i.status === "pending").length,
      inProgressIncidents: incidents.filter((i) => i.status === "in_progress").length,
      resolvedIncidents: incidents.filter((i) => i.status === "resolved").length,
      criticalIncidents: incidents.filter((i) => i.priority_level === "critical").length,
      highPriorityIncidents: incidents.filter((i) => i.priority_level === "high").length,
    }
    setStats(stats)
  }

  const fetchStats = async () => {
    try {
      const response = await staffDashboardApi.getStats()
      if (response.success && response.stats) {
        // Keep the global stats for reference, but we'll calculate from assigned incidents
        console.log("Global stats (for reference):", response.stats)
      }
    } catch (error) {
      console.error("Error fetching global stats:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200"
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-200"
      case "moderate":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200"
      case "low":
        return "bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200"
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200"
      case "resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200"
      case "closed":
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
            ></div>
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-2xl">
          {/* Background decorative elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-48 translate-x-48 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32 blur-2xl"></div>
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16 animate-pulse"></div>
          </div>

          <div className="relative z-10 p-4 sm:p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                    {getGreeting()}, <span className="text-blue-200">{authState.userData?.name}</span>!
                  </h1>
                  <p className="text-blue-100 text-base sm:text-lg lg:text-xl font-medium">
                    Welcome to your emergency response command center
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-blue-200">
                  <div className="flex items-center gap-2">
                    <i className="ri-calendar-line text-lg sm:text-xl"></i>
                    <span className="font-medium text-sm sm:text-base">
                      {currentTime.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 bg-blue-300 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <i className="ri-time-line text-lg sm:text-xl"></i>
                    <span className="font-medium text-sm sm:text-base">{currentTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                    <i className="ri-shield-check-line text-3xl sm:text-4xl lg:text-5xl text-white"></i>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <i className="ri-dashboard-3-line text-white text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Priority Overview</h2>
                <p className="text-slate-600 font-medium text-sm sm:text-base">
                  Real-time metrics for your assigned incidents
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Incidents */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 sm:p-6 border border-blue-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-blue-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <i className="ri-alert-line text-white text-xl sm:text-2xl"></i>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalIncidents}</div>
                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total</div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">All assigned incidents</div>
              </div>
            </div>

            {/* In Progress */}
            <div className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 sm:p-6 border border-indigo-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-indigo-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <i className="ri-loader-4-line text-white text-xl sm:text-2xl"></i>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.inProgressIncidents}</div>
                    <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Active</div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">Currently handling</div>
              </div>
            </div>

            {/* Critical Incidents */}
            <div className="group relative bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-4 sm:p-6 border border-red-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-red-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <i className="ri-error-warning-line text-white text-xl sm:text-2xl"></i>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.criticalIncidents}</div>
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">Urgent</div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">Immediate attention</div>
              </div>
            </div>

            {/* Resolved */}
            <div className="group relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 sm:p-6 border border-emerald-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <i className="ri-check-double-line text-white text-xl sm:text-2xl"></i>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.resolvedIncidents}</div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved</div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">Successfully closed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-200/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl shadow-lg">
                  <i className="ri-file-list-3-line text-white text-xl sm:text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Recent Incidents</h3>
                  <p className="text-slate-600 font-medium text-sm sm:text-base">Your latest assigned cases</p>
                </div>
              </div>
              <Link
                to="/staff/incidents"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-sm sm:text-base"
              >
                View All Cases
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            {recentIncidents.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="relative mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <i className="ri-inbox-line text-4xl sm:text-5xl text-slate-400"></i>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-green-400 rounded-full border-4 border-white flex items-center justify-center">
                    <i className="ri-check-line text-white text-xs sm:text-sm"></i>
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">All Clear!</h3>
                <p className="text-slate-600 text-base sm:text-lg max-w-md mx-auto">
                  You don't have any assigned incidents at the moment. Great work keeping things under control!
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Incident Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Date Reported
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {recentIncidents.map((incident) => (
                        <tr key={incident.incident_id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-900">{incident.incident_type}</div>
                              <div className="text-sm text-slate-600 line-clamp-2 max-w-xs">{incident.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <i className="ri-map-pin-line text-slate-400"></i>
                              {incident.location}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-lg ${getPriorityColor(incident.priority_level)}`}
                            >
                              {incident.priority_level.charAt(0).toUpperCase() + incident.priority_level.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusColor(incident.status)}`}
                            >
                              {getStatusText(incident.status)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm font-medium text-slate-700">
                            {new Date(incident.date_reported).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden space-y-3 sm:space-y-4">
                  {recentIncidents.map((incident) => (
                    <div
                      key={incident.incident_id}
                      className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl p-4 sm:p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                              {incident.incident_type}
                            </h4>
                            <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                              {incident.description}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <span
                              className={`inline-flex px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg ${getPriorityColor(incident.priority_level)}`}
                            >
                              {incident.priority_level.charAt(0).toUpperCase() + incident.priority_level.slice(1)}
                            </span>
                            <span
                              className={`inline-flex px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg ${getStatusColor(incident.status)}`}
                            >
                              {getStatusText(incident.status)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <i className="ri-map-pin-line text-slate-400"></i>
                            <span className="font-medium truncate">{incident.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <i className="ri-calendar-line text-slate-400"></i>
                            <span>{new Date(incident.date_reported).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 bg-blue-400/30 rounded-lg shadow-sm">
                <i className="ri-megaphone-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">System Announcements</h3>
                <p className="text-blue-100 text-sm sm:text-base font-medium">Latest alerts and notifications</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 bg-gray-50">
            {alerts.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="relative mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <i className="ri-shield-check-line text-4xl sm:text-5xl text-green-500"></i>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-green-400 rounded-full border-4 border-white flex items-center justify-center animate-pulse">
                    <i className="ri-check-line text-white text-xs sm:text-sm"></i>
                  </div>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">All Systems Operational</h4>
                <p className="text-slate-600 text-base sm:text-lg max-w-md mx-auto">
                  No active alerts or announcements. All emergency systems are running smoothly.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl">
                {(() => {
                  // Get the most recent alert
                  const latestAlert = alerts.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                  )[0]

                  // Format recipients
                  const recipientsDisplay = latestAlert.recipients && latestAlert.recipients.length > 0
                    ? `[Recipients: ${latestAlert.recipients.join(', ')}]`
                    : latestAlert.recipients
                      ? '[Recipients: all_users]'
                      : ''

                  return (
                    <div className="relative bg-white rounded-xl border border-gray-200 shadow-md p-6 sm:p-8">
                      {/* Grey dot indicator in top right */}
                      <div className="absolute top-4 right-4">
                        <div className={`w-3 h-3 rounded-full ${
                          latestAlert.status === "active" ? "bg-red-400" : "bg-gray-400"
                        }`}></div>
                      </div>

                      <div className="space-y-4 pr-6">
                        {/* Alert Tags */}
                        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg ${
                              latestAlert.alert_severity === "emergency"
                                ? "bg-red-100 text-red-800 border-2 border-red-200"
                                : latestAlert.alert_severity === "warning"
                                  ? "bg-amber-100 text-amber-800 border-2 border-amber-200"
                                  : "bg-blue-100 text-blue-800 border-2 border-blue-200"
                            }`}
                          >
                            <i
                              className={`text-sm ${
                                latestAlert.alert_severity === "emergency"
                                  ? "ri-alarm-warning-line"
                                  : latestAlert.alert_severity === "warning"
                                    ? "ri-error-warning-line"
                                    : "ri-information-line"
                              }`}
                            ></i>
                            {latestAlert.alert_severity.charAt(0).toUpperCase() + latestAlert.alert_severity.slice(1)} Alert
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 capitalize">
                            {latestAlert.alert_type || 'Info'}
                          </span>
                        </div>

                        {/* Announcement Content */}
                        <div className="space-y-3">
                          <h4 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                            {latestAlert.title || 'No title'}
                          </h4>
                          <div className="space-y-1">
                            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                              {latestAlert.description || latestAlert.message || 'No description available'}
                            </p>
                            {recipientsDisplay && (
                              <p className="text-gray-600 text-sm sm:text-base font-medium">
                                {recipientsDisplay}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Separator and Timestamp */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <i className="ri-time-line text-gray-400"></i>
                            <span className="font-medium">Posted:</span>
                            <span>{new Date(latestAlert.created_at).toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboardPage
