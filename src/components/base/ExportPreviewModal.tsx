
import type React from "react"

interface ExportPreviewModalProps {
  open: boolean
  onClose: () => void
  onExportPDF: (orientation?: 'portrait' | 'landscape') => void
  onExportCSV: () => void
  onExportExcel: () => void
  data: any[]
  columns: { key: string; label: string }[]
  title?: string
  orientation?: 'portrait' | 'landscape'
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void
}

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  open,
  onClose,
  onExportPDF,
  onExportCSV,
  onExportExcel,
  data,
  columns,
  title,
  orientation = 'portrait',
  onOrientationChange,
}) => {
  if (!open) return null

  // Show only first 5 rows for preview
  const previewData = data.slice(0, 5)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title || "Export Preview"}</h3>
            <p className="text-sm text-gray-500 mt-1">Preview of first 5 records • {data.length} total records</p>
          </div>
          <div className="flex items-center gap-3">
            {onOrientationChange && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onOrientationChange('portrait')}
                  className={`px-3 py-1.5 rounded transition-all duration-200 flex items-center gap-1 ${
                    orientation === 'portrait'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Portrait Mode (Vertical)"
                >
                  <i className="ri-file-line"></i>
                  <span className="text-xs font-medium">Portrait</span>
                </button>
                <button
                  onClick={() => onOrientationChange('landscape')}
                  className={`px-3 py-1.5 rounded transition-all duration-200 flex items-center gap-1 ${
                    orientation === 'landscape'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Landscape Mode (Horizontal)"
                >
                  <i className="ri-file-text-line"></i>
                  <span className="text-xs font-medium">Landscape</span>
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Close modal"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            {data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-white">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                        {columns.map((col) => {
                          const cellValue = row[col.key];
                          
                          // Special handling for attachment column to show image preview
                          if (col.key === 'attachment' && cellValue && cellValue !== 'No' && cellValue !== '-') {
                            // Try to extract image URLs from the data
                            const rawAttachment = (data[idx] as any)?.attachment;
                            if (rawAttachment) {
                              try {
                                // Parse JSON array format
                                const parsed = JSON.parse(rawAttachment);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  // Find first image
                                  const firstImage = parsed.find((url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
                                  if (firstImage) {
                                    const isCloudinary = firstImage.startsWith('http://') || firstImage.startsWith('https://');
                                    return (
                                      <td key={col.key} className="px-4 py-3 text-sm">
                                        <div className="flex items-center space-x-2">
                                          <img 
                                            src={isCloudinary ? firstImage : `/uploads/incidents/${firstImage}`}
                                            alt="Attachment preview"
                                            className="w-12 h-12 object-cover rounded border border-gray-300"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                          <span className="text-gray-900">{cellValue}</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                }
                              } catch {
                                // Not JSON, check if comma-separated
                                if (rawAttachment.includes(',')) {
                                  const files = rawAttachment.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                                  const firstImage = files.find((url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
                                  if (firstImage) {
                                    const isCloudinary = firstImage.startsWith('http://') || firstImage.startsWith('https://');
                                    return (
                                      <td key={col.key} className="px-4 py-3 text-sm">
                                        <div className="flex items-center space-x-2">
                                          <img 
                                            src={isCloudinary ? firstImage : `/uploads/incidents/${firstImage}`}
                                            alt="Attachment preview"
                                            className="w-12 h-12 object-cover rounded border border-gray-300"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                          <span className="text-gray-900">{cellValue}</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(rawAttachment)) {
                                  const isCloudinary = rawAttachment.startsWith('http://') || rawAttachment.startsWith('https://');
                                  return (
                                    <td key={col.key} className="px-4 py-3 text-sm">
                                      <div className="flex items-center space-x-2">
                                        <img 
                                          src={isCloudinary ? rawAttachment : `/uploads/incidents/${rawAttachment}`}
                                          alt="Attachment preview"
                                          className="w-12 h-12 object-cover rounded border border-gray-300"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                        <span className="text-gray-900">{cellValue}</span>
                                      </div>
                                    </td>
                                  );
                                }
                              }
                            }
                          }
                          
                          // Default cell rendering
                          return (
                            <td key={col.key} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {cellValue || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="ri-file-list-line text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">No data to preview</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <i className="ri-information-line"></i>
            <span>
              Total records to export: <strong className="text-gray-900">{data.length}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>

            <button
              onClick={onExportCSV}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
              disabled={data.length === 0}
            >
              <i className="ri-file-text-line"></i>
              Export CSV
            </button>

            <button
              onClick={onExportExcel}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
              disabled={data.length === 0}
            >
              <i className="ri-file-excel-line"></i>
              Export Excel
            </button>

            <button
              onClick={() => onExportPDF(orientation)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
              disabled={data.length === 0}
            >
              <i className="ri-file-pdf-line"></i>
              Export PDF ({orientation === 'portrait' ? 'Portrait' : 'Landscape'})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportPreviewModal
