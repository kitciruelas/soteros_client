import React, { useState, useEffect } from 'react';
import { evacuationCentersApi } from '../../../../utils/api';
import { ConfirmModal } from '../../../../components/base/Modal';
import { useToast } from '../../../../components/base/Toast';
import ExportPreviewModal from '../../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../../utils/exportUtils';
import ExportUtils from '../../../../utils/exportUtils';

// Simple SVG icons to match the centers page style
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

const BoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const BuildingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const ToolsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const WaterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SupplyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface EvacuationResource {
  resource_id: number;
  center_id: number;
  type: 'facility' | 'water' | 'supply';
  name: string;
  quantity: number;
  picture: string | null;
  created_at: string;
  updated_at: string;
}

interface EvacuationCenter {
  center_id: number;
  name: string;
}

const EvacuationResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<EvacuationResource[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<EvacuationResource | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<number | ''>('');
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'facility' as 'facility' | 'water' | 'supply',
    name: '',
    quantity: 1
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resourceIdToDelete, setResourceIdToDelete] = useState<number | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const centersData = await evacuationCentersApi.getCenters();
      
      // Handle different API response formats
      let centersArray: EvacuationCenter[] = [];
      if (centersData && typeof centersData === 'object') {
        if (centersData.success && centersData.data) {
          centersArray = centersData.data;
        } else if (Array.isArray(centersData)) {
          centersArray = centersData;
        } else if (centersData.data && Array.isArray(centersData.data)) {
          centersArray = centersData.data;
        }
      }
      
      setCenters(centersArray);
      
      if (centersArray.length > 0) {
        setSelectedCenter(centersArray[0].center_id);
        await loadResourcesForCenter(centersArray[0].center_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load evacuation centers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadResourcesForCenter = async (centerId: number) => {
    try {
      setResourcesLoading(true);
      setError('');
      const resourcesData = await evacuationCentersApi.getResources(centerId);
      
      let resourcesArray: EvacuationResource[] = [];
      if (resourcesData && typeof resourcesData === 'object') {
        if (resourcesData.success && resourcesData.data) {
          resourcesArray = resourcesData.data;
        } else if (Array.isArray(resourcesData)) {
          resourcesArray = resourcesData;
        } else if (resourcesData.data && Array.isArray(resourcesData.data)) {
          resourcesArray = resourcesData.data;
        }
      }
      
      // Ensure all resources have the required fields
      resourcesArray = resourcesArray.map(resource => ({
        ...resource,
        created_at: resource.created_at || resource.updated_at || new Date().toISOString(),
        updated_at: resource.updated_at || new Date().toISOString()
      }));
      
      setResources(resourcesArray);
    } catch (error) {
      console.error('Error loading resources:', error);
      setError('Failed to load resources for this center. Please try again.');
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleCenterChange = async (centerId: number) => {
    setSelectedCenter(centerId);
    setSearch('');
    setTypeFilter('all');
    await loadResourcesForCenter(centerId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenter) {
      setError('Please select a center first.');
      return;
    }

    if (!formData.name.trim()) {
      setError('Resource name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const resourceData = {
        ...formData,
        name: formData.name.trim()
      };

      let resourceId: number;

      if (editingResource) {
        await evacuationCentersApi.updateResource(
          selectedCenter,
          editingResource.resource_id,
          resourceData
        );
        resourceId = editingResource.resource_id;
        showToast({ type: 'success', message: 'Resource updated successfully' });
      } else {
        const createResponse = await evacuationCentersApi.createResource(selectedCenter, resourceData);
        resourceId = createResponse.data?.resource_id;
        showToast({ type: 'success', message: 'Resource created successfully' });
      }

      // Upload picture if selected
      if (selectedFile && resourceId) {
        try {
          await evacuationCentersApi.uploadResourcePicture(selectedCenter, resourceId, selectedFile);
        } catch (uploadError) {
          console.error('Error uploading picture:', uploadError);
          // Don't fail the entire operation if picture upload fails
          showToast({ type: 'warning', message: 'Image upload failed, saved without image' });
        }
      }

      setShowModal(false);
      setEditingResource(null);
      resetForm();
      // Clean up preview URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      await loadResourcesForCenter(selectedCenter);
    } catch (error: any) {
      console.error('Error saving resource:', error);
      const errorMessage = error.message || 'Failed to save resource. Please try again.';
      setError(errorMessage);
      showToast({ type: 'error', message: 'Failed to save resource' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (resource: EvacuationResource) => {
    setEditingResource(resource);
    setFormData({
      type: resource.type,
      name: resource.name,
      quantity: resource.quantity
    });
    setSelectedFile(null);
    setPreviewUrl(resource.picture || null);
    setShowModal(true);
  };

  const requestDelete = (resourceId: number) => {
    setResourceIdToDelete(resourceId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedCenter || resourceIdToDelete == null) return;
    try {
      setDeleting(true);
      setError('');
      await evacuationCentersApi.deleteResource(selectedCenter, resourceIdToDelete);
      await loadResourcesForCenter(selectedCenter);
      showToast({ type: 'success', message: 'Resource deleted successfully' });
      setShowDeleteConfirm(false);
      setResourceIdToDelete(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
      setError('Failed to delete resource. Please try again.');
      showToast({ type: 'error', message: 'Failed to delete resource' });
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'facility',
      name: '',
      quantity: 1
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'facility': return 'bg-blue-100 text-blue-800';
      case 'water': return 'bg-cyan-100 text-cyan-800';
      case 'supply': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIconComponent = (type: string) => {
    switch (type) {
      case 'facility': return BuildingIcon;
      case 'water': return WaterIcon;
      case 'supply': return SupplyIcon;
      default: return BoxIcon;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB.');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    // Clean up blob URL if it exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (editingResource?.picture) {
      // If editing and there was a previous image, we'll need to handle this
      // For now, just clear the preview
    }
  };

  const openImageModal = (src: string, alt: string) => {
    setSelectedImage({ src, alt });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Export functionality
  const exportColumns: ExportColumn[] = [
    { key: 'name', label: 'Resource Name' },
    { key: 'type', label: 'Type' },
    { key: 'quantity', label: 'Quantity' },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      format: (value) => new Date(value).toLocaleDateString()
    }
  ];

  const prepareExportData = () => {
    return filteredResources.map(resource => ({
      name: resource.name,
      type: resource.type.charAt(0).toUpperCase() + resource.type.slice(1),
      quantity: resource.quantity,
      created_at: resource.created_at,
      updated_at: resource.updated_at
    }));
  };

  const handleExportPDF = async () => {
    try {
      const exportData = prepareExportData();
      await ExportUtils.exportToPDF(
        exportData,
        exportColumns,
        {
          filename: `evacuation-resources-${centers.find(c => c.center_id === selectedCenter)?.name || 'all'}`,
          title: `Evacuation Resources - ${centers.find(c => c.center_id === selectedCenter)?.name || 'All Centers'}`,
          includeTimestamp: true
        }
      );
      showToast({ type: 'success', message: 'PDF exported successfully' });
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast({ type: 'error', message: 'Failed to export PDF' });
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = prepareExportData();
      ExportUtils.exportToCSV(
        exportData,
        exportColumns,
        {
          filename: `evacuation-resources-${centers.find(c => c.center_id === selectedCenter)?.name || 'all'}`,
          includeTimestamp: true
        }
      );
      showToast({ type: 'success', message: 'CSV exported successfully' });
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast({ type: 'error', message: 'Failed to export CSV' });
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = prepareExportData();
      ExportUtils.exportToExcel(
        exportData,
        exportColumns,
        {
          filename: `evacuation-resources-${centers.find(c => c.center_id === selectedCenter)?.name || 'all'}`,
          title: `Evacuation Resources - ${centers.find(c => c.center_id === selectedCenter)?.name || 'All Centers'}`,
          includeTimestamp: true
        }
      );
      showToast({ type: 'success', message: 'Excel exported successfully' });
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast({ type: 'error', message: 'Failed to export Excel' });
    }
  };

  // Filter resources based on search and type filter
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || resource.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate stats
  const totalResources = resources.length;
  const facilityResources = resources.filter(r => r.type === 'facility').length;
  const waterResources = resources.filter(r => r.type === 'water').length;
  const supplyResources = resources.filter(r => r.type === 'supply').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!centers.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Evacuation Resources</h1>
            <p className="text-gray-600 mt-1">Manage resources and supplies at evacuation centers</p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <BuildingIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No evacuation centers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            You need to create evacuation centers first before managing resources.
          </p>
          <div className="mt-4">
            <button
              onClick={() => window.location.href = '/admin/evacuation/centers'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Evacuation Centers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evacuation Resources</h1>
          <p className="text-gray-600 mt-1">Manage resources and supplies at evacuation centers</p>
        </div>
        {selectedCenter && (
          <div className="flex gap-3">
          
            <button
              onClick={() => {
                setError('');
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add New Resource
            </button>
              <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              title="Export Resources"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export Resources
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError('')}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Center</label>
            <select
              value={selectedCenter}
              onChange={(e) => handleCenterChange(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {centers.map((center) => (
                <option key={center.center_id} value={center.center_id}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedCenter && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <BoxIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Resources</p>
                <p className="text-xl font-bold text-gray-900">{totalResources}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <BuildingIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Facilities</p>
                <p className="text-xl font-bold text-gray-900">{facilityResources}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                <WaterIcon className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Water</p>
                <p className="text-xl font-bold text-gray-900">{waterResources}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <SupplyIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Supplies</p>
                <p className="text-xl font-bold text-gray-900">{supplyResources}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedCenter && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="facility">Facility</option>
              <option value="water">Water</option>
              <option value="supply">Supply</option>
            </select>
          </div>
        </div>
      )}

      {/* Resources Table */}
      {selectedCenter && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Resources at {centers.find(c => c.center_id === selectedCenter)?.name}
            </h2>
          </div>
          
          {resourcesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading resources...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Picture</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResources.map((resource) => {
                      const IconComponent = getTypeIconComponent(resource.type);
                      return (
                        <tr key={resource.resource_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(resource.type)}`}>
                              <IconComponent className="w-3 h-3 mr-1" />
                              {resource.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {resource.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {resource.picture ? (
                              <img
                                src={resource.picture}
                                alt={resource.name}
                                className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openImageModal(resource.picture!, resource.name)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 bg-gray-200 rounded flex items-center justify-center ${resource.picture ? 'hidden' : ''}`}>
                              <BoxIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(resource.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(resource)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                                title="Edit resource"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDelete(resource.resource_id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                title="Delete resource"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredResources.length === 0 && (
                <div className="text-center py-12">
                  <BoxIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {search || typeFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by adding a new resource.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={submitting}
                  >
                    <option value="facility">Facility</option>
                    <option value="water">Water</option>
                    <option value="supply">Supply</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Enter resource name"
                    disabled={submitting}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    max="999999"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Enter quantity"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Picture</label>
                  <div className="space-y-2">
                    {previewUrl && (
                      <div className="relative">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                          disabled={submitting}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={submitting}
                    />
                    <p className="text-xs text-gray-500">
                      Accepted formats: JPG, PNG, GIF. Max size: 5MB
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingResource(null);
                      resetForm();
                      // Clean up preview URL
                      if (previewUrl && previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(previewUrl);
                      }
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingResource ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingResource ? 'Update Resource' : 'Create Resource'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { 
          if (!deleting) {
            setShowDeleteConfirm(false); 
            setResourceIdToDelete(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmText="Delete Resource"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
        isLoading={deleting}
      />

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportPreviewModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        data={prepareExportData()}
        columns={exportColumns}
        title={`Evacuation Resources - ${centers.find(c => c.center_id === selectedCenter)?.name || 'All Centers'}`}
      />
    </div>
  );
};

export default EvacuationResourcesPage;
