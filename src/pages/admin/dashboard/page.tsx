// ...existing code...
import React, { useState, useEffect } from 'react';
import { adminDashboardApi } from '../../../utils/api';
import BarChart from '../../../components/charts/BarChart';
import PieChart from '../../../components/charts/PieChart';
import StackedBarChart from '../../../components/charts/StackedBarChart';
import LineChart from '../../../components/charts/LineChart';
import { useToast } from '../../../components/base/Toast';
import ExportUtils, { type ExportColumn } from '../../../utils/exportUtils';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';
import PrivacyNotice from '../../../components/PrivacyNotice';

interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  totalUsers: number;
  totalStaff: number;
  totalAlerts: number;
  activeAlerts: number;
}

interface RecentActivity {
  action: string;
  details: string;
  created_at: string;
  user_type: string;
  user_id: number;
}

interface IncidentTypeData {
  incident_type: string;
  count: number;
}

interface PriorityData {
  priority: string;
  count: number;
}

interface MonthlyIncidentData {
  month: string;
  period?: string; // For backward compatibility with new API
  total_incidents: number;
  resolved_incidents: number;
  high_priority_incidents: number;
}

interface PeakHoursData {
  hour: number;
  incident_count: number;
  earliest_datetime: string;
  latest_datetime: string;
  sample_datetimes: string;
  consecutive_dates: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    activeIncidents: 0,
    totalUsers: 0,
    totalStaff: 0,
    totalAlerts: 0,
    activeAlerts: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [incidentTrend, setIncidentTrend] = useState<string | null>(null);
  const [userTrend, setUserTrend] = useState<string | null>(null);
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypeData[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityData[]>([]);
  const [locationIncidents, setLocationIncidents] = useState<Array<{ name: string; [key: string]: string | number }>>([]);
  const [monthlyIncidents, setMonthlyIncidents] = useState<MonthlyIncidentData[]>([]);
  const [trendsPeriod, setTrendsPeriod] = useState<'days' | 'weeks' | 'months'>('days');
  const [trendsLimit, setTrendsLimit] = useState<number>(7);
  const [peakHoursData, setPeakHoursData] = useState<PeakHoursData[]>([]);
  const [peakHoursDateRange, setPeakHoursDateRange] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Export functionality
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([]);
  const [exportTitle, setExportTitle] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardStats();
      // Ensure trends data is loaded
      await fetchTrendsData(trendsPeriod, trendsLimit);
    };
    loadData();
  }, []);

  // Reset limit when period changes to ensure valid combinations
  useEffect(() => {
    if (trendsPeriod === 'days' && trendsLimit > 30) {
      setTrendsLimit(7); // Default to 7 days for better performance
    } else if (trendsPeriod === 'weeks' && trendsLimit > 52) {
      setTrendsLimit(12); // Default to 12 weeks
    } else if (trendsPeriod === 'months' && trendsLimit > 24) {
      setTrendsLimit(12); // Default to 12 months
    }
  }, [trendsPeriod]);

  // Fetch trends data when filter changes
  useEffect(() => {
    console.log(`useEffect triggered - Period: ${trendsPeriod}, Limit: ${trendsLimit}`);
    // Force refresh trends data when period or limit changes
    setTrendsLoading(true);
    fetchTrendsData(trendsPeriod, trendsLimit);
  }, [trendsPeriod, trendsLimit]);

  // Helper function to format hour data for peak hours chart
  const formatPeakHoursData = (peakHours: PeakHoursData[]) => {
    const hourLabels = [
      '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
      '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
      '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
      '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
    ];

    return peakHours.map(item => {
      // Parse sample datetimes from the API response
      const sampleDatetimes = item.sample_datetimes ? item.sample_datetimes.split(',') : [];
      const mostRecentDatetime = sampleDatetimes[0] || item.latest_datetime;
      
      // Parse consecutive dates and format them in compact format
      const consecutiveDates = item.consecutive_dates ? item.consecutive_dates.split(',') : [];
      
      // Group dates by month and format them compactly
      const groupDatesByMonth = (dates: string[]) => {
        const monthGroups: { [key: string]: number[] } = {};
        
        dates.forEach(dateStr => {
          if (!dateStr) return;
          const date = new Date(dateStr);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
          const day = date.getDate();
          
          if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = [];
          }
          monthGroups[monthKey].push(day);
        });
        
        // Sort days within each month
        Object.keys(monthGroups).forEach(month => {
          monthGroups[month].sort((a, b) => a - b);
        });
        
        // Format as "Sep 1, 4, 5, Oct 23, 30"
        return Object.keys(monthGroups)
          .sort((a, b) => {
            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthOrder.indexOf(a) - monthOrder.indexOf(b);
          })
          .map(month => `${month} ${monthGroups[month].join(', ')}`)
          .join(', ');
      };
      
      const formattedConsecutiveDates = groupDatesByMonth(consecutiveDates);
      
      // Format datetime for display
      const formatDateTime = (dateTimeString: string): { date: string; time: string; full: string } | null => {
        if (!dateTimeString) return null;
        const date = new Date(dateTimeString);
        return {
          date: date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric' 
          }),
          time: date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          full: date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric' 
          }) + ' ' + date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
        };
      };

      const mostRecent = formatDateTime(mostRecentDatetime);
      const earliest = formatDateTime(item.earliest_datetime);
      const latest = formatDateTime(item.latest_datetime);
      
      // Create consecutive date range from the compact format
      const consecutiveDateRange = formattedConsecutiveDates || mostRecent?.date || '';

      // Create time range display - only show if within same hour and day
      // Since data is grouped by hour, we only show time range if all incidents in that hour occurred on the same day
      let timeRange = '';
      if (earliest && latest) {
        const earliestDate = new Date(item.earliest_datetime);
        const latestDate = new Date(item.latest_datetime);
        
        // Check if they're in the same day and hour
        const sameDay = earliestDate.getDate() === latestDate.getDate() &&
                       earliestDate.getMonth() === latestDate.getMonth() &&
                       earliestDate.getFullYear() === latestDate.getFullYear();
        const sameHour = earliestDate.getHours() === latestDate.getHours() && 
                         earliestDate.getHours() === item.hour;
        
        if (sameDay && sameHour && earliestDate.getMinutes() !== latestDate.getMinutes()) {
          // Show minute range within the hour (e.g., "2:15 - 2:45 AM")
          timeRange = `${earliestDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${latestDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        // If no range (single minute or different days), leave empty
      }

      return {
        name: hourLabels[item.hour] || `${item.hour}:00`,
        count: item.incident_count,
        percentage: 0, // Will be calculated if total is provided
        // Add detailed time information for tooltips with actual dates and times
        timeLabel: `${hourLabels[item.hour] || `${item.hour}:00`} (${mostRecent?.full || ''})`,
        hour: item.hour,
        formattedTime: hourLabels[item.hour] || `${item.hour}:00`,
        // Add display name with time format like "8 PM"
        displayName: hourLabels[item.hour] || `${item.hour}:00`,
        // Add date and time information
        sampleDate: mostRecent?.date || '',
        sampleTime: mostRecent?.time || '',
        sampleDateTime: mostRecent?.full || '',
        dateRange: consecutiveDateRange,
        timeRange: timeRange,
        consecutiveDates: formattedConsecutiveDates.split(', '),
        earliestDateTime: item.earliest_datetime,
        latestDateTime: item.latest_datetime
      };
    });
  };

  // Helper function to calculate date range for peak hours analysis
  const calculatePeakHoursDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Export functions
  const exportDashboardStats = () => {
    const statsData = [
      { metric: 'Total Incidents', value: stats.totalIncidents },
      { metric: 'Active Incidents', value: stats.activeIncidents },
      { metric: 'Total Users', value: stats.totalUsers },
      { metric: 'Staff Members', value: stats.totalStaff },
      { metric: 'Total Alerts', value: stats.totalAlerts },
      { metric: 'Active Alerts', value: stats.activeAlerts }
    ];

    const columns: ExportColumn[] = [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' }
    ];

    setExportData(statsData);
    setExportColumns(columns);
    setExportTitle('Dashboard Statistics');
    setShowExportModal(true);
  };

  const exportIncidentTypes = () => {
    const columns: ExportColumn[] = [
      { key: 'incident_type', label: 'Incident Type' },
      { key: 'count', label: 'Count' }
    ];

    setExportData(incidentTypes);
    setExportColumns(columns);
    setExportTitle('Incident Types Distribution');
    setShowExportModal(true);
  };

  const exportPriorityData = () => {
    const columns: ExportColumn[] = [
      { key: 'priority', label: 'Priority Level' },
      { key: 'count', label: 'Count' }
    ];

    setExportData(priorityData);
    setExportColumns(columns);
    setExportTitle('Priority Level Distribution');
    setShowExportModal(true);
  };

  const exportTrendsData = () => {
    const columns: ExportColumn[] = [
      { key: 'period', label: 'Period' },
      { key: 'total_incidents', label: 'Total Incidents' },
      { key: 'resolved_incidents', label: 'Resolved Incidents' },
      { key: 'high_priority_incidents', label: 'High Priority Incidents' }
    ];

    setExportData(monthlyIncidents);
    setExportColumns(columns);
    setExportTitle(`Incident Trends (Last ${trendsLimit} ${trendsPeriod})`);
    setShowExportModal(true);
  };

  const exportPeakHoursData = () => {
    const formattedData = formatPeakHoursData(peakHoursData);
    const columns: ExportColumn[] = [
      { key: 'name', label: 'Hour' },
      { key: 'count', label: 'Incident Count' },
      { key: 'dateRange', label: 'Date Range' },
      { key: 'sampleDateTime', label: 'Sample DateTime' }
    ];

    setExportData(formattedData);
    setExportColumns(columns);
    setExportTitle(`Peak Hours Analysis (${peakHoursDateRange})`);
    setShowExportModal(true);
  };

  const exportLocationData = () => {
    if (locationIncidents.length === 0) {
      showToast({ message: 'No location data available to export', type: 'warning' });
      return;
    }

    const columns: ExportColumn[] = [
      { key: 'name', label: 'Barangay' },
      ...Object.keys(locationIncidents[0] || {})
        .filter(key => key !== 'name')
        .map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }))
    ];

    setExportData(locationIncidents);
    setExportColumns(columns);
    setExportTitle('Barangay-based Risk Analysis');
    setShowExportModal(true);
  };


  const exportRecentActivity = () => {
    if (recentActivity.length === 0) {
      showToast({ message: 'No recent activity available to export', type: 'warning' });
      return;
    }

    const columns: ExportColumn[] = [
      { key: 'action', label: 'Action' },
      { key: 'details', label: 'Details' },
      { key: 'user_type', label: 'User Type' },
      { key: 'created_at', label: 'Date' }
    ];

    setExportData(recentActivity);
    setExportColumns(columns);
    setExportTitle('Recent Activity');
    setShowExportModal(true);
  };

  const exportAllData = () => {
    // Combine all dashboard data into a comprehensive export
    const allData = [];
    
    // Add dashboard statistics
    allData.push({
      section: 'Dashboard Statistics',
      metric: 'Total Incidents',
      value: stats.totalIncidents,
      details: 'Overall incident count'
    });
    allData.push({
      section: 'Dashboard Statistics',
      metric: 'Active Incidents',
      value: stats.activeIncidents,
      details: 'Currently active incidents'
    });
    allData.push({
      section: 'Dashboard Statistics',
      metric: 'Total Users',
      value: stats.totalUsers,
      details: 'Registered users count'
    });
    allData.push({
      section: 'Dashboard Statistics',
      metric: 'Staff Members',
      value: stats.totalStaff,
      details: 'Staff members count'
    });
    allData.push({
      section: 'Dashboard Statistics',
      metric: 'Total Alerts',
      value: stats.totalAlerts,
      details: 'Total alerts count'
    });
    allData.push({
      section: 'Dashboard Statistics',
      metric: 'Active Alerts',
      value: stats.activeAlerts,
      details: 'Currently active alerts'
    });

    // Add incident types data
    incidentTypes.forEach(item => {
      allData.push({
        section: 'Incident Types',
        metric: item.incident_type,
        value: item.count,
        details: 'Incident type distribution'
      });
    });

    // Add priority data
    priorityData.forEach(item => {
      allData.push({
        section: 'Priority Distribution',
        metric: item.priority,
        value: item.count,
        details: 'Priority level distribution'
      });
    });

    // Add trends data
    monthlyIncidents.forEach(item => {
      allData.push({
        section: 'Trends Data',
        metric: item.period || item.month || 'Unknown Period',
        value: item.total_incidents,
        details: `Total incidents in ${item.period || item.month || 'Unknown Period'}`
      });
    });

    // Add peak hours data
    const formattedPeakHours = formatPeakHoursData(peakHoursData);
    formattedPeakHours.forEach(item => {
      allData.push({
        section: 'Peak Hours Analysis',
        metric: item.name,
        value: item.count,
        details: `Peak hour: ${item.dateRange || 'N/A'}`
      });
    });

    // Add location data
    locationIncidents.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name') {
          allData.push({
            section: 'Location Data',
            metric: `${item.name} - ${key}`,
            value: item[key],
            details: 'Barangay-based incident data'
          });
        }
      });
    });


    // Add recent activity
    recentActivity.forEach(item => {
      allData.push({
        section: 'Recent Activity',
        metric: item.action,
        value: 1,
        details: `${item.details} - ${item.user_type}`
      });
    });

    const columns: ExportColumn[] = [
      { key: 'section', label: 'Data Section' },
      { key: 'metric', label: 'Metric/Type' },
      { key: 'value', label: 'Value' },
      { key: 'details', label: 'Details' }
    ];

    setExportData(allData);
    setExportColumns(columns);
    setExportTitle('Complete Dashboard Data Export');
    setShowExportModal(true);
  };

  const fetchTrendsData = async (period: 'days' | 'weeks' | 'months' = 'months', limit: number = 12) => {
    try {
      setTrendsLoading(true);
      console.log(`Fetching trends data for period: ${period}, limit: ${limit}`);
      const trendsResponse = await adminDashboardApi.getMonthlyTrends(period, limit);
      console.log('Trends response:', trendsResponse);
      
      if (trendsResponse.success && trendsResponse.trendsData) {
        // Map the API response to the expected interface format
        const mappedData = trendsResponse.trendsData.map(item => ({
          month: item.period, // Use period as month for compatibility
          period: item.period,
          total_incidents: item.total_incidents || 0,
          resolved_incidents: item.resolved_incidents || 0,
          high_priority_incidents: item.high_priority_incidents || 0
        }));
        console.log('Mapped data:', mappedData);
        setMonthlyIncidents(mappedData);
      } else {
        console.warn('Trends API returned success: false or no data');
        setMonthlyIncidents([]);
      }
    } catch (error) {
      console.error('Failed to fetch trends data:', error);
      setMonthlyIncidents([]);
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats, overview, and analytics data
      const [statsResponse, overviewResponse, analyticsResponse] = await Promise.all([
        adminDashboardApi.getStats(),
        adminDashboardApi.getOverview(),
        adminDashboardApi.getAnalytics()
      ]);

      // Fetch trends data with current filter settings
      await fetchTrendsData(trendsPeriod, trendsLimit);

      // Try to fetch location data, but don't fail if it doesn't work
      let locationResponse = null;
      try {
        locationResponse = await adminDashboardApi.getLocationIncidents();
      } catch (error) {
        console.warn('Location incidents endpoint not available, using fallback data:', error);
        // Set empty data as fallback
        locationResponse = { success: true, locationIncidents: [] };
      }


      if (statsResponse.success) {
        setStats({
          totalIncidents: statsResponse.stats.incidents.total_incidents,
          activeIncidents: statsResponse.stats.incidents.active_incidents,
          totalUsers: statsResponse.stats.users.total_users,
          totalStaff: statsResponse.stats.staff.total_staff,
          totalAlerts: statsResponse.stats.alerts.total_alerts,
          activeAlerts: statsResponse.stats.alerts.active_alerts
        });

        setRecentActivity(statsResponse.recentActivity || []);

        // Set trends based on response data
        if (statsResponse.trends) {
          // Example: calculate percentage change for incidents and users
          const incidentsTrendData = statsResponse.trends.incidents;
          const usersTrendData = statsResponse.trends.users;

          if (incidentsTrendData && incidentsTrendData.length >= 2) {
            const latest = incidentsTrendData[incidentsTrendData.length - 1].count;
            const previous = incidentsTrendData[incidentsTrendData.length - 2].count;
            const change = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
            setIncidentTrend(`${change >= 0 ? '+' : ''}${change.toFixed(1)}% from last period`);
          } else {
            setIncidentTrend(null);
          }

          if (usersTrendData && usersTrendData.length >= 2) {
            const latest = usersTrendData[usersTrendData.length - 1].count;
            const previous = usersTrendData[usersTrendData.length - 2].count;
            const change = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
            setUserTrend(`${change >= 0 ? '+' : ''}${change.toFixed(1)}% from last period`);
          } else {
            setUserTrend(null);
          }
        } else {
          setIncidentTrend(null);
          setUserTrend(null);
        }
      } else {
        setError('Failed to fetch dashboard statistics');
      }

      // Set incident types data from overview response
      if (overviewResponse.success) {
        setIncidentTypes(overviewResponse.overview.incidentTypes || []);
      }

      // Set priority data from analytics response
      if (analyticsResponse.success) {
        setPriorityData(analyticsResponse.analytics.incidentPriority || []);
        setMonthlyIncidents(analyticsResponse.analytics.monthlyIncidents || []);
        
        // Handle peak hours data with proper typing
        const peakHoursData = analyticsResponse.analytics.peakHours || [];
        const typedPeakHoursData: PeakHoursData[] = peakHoursData.map((item: any) => ({
          hour: item.hour,
          incident_count: item.incident_count,
          earliest_datetime: item.earliest_datetime || '',
          latest_datetime: item.latest_datetime || '',
          sample_datetimes: item.sample_datetimes || '',
          consecutive_dates: item.consecutive_dates || ''
        }));
        setPeakHoursData(typedPeakHoursData);
        
        // Set the date range for peak hours analysis
        setPeakHoursDateRange(calculatePeakHoursDateRange());
      }

      // Set location incidents data from location response
      if (locationResponse && locationResponse.success) {
        setLocationIncidents(locationResponse.locationIncidents || []);
      } else {
        // Set empty data if location response failed
        setLocationIncidents([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: string;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value?.toLocaleString() || '0'}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">
              <i className="ri-arrow-up-line mr-1"></i>
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <i className={`${icon} text-xl text-white`}></i>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <i className="ri-error-warning-line text-red-500 text-xl mr-3"></i>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <PrivacyNotice variant="banner" />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Analytics</h1>
            <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <i className="ri-shield-check-line mr-1"></i>
              Secure Access
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
              <i className="ri-download-line mr-2"></i>
              Export Data
              <i className="ri-arrow-down-s-line ml-1"></i>
            </button>
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <button
                  onClick={exportAllData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center border-b border-gray-200 mb-1"
                >
                  <i className="ri-download-cloud-line mr-3 text-green-600"></i>
                  <span className="font-semibold">Export All Data</span>
                </button>
                <div className="px-2 py-1 text-xs text-gray-500 mb-2">Individual Exports:</div>
                <button
                  onClick={exportDashboardStats}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-bar-chart-line mr-3 text-blue-500"></i>
                  Dashboard Statistics
                </button>
                <button
                  onClick={exportIncidentTypes}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-pie-chart-line mr-3 text-red-500"></i>
                  Incident Types
                </button>
                <button
                  onClick={exportPriorityData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-pie-chart-2-line mr-3 text-orange-500"></i>
                  Priority Distribution
                </button>
                <button
                  onClick={exportTrendsData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-line-chart-line mr-3 text-green-500"></i>
                  Trends Data
                </button>
                <button
                  onClick={exportPeakHoursData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-time-line mr-3 text-yellow-500"></i>
                  Peak Hours Analysis
                </button>
                <button
                  onClick={exportLocationData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-map-pin-line mr-3 text-purple-500"></i>
                  Location Data
                </button>
                <button
                  onClick={exportRecentActivity}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <i className="ri-history-line mr-3 text-gray-500"></i>
                  Recent Activity
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={fetchDashboardStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`ri-refresh-line mr-2 ${loading ? 'animate-spin' : ''}`}></i>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Incidents"
          value={stats.totalIncidents}
          icon="ri-error-warning-line"
          color="bg-red-500"
          trend={incidentTrend || undefined}
        />
        <StatCard
          title="Active Incidents"
          value={stats.activeIncidents}
          icon="ri-alarm-warning-line"
          color="bg-orange-500"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="ri-user-line"
          color="bg-blue-500"
          trend={userTrend || undefined}
        />
        <StatCard
          title="Staff Members"
          value={stats.totalStaff}
          icon="ri-team-line"
          color="bg-green-500"
        />
        <StatCard
          title="Total Alerts"
          value={stats.totalAlerts}
          icon="ri-notification-line"
          color="bg-purple-500"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon="ri-alarm-warning-line"
          color="bg-indigo-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Common Incident Types Chart */}
        <BarChart
          data={incidentTypes.map(item => ({
            name: item.incident_type,
            count: item.count
          }))}
          title="Most Common Incident Types"
          dataKey="count"
          color={{
            medical: '#007BFF',
            fire: '#DC3545',
            accident: '#FD7E14',
            security: '#6610F2',
            other: '#6C757D'
          }}
          height={300}
        />

        {/* Priority Level Distribution Chart */}
        <PieChart
          data={priorityData.map(item => ({
            name: item.priority,
            count: item.count
          }))}
          title="Priority Level Distribution"
          dataKey="count"
          nameKey="name"
          height={300}
          colors={{
            low: "#10B981",
            moderate: "#FFD966",
            high: "#E67E22",
            critical: "#EF4444"
          }}
        />
      </div>

      {/* Monthly Trends Line Chart with Filter */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Incident Trends Analysis</h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <select
                  value={trendsPeriod}
                  onChange={(e) => setTrendsPeriod(e.target.value as 'days' | 'weeks' | 'months')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Last:</label>
                <select
                  value={trendsLimit}
                  onChange={(e) => setTrendsLimit(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {trendsPeriod === 'days' && (
                    <>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </>
                  )}
                  {trendsPeriod === 'weeks' && (
                    <>
                      <option value={4}>4 weeks</option>
                      <option value={8}>8 weeks</option>
                      <option value={12}>12 weeks</option>
                      <option value={24}>24 weeks</option>
                    </>
                  )}
                  {trendsPeriod === 'months' && (
                    <>
                      <option value={6}>6 months</option>
                      <option value={12}>12 months</option>
                      <option value={18}>18 months</option>
                      <option value={24}>24 months</option>
                    </>
                  )}
                </select>
              </div>
              <button
                onClick={() => fetchTrendsData(trendsPeriod, trendsLimit)}
                disabled={trendsLoading}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className={`ri-refresh-line mr-1 ${trendsLoading ? 'animate-spin' : ''}`}></i>
                {trendsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          {trendsLoading || (monthlyIncidents.length === 0 && !trendsLoading) ? (
            <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">
                  {trendsLoading ? 'Loading trends data...' : 'Loading chart data...'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Period: {trendsPeriod} | Limit: {trendsLimit}
                </p>
              </div>
            </div>
          ) : monthlyIncidents.length > 0 ? (
            <LineChart
              data={monthlyIncidents.map(item => ({
                date: item.period || item.month || 'Unknown',
                count: item.total_incidents || 0
              }))}
              title={`Incident Trends (Last ${trendsLimit} ${trendsPeriod})`}
              color="#10b981"
              height={350}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <i className="ri-bar-chart-line text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">No data available for the selected period</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting the time range or check back later</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Peak Hours Analysis */}
      <div className="grid grid-cols-1 gap-6">
        <BarChart
          data={formatPeakHoursData(peakHoursData)}
          title={`Peak Hours Analysis - Incident Distribution by Time (${peakHoursDateRange || 'Last 30 Days'})`}
          dataKey="count"
          color="#f59e0b"
          height={350}
        />
        {peakHoursData.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-information-line text-amber-500 text-lg mr-3"></i>
              <div>
                <h4 className="text-amber-800 font-medium">Peak Hours Analysis</h4>
                <p className="text-amber-600 text-sm mt-1">
                  This bar chart shows incident distribution by hour of day over the period {peakHoursDateRange || 'last 30 days'}.
                  Hover over bars to see consecutive incident dates and exact times in 12-hour format (e.g., "September 30 8:30 PM"). It helps identify peak hours when incidents are most likely to occur, enabling better resource allocation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barangay-based Risk Analysis Chart */}
      <div className="grid grid-cols-1 gap-6">
        {(() => {
          // Debug: Log the actual data structure
          console.log('Location incidents data:', locationIncidents);

          // Get all possible incident type keys from the data
          const allKeys: string[] = [];
          locationIncidents.forEach(item => {
            Object.keys(item).forEach(key => {
              if (key !== 'name' && !allKeys.includes(key)) {
                allKeys.push(key);
              }
            });
          });

          console.log('Available incident type keys:', allKeys);

          // Create color array based on incident type order
          const incidentTypeColors: { [key: string]: string } = {
            medical: '#007BFF',
            fire: '#DC3545',
            accident: '#FD7E14',
            security: '#6610F2',
            other: '#6C757D'
          };
          
          // Map stack keys to their corresponding colors
          const colors = allKeys.map(key => 
            incidentTypeColors[key.toLowerCase()] || '#6C757D'
          );

          return (
            <StackedBarChart
              data={locationIncidents.length > 0 ? locationIncidents : []}
              title="Risky Areas by Barangay"
              stackKeys={allKeys}
              colors={colors}
              height={400}
            />
          );
        })()}
        {locationIncidents.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-information-line text-blue-500 text-lg mr-3"></i>
              <div>
                <h4 className="text-blue-800 font-medium">Barangay-based Risk Analysis</h4>
                <p className="text-blue-600 text-sm mt-1">
                  This chart shows incident distribution by barangay. Barangay names are extracted from incident descriptions.
                  If no data appears, ensure incidents have barangay information in their descriptions or check the backend server.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={exportData}
        columns={exportColumns}
        title={exportTitle}
        onExportCSV={() => {
          try {
            ExportUtils.exportToCSV(exportData, exportColumns, { 
              filename: exportTitle.toLowerCase().replace(/\s+/g, '_'),
              title: exportTitle 
            });
            showToast({ message: 'Data exported to CSV successfully!', type: 'success' });
            setShowExportModal(false);
          } catch (error) {
            console.error('Export error:', error);
            showToast({ message: 'Failed to export data. Please try again.', type: 'error' });
          }
        }}
        onExportExcel={() => {
          try {
            ExportUtils.exportToExcel(exportData, exportColumns, { 
              filename: exportTitle.toLowerCase().replace(/\s+/g, '_'),
              title: exportTitle 
            });
            showToast({ message: 'Data exported to Excel successfully!', type: 'success' });
            setShowExportModal(false);
          } catch (error) {
            console.error('Export error:', error);
            showToast({ message: 'Failed to export data. Please try again.', type: 'error' });
          }
        }}
        onExportPDF={async () => {
          try {
            await ExportUtils.exportToPDF(exportData, exportColumns, { 
              filename: exportTitle.toLowerCase().replace(/\s+/g, '_'),
              title: exportTitle 
            });
            showToast({ message: 'Data exported to PDF successfully!', type: 'success' });
            setShowExportModal(false);
          } catch (error) {
            console.error('Export error:', error);
            showToast({ message: 'Failed to export data. Please try again.', type: 'error' });
          }
        }}
      />
      
    </div>
  );
};

export default AdminDashboard;
