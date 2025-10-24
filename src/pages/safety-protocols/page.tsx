import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { safetyProtocolsApi } from '../../utils/api';
import { getAuthState, type UserData } from '../../utils/auth';


interface SafetyProtocol {
  protocol_id: number;
  title: string;
  description: string;
  type: 'fire' | 'earthquake' | 'medical' | 'intrusion' | 'general';
  file_attachment: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Helper function to get the file URL (supports both local and Cloudinary)
const getFileUrl = (fileAttachment: string | null) => {
  if (!fileAttachment) return '';
  
  // If it's already a full URL (Cloudinary or other), return as-is
  if (fileAttachment.startsWith('http://') || fileAttachment.startsWith('https://')) {
    return fileAttachment;
  }
  
  // Check if it's a Cloudinary path (starts with folder structure like "mdrrmo/")
  if (fileAttachment.startsWith('mdrrmo/')) {
    const cloudName = 'dko23mxez';
    let filePath = fileAttachment;
    
    // If the file doesn't have an extension and it's in safety-protocols, add .pdf
    if (!filePath.includes('.') && filePath.includes('safety-protocols')) {
      filePath = `${filePath}.pdf`;
    }
    
    // Determine resource type based on file extension
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const isDoc = filePath.toLowerCase().match(/\.(doc|docx)$/);
    const resourceType = (isPdf || isDoc) ? 'raw' : 'image';
    
    return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${filePath}`;
  }
  
  // Check if it looks like a Cloudinary public ID (random string with possible extension)
  // Pattern: alphanumeric string (often 10-30 chars) with optional .pdf/.jpg etc
  const cloudinaryIdPattern = /^[a-z0-9]{10,}(\.(pdf|jpg|jpeg|png|gif|webp|doc|docx))?$/i;
  if (cloudinaryIdPattern.test(fileAttachment)) {
    const cloudName = 'dko23mxez';
    // Assume it's in the safety-protocols folder
    const fullPath = `mdrrmo/safety-protocols/${fileAttachment}`;
    
    // Determine resource type based on file extension
    const isPdf = fileAttachment.toLowerCase().endsWith('.pdf');
    const isDoc = fileAttachment.toLowerCase().match(/\.(doc|docx)$/);
    const resourceType = (isPdf || isDoc) ? 'raw' : 'image';
    
    return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${fullPath}`;
  }
  
  // Otherwise, it's a local file path - construct the backend URL
  const apiUrl = import.meta.env.VITE_API_URL;
  let baseUrl = 'https://soteros-backend.onrender.com';
  
  if (apiUrl) {
    baseUrl = apiUrl.replace(/\/api\/?$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
  }
  
  return `${baseUrl}/uploads/${fileAttachment}`;
};

const SafetyProtocolsPage: React.FC = () => {
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProtocol, setSelectedProtocol] = useState<SafetyProtocol | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debug: Log file URL handling on mount
  useEffect(() => {
    console.log('🖼️ Safety Protocols - File URL handler ready (supports Cloudinary & local)');
  }, []);

  useEffect(() => {
    const authState = getAuthState();
    // Only allow user type to access this page
    if (authState.isAuthenticated && authState.userType !== 'user') {
      // Redirect admin/staff users to their respective dashboards
      if (authState.userType === 'admin') {
        window.location.href = '/admin';
        return;
      } else if (authState.userType === 'staff') {
        window.location.href = '/staff';
        return;
      }
    }
    
    const isUserAuth = authState.isAuthenticated && authState.userType === 'user';
    setIsAuthenticated(isUserAuth);
    setUserData(isUserAuth ? authState.userData : null);

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      // Only allow user type to access this page
      if (newAuthState.isAuthenticated && newAuthState.userType !== 'user') {
        // Redirect admin/staff users to their respective dashboards
        if (newAuthState.userType === 'admin') {
          window.location.href = '/admin';
          return;
        } else if (newAuthState.userType === 'staff') {
          window.location.href = '/staff';
          return;
        }
      }
      
      const isNewUserAuth = newAuthState.isAuthenticated && newAuthState.userType === 'user';
      setIsAuthenticated(isNewUserAuth);
      setUserData(isNewUserAuth ? newAuthState.userData : null);
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    // Fetch safety protocols data
    safetyProtocolsApi.getProtocols()
      .then(rows => {
        if (Array.isArray(rows)) {
          setProtocols(rows as unknown as SafetyProtocol[]);
        } else {
          console.error('Expected array but got:', rows);
          setProtocols([]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching safety protocols:', error);
        setProtocols([]);
        setIsLoading(false);
      });

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);



  // Enhanced filtering logic
  const filteredProtocols = protocols.filter(protocol => {
    const matchesType = selectedType === 'all' || protocol.type === selectedType;
    const matchesSearch = searchQuery === '' ||
      protocol.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      protocol.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      protocol.type.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  const protocolTypes = ['all', 'fire', 'earthquake', 'medical', 'intrusion', 'general'];

  // Get protocol statistics
  const protocolStats = {
    total: protocols.length,
    fire: protocols.filter(p => p.type === 'fire').length,
    earthquake: protocols.filter(p => p.type === 'earthquake').length,
    medical: protocols.filter(p => p.type === 'medical').length,
    intrusion: protocols.filter(p => p.type === 'intrusion').length,
    general: protocols.filter(p => p.type === 'general').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
            <div className="relative w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
              <i className="ri-loader-4-line text-3xl text-white animate-spin"></i>
            </div>
          </div>
          <p className="text-xl text-gray-600 font-medium">Loading safety protocols...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the latest information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 relative">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(34, 197, 94, 0.05) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon with enhanced styling */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-shield-check-line text-3xl text-white"></i>
              </div>
            </div>

            {/* Enhanced Typography */}
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-green-900 to-emerald-900 bg-clip-text text-transparent mb-6 leading-tight">
              Safety Protocols
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Rosario, Batangas
              <span className="block text-lg text-gray-500 mt-2">Emergency Procedures & Safety Guidelines</span>
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-green-600">{protocolStats.total}</div>
                <div className="text-sm text-gray-600">Total Protocols</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-red-600">{protocolStats.fire}</div>
                <div className="text-sm text-gray-600">Fire Safety</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-yellow-600">{protocolStats.earthquake}</div>
                <div className="text-sm text-gray-600">Earthquake</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-blue-600">{protocolStats.medical}</div>
                <div className="text-sm text-gray-600">Medical</div>
              </div>
            </div>

            {/* Enhanced Info Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-6 max-w-3xl mx-auto shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-center text-green-800">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-information-line text-green-600"></i>
                </div>
                <p className="font-semibold text-lg">
                  Comprehensive safety protocols for all emergency situations
                </p>
              </div>
              <p className="text-green-600 text-sm mt-2 opacity-80">
                Updated regularly • Last update: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">

        {/* Enhanced View Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-white/20">
            {/* Sliding background */}
            <div
              className={`absolute top-1.5 bottom-1.5 w-1/2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg transition-transform duration-300 ease-out ${
                viewMode === 'list' ? 'translate-x-full' : 'translate-x-0'
              }`}
            ></div>

            <div className="relative flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 min-w-[120px] justify-center ${
                  viewMode === 'grid'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className={`ri-grid-line text-lg transition-transform duration-300 ${
                  viewMode === 'grid' ? 'scale-110' : ''
                }`}></i>
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 min-w-[120px] justify-center ${
                  viewMode === 'list'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className={`ri-list-unordered text-lg transition-transform duration-300 ${
                  viewMode === 'list' ? 'scale-110' : ''
                }`}></i>
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="ri-search-line mr-2"></i>
                  Search Protocols
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title, description, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="ri-filter-line mr-2"></i>
                  Filter by Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                >
                  {protocolTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} {type === 'all' ? 'Protocols' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-green-600">{filteredProtocols.length}</span> of{' '}
                <span className="font-semibold">{protocols.length}</span> protocols
                {searchQuery && (
                  <span className="ml-2 text-green-600">
                    for "{searchQuery}"
                  </span>
                )}
              </div>

              {(searchQuery || selectedType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                  }}
                  className="text-green-600 hover:text-green-700 font-medium flex items-center space-x-1"
                >
                  <i className="ri-refresh-line"></i>
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Protocol Cards */}
        {filteredProtocols.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
              <i className="ri-search-line text-3xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No protocols found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No safety protocols are currently available'
              }
            </p>
            {(searchQuery || selectedType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <i className="ri-refresh-line mr-2"></i>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid'
              ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }`}>
            {filteredProtocols.map((protocol) => (
              <div
                key={protocol.protocol_id}
                className={`bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                  viewMode === 'grid' ? 'p-6 flex flex-col h-full' : 'p-6 flex items-center space-x-6'
                }`}
              >
                {/* Protocol Icon and Type */}
                <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'flex items-center justify-between mb-4'}`}>
                  <div className={`relative ${viewMode === 'list' ? 'w-16 h-16' : 'w-14 h-14'} rounded-2xl flex items-center justify-center ${
                    protocol.type === 'fire' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    protocol.type === 'earthquake' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                    protocol.type === 'medical' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    protocol.type === 'intrusion' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  } shadow-lg`}>
                    <i className={`${viewMode === 'list' ? 'text-2xl' : 'text-xl'} text-white ${
                      protocol.type === 'fire' ? 'ri-fire-line' :
                      protocol.type === 'earthquake' ? 'ri-earthquake-line' :
                      protocol.type === 'medical' ? 'ri-heart-pulse-line' :
                      protocol.type === 'intrusion' ? 'ri-shield-keyhole-line' :
                      'ri-alert-line'
                    }`}></i>
                  </div>

                  {viewMode === 'grid' && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      protocol.type === 'fire' ? 'bg-red-100 text-red-800' :
                      protocol.type === 'earthquake' ? 'bg-yellow-100 text-yellow-800' :
                      protocol.type === 'medical' ? 'bg-blue-100 text-blue-800' :
                      protocol.type === 'intrusion' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {protocol.type.charAt(0).toUpperCase() + protocol.type.slice(1)}
                    </span>
                  )}
                </div>

                {/* Protocol Content */}
                <div className={`${viewMode === 'list' ? 'flex-1' : 'flex-1 flex flex-col'}`}>
                  <div className={`${viewMode === 'list' ? 'flex items-start justify-between' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'flex-1 pr-4' : ''}`}>
                      <h3 className={`font-bold text-gray-900 mb-2 ${viewMode === 'list' ? 'text-xl' : 'text-lg'}`}>
                        {protocol.title}
                      </h3>
                      <div className={`relative ${viewMode === 'grid' ? 'mb-4' : ''}`}>
                        <p className={`text-gray-600 ${viewMode === 'list' ? 'text-base mb-1' : 'text-sm line-clamp-3'}`}>
                          {protocol.description}
                        </p>
                      </div>
                    </div>

                    {viewMode === 'list' && (
                      <div className="flex-shrink-0 flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          protocol.type === 'fire' ? 'bg-red-100 text-red-800' :
                          protocol.type === 'earthquake' ? 'bg-yellow-100 text-yellow-800' :
                          protocol.type === 'medical' ? 'bg-blue-100 text-blue-800' :
                          protocol.type === 'intrusion' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {protocol.type.charAt(0).toUpperCase() + protocol.type.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Attachment */}
                  {protocol.file_attachment && (
                    <div className="mb-4">
                      {viewMode === 'grid' ? (
                        <div className="relative">
                          {/* File Preview */}
                          {protocol.file_attachment.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                            // Image preview
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between px-4 z-10">
                                <div className="flex items-center min-w-0">
                                  <i className="ri-image-line text-xl text-white mr-2 flex-shrink-0"></i>
                                  <span className="text-white font-medium truncate text-sm">
                                    {protocol.file_attachment.split('/').pop()}
                                  </span>
                                </div>
                                <a
                                  href={`${getFileUrl(protocol.file_attachment)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white/80 hover:text-white transition-colors flex-shrink-0 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <i className="ri-download-line text-xl"></i>
                                </a>
                              </div>
                              <div className="pt-12 aspect-[4/3] bg-gray-100">
                                <img
                                  src={`${getFileUrl(protocol.file_attachment)}`}
                                  alt={protocol.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-gray-900 font-medium flex items-center space-x-2">
                                    <i className="ri-fullscreen-line"></i>
                                    <span>View Full Image</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : protocol.file_attachment.toLowerCase().endsWith('.pdf') ? (
                            // PDF preview with embedded viewer
                            <div className="relative rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm group">
                              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-between px-4 z-10">
                                <div className="flex items-center min-w-0">
                                  <i className="ri-file-pdf-line text-xl text-white mr-2 flex-shrink-0"></i>
                                  <span className="text-white font-medium truncate text-sm">
                                    {protocol.file_attachment.split('/').pop()}
                                  </span>
                                </div>
                                <a
                                  href={`${getFileUrl(protocol.file_attachment)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white/80 hover:text-white transition-colors flex-shrink-0 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <i className="ri-download-line text-xl"></i>
                                </a>
                              </div>
                              {/* PDF Embed Preview */}
                              <div className="pt-12 aspect-[4/3] bg-gray-50">
                                <iframe
                                  src={`${getFileUrl(protocol.file_attachment)}#toolbar=0&view=FitH`}
                                  className="w-full h-full"
                                  title={protocol.title}
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-gray-900 font-medium flex items-center space-x-2">
                                    <i className="ri-fullscreen-line"></i>
                                    <span>Open Full PDF</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Generic file preview
                            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <div className="text-center">
                                <i className="ri-file-text-line text-4xl text-gray-400"></i>
                                <p className="text-sm text-gray-600 mt-2">Document</p>
                              </div>
                            </div>
                          )}
                          
                          {/* View button overlay */}
                          <a
                            href={`${getFileUrl(protocol.file_attachment)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl group"
                          >
                            <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-gray-900 font-medium flex items-center space-x-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                              <i className="ri-eye-line"></i>
                              <span>View File</span>
                            </span>
                          </a>
                        </div>
                      ) : (
                        // List view - keep original link style
                        <a
                          href={`${getFileUrl(protocol.file_attachment)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold transition-colors group"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2 group-hover:bg-green-200 transition-colors">
                            <i className="ri-file-text-line text-sm"></i>
                          </div>
                          <span className="text-sm">View Attachment</span>
                          <i className="ri-external-link-line ml-1 text-xs"></i>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className={`pt-4 border-t border-gray-200 ${viewMode === 'list' ? 'flex items-center justify-between mt-4' : 'mt-auto'}`}>
                    <p className="text-xs text-gray-500">
                      <i className="ri-time-line mr-1"></i>
                      Updated: {new Date(protocol.updated_at).toLocaleDateString()}
                    </p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedProtocol(protocol);
                        setIsModalOpen(true);
                      }}
                      className={`text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1 transition-colors ${
                        viewMode === 'grid' ? 'mt-2' : ''
                      }`}
                    >
                      <span>View Details</span>
                      <i className="ri-arrow-right-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        {isModalOpen && selectedProtocol && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedProtocol.type === 'fire' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    selectedProtocol.type === 'earthquake' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                    selectedProtocol.type === 'medical' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    selectedProtocol.type === 'intrusion' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}>
                    <i className={`text-2xl text-white ${
                      selectedProtocol.type === 'fire' ? 'ri-fire-line' :
                      selectedProtocol.type === 'earthquake' ? 'ri-earthquake-line' :
                      selectedProtocol.type === 'medical' ? 'ri-heart-pulse-line' :
                      selectedProtocol.type === 'intrusion' ? 'ri-shield-keyhole-line' :
                      'ri-alert-line'
                    }`}></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedProtocol.title}</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                      selectedProtocol.type === 'fire' ? 'bg-red-100 text-red-800' :
                      selectedProtocol.type === 'earthquake' ? 'bg-yellow-100 text-yellow-800' :
                      selectedProtocol.type === 'medical' ? 'bg-blue-100 text-blue-800' :
                      selectedProtocol.type === 'intrusion' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedProtocol.type.charAt(0).toUpperCase() + selectedProtocol.type.slice(1)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="prose prose-green max-w-none">
                <p className="text-gray-600 whitespace-pre-wrap">{selectedProtocol.description}</p>
              </div>

              {/* File Attachment */}
              {selectedProtocol.file_attachment && (
                <div className="mt-8">
                  <h4 className="font-semibold text-gray-900 mb-4">Attached Document</h4>
                  {selectedProtocol.file_attachment.toLowerCase().endsWith('.pdf') ? (
                    // PDF Preview
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <i className="ri-file-pdf-line text-2xl text-white"></i>
                          </div>
                          <span className="font-medium text-white">{selectedProtocol.file_attachment.split('/').pop()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`${getFileUrl(selectedProtocol.file_attachment)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <i className="ri-download-line"></i>
                            <span>Download</span>
                          </a>
                          <a
                            href={`${getFileUrl(selectedProtocol.file_attachment)}#toolbar=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <i className="ri-fullscreen-line"></i>
                            <span>Full View</span>
                          </a>
                        </div>
                      </div>
                      <div className="h-[600px] bg-gray-50">
                        <iframe
                          src={`${getFileUrl(selectedProtocol.file_attachment)}#toolbar=0&view=FitH`}
                          className="w-full h-full"
                          title={selectedProtocol.title}
                        />
                      </div>
                    </div>
                  ) : selectedProtocol.file_attachment.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                    // Image Preview
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <i className="ri-image-line text-2xl text-white"></i>
                          </div>
                          <span className="font-medium text-white">{selectedProtocol.file_attachment.split('/').pop()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`${getFileUrl(selectedProtocol.file_attachment)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <i className="ri-download-line"></i>
                            <span>Download</span>
                          </a>
                          <a
                            href={`${getFileUrl(selectedProtocol.file_attachment)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <i className="ri-fullscreen-line"></i>
                            <span>Full View</span>
                          </a>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4">
                        <div className="max-h-[600px] overflow-hidden rounded-lg">
                          <img
                            src={`${getFileUrl(selectedProtocol.file_attachment)}`}
                            alt={selectedProtocol.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Other file types
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <i className="ri-file-text-line text-gray-500"></i>
                          <span className="font-medium text-gray-900">{selectedProtocol.file_attachment.split('/').pop()}</span>
                        </div>
                        <a
                          href={`${getFileUrl(selectedProtocol.file_attachment)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <i className="ri-download-line"></i>
                          <span>Download File</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedProtocol.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedProtocol.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default SafetyProtocolsPage;