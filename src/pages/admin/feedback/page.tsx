import React, { useState, useEffect } from 'react';
import { feedbackApi } from '../../../utils/api';
import Card from '../../../components/base/Card';
import Button from '../../../components/base/Button';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import type { ExportColumn } from '../../../utils/exportUtils';
import ExportUtils from '../../../utils/exportUtils';
import { useToast } from '../../../components/base/Toast';

interface Feedback {
  id: number;
  message: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
  user_info: {
    id: number;
    name: string;
    email: string;
    type: 'user' | 'staff' | 'admin';
    position?: string;
    department?: string;
  };
}

const AdminFeedbackPage: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'user' | 'staff'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5' | 'none'>('all');
  const toast = useToast();

  const exportColumns: ExportColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'type', label: 'Type' },
    { key: 'message', label: 'Message' },
    { key: 'rating', label: 'Rating', format: (value) => value ? `${value}/5` : 'N/A' },
    { key: 'created_at', label: 'Created At', format: ExportUtils.formatDateTime },
  ];

  const flattenedData = feedbackList.map(fb => ({
    name: fb.user_info.name,
    email: fb.user_info.email,
    type: fb.user_info.type,
    message: fb.message,
    rating: fb.rating,
    created_at: fb.created_at,
  }));

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await feedbackApi.getFeedback({ page: 1, limit: 50 });
      if (response.success) {
        setFeedbackList(response.feedback);
      } else {
        setError('Failed to fetch feedback');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const filteredFeedback = feedbackList.filter(fb => {
    const typeMatch = filterType === 'all' || fb.user_info.type === filterType;
    const ratingMatch = ratingFilter === 'all' ||
      (ratingFilter === 'none' && fb.rating === null) ||
      (ratingFilter !== 'none' && fb.rating === parseInt(ratingFilter));
    return typeMatch && ratingMatch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
          <p className="text-gray-600 mt-1">View and manage user feedback</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-refresh-line mr-2"></i>
            Refresh
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={loading || feedbackList.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-download-line mr-2"></i>
            Export Feeback
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <i className="ri-filter-line mr-2"></i>
              Filter by Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('user')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                User
              </button>
              <button
                onClick={() => setFilterType('staff')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filterType === 'staff'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Staff
              </button>
            </div>
          </div>

          {/* Filter by Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <i className="ri-star-line mr-2"></i>
              Filter by Rating
            </label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as 'all' | '1' | '2' | '3' | '4' | '5' | 'none')}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
              <option value="none">No Rating</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filterType !== 'all' || ratingFilter !== 'all') && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilterType('all');
                setRatingFilter('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 text-sm"
            >
              <i className="ri-refresh-line"></i>
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <i className="ri-error-warning-line text-red-400 mr-3 mt-0.5"></i>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-chat-1-line text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterType === 'all' && ratingFilter === 'all'
                ? 'No feedback available'
                : `No feedback matches your filters`
              }
            </h3>
            <p className="text-gray-600">
              {filterType === 'all' && ratingFilter === 'all'
                ? 'No user feedback has been submitted yet.'
                : 'Try adjusting your filter criteria to see more results.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFeedback.map((fb) => (
              <div key={fb.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="ri-user-line text-blue-600"></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">{fb.user_info.name}</span>
                      {fb.user_info.type === 'user' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {fb.user_info.type.charAt(0).toUpperCase() + fb.user_info.type.slice(1)}
                        </span>
                      )}
                      {fb.user_info.type === 'staff' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {fb.user_info.type.charAt(0).toUpperCase() + fb.user_info.type.slice(1)}
                        </span>
                      )}
                    
                      {fb.user_info.type === 'staff' && fb.user_info.department && (
                        <>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-blue-600">{fb.user_info.department.charAt(0).toUpperCase() + fb.user_info.department.slice(1)}</span>
                        </>
                      )}
                      {fb.rating !== null && (
                        <>
                          <span className="text-sm text-gray-500">•</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`ri-star-${i < fb.rating! ? 'fill' : 'line'} text-yellow-400 text-sm`}
                              ></i>
                            ))}
                            <span className="ml-1 text-sm text-gray-600">({fb.rating})</span>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{fb.message}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>
                        <i className="ri-time-line mr-1"></i>
                        {new Date(fb.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )} 
      </div>

      <ExportPreviewModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportCSV={() => {
          ExportUtils.exportToCSV(flattenedData, exportColumns, { filename: 'feedback', title: 'User Feedback' });
          setExportModalOpen(false);
          toast.showToast({ type: 'success', message: 'Feedback exported to CSV successfully!' });
        }}
        onExportExcel={() => {
          ExportUtils.exportToExcel(flattenedData, exportColumns, { filename: 'feedback', title: 'User Feedback' });
          setExportModalOpen(false);
          toast.showToast({ type: 'success', message: 'Feedback exported to Excel successfully!' });
        }}
        onExportPDF={() => {
          ExportUtils.exportToPDF(flattenedData, exportColumns, { filename: 'feedback', title: 'User Feedback' });
          setExportModalOpen(false);
          toast.showToast({ type: 'success', message: 'Feedback exported to PDF successfully!' });
        }}
        data={flattenedData}
        columns={exportColumns.map(c => ({ key: c.key, label: c.label }))}
        title="Export User Feedback"
      />
    </div>
  );
};

export default AdminFeedbackPage;
