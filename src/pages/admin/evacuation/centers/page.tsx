import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { evacuationCentersApi } from '../../../../utils/api';
import CoordinatePicker from '../../../../components/CoordinatePicker';
import { useToast } from '../../../../components/base/Toast';
import ExportPreviewModal from '../../../../components/base/ExportPreviewModal';
import { ConfirmModal } from '../../../../components/base/Modal';
import ExportUtils from '../../../../utils/exportUtils';
import type { ExportColumn } from '../../../../utils/exportUtils';

// Simple SVG icons to avoid dependency issues
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MailIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const AlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface EvacuationCenter {
  center_id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  status: 'open' | 'full' | 'closed';
  contact_person?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  facilities?: string[];
  created_at?: string;
  updated_at?: string;
}

const EvacuationCentersManagement: React.FC = () => {
  const { showToast } = useToast();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedCenter, setSelectedCenter] = useState<EvacuationCenter | null>(null);
  const [formData, setFormData] = useState<Partial<EvacuationCenter>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);

  useEffect(() => {
    loadCenters();
  }, []);

  // Auto-update status when occupancy or capacity changes in the form
  useEffect(() => {
    if (formData.current_occupancy !== undefined && formData.capacity !== undefined) {
      const occupancy = Number(formData.current_occupancy) || 0;
      const capacity = Number(formData.capacity);
      if (capacity > 0) {
        const newStatus = calculateStatus(occupancy, capacity, formData.status);
        // Only update if status actually changed to avoid unnecessary re-renders
        if (newStatus !== formData.status) {
          setFormData(prev => ({
            ...prev,
            status: newStatus
          }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.current_occupancy, formData.capacity]);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const response = await evacuationCentersApi.getCenters();
      const data = response?.data || response;
      setCenters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCenters = useMemo(() => {
    let filtered = centers;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(center =>
        center.name.toLowerCase().includes(query) ||
        center.address?.toLowerCase().includes(query) ||
        center.contact_person?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(center => center.status === statusFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'capacity':
          return b.capacity - a.capacity;
        case 'occupancy':
          return b.current_occupancy - a.current_occupancy;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [centers, search, statusFilter, sortBy]);

  const validateForm = useCallback((data: Partial<EvacuationCenter>): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) newErrors.name = 'Name is required';
    if (!data.latitude || data.latitude < -90 || data.latitude > 90) newErrors.latitude = 'Valid latitude required (-90 to 90)';
    if (!data.longitude || data.longitude < -180 || data.longitude > 180) newErrors.longitude = 'Valid longitude required (-180 to 180)';
    if (!data.capacity || data.capacity < 0) newErrors.capacity = 'Valid capacity required (greater than 0)';
    if (data.current_occupancy !== undefined && data.current_occupancy < 0) {
      newErrors.current_occupancy = 'Occupancy cannot be negative';
    }
    if (data.current_occupancy !== undefined && data.capacity && data.current_occupancy > data.capacity) {
      newErrors.current_occupancy = 'Occupancy cannot exceed capacity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const handleCreate = async () => {
    if (!validateForm(formData)) return;

    setSubmitting(true);
    try {
      const capacity = Number(formData.capacity);
      const occupancy = Number(formData.current_occupancy) || 0;
      const autoStatus = calculateStatus(occupancy, capacity);
      
      const payload = {
        name: formData.name as string,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        capacity: capacity,
        current_occupancy: occupancy,
        status: autoStatus,
        contact_person: formData.contact_person || null,
        contact_number: formData.contact_number || null,
        email: formData.email || null,
        address: formData.address || null,
      };
      
      const response = await evacuationCentersApi.createCenter(payload);
      const newCenter = response?.data || response;
      
      if (newCenter) {
        setCenters(prev => [newCenter, ...prev]);
        setShowCreateModal(false);
        setFormData({});
        setErrors({});
        showToast({
          type: "success",
          title: "Success",
          message: "Evacuation center created successfully",
        });
      }
    } catch (error) {
      console.error('Failed to create center:', error);
      showToast({
        type: "error",
        title: "Error",
        message: "Failed to create evacuation center. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCenter || !validateForm(formData)) return;

    setSubmitting(true);
    try {
      const capacity = Number(formData.capacity);
      const occupancy = Number(formData.current_occupancy) || 0;
      const autoStatus = calculateStatus(occupancy, capacity, formData.status);
      
      const payload = {
        name: formData.name as string,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        capacity: capacity,
        current_occupancy: occupancy,
        status: autoStatus,
        contact_person: formData.contact_person || null,
        contact_number: formData.contact_number || null,
        email: formData.email || null,
        address: formData.address || null,
      };
      
      const response = await evacuationCentersApi.updateCenter(selectedCenter.center_id, payload);
      const updated = response?.data || response;
      
      if (updated) {
        setCenters(prev => prev.map(c => c.center_id === selectedCenter.center_id ? updated : c));
        setShowEditModal(false);
        setSelectedCenter(null);
        setFormData({});
        setErrors({});
        showToast({
          type: "success",
          title: "Success",
          message: "Evacuation center updated successfully",
        });
      }
    } catch (error) {
      console.error('Failed to update center:', error);
      showToast({
        type: "error",
        title: "Error",
        message: "Failed to update evacuation center. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCenter) return;

    try {
      setIsDeleting(true);
      await evacuationCentersApi.deleteCenter(selectedCenter.center_id);
      setCenters(prev => prev.filter(c => c.center_id !== selectedCenter.center_id));
      setShowDeleteModal(false);
      setSelectedCenter(null);
      showToast({
        type: "success",
        title: "Success",
        message: "Evacuation center deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete center:', error);
      showToast({
        type: "error",
        title: "Error",
        message: "Failed to delete evacuation center. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (center: EvacuationCenter) => {
    setSelectedCenter(center);
    setFormData(center);
    setShowEditModal(true);
  };

  const handleCoordinateChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const openDeleteModal = (center: EvacuationCenter) => {
    setSelectedCenter(center);
    setShowDeleteModal(true);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf', columns: ExportColumn[]) => {
    try {
      const exportData = filteredAndSortedCenters.map(center => ({
        name: center.name,
        status: center.status,
        capacity: center.capacity,
        current_occupancy: center.current_occupancy,
        occupancy_rate: `${getOccupancyPercentage(center)}%`,
        latitude: center.latitude,
        longitude: center.longitude,
        contact_person: center.contact_person || 'N/A',
        contact_number: center.contact_number || 'N/A',
        address: center.address || 'N/A',
        created_at: center.created_at || 'N/A',
        updated_at: center.updated_at || 'N/A',
      }));

      const exportColumns: ExportColumn[] = columns.map(col => ({
        key: col.key,
        label: col.label,
        format: col.format,
      }));

      switch (format) {
        case 'csv':
          ExportUtils.exportToCSV(exportData, exportColumns, {
            filename: `evacuation-centers-${new Date().toISOString().split('T')[0]}`,
            title: 'Evacuation Centers Report',
          });
          break;
        case 'excel':
          ExportUtils.exportToExcel(exportData, exportColumns, {
            filename: `evacuation-centers-${new Date().toISOString().split('T')[0]}`,
            title: 'Evacuation Centers Report',
          });
          break;
        case 'pdf':
          await ExportUtils.exportToPDF(exportData, exportColumns, {
            filename: `evacuation-centers-${new Date().toISOString().split('T')[0]}`,
            title: 'Evacuation Centers Report',
          });
          break;
      }

      showToast({
        type: "success",
        title: "Success",
        message: `Data exported successfully as ${format.toUpperCase()}`,
      });

      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      showToast({
        type: "error",
        title: "Error",
        message: "Failed to export data. Please try again.",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'full': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccupancyPercentage = (center: EvacuationCenter) => {
    return Math.round((center.current_occupancy / center.capacity) * 100);
  };

  // Automatically determine status based on occupancy
  const calculateStatus = useCallback((occupancy: number, capacity: number, currentStatus?: string): 'open' | 'full' | 'closed' => {
    // Don't auto-change if manually set to closed (unless it's full)
    if (currentStatus === 'closed' && occupancy < capacity) {
      return 'closed';
    }
    
    // Auto-update based on occupancy
    if (occupancy >= capacity) {
      return 'full';
    }
    return 'open';
  }, []);

  // Safely format coordinates that may be strings from the API
  const formatCoordinate = (value: unknown): string => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
    return Number.isFinite(n) ? n.toFixed(4) : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evacuation Centers</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all evacuation centers in the system</p>
        </div>
        <div className="flex space-x-3">
         
          <button
            onClick={() => {
              setFormData({});
              setErrors({});
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add New Center
          </button>
          <button
            onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
                        <i className="ri-download-line mr-2"></i>

            Export Centers
          </button>
        </div>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <UsersIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Centers</p>
                <p className="text-xl font-bold text-gray-900">{centers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open Centers</p>
                <p className="text-xl font-bold text-gray-900">{centers.filter(c => c.status === 'open').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <AlertIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Full Centers</p>
                <p className="text-xl font-bold text-gray-900">{centers.filter(c => c.status === 'full').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <XIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Closed Centers</p>
                <p className="text-xl font-bold text-gray-900">{centers.filter(c => c.status === 'closed').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search centers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="capacity">Sort by Capacity</option>
              <option value="occupancy">Sort by Occupancy</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* Centers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedCenters.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No centers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by creating a new center.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCenters.map((center) => (
              <div key={center.center_id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{center.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(center.status)}`}>
                        {center.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(center)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit center"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(center)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete center"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatCoordinate(center.latitude)}, {formatCoordinate(center.longitude)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{center.current_occupancy} / {center.capacity} ({getOccupancyPercentage(center)}%)</span>
                    </div>
                    {center.contact_person && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{center.contact_person}</span>
                      </div>
                    )}
                    {center.contact_number && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MailIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{center.contact_number}</span>
                      </div>
                    )}
                    {center.address && (
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{center.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getOccupancyPercentage(center) > 80 ? 'bg-red-500' : getOccupancyPercentage(center) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(getOccupancyPercentage(center), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              if (!submitting) {
                setShowCreateModal(false);
                setShowEditModal(false);
                setFormData({});
                setErrors({});
              }
            }}
          >
            <div 
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {showCreateModal ? 'Create New Evacuation Center' : 'Edit Evacuation Center'}
                </h2>
                <button
                  onClick={() => {
                    if (!submitting) {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setFormData({});
                      setErrors({});
                    }
                  }}
                  disabled={submitting}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Close"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Center Name *</label>
                        <input
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter evacuation center name"
                          disabled={submitting}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <MapPinIcon className="w-5 h-5 inline mr-2" />
                      Location Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Location Coordinates *
                        </label>
                        <div className="text-xs text-gray-500 mb-3">
                          Click on the map below to select coordinates, or enter them manually
                        </div>
                        
                        {/* Map Picker */}
                        <div className="mb-4">
                          <CoordinatePicker
                            latitude={formData.latitude || null}
                            longitude={formData.longitude || null}
                            onCoordinateChange={handleCoordinateChange}
                            height="250px"
                            center={[13.8456, 121.2006]}
                            zoom={13}
                          />
                        </div>

                        {/* Manual Coordinate Input */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={formData.latitude || ''}
                              onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                              placeholder="e.g., 13.7565"
                              disabled={submitting}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                                errors.latitude ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={formData.longitude || ''}
                              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                              placeholder="e.g., 121.3851"
                              disabled={submitting}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                                errors.longitude ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
                          </div>
                        </div>
                      </div>


                    </div>
                  </div>

                  {/* Capacity and Status Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <UsersIcon className="w-5 h-5 inline mr-2" />
                      Capacity & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                          placeholder="Enter maximum capacity"
                          disabled={submitting}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.capacity ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Occupancy</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.current_occupancy || ''}
                          onChange={(e) => setFormData({ ...formData, current_occupancy: parseInt(e.target.value) })}
                          placeholder="Enter current occupancy"
                          disabled={submitting}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            errors.current_occupancy ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.current_occupancy && <p className="text-red-500 text-xs mt-1">{errors.current_occupancy}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                          <span className="text-xs text-gray-500 ml-2">(Auto-updated based on occupancy)</span>
                        </label>
                        <select
                          value={formData.status || 'open'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'full' | 'closed' })}
                          disabled={submitting}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="open">Open</option>
                          <option value="full">Full</option>
                          <option value="closed">Closed</option>
                        </select>
                        {formData.current_occupancy !== undefined && formData.capacity !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            Status automatically updates: {formData.current_occupancy || 0} / {formData.capacity} = {
                              formData.current_occupancy && formData.capacity && (formData.current_occupancy >= formData.capacity) ? 'Full' : 'Open'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <PhoneIcon className="w-5 h-5 inline mr-2" />
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={formData.contact_person || ''}
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                          placeholder="Enter contact person name"
                          disabled={submitting}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                        <input
                          type="tel"
                          value={formData.contact_number || ''}
                          onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                          placeholder="Enter contact number"
                          disabled={submitting}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
                <button
                  onClick={() => {
                    if (!submitting) {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setFormData({});
                      setErrors({});
                    }
                  }}
                  disabled={submitting}
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={showCreateModal ? handleCreate : handleUpdate}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      {showCreateModal ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      {showCreateModal ? 'Create Center' : 'Update Center'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setSelectedCenter(null); } }}
          onConfirm={handleDelete}
          title="Delete Evacuation Center"
          message={`Are you sure you want to delete the evacuation center "${selectedCenter?.name}"? This action cannot be undone.`}
          confirmText="Delete Center"
          cancelText="Cancel"
          confirmVariant="secondary"
          icon="ri-delete-bin-line"
          iconColor="text-red-600"
          isLoading={isDeleting}
          loadingText="Deleting..."
        />

        {/* Export Modal */}
        <ExportPreviewModal
          open={showExportModal}
          data={filteredAndSortedCenters}
          columns={[
            { key: 'name', label: 'Center Name' },
            { key: 'status', label: 'Status' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'current_occupancy', label: 'Current Occupancy' },
            { key: 'occupancy_rate', label: 'Occupancy Rate' },
            { key: 'contact_person', label: 'Contact Person' },
            { key: 'contact_number', label: 'Contact Number' },
          ]}
          title="Evacuation Centers Export"
          onClose={() => setShowExportModal(false)}
          onExportPDF={() => handleExport('pdf', [
            { key: 'name', label: 'Center Name' },
            { key: 'status', label: 'Status' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'current_occupancy', label: 'Current Occupancy' },
            { key: 'occupancy_rate', label: 'Occupancy Rate' },
            { key: 'contact_person', label: 'Contact Person' },
            { key: 'contact_number', label: 'Contact Number' },
          ])}
          onExportCSV={() => handleExport('csv', [
            { key: 'name', label: 'Center Name' },
            { key: 'status', label: 'Status' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'current_occupancy', label: 'Current Occupancy' },
            { key: 'occupancy_rate', label: 'Occupancy Rate' },
            { key: 'contact_person', label: 'Contact Person' },
            { key: 'contact_number', label: 'Contact Number' },
          ])}
          onExportExcel={() => handleExport('excel', [
            { key: 'name', label: 'Center Name' },
            { key: 'status', label: 'Status' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'current_occupancy', label: 'Current Occupancy' },
            { key: 'occupancy_rate', label: 'Occupancy Rate' },
            { key: 'contact_person', label: 'Contact Person' },
            { key: 'contact_number', label: 'Contact Number' },
          ])}
        />
    </div>
  );
};

export default EvacuationCentersManagement;