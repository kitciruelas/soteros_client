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
  
  // If it's already a full URL (Cloudinary or other)
  if (fileAttachment.startsWith('http://') || fileAttachment.startsWith('https://')) {
    // Fix Cloudinary URLs that have wrong resource type for PDFs
    if (fileAttachment.includes('res.cloudinary.com') && fileAttachment.toLowerCase().endsWith('.pdf')) {
      // If it's using /image/upload/ for a PDF, change to /raw/upload/
      return fileAttachment.replace('/image/upload/', '/raw/upload/');
    }
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
  let baseUrl = 'https://soteros-backend-q2yihjhchq-et.a.run.app';
  
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
  const [currentSlide, setCurrentSlide] = useState(0);
  // Track current slide for each protocol card in grid view
  const [cardSlides, setCardSlides] = useState<Record<number, number>>({});

  // Debug: Log file URL handling on mount
  useEffect(() => {
    console.log('🖼️ Safety Protocols - File URL handler ready (supports Cloudinary & local)');
  }, []);

  // Reset slide when opening modal or changing protocol
  useEffect(() => {
    if (isModalOpen && selectedProtocol) {
      setCurrentSlide(0);
      console.log('🔄 Modal opened, reset slide to 0');
    }
  }, [isModalOpen, selectedProtocol]);

  // Auto-correct currentSlide if out of bounds
  useEffect(() => {
    if (isModalOpen && selectedProtocol?.file_attachment) {
      let attachments: string[] = [];
      try {
        const parsed = JSON.parse(selectedProtocol.file_attachment);
        attachments = Array.isArray(parsed) ? parsed : [selectedProtocol.file_attachment];
      } catch {
        attachments = [selectedProtocol.file_attachment];
      }

      if (currentSlide >= attachments.length) {
        console.warn('⚠️ currentSlide out of bounds, resetting to 0', {
          currentSlide,
          totalFiles: attachments.length
        });
        setCurrentSlide(0);
      }
    }
  }, [currentSlide, isModalOpen, selectedProtocol]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (!isModalOpen || !selectedProtocol?.file_attachment) return;

    // Parse attachments to check if multiple files
    let attachments: string[] = [];
    try {
      const parsed = JSON.parse(selectedProtocol.file_attachment);
      attachments = Array.isArray(parsed) ? parsed : [selectedProtocol.file_attachment];
    } catch {
      attachments = [selectedProtocol.file_attachment];
    }

    if (attachments.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev - 1 + attachments.length) % attachments.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => (prev + 1) % attachments.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedProtocol]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Enhanced Loading Animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-lg opacity-30 scale-110 animate-pulse"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <i className="ri-shield-check-line text-3xl text-white animate-bounce"></i>
            </div>
          </div>

          {/* Loading Text */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading Safety Protocols</h2>

          {/* Loading Progress */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.05) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon with enhanced styling */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-shield-check-line text-3xl text-white"></i>
              </div>
            </div>

            {/* Enhanced Typography */}
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 leading-tight">
              Safety Protocols
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Rosario, Batangas
              <span className="block text-lg text-gray-500 mt-2">Emergency Procedures & Safety Guidelines</span>
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-blue-600">{protocolStats.total}</div>
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
                  viewMode === 'grid' ? 'p-6 flex flex-col h-full' : 'p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6'
                }`}
              >
                {/* Protocol Icon and Type */}
                <div className={`${viewMode === 'list' ? 'flex-shrink-0 flex items-center gap-3 sm:gap-0 sm:flex-col' : 'flex items-center justify-between mb-4'}`}>
                  <div className={`relative ${viewMode === 'list' ? 'w-12 h-12 sm:w-16 sm:h-16' : 'w-14 h-14'} rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    protocol.type === 'fire' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    protocol.type === 'earthquake' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                    protocol.type === 'medical' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    protocol.type === 'intrusion' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  } shadow-lg`}>
                    <i className={`${viewMode === 'list' ? 'text-xl sm:text-2xl' : 'text-xl'} text-white ${
                      protocol.type === 'fire' ? 'ri-fire-line' :
                      protocol.type === 'earthquake' ? 'ri-earthquake-line' :
                      protocol.type === 'medical' ? 'ri-heart-pulse-line' :
                      protocol.type === 'intrusion' ? 'ri-shield-keyhole-line' :
                      'ri-alert-line'
                    }`}></i>
                  </div>

                  {viewMode === 'list' && (
                    <span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold sm:hidden ${
                      protocol.type === 'fire' ? 'bg-red-100 text-red-800' :
                      protocol.type === 'earthquake' ? 'bg-yellow-100 text-yellow-800' :
                      protocol.type === 'medical' ? 'bg-blue-100 text-blue-800' :
                      protocol.type === 'intrusion' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {protocol.type.charAt(0).toUpperCase() + protocol.type.slice(1)}
                    </span>
                  )}

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
                <div className={`${viewMode === 'list' ? 'flex-1 min-w-0 overflow-hidden' : 'flex-1 flex flex-col'}`}>
                  <div className={`${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'flex-1 min-w-0 overflow-hidden pr-0 sm:pr-4' : ''}`}>
                      <h3 className={`font-bold text-gray-900 mb-2 truncate ${viewMode === 'list' ? 'text-lg sm:text-xl' : 'text-lg'}`}>
                        {protocol.title}
                      </h3>
                      <div className={`relative ${viewMode === 'grid' ? 'mb-4' : ''}`}>
                        <p className={`text-gray-600 ${viewMode === 'list' ? 'text-sm sm:text-base mb-1 line-clamp-2 sm:line-clamp-none' : 'text-sm line-clamp-3'}`}>
                          {protocol.description}
                        </p>
                      </div>
                    </div>

                    {viewMode === 'list' && (
                      <div className="flex-shrink-0 flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:space-y-2">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold hidden sm:inline-block ${
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

                  {/* File Attachments */}
                  {protocol.file_attachment && (() => {
                    // Parse multiple attachments
                    let attachments: string[] = [];
                    try {
                      const parsed = JSON.parse(protocol.file_attachment);
                      attachments = Array.isArray(parsed) ? parsed : [protocol.file_attachment];
                    } catch {
                      attachments = [protocol.file_attachment];
                    }

                    // Get current slide for this card (default to 0)
                    const currentCardSlide = cardSlides[protocol.protocol_id] || 0;

                    // Carousel navigation functions
                    const nextCardSlide = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCardSlides(prev => ({
                        ...prev,
                        [protocol.protocol_id]: (currentCardSlide + 1) % attachments.length
                      }));
                    };

                    const prevCardSlide = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCardSlides(prev => ({
                        ...prev,
                        [protocol.protocol_id]: (currentCardSlide - 1 + attachments.length) % attachments.length
                      }));
                    };

                    const goToCardSlide = (index: number) => (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCardSlides(prev => ({
                        ...prev,
                        [protocol.protocol_id]: index
                      }));
                    };

                    // Debug: Log URLs being displayed
                    console.log('📂 Protocol attachments:', {
                      protocolId: protocol.protocol_id,
                      count: attachments.length,
                      currentSlide: currentCardSlide,
                      urls: attachments
                    });

                    return (
                      <div className="mb-4">
                        {viewMode === 'grid' ? (
                          <div className="relative">
                            {/* Carousel - Show only current slide */}
                            {attachments.map((fileUrl, fileIndex) => {
                              // Only show current slide
                              if (fileIndex !== currentCardSlide) return null;

                              console.log(`🖼️ Rendering image ${fileIndex + 1}:`, fileUrl);
                              const isImage = fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                              const isPdf = fileUrl.toLowerCase().endsWith('.pdf');

                              return (
                                <div key={`${protocol.protocol_id}-${fileIndex}-${fileUrl}`} className="relative">
                                  {/* File Preview */}
                                  {isImage ? (
                                    // Image preview
                                    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                                      <div className="aspect-[4/3] bg-gray-100">
                                        <img
                                          key={fileUrl}
                                          src={`${getFileUrl(fileUrl)}`}
                                          alt={`${protocol.title} - Image ${fileIndex + 1}`}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </div>
                                      {/* Counter badge */}
                                      {attachments.length > 1 && (
                                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                                          {fileIndex + 1}/{attachments.length}
                                        </div>
                                      )}
                                    </div>
                                  ) : isPdf ? (
                                    // PDF preview with embedded viewer
                                    <div className="relative rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm group">
                                      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-between px-4 z-10">
                                        <div className="flex items-center min-w-0">
                                          <i className="ri-file-pdf-line text-xl text-white mr-2 flex-shrink-0"></i>
                                          <span className="text-white font-medium truncate text-sm">
                                            {fileUrl.split('/').pop()} {attachments.length > 1 && `(${fileIndex + 1}/${attachments.length})`}
                                          </span>
                                        </div>
                                      </div>
                                      {/* PDF Embed Preview */}
                                      <div className="pt-12 aspect-[4/3] bg-gray-50">
                                        <iframe
                                          src={`${getFileUrl(fileUrl)}#toolbar=0&view=FitH`}
                                          className="w-full h-full"
                                          title={protocol.title}
                                        />
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
                                </div>
                              );
                            })}

                            {/* Navigation Arrows - Only show if multiple attachments */}
                            {attachments.length > 1 && (
                              <>
                                <button
                                  onClick={prevCardSlide}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-20"
                                  aria-label="Previous image"
                                >
                                  <i className="ri-arrow-left-s-line text-2xl text-gray-800"></i>
                                </button>
                                <button
                                  onClick={nextCardSlide}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-20"
                                  aria-label="Next image"
                                >
                                  <i className="ri-arrow-right-s-line text-2xl text-gray-800"></i>
                                </button>
                              </>
                            )}

                            {/* Indicator Dots - Only show if multiple attachments */}
                            {attachments.length > 1 && (
                              <div className="flex items-center justify-center gap-2 mt-3">
                                {attachments.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={goToCardSlide(index)}
                                    className={`transition-all duration-300 ${
                                      index === currentCardSlide
                                        ? 'w-6 h-2 bg-green-600 rounded-full'
                                        : 'w-2 h-2 bg-gray-300 hover:bg-gray-400 rounded-full'
                                    }`}
                                    aria-label={`Go to image ${index + 1}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // List view - show all files as links
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((fileUrl, fileIndex) => {
                              const isImage = fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                              const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
                              
                              return (
                                <a
                                  key={fileIndex}
                                  href={`${getFileUrl(fileUrl)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold transition-colors group text-xs sm:text-sm"
                                >
                                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mr-2 transition-colors flex-shrink-0 ${
                                    isImage ? 'bg-blue-100 group-hover:bg-blue-200' :
                                    isPdf ? 'bg-red-100 group-hover:bg-red-200' :
                                    'bg-green-100 group-hover:bg-green-200'
                                  }`}>
                                    <i className={`text-xs sm:text-sm ${
                                      isImage ? 'ri-image-line' :
                                      isPdf ? 'ri-file-pdf-line' :
                                      'ri-file-text-line'
                                    }`}></i>
                                  </div>
                                  <span className="truncate max-w-[120px] sm:max-w-none">
                                    {attachments.length > 1 ? `File ${fileIndex + 1}` : 'View Attachment'}
                                  </span>
                                  <i className="ri-external-link-line ml-1 text-xs flex-shrink-0"></i>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Footer */}
                  <div className={`pt-4 border-t border-gray-200 ${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mt-4' : 'mt-auto'}`}>
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
                        viewMode === 'grid' ? 'mt-2' : 'self-start sm:self-auto'
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

              {/* File Attachments Carousel */}
              {selectedProtocol.file_attachment && (() => {
                // Parse multiple attachments
                let attachments: string[] = [];
                try {
                  const parsed = JSON.parse(selectedProtocol.file_attachment);
                  attachments = Array.isArray(parsed) ? parsed : [selectedProtocol.file_attachment];
                } catch {
                  attachments = [selectedProtocol.file_attachment];
                }

                const nextSlide = () => {
                  setCurrentSlide((prev) => {
                    const next = (prev + 1) % attachments.length;
                    console.log('➡️ Next slide:', prev, '→', next);
                    return next;
                  });
                };

                const prevSlide = () => {
                  setCurrentSlide((prev) => {
                    const previous = (prev - 1 + attachments.length) % attachments.length;
                    console.log('⬅️ Previous slide:', prev, '→', previous);
                    return previous;
                  });
                };

                const goToSlide = (index: number) => {
                  console.log('🎯 Jump to slide:', index);
                  setCurrentSlide(index);
                };

                return (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">
                        Attached Document{attachments.length > 1 ? 's' : ''} 
                      </h4>
                      {attachments.length > 1 && (
                        <span className="text-sm text-gray-600 font-medium">
                          {Math.max(1, Math.min(currentSlide + 1, attachments.length))} / {attachments.length}
                        </span>
                      )}
                    </div>

                    {/* Carousel Container */}
                    <div className="relative">
                      {/* Current File Display */}
                      {attachments.map((fileUrl, fileIndex) => {
                        // Ensure currentSlide is within bounds
                        const safeCurrentSlide = Math.max(0, Math.min(currentSlide, attachments.length - 1));
                        
                        // Only show current slide
                        if (fileIndex !== safeCurrentSlide) return null;

                        console.log('🎬 Rendering slide:', {
                          fileIndex,
                          safeCurrentSlide,
                          currentSlide,
                          totalFiles: attachments.length,
                          fileUrl
                        });

                        const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
                        const isImage = fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                        const fileName = fileUrl.split('/').pop();

                        return (
                          <div key={`slide-${fileIndex}-${fileUrl}`} className="transition-opacity duration-300">
                            {isPdf ? (
                              // PDF Preview
                              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                      <i className="ri-file-pdf-line text-2xl text-white"></i>
                                    </div>
                                    <span className="font-medium text-white">
                                      {fileName} {attachments.length > 1 && `(${fileIndex + 1}/${attachments.length})`}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <a
                                      href={`${getFileUrl(fileUrl)}#toolbar=1`}
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
                                    src={`${getFileUrl(fileUrl)}#toolbar=0&view=FitH`}
                                    className="w-full h-full"
                                    title={selectedProtocol.title}
                                  />
                                </div>
                              </div>
                            ) : isImage ? (
                              // Image Preview
                              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                <div className="bg-gray-50 p-4 relative">
                                  <div className="max-h-[600px] overflow-hidden rounded-lg">
                                    <img
                                      key={fileUrl}
                                      src={`${getFileUrl(fileUrl)}`}
                                      alt={`${selectedProtocol.title} - Image ${fileIndex + 1}`}
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                    />
                                  </div>
                                  {/* Counter and action buttons overlay */}
                                  {attachments.length > 1 && (
                                    <div className="absolute top-8 right-8 bg-black/70 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
                                      {fileIndex + 1}/{attachments.length}
                                    </div>
                                  )}
                                  <div className="absolute top-8 left-8 flex items-center space-x-2">
                                    <a
                                      href={`${getFileUrl(fileUrl)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-black/70 backdrop-blur-sm hover:bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                                    >
                                      <i className="ri-fullscreen-line"></i>
                                      <span>Full View</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Other file types
                              <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 p-4 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <i className="ri-file-text-line text-gray-500"></i>
                                    <span className="font-medium text-gray-900">
                                      {fileName} {attachments.length > 1 && `(${fileIndex + 1}/${attachments.length})`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Navigation Buttons - Only show if multiple files */}
                      {attachments.length > 1 && (
                        <>
                          {/* Previous Button */}
                          <button
                            onClick={prevSlide}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
                            aria-label="Previous file"
                          >
                            <i className="ri-arrow-left-line text-2xl text-gray-800"></i>
                          </button>

                          {/* Next Button */}
                          <button
                            onClick={nextSlide}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
                            aria-label="Next file"
                          >
                            <i className="ri-arrow-right-line text-2xl text-gray-800"></i>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Indicator Dots - Only show if multiple files */}
                    {attachments.length > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        {attachments.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`transition-all duration-300 ${
                              index === currentSlide
                                ? 'w-8 h-3 bg-green-600 rounded-full'
                                : 'w-3 h-3 bg-gray-300 hover:bg-gray-400 rounded-full'
                            }`}
                            aria-label={`Go to file ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* File List - Thumbnails */}
                    {attachments.length > 1 && (
                      <div className="flex items-center gap-3 mt-6 overflow-x-auto pb-2">
                        {attachments.map((fileUrl, index) => {
                          const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
                          const isImage = fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
                          
                          return (
                            <button
                              key={index}
                              onClick={() => goToSlide(index)}
                              className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 transition-all ${
                                index === currentSlide
                                  ? 'border-green-600 shadow-lg scale-110'
                                  : 'border-gray-300 hover:border-green-400 opacity-70 hover:opacity-100'
                              }`}
                            >
                              {isImage ? (
                                <img
                                  key={`thumb-${fileUrl}`}
                                  src={getFileUrl(fileUrl)}
                                  alt={`Thumbnail ${index + 1}`}
                                  className="w-full h-full object-cover rounded-md"
                                  loading="lazy"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center rounded-md ${
                                  isPdf ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                  <i className={`text-2xl ${
                                    isPdf ? 'ri-file-pdf-line text-red-600' : 'ri-file-text-line text-gray-600'
                                  }`}></i>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

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