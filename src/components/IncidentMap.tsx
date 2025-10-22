"use client"

import type React from "react"
import { useState, useMemo } from "react"

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
  assigned_team_id?: number | null
  assigned_team_name?: string
  assigned_staff_id?: number | null
  assigned_staff_name?: string
  date_reported: string
  date_resolved?: string
  assignment_type?: "individual" | "team" | "unknown"
  resolvedLocation?: string
}

interface IncidentMapProps {
  incidents: Incident[]
  onIncidentClick?: (incident: Incident) => void
  height?: string
  showUserLocation?: boolean
  userLocation?: { latitude: number; longitude: number } | null
}

const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  onIncidentClick,
  height = "24rem",
  showUserLocation = false,
  userLocation = null,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [hoveredIncident, setHoveredIncident] = useState<number | null>(null)

  // Rosario, Batangas bounds
  const rosarioBounds = {
    north: 13.89,
    south: 13.82,
    east: 121.24,
    west: 121.14,
  }

  // Convert lat/lng to SVG coordinates
  const latLngToSVG = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng - rosarioBounds.west) / (rosarioBounds.east - rosarioBounds.west)) * width
    const y = ((rosarioBounds.north - lat) / (rosarioBounds.north - rosarioBounds.south)) * height
    return { x, y }
  }

  const validIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (!inc.latitude || !inc.longitude || isNaN(Number(inc.latitude)) || isNaN(Number(inc.longitude))) {
        return false
      }
      const lat = Number(inc.latitude)
      const lng = Number(inc.longitude)
      // Only include incidents within Rosario bounds
      return (
        lat >= rosarioBounds.south &&
        lat <= rosarioBounds.north &&
        lng >= rosarioBounds.west &&
        lng <= rosarioBounds.east
      )
    })
  }, [incidents])

  const getMarkerColor = (priority: string, status: string) => {
    if (status === "resolved" || status === "closed") {
      return "#059669" // Green for resolved
    } else if (status === "in_progress") {
      return "#0891b2" // Blue for in progress
    } else if (status === "pending") {
      if (priority === "critical") {
        return "#be123c" // Red for critical pending
      }
      return "#f59e0b" // Yellow for pending
    }
    return "#6b7280" // Gray default
  }

  const getStatusText = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleMarkerClick = (incident: Incident) => {
    setSelectedIncident(incident)
    onIncidentClick?.(incident)
  }

  // Rosario boundary path (simplified polygon)
  const boundaryPath = `
    M 50 100
    L 150 80
    L 250 120
    L 300 200
    L 280 300
    L 200 320
    L 120 280
    L 80 200
    Z
  `

  return (
    <div className="relative group">
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800">{validIncidents.length}</div>
            <div className="text-xs text-gray-600">Incidents in Rosario</div>
          </div>
        </div>
      </div>

      <div
        className="w-full rounded-lg overflow-hidden shadow-lg border border-gray-200 relative bg-blue-50"
        style={{
          height,
          minHeight: "400px",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 400 400"
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)" }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e3f2fd" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Rosario boundary */}
          <path
            d={boundaryPath}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#2563eb"
            strokeWidth="3"
            strokeDasharray="10,5"
            opacity="0.8"
          />

          {/* Boundary label */}
          <text x="200" y="50" textAnchor="middle" className="fill-blue-600 text-sm font-semibold">
            Rosario, Batangas
          </text>
          <text x="200" y="70" textAnchor="middle" className="fill-blue-500 text-xs">
            Municipality Boundary
          </text>

          {/* User location marker */}
          {showUserLocation && userLocation && (
            <g>
              {(() => {
                const { x, y } = latLngToSVG(userLocation.latitude, userLocation.longitude, 400, 400)
                return (
                  <g>
                    <circle cx={x} cy={y} r="8" fill="#3b82f6" stroke="white" strokeWidth="2">
                      <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={x} y={y - 15} textAnchor="middle" className="fill-blue-600 text-xs font-medium">
                      You
                    </text>
                  </g>
                )
              })()}
            </g>
          )}

          {/* Incident markers */}
          {validIncidents.map((incident) => {
            const lat = Number(incident.latitude)
            const lng = Number(incident.longitude)
            const { x, y } = latLngToSVG(lat, lng, 400, 400)
            const color = getMarkerColor(incident.priority_level, incident.status)
            const isHovered = hoveredIncident === incident.incident_id
            const isSelected = selectedIncident?.incident_id === incident.incident_id

            return (
              <g key={incident.incident_id}>
                {/* Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isSelected ? "12" : "8"}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    filter: isHovered
                      ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
                      : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                  }}
                  onClick={() => handleMarkerClick(incident)}
                  onMouseEnter={() => setHoveredIncident(incident.incident_id)}
                  onMouseLeave={() => setHoveredIncident(null)}
                >
                  {(incident.status === "pending" ||
                    (incident.status === "in_progress" && incident.priority_level === "critical")) && (
                    <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>

                {/* Incident number */}
                <text
                  x={x}
                  y={y + 2}
                  textAnchor="middle"
                  className="fill-white text-xs font-bold pointer-events-none"
                  style={{ fontSize: "10px" }}
                >
                  {incident.incident_id}
                </text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x + 15}
                      y={y - 25}
                      width="120"
                      height="40"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      rx="4"
                      className="drop-shadow-lg"
                    />
                    <text x={x + 20} y={y - 12} className="fill-gray-900 text-xs font-semibold">
                      #{incident.incident_id} - {incident.incident_type}
                    </text>
                    <text x={x + 20} y={y - 2} className="fill-gray-600 text-xs">
                      {getStatusText(incident.status)}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Incident Status</h4>
          <div className="space-y-2">
            {[
              {
                status: "critical",
                label: "Critical",
                color: "#be123c",
                count: validIncidents.filter(
                  (i) => i.priority_level === "critical" && (i.status === "pending" || i.status === "in_progress"),
                ).length,
              },
              {
                status: "pending",
                label: "Pending",
                color: "#f59e0b",
                count: validIncidents.filter((i) => i.status === "pending" && i.priority_level !== "critical").length,
              },
              {
                status: "in_progress",
                label: "In Progress",
                color: "#0891b2",
                count: validIncidents.filter((i) => i.status === "in_progress" && i.priority_level !== "critical")
                  .length,
              },
              {
                status: "resolved",
                label: "Resolved",
                color: "#059669",
                count: validIncidents.filter((i) => i.status === "resolved" || i.status === "closed").length,
              },
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700">{item.label}</span>
                </div>
                <span className="text-gray-500 font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected incident details */}
      {selectedIncident && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Incident #{selectedIncident.incident_id}</h3>
                <p className="text-sm text-blue-600 font-medium">{selectedIncident.incident_type}</p>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-sm text-gray-700">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      selectedIncident.status === "resolved"
                        ? "text-green-600"
                        : selectedIncident.status === "in_progress"
                          ? "text-blue-600"
                          : selectedIncident.status === "pending"
                            ? "text-yellow-600"
                            : "text-gray-600"
                    }`}
                  >
                    {getStatusText(selectedIncident.status)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span
                    className={`font-medium ${
                      selectedIncident.priority_level === "critical"
                        ? "text-red-600"
                        : selectedIncident.priority_level === "high"
                          ? "text-orange-600"
                          : selectedIncident.priority_level === "moderate"
                            ? "text-yellow-600"
                            : "text-green-600"
                    }`}
                  >
                    {selectedIncident.priority_level.charAt(0).toUpperCase() + selectedIncident.priority_level.slice(1)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="text-gray-900">
                    {selectedIncident.resolvedLocation || selectedIncident.location}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Reporter:</span>
                  <span className="text-gray-900">{selectedIncident.reporter_name}</span>
                </div>

                {selectedIncident.assigned_team_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team:</span>
                    <span className="text-gray-900">{selectedIncident.assigned_team_name}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                <div>Reported: {formatDateTime(selectedIncident.date_reported)}</div>
                {selectedIncident.date_resolved && (
                  <div>Resolved: {formatDateTime(selectedIncident.date_resolved)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncidentMap
