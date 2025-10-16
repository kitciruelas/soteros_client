import React, { useState } from 'react';
import ExportUtils, { type ExportColumn, type ExportOptions } from '../../utils/exportUtils';

export interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn[];
  filename?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function ExportButton<T>({
  data,
  columns,
  filename = 'export',
  title = 'Data Export',
  className = '',
  disabled = false,
  variant = 'success',
  size = 'md'
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'json' | 'excel') => {
    if (disabled || isExporting || !data.length) return;

    setIsExporting(true);
    setShowModal(false);

    try {
      const options: ExportOptions = {
        filename,
        title,
        includeTimestamp: true
      };

      switch (format) {
        case 'csv':
          ExportUtils.exportToCSV(data, columns, options);
          break;
        case 'pdf':
          await ExportUtils.exportToPDF(data, columns, options);
          break;
        case 'json':
          ExportUtils.exportToJSON(data, options);
          break;
        case 'excel':
          ExportUtils.exportToExcel(data, columns, options);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      // You could add a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  const exportFormats = [
    { key: 'csv', label: 'CSV', icon: 'ri-file-excel-line', description: 'Comma-separated values' },
    { key: 'pdf', label: 'PDF', icon: 'ri-file-pdf-line', description: 'Portable document format' },
    { key: 'json', label: 'JSON', icon: 'ri-file-code-line', description: 'JavaScript object notation' },
    { key: 'excel', label: 'Excel', icon: 'ri-file-excel-line', description: 'Microsoft Excel format' }
  ];

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled || isExporting || !data.length}
        className={`${getVariantClasses()} ${className}`}
        title={data.length ? 'Export data' : 'No data to export'}
      >
        {isExporting ? (
          <>
            <i className="ri-loader-4-line animate-spin mr-2"></i>
            Exporting...
          </>
        ) : (
          <>
            <i className="ri-download-line mr-2"></i>
            Export
          </>
        )}
      </button>

      {/* Export Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose export format for {data.length} record{data.length !== 1 ? 's' : ''}
              </p>

              <div className="space-y-2">
                {exportFormats.map((format) => (
                  <button
                    key={format.key}
                    onClick={() => handleExport(format.key as any)}
                    className="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <i className={`${format.icon} text-lg mr-3 text-gray-600`}></i>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{format.label}</div>
                      <div className="text-sm text-gray-500">{format.description}</div>
                    </div>
                    <i className="ri-arrow-right-line text-gray-400"></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
