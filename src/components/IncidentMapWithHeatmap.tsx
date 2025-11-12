"use client"
import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"

// Dynamic import for heatmap plugin to avoid TypeScript issues
const loadHeatmapPlugin = async () => {
  try {
    await import("leaflet.heat")
  } catch (error) {
    console.warn("Heatmap plugin not available:", error)
  }
}

// Dynamic import for leaflet-draw plugin
const loadDrawPlugin = async () => {
  try {
    await import("leaflet-draw")
  } catch (error) {
    console.warn("Leaflet Draw plugin not available:", error)
  }
}

// Ensure Leaflet CSS is loaded
const ensureLeafletCSS = () => {
  const link = document.querySelector('link[href*="leaflet"]')
  if (!link) {
    const newLink = document.createElement("link")
    newLink.rel = "stylesheet"
    newLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    newLink.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    newLink.crossOrigin = ""
    document.head.appendChild(newLink)
  }
  
  // Ensure Leaflet Draw CSS is loaded
  const drawLink = document.querySelector('link[href*="leaflet.draw"]')
  if (!drawLink) {
    const newDrawLink = document.createElement("link")
    newDrawLink.rel = "stylesheet"
    newDrawLink.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"
    document.head.appendChild(newDrawLink)
  }
  
  // Add fallback styles for Leaflet Draw toolbar
  if (!document.querySelector('style[data-leaflet-draw-fallback]')) {
    const drawStyle = document.createElement("style")
    drawStyle.setAttribute('data-leaflet-draw-fallback', 'true')
    drawStyle.textContent = `
      .leaflet-draw-toolbar {
        margin-top: 10px;
        z-index: 1000;
      }
      .leaflet-draw-toolbar a {
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      .leaflet-draw-toolbar a:hover {
        background-color: #f4f4f4;
      }
    `
    document.head.appendChild(drawStyle)
  }
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Custom icons for different incident priorities
const createCustomIcon = (priority: string, status: string) => {
  let color = "#6b7280" // default gray

  // If critical priority, always red
  if (priority === "critical") {
    color = "#ef4444"
  } else {
    // For non-critical, base color on status
    if (status === "resolved" || status === "closed") {
      color = "#10b981" // green for resolved
    } else if (status === "in_progress") {
      color = "#3b82f6" // blue for in progress
    } else if (status === "pending") {
      color = "#f59e0b" // amber for pending
    }
  }

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <i class="ri-alert-line" style="color: white; font-size: 12px;"></i>
          </div>`,
    className: "custom-incident-marker",
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
  onDrawCreated?: (layer: L.Layer) => void
  onDrawEdited?: (e: L.DrawEvents.Edited) => void
  onDrawDeleted?: (e: L.DrawEvents.Deleted) => void
  enableDraw?: boolean
}

// Component to handle map centering
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
}

// Utility functions for better code organization
const BATANGAS_BOUNDS = {
  north: 14.2,
  south: 13.5,
  east: 121.5,
  west: 120.8,
}

const DEFAULT_CENTER: [number, number] = [13.84542, 121.206189]

const LEGEND_FILTERS = {
  CRITICAL: "critical",
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
} as const

const calculateMapBounds = (incidents: Incident[]) => {
  const validIncidents = incidents.filter(
    (inc) => inc.latitude && inc.longitude && !isNaN(Number(inc.latitude)) && !isNaN(Number(inc.longitude)),
  )

  if (validIncidents.length === 0) return null

  const latitudes = validIncidents.map((inc) => Number(inc.latitude))
  const longitudes = validIncidents.map((inc) => Number(inc.longitude))

  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
    centerLat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    centerLng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    validIncidents,
  }
}

const calculateOptimalZoom = (bounds: ReturnType<typeof calculateMapBounds>) => {
  if (!bounds) return 10

  const { minLat, maxLat, minLng, maxLng, validIncidents } = bounds

  if (validIncidents.length === 1) return 15

  const allInBatangas = validIncidents.every((inc) => {
    const lat = Number(inc.latitude)
    const lng = Number(inc.longitude)
    return (
      lat >= BATANGAS_BOUNDS.south &&
      lat <= BATANGAS_BOUNDS.north &&
      lng >= BATANGAS_BOUNDS.west &&
      lng <= BATANGAS_BOUNDS.east
    )
  })

  const latDiff = maxLat - minLat
  const lngDiff = maxLng - minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  if (allInBatangas) {
    if (maxDiff < 0.01) return 16
    if (maxDiff < 0.05) return 14
    if (maxDiff < 0.2) return 12
    return 10
  } else {
    if (maxDiff < 0.01) return 16
    if (maxDiff < 0.05) return 14
    if (maxDiff < 0.2) return 12
    if (maxDiff < 1) return 10
    return 8
  }
}

const getHeatmapIntensity = (incident: Incident): number => {
  let intensity = 0.3

  switch (incident.priority_level) {
    case "critical":
      intensity = 1.0
      break
    case "high":
      intensity = 0.8
      break
    case "moderate":
      intensity = 0.6
      break
    case "low":
      intensity = 0.4
      break
  }

  if (incident.status === "pending" || incident.status === "in_progress") {
    intensity *= 1.2
  }

  return Math.min(intensity, 1.0)
}

// Component to handle heatmap layer
const HeatmapController: React.FC<{
  incidents: Incident[]
  showHeatmap: boolean
  onHeatmapLayerChange: (layer: any) => void
}> = ({ incidents, showHeatmap, onHeatmapLayerChange }) => {
  const map = useMap()

  const priorityColors = {
    critical: "#EF4444",
    low: "#10B981",
    moderate: "#FFD966",
    high: "#E67E22",
  }

  useEffect(() => {
    if (!showHeatmap) {
      // Remove existing heatmap layers
      map.eachLayer((layer: any) => {
        if (layer.options && layer.options.heatLayer) {
          map.removeLayer(layer)
        }
      })
      onHeatmapLayerChange([])
      return
    }

    const createHeatmaps = () => {
      if ((window as any).L && (window as any).L.heatLayer) {
        console.log("Creating separate heatmaps for each priority level")

        // Remove existing heatmap layers
        map.eachLayer((layer: any) => {
          if (layer.options && layer.options.heatLayer) {
            console.log("Removing existing heatmap layer")
            map.removeLayer(layer)
          }
        })

        const layers: any[] = []

        // Group incidents by priority
        const incidentsByPriority = {
          critical: incidents.filter(
            (inc) =>
              inc.latitude &&
              inc.longitude &&
              !isNaN(Number(inc.latitude)) &&
              !isNaN(Number(inc.longitude)) &&
              inc.priority_level === "critical"
          ),
          high: incidents.filter(
            (inc) =>
              inc.latitude &&
              inc.longitude &&
              !isNaN(Number(inc.latitude)) &&
              !isNaN(Number(inc.longitude)) &&
              inc.priority_level === "high"
          ),
          moderate: incidents.filter(
            (inc) =>
              inc.latitude &&
              inc.longitude &&
              !isNaN(Number(inc.latitude)) &&
              !isNaN(Number(inc.longitude)) &&
              inc.priority_level === "moderate"
          ),
          low: incidents.filter(
            (inc) =>
              inc.latitude &&
              inc.longitude &&
              !isNaN(Number(inc.latitude)) &&
              !isNaN(Number(inc.longitude)) &&
              inc.priority_level === "low"
          ),
        }

        // Create layer for each priority
        Object.entries(incidentsByPriority).forEach(([priority, priorityIncidents]) => {
          const data = priorityIncidents.map((incident) => {
            const lat = Number(incident.latitude)
            const lng = Number(incident.longitude)
            const intensity = getHeatmapIntensity(incident)
            return [lat, lng, intensity]
          })

          if (data.length > 0) {
            const color = priorityColors[priority as keyof typeof priorityColors]
            const heatLayer = (window as any).L.heatLayer(data, {
              radius: 35,
              blur: 15,
              maxZoom: 18,
              minZoom: 8,
              minOpacity: 0.65,
              maxOpacity: 0.8,
              gradient: {
                0.5: color,
                1.0: color,
              },
              heatLayer: true,
            })

            console.log(`Adding heatmap layer for ${priority} with color ${color}`)
            heatLayer.addTo(map)
            layers.push(heatLayer)
          }
        })

        onHeatmapLayerChange(layers)

        // Force map redraw
        setTimeout(() => {
          map.invalidateSize()
        }, 100)
      } else {
        console.log("Heatmap plugin not available, retrying...")
        setTimeout(createHeatmaps, 100)
      }
    }

    loadHeatmapPlugin().then(createHeatmaps)
  }, [incidents, showHeatmap, map, onHeatmapLayerChange])

  return null
}

// Component to handle Leaflet Draw control
const DrawController: React.FC<{
  enableDraw: boolean
  onDrawCreated?: (layer: L.Layer) => void
  onDrawEdited?: (e: L.DrawEvents.Edited) => void
  onDrawDeleted?: (e: L.DrawEvents.Deleted) => void
}> = ({ enableDraw, onDrawCreated, onDrawEdited, onDrawDeleted }) => {
  const map = useMap()
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const drawnLayersRef = useRef<L.FeatureGroup>(new L.FeatureGroup())

  useEffect(() => {
    if (!enableDraw) {
      // Remove draw control if disabled
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
        drawControlRef.current = null
      }
      if (map.hasLayer(drawnLayersRef.current)) {
        map.removeLayer(drawnLayersRef.current)
      }
      return
    }

    let cleanup: (() => void) | undefined

    const initializeDraw = async () => {
      await loadDrawPlugin()

      if ((window as any).L && (window as any).L.Draw) {
        // Remove existing control if any
        if (drawControlRef.current) {
          map.removeControl(drawControlRef.current)
        }

        // Add drawn layers to map
        if (!map.hasLayer(drawnLayersRef.current)) {
          drawnLayersRef.current.addTo(map)
        }

        // Create draw control
        const drawControl = new (window as any).L.Draw({
          position: "topleft",
          draw: {
            polygon: {
              allowIntersection: false,
              showArea: true,
            },
            polyline: true,
            rectangle: true,
            circle: true,
            circlemarker: false,
            marker: true,
          },
          edit: {
            featureGroup: drawnLayersRef.current,
            remove: true,
          },
        })

        drawControlRef.current = drawControl
        map.addControl(drawControl)

        // Handle draw events
        const handleDrawCreated = (e: L.DrawEvents.Created) => {
          const layer = e.layer
          drawnLayersRef.current.addLayer(layer)
          onDrawCreated?.(layer)
        }

        const handleDrawEdited = (e: L.DrawEvents.Edited) => {
          onDrawEdited?.(e)
        }

        const handleDrawDeleted = (e: L.DrawEvents.Deleted) => {
          onDrawDeleted?.(e)
        }

        map.on((window as any).L.Draw.Event.CREATED, handleDrawCreated)
        map.on((window as any).L.Draw.Event.EDITED, handleDrawEdited)
        map.on((window as any).L.Draw.Event.DELETED, handleDrawDeleted)

        cleanup = () => {
          map.off((window as any).L.Draw.Event.CREATED, handleDrawCreated)
          map.off((window as any).L.Draw.Event.EDITED, handleDrawEdited)
          map.off((window as any).L.Draw.Event.DELETED, handleDrawDeleted)
        }
      }
    }

    initializeDraw()

    return () => {
      if (cleanup) {
        cleanup()
      }
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
        drawControlRef.current = null
      }
      if (map.hasLayer(drawnLayersRef.current)) {
        map.removeLayer(drawnLayersRef.current)
      }
    }
  }, [map, enableDraw, onDrawCreated, onDrawEdited, onDrawDeleted])

  return null
}

// Color mapping for dynamic Tailwind classes
const getLegendColors = (color: string) => {
  const colorMap: { [key: string]: { bg: string; border: string; ring: string; text: string; gradient: string } } = {
    red: { bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-300', text: 'text-red-600', gradient: 'from-red-500 to-red-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-300', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-300', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', ring: 'ring-green-300', text: 'text-green-600', gradient: 'from-green-500 to-green-500' },
  }
  return colorMap[color] || colorMap.blue // fallback to blue if color not found
}

const LegendItem: React.FC<{
  type: string
  label: string
  icon: string
  iconColor: string
  isActive: boolean
  onClick: () => void
}> = ({ type, label, icon, iconColor, isActive, onClick }) => {
  return (
    <div
      className={`flex items-center text-sm cursor-pointer rounded-lg p-2 transition-all duration-200 hover:bg-gray-50 ${
        isActive ? "bg-gray-50 border border-gray-200" : "opacity-60"
      }`}
      onClick={onClick}
    >
      <i
        className={`${icon} mr-3 text-lg ${isActive ? iconColor : "text-gray-400"}`}
      ></i>
      <span className={`font-medium ${isActive ? "text-gray-900" : "text-gray-500"}`}>{label}</span>
      {isActive && <i className={`ri-check-line ml-auto ${iconColor} text-sm`}></i>}
    </div>
  )
}

const MapControls: React.FC<{
  userLocation: { latitude: number; longitude: number } | null
  incidents: Incident[]
  showHeatmap: boolean
  filteredIncidentsCount: number
  enableDraw: boolean
  onCenterUserLocation: () => void
  onShowAllIncidents: () => void
  onToggleHeatmap: () => void
  onToggleDraw: () => void
}> = ({
  userLocation,
  incidents,
  showHeatmap,
  filteredIncidentsCount,
  enableDraw,
  onCenterUserLocation,
  onShowAllIncidents,
  onToggleHeatmap,
  onToggleDraw,
}) => (
  <div className="absolute top-4 right-4 z-[1000] space-y-3">
    {userLocation && (
      <button
        onClick={onCenterUserLocation}
        className="group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        title="Center on my location"
      >
        <i className="ri-focus-3-line text-blue-600 text-lg group-hover:text-blue-700"></i>
      </button>
    )}

    <button
      onClick={onShowAllIncidents}
      className="group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
      title="Show all incidents"
    >
      <i className="ri-fullscreen-line text-blue-600 text-lg group-hover:text-blue-700"></i>
    </button>

    <button
      onClick={onToggleHeatmap}
      className={`group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
        showHeatmap ? "bg-blue-100 border-blue-300" : ""
      }`}
      title={showHeatmap ? "Hide heatmap" : "Show heatmap"}
    >
      <i
        className={`ri-fire-line text-lg group-hover:text-blue-700 ${showHeatmap ? "text-blue-600" : "text-gray-600"}`}
      ></i>
    </button>

    <button
      onClick={onToggleDraw}
      className={`group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
        enableDraw ? "bg-green-100 border-green-300" : ""
      }`}
      title={enableDraw ? "Disable drawing" : "Enable drawing"}
    >
      <i
        className={`ri-edit-line text-lg group-hover:text-blue-700 ${enableDraw ? "text-green-600" : "text-gray-600"}`}
      ></i>
    </button>

    <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-xl">
      <div className="text-center">
        <div className="text-lg font-bold text-blue-600">{filteredIncidentsCount}</div>
        <div className="text-xs text-gray-600">Incidents</div>
      </div>
    </div>
  </div>
)

const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  onIncidentClick,
  height = "24rem",
  showUserLocation = false,
  userLocation = null,
  onDrawCreated,
  onDrawEdited,
  onDrawDeleted,
  enableDraw = false,
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [mapZoom, setMapZoom] = useState(13)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  const [activeLegendFilters, setActiveLegendFilters] = useState<Set<string>>(
    new Set([LEGEND_FILTERS.CRITICAL, LEGEND_FILTERS.PENDING, LEGEND_FILTERS.IN_PROGRESS, LEGEND_FILTERS.RESOLVED]),
  )
  const [isLegendExpanded, setIsLegendExpanded] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapLayer, setHeatmapLayer] = useState<any>(null)
  const [drawEnabled, setDrawEnabled] = useState(enableDraw)

  const mapBounds = useMemo(() => calculateMapBounds(incidents), [incidents])

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (activeLegendFilters.size === 0) return true

      // Critical filter - shows all critical incidents regardless of status
      if (
        activeLegendFilters.has(LEGEND_FILTERS.CRITICAL) &&
        incident.priority_level === "critical"
      ) {
        return true
      }
      
      // Status filters - show all incidents matching the status (including critical)
      if (
        activeLegendFilters.has(LEGEND_FILTERS.PENDING) &&
        incident.status === "pending"
      ) {
        return true
      }
      if (
        activeLegendFilters.has(LEGEND_FILTERS.IN_PROGRESS) &&
        incident.status === "in_progress"
      ) {
        return true
      }
      if (
        activeLegendFilters.has(LEGEND_FILTERS.RESOLVED) &&
        (incident.status === "resolved" || incident.status === "closed")
      ) {
        return true
      }

      return false
    })
  }, [incidents, activeLegendFilters])

  const updateMapCenter = useCallback(() => {
    if (mapBounds && mapBounds.validIncidents.length > 0) {
      if (mapBounds.validIncidents.length === 1) {
        const incident = mapBounds.validIncidents[0]
        setMapCenter([Number(incident.latitude), Number(incident.longitude)])
        setMapZoom(15)
      } else {
        setMapCenter([mapBounds.centerLat, mapBounds.centerLng])
        setMapZoom(calculateOptimalZoom(mapBounds))
      }
    } else if (userLocation) {
      setMapCenter([userLocation.latitude, userLocation.longitude])
      setMapZoom(14)
    } else {
      setMapCenter(DEFAULT_CENTER)
      setMapZoom(10)
    }
  }, [mapBounds, userLocation])

  useEffect(() => {
    updateMapCenter()
  }, [updateMapCenter])

  // Sync drawEnabled with enableDraw prop
  useEffect(() => {
    setDrawEnabled(enableDraw)
  }, [enableDraw])

  // Ensure Leaflet CSS is loaded
  useEffect(() => {
    ensureLeafletCSS()
  }, [])

  // Add timeout for map loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapLoading) {
        console.log("Map loading timeout - setting error state")
        setMapError(true)
        setMapLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [mapLoading])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600"
      case "high":
        return "text-orange-600"
      case "moderate":
        return "text-yellow-600"
      case "low":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600"
      case "in_progress":
        return "text-blue-600"
      case "resolved":
        return "text-green-600"
      case "closed":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusText = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleLegendClick = useCallback((filterType: string) => {
    setActiveLegendFilters((prev) => {
      const newFilters = new Set(prev)
      if (newFilters.has(filterType)) {
        newFilters.delete(filterType)
      } else {
        newFilters.add(filterType)
      }
      return newFilters
    })
  }, [])

  const handleShowAll = useCallback(() => {
    setActiveLegendFilters(
      new Set([LEGEND_FILTERS.CRITICAL, LEGEND_FILTERS.PENDING, LEGEND_FILTERS.IN_PROGRESS, LEGEND_FILTERS.RESOLVED]),
    )
  }, [])

  const handleHeatmapToggle = useCallback(() => {
    setShowHeatmap((prev) => !prev)
  }, [])

  const handleToggleDraw = useCallback(() => {
    setDrawEnabled((prev) => !prev)
  }, [])

  const handleCenterUserLocation = useCallback(() => {
    if (userLocation) {
      setMapCenter([userLocation.latitude, userLocation.longitude])
      setMapZoom(15)
    }
  }, [userLocation])

  const handleShowAllIncidents = useCallback(() => {
    if (mapBounds && mapBounds.validIncidents.length > 0) {
      setMapCenter([mapBounds.centerLat, mapBounds.centerLng])
      // Calculate optimal zoom but ensure it's not too zoomed in
      const optimalZoom = calculateOptimalZoom(mapBounds)
      // For "show all" functionality, we want to zoom out to see all incidents
      // Use a minimum zoom level to ensure all incidents are visible
      const fullViewZoom = Math.min(optimalZoom, 10)
      setMapZoom(fullViewZoom)
    }
  }, [mapBounds])

  return (
    <div className="relative">
      <MapControls
        userLocation={userLocation}
        incidents={incidents}
        showHeatmap={showHeatmap}
        filteredIncidentsCount={filteredIncidents.length}
        enableDraw={drawEnabled}
        onCenterUserLocation={handleCenterUserLocation}
        onShowAllIncidents={handleShowAllIncidents}
        onToggleHeatmap={handleHeatmapToggle}
        onToggleDraw={handleToggleDraw}
      />

      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 relative"
        style={{
          height,
          minHeight: "300px",
          position: "relative",
        }}
      >
        {/* Loading overlay */}
        {mapLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
            <div className="text-center">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-4"></i>
              <p className="text-gray-600 mb-2">Failed to load interactive map</p>
              <p className="text-sm text-gray-500 mb-4">Showing static map instead</p>
              <button
                onClick={() => {
                  setMapError(false)
                  setMapLoading(true)
                  // Force re-render
                  window.location.reload()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Interactive Map
              </button>
            </div>
          </div>
        )}

        {/* Static map fallback */}
        {mapError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center p-4">
              <i className="ri-map-2-line text-6xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Incidents Map</h3>
              <p className="text-sm text-gray-500 mb-4">{incidents.length} incidents available</p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                {incidents.slice(0, 5).map((incident) => (
                  <div key={incident.incident_id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          #{incident.incident_id} - {incident.incident_type}
                        </h4>
                        <p className="text-sm text-gray-600">{incident.description}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          incident.status === "resolved"
                            ? "bg-green-100 text-green-800"
                            : incident.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : incident.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </div>
                ))}
                {incidents.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">+{incidents.length - 5} more incidents</p>
                )}
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0 h-full w-full"
          zoomControl={true}
          whenReady={() => {
            console.log("Map is ready!")
            setMapLoading(false)
            // Ensure heatmap plugin is loaded after map is ready
            if (showHeatmap) {
              setTimeout(() => {
                setShowHeatmap(true)
              }, 500)
            }
          }}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          <HeatmapController
            incidents={filteredIncidents}
            showHeatmap={showHeatmap}
            onHeatmapLayerChange={setHeatmapLayer}
          />
          <DrawController
            enableDraw={drawEnabled}
            onDrawCreated={onDrawCreated}
            onDrawEdited={onDrawEdited}
            onDrawDeleted={onDrawDeleted}
          />

          {/* TileLayer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            eventHandlers={{
              loading: () => console.log("Tiles loading..."),
              load: () => console.log("Tiles loaded successfully"),
              tileerror: (e) => {
                console.error("Tile loading error:", e)
                setMapError(true)
              },
            }}
          />

          {/* User location marker */}
          {showUserLocation && userLocation && (
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={L.divIcon({
                html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); animation: pulse 2s infinite;"></div>
                       <style>@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }</style>`,
                className: "user-location-marker",
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>
                <div className="text-center">
                  <strong>Your Location</strong>
                  <br />
                  <small className="text-gray-600">
                    Lat: {userLocation.latitude.toFixed(6)}
                    <br />
                    Lng: {userLocation.longitude.toFixed(6)}
                  </small>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Incident markers - only show when heatmap is disabled */}
          {!showHeatmap &&
            filteredIncidents.map((incident) => {
              const lat = Number(incident.latitude)
              const lng = Number(incident.longitude)

              if (isNaN(lat) || isNaN(lng)) {
                console.warn(
                  "Invalid coordinates for incident:",
                  incident.incident_id,
                  incident.latitude,
                  incident.longitude,
                )
                return null
              }

              return (
                <Marker
                  key={incident.incident_id}
                  position={[lat, lng]}
                  icon={createCustomIcon(incident.priority_level, incident.status)}
                  eventHandlers={{
                    click: () => onIncidentClick?.(incident),
                  }}
                >
                  <Popup maxWidth={350} className="incident-popup">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-gray-900">Incident #{incident.incident_id}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            incident.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : incident.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : incident.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {getStatusText(incident.status)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium text-gray-900">{incident.incident_type}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{incident.description}</p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Location:</span>{" "}
                          {incident.resolvedLocation || incident.location}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Priority:</span>
                          <span className={`ml-1 ${getPriorityColor(incident.priority_level)}`}>
                            {incident.priority_level.charAt(0).toUpperCase() + incident.priority_level.slice(1)}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Reporter:</span> {incident.reporter_name}
                        </p>
                        {incident.assigned_team_name && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Assigned Team:</span> {incident.assigned_team_name}
                          </p>
                        )}
                        {incident.assigned_staff_name && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Assigned Staff:</span> {incident.assigned_staff_name}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onIncidentClick?.(incident)}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-3">Reported: {formatDateTime(incident.date_reported)}</p>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      </div>

      {isLegendExpanded ? (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4">
          <div
            className="flex items-center justify-between mb-3"
            onClick={() => setIsLegendExpanded(false)}
            style={{ cursor: "pointer" }}
          >
            <h4 className="text-sm font-bold text-gray-900 flex items-center">
              <i className="ri-information-line mr-2 text-blue-600"></i>
              Legend
            </h4>
            <button
              onClick={handleShowAll}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
              title="Show all incident types"
            >
              Show All
            </button>
          </div>
          <div className="space-y-2">
            <LegendItem
              type={LEGEND_FILTERS.CRITICAL}
              label="All"
              icon="ri-error-warning-fill"
              iconColor="text-red-600"
              isActive={activeLegendFilters.has(LEGEND_FILTERS.CRITICAL)}
              onClick={() => handleLegendClick(LEGEND_FILTERS.CRITICAL)}
            />
            <LegendItem
              type={LEGEND_FILTERS.PENDING}
              label="Pending"
              icon="ri-time-line"
              iconColor="text-amber-600"
              isActive={activeLegendFilters.has(LEGEND_FILTERS.PENDING)}
              onClick={() => handleLegendClick(LEGEND_FILTERS.PENDING)}
            />
            <LegendItem
              type={LEGEND_FILTERS.IN_PROGRESS}
              label="In Progress"
              icon="ri-loader-4-line"
              iconColor="text-blue-600"
              isActive={activeLegendFilters.has(LEGEND_FILTERS.IN_PROGRESS)}
              onClick={() => handleLegendClick(LEGEND_FILTERS.IN_PROGRESS)}
            />
            <LegendItem
              type={LEGEND_FILTERS.RESOLVED}
              label="Resolved/Closed"
              icon="ri-checkbox-circle-line"
              iconColor="text-green-600"
              isActive={activeLegendFilters.has(LEGEND_FILTERS.RESOLVED)}
              onClick={() => handleLegendClick(LEGEND_FILTERS.RESOLVED)}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsLegendExpanded(true)}
          className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          title="Show legend"
        >
          <i className="ri-information-line text-blue-600 text-lg"></i>
        </button>
      )}
    </div>
  )
}

export default IncidentMap;
