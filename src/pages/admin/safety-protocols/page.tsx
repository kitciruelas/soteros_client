import React, { useState, useEffect } from 'react';
import { safetyProtocolsApi } from '../../../utils/api';
import Modal, { ConfirmModal } from '../../../components/base/Modal';
import { useToast } from '../../../components/base/Toast';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import ExportUtils from '../../../utils/exportUtils';
import type { ExportColumn } from '../../../utils/exportUtils';


interface SafetyProtocol {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'draft' | 'archived'; 
  steps: string[];
  createdAt: string;
  updatedAt: string;
  // DB fields (optional on UI type)
  protocol_id?: number;
  type?: 'fire' | 'earthquake' | 'medical' | 'intrusion' | 'general';
  file_attachment?: string | null;
  created_by?: number | null;
  creator_name?: string;
  created_at?: string;
  updated_at?: string;
}

const SafetyProtocolsManagement: React.FC = () => {
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<SafetyProtocol | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [protocolToDelete, setProtocolToDelete] = useState<SafetyProtocol | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state for create/edit
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'' | 'fire' | 'earthquake' | 'medical' | 'intrusion' | 'general'>('');
  const [formFileAttachments, setFormFileAttachments] = useState<string[]>([]); // Changed to array for multiple files
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: boolean}>({});

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<SafetyProtocol[]>([]);
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([]);
  const [exportOrientation, setExportOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // Dynamic export modal title
    const getExportTitle = () => {
      let title = 'Export Safety Protocols';
      if (categoryFilter !== 'all' || searchTerm.trim() !== '') {
        title += ' - ';
        if (categoryFilter !== 'all') title += categoryFilter;
        if (searchTerm.trim() !== '') title += (categoryFilter !== 'all' ? ' | ' : '') + `Search: "${searchTerm.trim()}"`;
      }
      return title;
    };

  useEffect(() => {
    fetchProtocols();
  }, []);

  const openExportModal = () => {
    // Define columns for export
    const columns: ExportColumn[] = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At', format: ExportUtils.formatDateTime },
    ];
    setExportColumns(columns);
    setExportData(filteredProtocols);
    setShowExportModal(true);
  };

  const toCategory = (typeValue: string): string => {
    const t = (typeValue || '').toLowerCase();
    if (t === 'fire') return 'Fire Safety';
    if (t === 'earthquake') return 'Natural Disasters';
    if (t === 'medical') return 'Medical';
    if (t === 'intrusion') return 'Security';
    if (t === 'general') return 'Other';
    return typeValue || 'Other';
  };

  const normalizePriority = (value: string): SafetyProtocol['priority'] => {
    const v = (value || '').toLowerCase();
    if (v === 'low' || v === 'medium' || v === 'high' || v === 'critical') return v as SafetyProtocol['priority'];
    return 'medium';
  };

  const normalizeStatus = (value: string): SafetyProtocol['status'] => {
    const v = (value || '').toLowerCase();
    if (v === 'active' || v === 'draft' || v === 'archived') return v as SafetyProtocol['status'];
    return 'active';
  };

  const parseSteps = (row: any): string[] => {
    if (Array.isArray(row?.steps)) return row.steps as string[];
    if (typeof row?.steps_json === 'string') {
      try { const parsed = JSON.parse(row.steps_json); if (Array.isArray(parsed)) return parsed; } catch {}
    }
    if (typeof row?.steps === 'string') {
      return row.steps.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const mapRowToProtocol = (row: any): SafetyProtocol => ({
    id: Number(row?.protocol_id ?? row?.id ?? 0),
    title: String(row?.title ?? ''),
    description: String(row?.description ?? ''),
    category: toCategory(String(row?.type ?? row?.category ?? 'General')),
    priority: normalizePriority(String(row?.priority ?? 'medium')),
    status: normalizeStatus(String(row?.status ?? 'active')),
    steps: parseSteps(row),
    createdAt: row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    // DB fields
    protocol_id: row?.protocol_id ?? null,
    type: row?.type ?? undefined,
    file_attachment: row?.file_attachment ?? null,
    created_by: row?.created_by ?? null,
    created_at: row?.created_at ?? undefined,
    updated_at: row?.updated_at ?? undefined,
  });

  const fetchProtocols = async () => {
    try {
      const rows = await safetyProtocolsApi.getProtocols();
      const mapped = Array.isArray(rows) ? rows.map(mapRowToProtocol) : [];
      
      // Debug: Log file attachments
      console.log('📥 Fetched protocols:', mapped.map(p => ({
        id: p.protocol_id || p.id,
        title: p.title,
        file_attachment_type: typeof p.file_attachment,
        file_attachment_value: p.file_attachment
      })));
      
      setProtocols(mapped);
    } catch (error) {
      console.error('Error fetching protocols:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProtocol = () => {
    setSelectedProtocol(null);
    setIsEditing(true);
    setShowProtocolModal(true);
    // reset form
    setFormTitle('');
    setFormDescription('');
    setFormType('');
    setFormFileAttachments([]);
    setUploadProgress({});
  };

  const handleEditProtocol = (protocol: SafetyProtocol) => {
    setSelectedProtocol(protocol);
    setIsEditing(true);
    setShowProtocolModal(true);
    // seed form from selected
    setFormTitle(protocol.title || '');
    setFormDescription(protocol.description || '');
    setFormType((protocol.type as any) || '');
    
    console.log('📝 Editing protocol - file_attachment:', {
      type: typeof protocol.file_attachment,
      isArray: Array.isArray(protocol.file_attachment),
      value: protocol.file_attachment,
      length: Array.isArray(protocol.file_attachment) ? protocol.file_attachment.length : 'N/A'
    });
    
    // Parse multiple attachments - handle both array and string formats
    let finalAttachments: string[] = [];
    
    if (Array.isArray(protocol.file_attachment)) {
      // Already an array
      finalAttachments = protocol.file_attachment.filter(Boolean);
      console.log('✅ Array format:', finalAttachments);
    } else if (protocol.file_attachment) {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(protocol.file_attachment);
        finalAttachments = Array.isArray(parsed) ? parsed.filter(Boolean) : [protocol.file_attachment];
        console.log('✅ Parsed JSON format:', finalAttachments);
      } catch (e) {
        // Single file string
        finalAttachments = [protocol.file_attachment];
        console.log('✅ Single file format:', finalAttachments);
      }
    } else {
      finalAttachments = [];
      console.log('⚠️ No attachments');
    }
    
    console.log('📎 Final attachments to load:', finalAttachments);
    setFormFileAttachments(finalAttachments);
    setUploadProgress({});
  };

  const handleViewProtocol = (protocol: SafetyProtocol) => {
    setSelectedProtocol(protocol);
    setIsEditing(false);
    setShowProtocolModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
      const adminId = adminInfo?.admin?.id;

      // Convert multiple attachments to JSON string
      const attachmentsJson = formFileAttachments.length > 0 ? JSON.stringify(formFileAttachments) : null;

      console.log('💾 Saving protocol:', {
        attachmentCount: formFileAttachments.length,
        attachmentsJsonLength: attachmentsJson?.length || 0,
        attachmentsJson: attachmentsJson
      });

      if (!selectedProtocol) {
        // Create
        const payload = {
          title: formTitle.trim(),
          description: formDescription.trim(),
          type: (formType || 'general') as 'fire' | 'earthquake' | 'medical' | 'intrusion' | 'general',
          file_attachment: attachmentsJson,
          created_by: adminId || null,
        };
        console.log('📝 CREATE payload:', {
          ...payload,
          file_attachment_length: payload.file_attachment?.length || 0
        });
        
        const response = await safetyProtocolsApi.createProtocol(payload);
        console.log('✅ CREATE response:', response);
        showToast({ type: 'success', message: 'Protocol created successfully' });
      } else {
        // Update existing
        const protocolId = Number(selectedProtocol.protocol_id ?? selectedProtocol.id);
        const payload: Partial<{ title: string; description: string; type: 'fire'|'earthquake'|'medical'|'intrusion'|'general'; file_attachment: string|null }> = {};
        if (formTitle.trim() !== '') payload.title = formTitle.trim();
        if (formDescription.trim() !== '') payload.description = formDescription.trim();
        if ((formType as any) && formType !== '') payload.type = formType as any;
        payload.file_attachment = attachmentsJson;
        
        console.log('✏️ UPDATE payload:', {
          protocolId,
          ...payload,
          file_attachment_length: payload.file_attachment?.length || 0
        });
        
        const response = await safetyProtocolsApi.updateProtocol(protocolId, payload);
        console.log('✅ UPDATE response:', response);
        showToast({ type: 'success', message: 'Protocol updated successfully' });
      }
      await fetchProtocols();
      setShowProtocolModal(false);
    } catch (err) {
      console.error('❌ Save failed:', err);
      console.error('Error details:', {
        message: (err as any)?.message,
        response: (err as any)?.response,
        status: (err as any)?.status
      });
      showToast({ type: 'error', message: 'Failed to save protocol' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    console.log('📤 Upload triggered:', {
      filesCount: files?.length || 0,
      files: files ? Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })) : []
    });
    
    if (!files || files.length === 0) {
      console.warn('⚠️ No files selected');
      return;
    }
    
    try {
      setUploading(true);
      const uploadedUrls: string[] = [];
      
      console.log(`🚀 Starting upload of ${files.length} file(s)...`);
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileKey = `${file.name}-${Date.now()}`;
        
        console.log(`📁 Uploading file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        try {
          setUploadProgress(prev => ({ ...prev, [fileKey]: true }));
          
          const res = await safetyProtocolsApi.uploadAttachment(file);
          console.log(`✅ Upload successful for ${file.name}:`, res);
          
          if (res && (res as any).url) {
            uploadedUrls.push((res as any).url || (res as any).path);
            showToast({ type: 'success', message: `${file.name} uploaded successfully` });
          } else {
            console.error('❌ No URL in response for', file.name);
          }
          
          setUploadProgress(prev => ({ ...prev, [fileKey]: false }));
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
          showToast({ type: 'error', message: `Failed to upload ${file.name}` });
          setUploadProgress(prev => ({ ...prev, [fileKey]: false }));
        }
      }
      
      console.log(`✨ Upload complete! ${uploadedUrls.length} file(s) uploaded:`, uploadedUrls);
      
      // Add new URLs to existing attachments
      if (uploadedUrls.length > 0) {
        setFormFileAttachments(prev => {
          const newAttachments = [...prev, ...uploadedUrls];
          console.log('📎 Total attachments now:', newAttachments.length, newAttachments);
          return newAttachments;
        });
      } else {
        console.warn('⚠️ No files were successfully uploaded');
      }
      
    } catch (error) {
      console.error('❌ Attachment upload failed:', error);
      showToast({ type: 'error', message: 'Failed to upload files' });
    } finally {
      setUploading(false);
      setUploadProgress({});
      // Reset input so same file can be uploaded again
      e.target.value = '';
      console.log('🏁 Upload process finished');
    }
  };

  const removeAttachment = (index: number) => {
    setFormFileAttachments(prev => prev.filter((_, i) => i !== index));
    showToast({ type: 'success', message: 'Attachment removed' });
  };

  const requestDeleteProtocol = (protocol: SafetyProtocol) => {
    setProtocolToDelete(protocol);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProtocol = async () => {
    if (!protocolToDelete) return;
    try {
      setIsDeleting(true);
      const protocolId = Number(protocolToDelete.protocol_id ?? protocolToDelete.id);
      await safetyProtocolsApi.deleteProtocol(protocolId);
      await fetchProtocols();
      showToast({ type: 'success', message: 'Protocol deleted successfully' });
    } catch (error) {
      console.error('Delete failed:', error);
      showToast({ type: 'error', message: 'Failed to delete protocol' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setProtocolToDelete(null);
    }
  };

  const getTypeColor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'fire') return 'bg-red-50 text-red-600';
    if (t === 'earthquake') return 'bg-orange-50 text-orange-600';
    if (t === 'medical') return 'bg-green-50 text-green-600';
    if (t === 'intrusion') return 'bg-purple-50 text-purple-600';
    return 'bg-gray-50 text-gray-600';
  };

  const handleExportPDF = async (orientation: 'portrait' | 'landscape' = exportOrientation) => {
    try {
      const options = {
        filename: 'SafetyProtocols',
        title: getExportTitle(),
        includeTimestamp: true,
        orientation
      };
      await ExportUtils.exportToPDF(exportData, exportColumns, options);
      setShowExportModal(false);
      showToast({ type: 'success', message: 'Export successful' });
    } catch (error) {
      console.error('Export failed:', error);
      showToast({ type: 'error', message: 'Export failed' });
    }
  };

  const handleExportCSV = () => {
    try {
      const options = {
        filename: 'SafetyProtocols',
        title: getExportTitle(),
        includeTimestamp: true
      };
      ExportUtils.exportToCSV(exportData, exportColumns, options);
      setShowExportModal(false);
      showToast({ type: 'success', message: 'Export successful' });
    } catch (error) {
      console.error('Export failed:', error);
      showToast({ type: 'error', message: 'Export failed' });
    }
  };

  const handleExportExcel = () => {
    try {
      const options = {
        filename: 'SafetyProtocols',
        title: getExportTitle(),
        includeTimestamp: true
      };
      ExportUtils.exportToExcel(exportData, exportColumns, options);
      setShowExportModal(false);
      showToast({ type: 'success', message: 'Export successful' });
    } catch (error) {
      console.error('Export failed:', error);
      showToast({ type: 'error', message: 'Export failed' });
    }
  };

  const filteredProtocols = protocols.filter(protocol => {
    const matchesSearch = protocol.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         protocol.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         protocol.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || protocol.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Priority/Status badges removed per request

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
          <h1 className="text-2xl font-bold text-gray-900">Safety Protocols Management</h1>
          <p className="text-gray-600 mt-1">Manage emergency safety protocols</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddProtocol}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-add-line mr-2"></i>
            Add Protocol
          </button>
          <button
            onClick={openExportModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Export Protocols
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-shield-check-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Protocols</p>
              <p className="text-xl font-bold text-gray-900">{protocols.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-folder-line text-purple-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-xl font-bold text-gray-900">
                {new Set(protocols.map(p => p.category)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-check-circle-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Protocols</p>
              <p className="text-xl font-bold text-gray-900">
                {protocols.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search protocols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="all">All Categories</option>
              <option value="Fire Safety">Fire Safety</option>
              <option value="Natural Disasters">Natural Disasters</option>
              <option value="Medical">Medical</option>
              <option value="Security">Security</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
            Showing <span className="font-medium text-gray-900">{filteredProtocols.length}</span> of <span className="font-medium text-gray-900">{protocols.length}</span> protocols
          </div>
        </div>
      </div>

      {/* Protocols Grid */}
      {filteredProtocols.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <i className="ri-shield-check-line text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {categoryFilter === 'all' && searchTerm.trim() === ''
              ? 'No safety protocols available'
              : 'No safety protocols match your filters'}
          </h3>
          <p className="text-gray-600">
            {categoryFilter === 'all' && searchTerm.trim() === ''
              ? 'No safety protocols have been created yet. Click "Add Protocol" to create your first one.'
              : 'Try adjusting your search or filter criteria to see more results.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProtocols.map((protocol) => (
            <div key={protocol.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getTypeColor(protocol.type || 'general')}`}>
                      {protocol.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{protocol.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{protocol.description}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500">
                  <i className="ri-time-line mr-1"></i>
                  {new Date(protocol.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleViewProtocol(protocol)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                    title="View Protocol"
                  >
                    <i className="ri-eye-line text-lg"></i>
                  </button>
                  <button
                    onClick={() => handleEditProtocol(protocol)}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-all"
                    title="Edit Protocol"
                  >
                    <i className="ri-edit-line text-lg"></i>
                  </button>
                  <button
                    onClick={() => requestDeleteProtocol(protocol)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                    title="Delete Protocol"
                  >
                    <i className="ri-delete-bin-line text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Protocol Modal (using shared Modal component for consistency) */}
      <Modal
        isOpen={showProtocolModal}
        onClose={() => setShowProtocolModal(false)}
        title={isEditing ? (selectedProtocol ? 'Edit Safety Protocol' : 'Add New Safety Protocol') : 'Safety Protocol Details'}
        size="xl"
      >
        <div className="space-y-4">
          {selectedProtocol && !isEditing ? (
            <>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      {selectedProtocol.type ? 
                        (selectedProtocol.type === 'general' ? 'Other' : 
                        (selectedProtocol.type.charAt(0).toUpperCase() + selectedProtocol.type.slice(1))) 
                        : 'General'}
                    </span>
                    <span className="text-xs text-gray-500">ID: {selectedProtocol.protocol_id ?? selectedProtocol.id}</span>
                  </div>
                  {selectedProtocol.file_attachment && (() => {
                    // Parse attachments - handle both array and string formats
                    let attachments: string[] = [];
                    
                    // Check if it's already an array (from API)
                    if (Array.isArray(selectedProtocol.file_attachment)) {
                      attachments = selectedProtocol.file_attachment;
                    } else if (typeof selectedProtocol.file_attachment === 'string') {
                      try {
                        // Try to parse as JSON array
                        const parsed = JSON.parse(selectedProtocol.file_attachment);
                        attachments = Array.isArray(parsed) ? parsed : [selectedProtocol.file_attachment];
                      } catch {
                        // Single file (old format)
                        attachments = [selectedProtocol.file_attachment];
                      }
                    }

                    // Filter out empty strings and display
                    const validAttachments = attachments.filter(a => a && a.trim());
                    
                    if (validAttachments.length === 0) return null;

                    return (
                      <div className="flex flex-wrap gap-2">
                        {validAttachments.map((url: string, idx: number) => {
                          // Ensure URL is properly formatted
                          const fileUrl = url.startsWith('http') ? url : `/uploads/${url}`;
                          
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                            >
                              <i className={`mr-1.5 ${
                                /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ? 'ri-image-line' :
                                /\.pdf$/i.test(url) ? 'ri-file-pdf-line' : 'ri-file-text-line'
                              }`}></i>
                              {validAttachments.length > 1 ? `File ${idx + 1}` : 'View Attachment'}
                            </a>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedProtocol.title}</h3>
                <p className="text-gray-600 mb-4 whitespace-pre-line">{selectedProtocol.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Created Information</label>
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3 text-sm">
                        <i className="ri-user-line text-gray-400"></i>
                        <span className="text-gray-600">Created by:</span>
                        <span className={`font-medium ${selectedProtocol.creator_name !== 'System' ? 'text-gray-900' : 'text-gray-500 italic'}`}>
                          {selectedProtocol.creator_name || 'System'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm mt-2">
                        <i className="ri-time-line text-gray-400"></i>
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium text-gray-900">
                          {selectedProtocol.created_at
                            ? new Date(selectedProtocol.created_at).toLocaleString()
                            : new Date(selectedProtocol.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Last Update</label>
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3 text-sm">
                        <i className="ri-history-line text-gray-400"></i>
                        <span className="text-gray-600">Updated:</span>
                        <span className="font-medium text-gray-900">
                          {selectedProtocol.updated_at
                            ? new Date(selectedProtocol.updated_at).toLocaleString()
                            : new Date(selectedProtocol.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter protocol title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type <span className="text-red-500">*</span></label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Type</option>
                    <option value="fire">Fire</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="medical">Medical</option>
                    <option value="intrusion">Intrusion</option>
                    <option value="general">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter detailed protocol description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Attachments ({formFileAttachments.length})
                </label>
                
                {/* Uploaded Files List */}
                {formFileAttachments.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {formFileAttachments.map((url, index) => {
                      const fileName = url.split('/').pop() || `File ${index + 1}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      const isPdf = /\.pdf$/i.test(url);
                      
                      return (
                        <div key={index} className="relative group bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all overflow-hidden">
                          {/* Preview Area */}
                          <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                            {isImage ? (
                              <img 
                                src={url} 
                                alt={fileName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className={`w-full h-full flex flex-col items-center justify-center ${
                                isPdf ? 'bg-red-50' : 'bg-gray-100'
                              }`}>
                                <i className={`text-4xl mb-2 ${
                                  isPdf ? 'ri-file-pdf-line text-red-500' : 'ri-file-line text-gray-400'
                                }`}></i>
                                <span className="text-xs text-gray-500">
                                  {isPdf ? 'PDF' : 'File'}
                                </span>
                              </div>
                            )}
                            
                            {/* Overlay with actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <i className="ri-eye-line"></i>
                              </a>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-lg transition-colors"
                                title="Remove"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                            
                            {/* File number badge */}
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
                              {index + 1}
                            </div>
                          </div>
                          
                          {/* File info */}
                          <div className="p-2 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 truncate" title={fileName}>
                              {fileName}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upload Area */}
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-lg hover:border-blue-400 transition-all cursor-pointer">
                  <div className="space-y-2 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <i className="ri-upload-cloud-2-line text-4xl text-gray-400"></i>
                    </div>
                    <div className="flex text-sm text-gray-600">
                      <input
                        type="file"
                        accept="*/*"
                        multiple
                        onChange={handleAttachmentChange}
                        className="sr-only"
                        id="file-upload"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-700 focus-within:outline-none"
                      >
                        <span>Click to upload images</span>
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">Images (JPG, PNG, GIF, WEBP) up to 10MB each</p>
                 
                    {uploading && (
                      <div className="flex items-center justify-center text-sm text-blue-600 pt-2">
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        Uploading files...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="pt-4 mt-2 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowProtocolModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {isEditing ? 'Cancel' : 'Close'}
            </button>
            {isEditing && (
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                {isSaving ? 'Saving...' : (selectedProtocol ? 'Update Protocol' : 'Create Protocol')}
              </button>
            )}
          </div>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { if (!isDeleting) { setShowDeleteConfirm(false); setProtocolToDelete(null); } }}
        onConfirm={confirmDeleteProtocol}
        title="Delete Protocol"
        message={protocolToDelete ? `Are you sure you want to delete "${protocolToDelete.title}"? This action cannot be undone.` : 'Are you sure you want to delete this protocol?'}
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
          data={exportData}
          columns={exportColumns}
          title={getExportTitle()}
          orientation={exportOrientation}
          onOrientationChange={setExportOrientation}
        />
    </div>
  );
};

export default SafetyProtocolsManagement;
