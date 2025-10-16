// Staff export utility
// This file provides functions to export staff data in various formats using ExportUtils

import ExportUtils from './exportUtils';
import type { ExportColumn, ExportOptions } from './exportUtils';

export const staffExportColumns: ExportColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'position', label: 'Position' },
  { key: 'department', label: 'Department' },
  { key: 'team_name', label: 'Team' },
];

export const exportStaffData = async (
  data: any[],
  format: 'csv' | 'pdf' | 'excel' | 'json',
  options: ExportOptions = {}
) => {
  switch (format) {
    case 'csv':
      ExportUtils.exportToCSV(data, staffExportColumns, options);
      break;
    case 'pdf':
      await ExportUtils.exportToPDF(data, staffExportColumns, options);
      break;
    case 'excel':
      ExportUtils.exportToExcel(data, staffExportColumns, options);
      break;
    case 'json':
      ExportUtils.exportToJSON(data, options);
      break;
    default:
      throw new Error('Unsupported export format');
  }
};
