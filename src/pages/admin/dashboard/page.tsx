// ...existing code...
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminDashboardApi, apiRequest } from '../../../utils/api';
import BarChart from '../../../components/charts/BarChart';
import PieChart from '../../../components/charts/PieChart';
import StackedBarChart from '../../../components/charts/StackedBarChart';
import LineChart from '../../../components/charts/LineChart';
import { useToast } from '../../../components/base/Toast';
import ExportUtils, { type ExportColumn, type ChartImage } from '../../../utils/exportUtils';
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

interface ResponseTimeData {
  incident_type: string;
  incident_count: number;
  avg_response_time_minutes: number;
  min_response_time_minutes: number;
  max_response_time_minutes: number;
  avg_resolution_time_minutes: number | null;
  avg_response_time_hours: string;
  avg_response_time_days?: number;
  display_value?: number;
  display_unit?: 'hours' | 'days';
}

interface IndividualResponseTimeData {
  incident_id: number;
  incident_type: string;
  date_reported: string;
  updated_at: string;
  status: string;
  response_time_minutes: number;
  response_time_hours: number;
  response_time_days: number;
  display_value: number;
  display_unit: 'hours' | 'days';
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
  const [welfareStats, setWelfareStats] = useState<{ safeReports: number; needsHelpReports: number; notSubmitted: number; uniqueUsers: number } | null>(null);
  const [hasActiveWelfare, setHasActiveWelfare] = useState(false);
  const [locationIncidents, setLocationIncidents] = useState<Array<{ name: string; [key: string]: string | number }>>([]);
  const [monthlyIncidents, setMonthlyIncidents] = useState<MonthlyIncidentData[]>([]);
  const [trendsPeriod, setTrendsPeriod] = useState<'days' | 'months'>('days');
  const [trendsLimit, setTrendsLimit] = useState<number>(7);
  const [peakHoursData, setPeakHoursData] = useState<PeakHoursData[]>([]);
  const [peakHoursDateRange, setPeakHoursDateRange] = useState<string>('');
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);
  const [individualResponseTimeData, setIndividualResponseTimeData] = useState<IndividualResponseTimeData[]>([]);
  const [showIndividualResponseTime, setShowIndividualResponseTime] = useState(false);
  const [responseTimePeriod, setResponseTimePeriod] = useState<'days' | 'months'>('months');
  const [responseTimeLimit, setResponseTimeLimit] = useState<number>(12);
  const [responseTimeLoading, setResponseTimeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date filter states
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // Current month (1-12)
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0 = All (optional)
  
  // Export functionality
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([]);
  const [exportTitle, setExportTitle] = useState('');
  const [exportChartImages, setExportChartImages] = useState<ChartImage[]>([]);
  const [exportOrientation, setExportOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const { showToast } = useToast();

  // Chart refs for capturing images
  const incidentTypesChartRef = useRef<HTMLDivElement>(null);
  const welfareChartRef = useRef<HTMLDivElement>(null);
  const trendsChartRef = useRef<HTMLDivElement>(null);
  const peakHoursChartRef = useRef<HTMLDivElement>(null);
  const locationChartRef = useRef<HTMLDivElement>(null);
  const responseTimeChartRef = useRef<HTMLDivElement>(null);

  // Helper functions for date filters
  const getYears = (): number[] => {
    const years: number[] = [];
    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    for (let i = startYear; i <= currentYear; i++) {
      years.push(i);
    }
    return years.reverse(); // Show most recent year first
  };

  const getMonths = (): Array<{ value: number; label: string }> => {
    return [
      { value: 0, label: 'All Months' },
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' }
    ];
  };

  const getDays = (year: number, month: number): number[] => {
    const days: number[] = [0]; // 0 = All Days
    if (month > 0) {
      // JavaScript Date months are 0-indexed (0=Jan, 11=Dec)
      // Our month values are 1-indexed (1=Jan, 12=Dec)
      // So we need to use month directly (not month-1) because:
      // new Date(year, month, 0) gives the last day of the previous month
      // So new Date(year, 10, 0) when month=10 (October) gives last day of October
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }
    }
    return days;
  };

  // Date filters: Year is required, Month and Day are optional (0 = All, not applied)

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardStats();
      // Trends data will be loaded automatically by the date filters useEffect
    };
    loadData();
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  // Reset limit when period changes to ensure valid combinations
  useEffect(() => {
    if (trendsPeriod === 'days' && trendsLimit > 30) {
      setTrendsLimit(7); // Default to 7 days for better performance
    } else if (trendsPeriod === 'months' && trendsLimit > 24) {
      setTrendsLimit(12); // Default to 12 months
    }
  }, [trendsPeriod]);

  // Reset day to "All Days" when month changes or validate day range
  useEffect(() => {
    if (selectedMonth > 0 && selectedDay > 0) {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      // If selected day is greater than days in month, reset to "All Days"
      if (selectedDay > daysInMonth) {
        setSelectedDay(0);
      }
    }
    // If month is "All Months", reset day to "All Days"
    if (selectedMonth === 0 && selectedDay > 0) {
      setSelectedDay(0);
    }
  }, [selectedMonth, selectedYear]);

  // Define fetchTrendsData function with useCallback to ensure stability
  const fetchTrendsData = useCallback(async (period: 'days' | 'months' = 'months', limit: number = 12, year?: number, month?: number, day?: number) => {
    try {
      setTrendsLoading(true);
      
      // When date filters are used, calculate appropriate limit
      let limitToUse = limit;
      if (year && month) {
        // If month is selected, use days in that month as limit
        const daysInMonth = new Date(year, month, 0).getDate();
        limitToUse = daysInMonth;
        console.log(`Month filter active: ${month}/${year}, expecting ${daysInMonth} daily data points`);
      } else if (year && !month) {
        // If only year is selected, use 12 months
        limitToUse = 12;
        console.log(`Year filter only: ${year}, expecting 12 monthly data points`);
      }
      
      console.log(`API Call - Period: ${period}, Limit: ${limitToUse}, Year: ${year}, Month: ${month}, Day: ${day}`);
      const trendsResponse = await adminDashboardApi.getMonthlyTrends(period, limitToUse, year, month, day);
      console.log('Trends API Response:', {
        success: trendsResponse.success,
        dataCount: trendsResponse.trendsData?.length || 0,
        firstFewItems: trendsResponse.trendsData?.slice(0, 5),
        period: trendsResponse.period,
        note: trendsResponse.note
      });
      
      if (trendsResponse.success && trendsResponse.trendsData) {
        // Map the API response to the expected interface format
        const mappedData = trendsResponse.trendsData.map(item => ({
          month: item.period, // Use period as month for compatibility
          period: item.period,
          total_incidents: item.total_incidents || 0,
          resolved_incidents: item.resolved_incidents || 0,
          high_priority_incidents: item.high_priority_incidents || 0
        }));
        console.log('Mapped trends data:', mappedData);
        console.log(`Total data points received: ${mappedData.length}`);
        if (month && mappedData.length < 10) {
          console.warn(`⚠️ Expected daily data for month ${month}, but only got ${mappedData.length} data points. Check server grouping logic.`);
        }
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
  }, []);

  // Fetch all dashboard data when date filters change
  useEffect(() => {
    console.log(`[DASHBOARD] Date filters changed - Year: ${selectedYear}, Month: ${selectedMonth}, Day: ${selectedDay}`);
    fetchDashboardStats();
  }, [selectedYear, selectedMonth, selectedDay]);

  // Fetch trends data automatically when date filters change (AUTOMATIC - NO NEED TO CLICK REFRESH)
  useEffect(() => {
    const monthParam = selectedMonth > 0 ? selectedMonth : undefined;
    // If day is 0 (All Days), pass undefined so server shows all days in the month
    const dayParam = selectedDay > 0 ? selectedDay : undefined;
    
    // Auto-adjust period and limit based on date filters:
    // - If month is selected, use daily breakdown for that month (shows all days 1-30/31)
    // - If only year is selected, use monthly breakdown for the year
    let periodToUse: 'days' | 'months' = 'months';
    let limitToUse: number = 12;
    
    if (monthParam) {
      // If month is selected, show daily breakdown for that month
      // When dayParam is undefined (All Days), server will show ALL days in the month
      periodToUse = 'days';
      // Calculate days in the selected month
      const daysInMonth = new Date(selectedYear, monthParam, 0).getDate();
      limitToUse = daysInMonth;
      const dayFilterText = dayParam ? `Day ${dayParam}` : 'All Days';
      console.log(`[TRENDS AUTO-UPDATE] Month selected (${monthParam}) - Using daily breakdown with ${daysInMonth} days for ${selectedYear}-${monthParam}, Filter: ${dayFilterText}`);
    } else if (selectedYear) {
      // If only year is selected, show monthly breakdown for the year
      periodToUse = 'months';
      limitToUse = 12;
      console.log(`[TRENDS AUTO-UPDATE] Only year selected (${selectedYear}) - Using monthly breakdown`);
    }
    
    console.log(`[TRENDS AUTO-UPDATE] Fetching trends data - Year: ${selectedYear}, Month: ${monthParam}, Day: ${dayParam || 'All Days'}, Period: ${periodToUse}, Limit: ${limitToUse}`);
    // Automatically refresh trends data when date filters change - NO MANUAL REFRESH NEEDED
    setTrendsLoading(true);
    fetchTrendsData(periodToUse, limitToUse, selectedYear, monthParam, dayParam);
  }, [selectedYear, selectedMonth, selectedDay, fetchTrendsData]);

  // Reset response time limit when period changes
  useEffect(() => {
    if (responseTimePeriod === 'days') {
      // If current limit is not a valid days option, reset to 7
      if (![7, 14, 30].includes(responseTimeLimit)) {
        setResponseTimeLimit(7); // Default to 7 days for better performance
      }
    } else if (responseTimePeriod === 'months') {
      // If current limit is not a valid months option, reset to 12
      if (![6, 12, 18, 24].includes(responseTimeLimit)) {
        setResponseTimeLimit(12); // Default to 12 months
      }
    }
  }, [responseTimePeriod]);

  // Fetch response time data when filter changes
  useEffect(() => {
    const fetchResponseTimeData = async () => {
      setResponseTimeLoading(true);
      const monthParam = selectedMonth > 0 ? selectedMonth : undefined;
      const dayParam = selectedDay > 0 ? selectedDay : undefined;
      try {
        const responseTimeResponse = await adminDashboardApi.getResponseTimeByType(responseTimePeriod, responseTimeLimit, selectedYear, monthParam, dayParam);
        if (responseTimeResponse.success && responseTimeResponse.responseTimeData) {
          setResponseTimeData(responseTimeResponse.responseTimeData || []);
        }
      } catch (error) {
        console.warn('Response time endpoint not available:', error);
        setResponseTimeData([]);
      }

      try {
        const individualResponseTimeResponse = await adminDashboardApi.getResponseTimeIndividual(200, responseTimePeriod, responseTimeLimit, selectedYear, monthParam, dayParam);
        if (individualResponseTimeResponse.success && individualResponseTimeResponse.incidents) {
          setIndividualResponseTimeData(individualResponseTimeResponse.incidents || []);
        }
      } catch (error) {
        console.warn('Individual response time endpoint not available:', error);
        setIndividualResponseTimeData([]);
      } finally {
        setResponseTimeLoading(false);
      }
    };
    fetchResponseTimeData();
  }, [responseTimePeriod, responseTimeLimit, selectedYear, selectedMonth, selectedDay]);

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
      
      // Validate that earliest and latest times match the hour bucket
      // Extract hour from datetime string directly to avoid timezone conversion issues
      const extractHourFromDateTime = (dateTimeString: string): number | null => {
        if (!dateTimeString) return null;
        // Try to extract hour directly from the datetime string
        // Format 1: "YYYY-MM-DD HH:MM:SS" (from earliest_datetime/latest_datetime)
        let match = dateTimeString.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          return parseInt(match[2], 10); // Extract hour (00-23)
        }
        // Format 2: "YYYY-MM-DD HH:MM AM/PM" (from sample_datetimes)
        match = dateTimeString.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
        if (match) {
          let hour = parseInt(match[2], 10);
          const period = match[4].toUpperCase();
          // Convert 12-hour to 24-hour format
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          return hour;
        }
        // Fallback to Date object (may have timezone issues)
        const date = new Date(dateTimeString);
        return date.getHours();
      };

      const earliestHour = extractHourFromDateTime(item.earliest_datetime);
      const latestHour = extractHourFromDateTime(item.latest_datetime);
      
      // Check if there's a mismatch (this indicates a timezone or data issue)
      // This is expected due to timezone conversion between MySQL server timezone and browser timezone
      const hourMismatch = 
        (earliestHour !== null && earliestHour !== item.hour) ||
        (latestHour !== null && latestHour !== item.hour);

      // Only log in development mode and only once per session to avoid console spam
      if (hourMismatch && process.env.NODE_ENV === 'development' && !(window as any).__peakHoursMismatchLogged) {
        console.debug(`Peak Hours: Timezone conversion detected. Hour buckets are based on server timezone, but datetimes are converted to browser timezone. This is handled gracefully in the UI.`);
        (window as any).__peakHoursMismatchLogged = true;
      }
      
      // Create consecutive date range from the compact format
      const consecutiveDateRange = formattedConsecutiveDates || mostRecent?.date || '';

      // Only show time range if it matches the hour bucket (to avoid confusion)
      // If there's a mismatch, don't show the time range or show a corrected version
      let timeRangeDisplay = '';
      if (earliest?.time && latest?.time) {
        if (!hourMismatch) {
          // Times match the hour bucket - safe to display
          timeRangeDisplay = `${earliest.time} - ${latest.time}`;
        } else {
          // Times don't match - either hide it or show a note
          // Extract times that actually match the hour bucket from sample_datetimes
          const matchingTimes = sampleDatetimes
            .filter((dt: string) => {
              const hour = extractHourFromDateTime(dt);
              return hour === item.hour;
            })
            .map((dt: string) => {
              const formatted = formatDateTime(dt);
              return formatted?.time || '';
            })
            .filter(Boolean);
          
          if (matchingTimes.length > 0) {
            // Show times that actually match the hour
            timeRangeDisplay = matchingTimes.length === 1 
              ? matchingTimes[0]
              : `${matchingTimes[matchingTimes.length - 1]} - ${matchingTimes[0]}`;
          } else {
            // Can't find matching times - show hour range instead
            timeRangeDisplay = `${hourLabels[item.hour]} (${item.hour}:00 - ${item.hour}:59)`;
          }
        }
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
        timeRange: timeRangeDisplay,
        consecutiveDates: formattedConsecutiveDates.split(', '),
        earliestDateTime: item.earliest_datetime,
        latestDateTime: item.latest_datetime,
        hourMismatch: hourMismatch // Flag for potential data issues
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

  // Helper function to capture chart images
  const captureChartImages = async (chartRefs: Array<{ ref: React.RefObject<HTMLDivElement>; title: string }>): Promise<ChartImage[]> => {
    const chartElements = chartRefs.map(({ ref, title }) => ({
      element: ref.current,
      title
    }));
    return await ExportUtils.chartsToImages(chartElements);
  };

  // Export functions
  const exportDashboardStats = async () => {
    setShowExportDropdown(false);
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

    // Capture all chart images for comprehensive export
    const chartImages = await captureChartImages([
      { ref: incidentTypesChartRef, title: 'Most Common Incident Types' },
      ...(hasActiveWelfare ? [{ ref: welfareChartRef, title: 'Welfare Status Overview' }] : []),
      { ref: trendsChartRef, title: 'Incident Trends Analysis' },
      { ref: peakHoursChartRef, title: `Peak Hours Analysis - Incident Distribution by Time` },
      { ref: locationChartRef, title: 'Risky Areas by Barangay' },
      { ref: responseTimeChartRef, title: 'Response Time per Incident Type' }
    ]);

    setExportData(statsData);
    setExportColumns(columns);
    setExportTitle('Dashboard Statistics');
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const exportIncidentTypes = async () => {
    setShowExportDropdown(false);
    const columns: ExportColumn[] = [
      { key: 'incident_type', label: 'Incident Type' },
      { key: 'count', label: 'Count' }
    ];

    // Capture the incident types chart
    const chartImages = await captureChartImages([
      { ref: incidentTypesChartRef, title: 'Most Common Incident Types' }
    ]);

    setExportData(incidentTypes);
    setExportColumns(columns);
    setExportTitle('Incident Types Distribution');
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const exportWelfareData = async () => {
    setShowExportDropdown(false);
    const welfareData = welfareStats ? [
      { status: 'Safe', count: welfareStats.safeReports },
      { status: 'Needs Help', count: welfareStats.needsHelpReports },
      { status: 'Not Submitted', count: welfareStats.notSubmitted }
    ] : [];
    
    const columns: ExportColumn[] = [
      { key: 'status', label: 'Welfare Status' },
      { key: 'count', label: 'Count' }
    ];

    // Capture the welfare chart
    const chartImages = await captureChartImages([
      { ref: welfareChartRef, title: 'Welfare Status Overview' }
    ]);

    setExportData(welfareData);
    setExportColumns(columns);
    setExportTitle('Welfare');
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const exportTrendsData = async () => {
    setShowExportDropdown(false);
    const columns: ExportColumn[] = [
      { key: 'period', label: 'Period' },
      { key: 'total_incidents', label: 'Total Incidents' },
      { key: 'resolved_incidents', label: 'Resolved Incidents' },
      { key: 'high_priority_incidents', label: 'High Priority Incidents' }
    ];

    // Capture the trends chart
    const chartImages = await captureChartImages([
      { ref: trendsChartRef, title: `Incident Trends (Last ${trendsLimit} ${trendsPeriod})` }
    ]);

    setExportData(monthlyIncidents);
    setExportColumns(columns);
    setExportTitle('Incident Trends Analysis');
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const exportPeakHoursData = async () => {
    setShowExportDropdown(false);
    const formattedData = formatPeakHoursData(peakHoursData);
    const columns: ExportColumn[] = [
      { key: 'name', label: 'Hour' },
      { key: 'count', label: 'Incident Count' },
      { key: 'dateRange', label: 'Date Range' },
      { key: 'sampleDateTime', label: 'Sample DateTime' }
    ];

    // Capture the peak hours chart
    const chartImages = await captureChartImages([
      { ref: peakHoursChartRef, title: `Peak Hours Analysis - Incident Distribution by Time` }
    ]);

    setExportData(formattedData);
    setExportColumns(columns);
    setExportTitle(`Peak Hours Analysis (${peakHoursDateRange})`);
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const exportLocationData = async () => {
    setShowExportDropdown(false);
    if (locationIncidents.length === 0) {
      showToast({ message: 'No location data available to export', type: 'warning' });
      return;
    }

    // Helper function to format column labels properly
    const formatColumnLabel = (key: string): string => {
      const labelMap: { [key: string]: string } = {
        'medical': 'Medical',
        'fire': 'Fire',
        'accident': 'Accident',
        'security': 'Security',
        'other': 'Other',
        'name': 'Barangay'
      };
      
      if (labelMap[key.toLowerCase()]) {
        return labelMap[key.toLowerCase()];
      }
      
      // Default: capitalize first letter and replace underscores with spaces
      return key
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Get all keys from location incidents and format them properly
    const allKeys = new Set<string>();
    locationIncidents.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const columns: ExportColumn[] = [
      { key: 'name', label: 'Barangay' },
      ...Array.from(allKeys)
        .filter(key => key !== 'name')
        .sort() // Sort columns for consistent order
        .map(key => ({ key, label: formatColumnLabel(key) }))
    ];

    // Capture the location chart
    const chartImages = await captureChartImages([
      { ref: locationChartRef, title: 'Risky Areas by Barangay' }
    ]);

    setExportData(locationIncidents);
    setExportColumns(columns);
    setExportTitle('Risky Areas by Barangay');
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const exportResponseTimeData = async () => {
    setShowExportDropdown(false);
    
    // Export based on current view
    if (showIndividualResponseTime) {
      // Export individual reports
      if (individualResponseTimeData.length === 0) {
        showToast({ message: 'No individual response time data available to export', type: 'warning' });
        return;
      }

      // Format individual incident data for export
      const formattedData = individualResponseTimeData.map(item => {
        // Format response time display
        let responseTimeDisplay = '';
        if (item.response_time_minutes < 60) {
          responseTimeDisplay = `${item.response_time_minutes} Minutes`;
        } else if (item.response_time_hours >= 24) {
          responseTimeDisplay = `${item.response_time_days} Days`;
        } else {
          responseTimeDisplay = `${item.response_time_hours.toFixed(1)} Hours`;
        }

        return {
          incident_id: item.incident_id,
          incident_type: item.incident_type,
          date_reported: new Date(item.date_reported).toLocaleString(),
          updated_at: new Date(item.updated_at).toLocaleString(),
          status: item.status,
          response_time_minutes: item.response_time_minutes,
          response_time_hours: item.response_time_hours.toFixed(2),
          response_time_days: item.response_time_days || 0,
          response_time_display: responseTimeDisplay
        };
      });

      const columns: ExportColumn[] = [
        { key: 'incident_id', label: 'Incident ID' },
        { key: 'incident_type', label: 'Incident Type' },
        { key: 'date_reported', label: 'Date Reported' },
        { key: 'updated_at', label: 'Updated At' },
        { key: 'status', label: 'Status' },
        { key: 'response_time_display', label: 'Response Time' },
       
      ];

      // Capture the response time chart
      const chartImages = await captureChartImages([
        { ref: responseTimeChartRef, title: `Response Time per Individual Incident (Minutes) - Last ${responseTimeLimit} ${responseTimePeriod}` }
      ]);

      setExportData(formattedData);
      setExportColumns(columns);
      setExportTitle(`Response Time per Individual Incident (Minutes) - Last ${responseTimeLimit} ${responseTimePeriod}`);
      setExportChartImages(chartImages);
      setShowExportModal(true);
    } else {
      // Export average by type
      if (responseTimeData.length === 0) {
        showToast({ message: 'No response time data available to export', type: 'warning' });
        return;
      }

      // Format data for export with readable time formats
      const formattedData = responseTimeData.map(item => {
        // Format response time display
        let avgResponseTimeDisplay = '';
        if (item.avg_response_time_minutes < 60) {
          avgResponseTimeDisplay = `${item.avg_response_time_minutes} Minutes`;
        } else if (item.avg_response_time_hours && parseFloat(item.avg_response_time_hours) >= 24) {
          avgResponseTimeDisplay = `${item.avg_response_time_days || Math.floor(parseFloat(item.avg_response_time_hours) / 24)} Days`;
        } else {
          avgResponseTimeDisplay = `${parseFloat(item.avg_response_time_hours || '0').toFixed(1)} Hours`;
        }

        return {
          incident_type: item.incident_type,
          incident_count: item.incident_count,
          avg_response_time_display: avgResponseTimeDisplay,
          avg_response_time_minutes: item.avg_response_time_minutes,
          avg_response_time_hours: parseFloat(item.avg_response_time_hours || '0').toFixed(2),
          avg_response_time_days: item.avg_response_time_days || 0,
          min_response_time_minutes: item.min_response_time_minutes,
          max_response_time_minutes: item.max_response_time_minutes,
          avg_resolution_time_minutes: item.avg_resolution_time_minutes || 'N/A',
          avg_resolution_time_hours: item.avg_resolution_time_minutes 
            ? (item.avg_resolution_time_minutes / 60).toFixed(2) 
            : 'N/A'
        };
      });

      const columns: ExportColumn[] = [
        { key: 'incident_type', label: 'Incident Type' },
        { key: 'incident_count', label: 'Incident Count' },
        { key: 'avg_response_time_display', label: 'Avg Response Time' },
        { key: 'avg_response_time_minutes', label: 'Avg Response Time (Minutes)' },
        { key: 'avg_response_time_hours', label: 'Avg Response Time (Hours)' },
   
      ];

      // Capture the response time chart
      const chartImages = await captureChartImages([
        { ref: responseTimeChartRef, title: `Response Time per Incident Type - Last ${responseTimeLimit} ${responseTimePeriod}` }
      ]);

      setExportData(formattedData);
      setExportColumns(columns);
      setExportTitle(`Response Time per Incident Type - Last ${responseTimeLimit} ${responseTimePeriod}`);
      setExportChartImages(chartImages);
      setShowExportModal(true);
    }
  };

  const exportRecentActivity = () => {
    setShowExportDropdown(false);
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

  const exportAllData = async () => {
    setShowExportDropdown(false);
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

    // Add welfare data
    if (welfareStats) {
      allData.push({
        section: 'Welfare Distribution',
        metric: 'Safe',
        value: welfareStats.safeReports,
        details: 'Welfare check - Safe reports'
      });
      allData.push({
        section: 'Welfare Distribution',
        metric: 'Needs Help',
        value: welfareStats.needsHelpReports,
        details: 'Welfare check - Needs Help reports'
      });
      allData.push({
        section: 'Welfare Distribution',
        metric: 'Not Submitted',
        value: welfareStats.notSubmitted,
        details: 'Welfare check - Not submitted'
      });
    }

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

    // Add response time data (average by type)
    responseTimeData.forEach(item => {
      let responseTimeDisplay = '';
      if (item.avg_response_time_minutes < 60) {
        responseTimeDisplay = `${item.avg_response_time_minutes} Minutes`;
      } else if (item.avg_response_time_hours && parseFloat(item.avg_response_time_hours) >= 24) {
        responseTimeDisplay = `${item.avg_response_time_days || Math.floor(parseFloat(item.avg_response_time_hours) / 24)} Days`;
      } else {
        responseTimeDisplay = `${parseFloat(item.avg_response_time_hours || '0').toFixed(1)} Hours`;
      }
      
      allData.push({
        section: 'Response Time Analysis (Average by Type)',
        metric: `${item.incident_type} - Avg Response Time`,
        value: responseTimeDisplay,
        details: `Based on ${item.incident_count} incidents. Min: ${item.min_response_time_minutes} min, Max: ${item.max_response_time_minutes} min`
      });
    });

    // Add individual response time data
    individualResponseTimeData.forEach(item => {
      let responseTimeDisplay = '';
      if (item.response_time_minutes < 60) {
        responseTimeDisplay = `${item.response_time_minutes} Minutes`;
      } else if (item.response_time_hours >= 24) {
        responseTimeDisplay = `${item.response_time_days || Math.floor(item.response_time_hours / 24)} Days`;
      } else {
        responseTimeDisplay = `${item.response_time_hours.toFixed(1)} Hours`;
      }
      
      allData.push({
        section: 'Response Time Analysis (Individual Reports)',
        metric: `Incident #${item.incident_id} - ${item.incident_type}`,
        value: responseTimeDisplay,
        details: `Status: ${item.status}, Reported: ${new Date(item.date_reported).toLocaleString()}`
      });
    });

    const columns: ExportColumn[] = [
      { key: 'section', label: 'Data Section' },
      { key: 'metric', label: 'Metric/Type' },
      { key: 'value', label: 'Value' },
      { key: 'details', label: 'Details' }
    ];

    // Capture all chart images for comprehensive export
    const chartImages = await captureChartImages([
      { ref: incidentTypesChartRef, title: 'Most Common Incident Types' },
      ...(hasActiveWelfare ? [{ ref: welfareChartRef, title: 'Welfare Status Overview' }] : []),
      { ref: trendsChartRef, title: 'Incident Trends Analysis' },
      { ref: peakHoursChartRef, title: `Peak Hours Analysis - Incident Distribution by Time` },
      { ref: locationChartRef, title: 'Risky Areas by Barangay' },
      { ref: responseTimeChartRef, title: 'Response Time per Incident Type' }
    ]);

    setExportData(allData);
    setExportColumns(columns);
    setExportTitle('Complete Dashboard Data Export');
    setExportChartImages(chartImages);
    setShowExportModal(true);
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats, overview, and analytics data with date filters (year required, month/day optional)
      const monthParam = selectedMonth > 0 ? selectedMonth : undefined;
      const dayParam = selectedDay > 0 ? selectedDay : undefined;
      
      const [statsResponse, overviewResponse, analyticsResponse] = await Promise.all([
        adminDashboardApi.getStats(selectedYear, monthParam, dayParam),
        adminDashboardApi.getOverview(selectedYear, monthParam, dayParam),
        adminDashboardApi.getAnalytics(selectedYear, monthParam, dayParam)
      ]);

      // Note: Trends data is fetched automatically via useEffect when date filters change
      // No need to fetch here to avoid duplicate calls

      // Try to fetch location data, but don't fail if it doesn't work
      let locationResponse = null;
      try {
        locationResponse = await adminDashboardApi.getLocationIncidents(selectedYear, monthParam, dayParam);
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
          // Calculate percentage change for incidents and users
          const incidentsTrendData = statsResponse.trends.incidents;
          const usersTrendData = statsResponse.trends.users;

          // Determine comparison type based on date filters
          let comparisonType = 'period';
          let comparisonLabel = 'from previous day';
          
          if (selectedDay > 0 && selectedMonth > 0) {
            // Day to day comparison
            comparisonType = 'day';
            comparisonLabel = 'from yesterday';
          } else if (selectedMonth > 0) {
            // Month to month comparison
            comparisonType = 'month';
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
            const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
            comparisonLabel = `from ${monthNames[prevMonth - 1]} ${prevYear}`;
          } else if (selectedYear) {
            // Year to year comparison
            comparisonType = 'year';
            comparisonLabel = `from ${selectedYear - 1}`;
          }

          if (incidentsTrendData && incidentsTrendData.length >= 2) {
            let latest: number;
            let previous: number;
            
            if (comparisonType === 'year') {
              // For year-to-year: sum all incidents in current year vs previous year
              // Since we're filtering by year, we need to compare totals
              // The trends data contains daily data for the selected year
              // We'll compare the last data point vs the second-to-last as a proxy
              // (Note: For true year-to-year, we'd need to fetch previous year's data)
              latest = incidentsTrendData[incidentsTrendData.length - 1].count;
              previous = incidentsTrendData[incidentsTrendData.length - 2].count;
            } else if (comparisonType === 'month') {
              // For month-to-month: compare last day of current month vs last day of previous month
              // Since trends data is daily, we can use the last data point
              latest = incidentsTrendData[incidentsTrendData.length - 1].count;
              previous = incidentsTrendData.length >= 2 ? incidentsTrendData[incidentsTrendData.length - 2].count : 0;
            } else {
              // For day-to-day or period: compare last two data points
              latest = incidentsTrendData[incidentsTrendData.length - 1].count;
              previous = incidentsTrendData[incidentsTrendData.length - 2].count;
            }
            
            const change = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
            setIncidentTrend(`${change >= 0 ? '+' : ''}${change.toFixed(1)}% ${comparisonLabel}`);
          } else {
            setIncidentTrend(null);
          }

          if (usersTrendData && usersTrendData.length >= 2) {
            let latest: number;
            let previous: number;
            
            if (comparisonType === 'year') {
              latest = usersTrendData[usersTrendData.length - 1].count;
              previous = usersTrendData[usersTrendData.length - 2].count;
            } else if (comparisonType === 'month') {
              latest = usersTrendData[usersTrendData.length - 1].count;
              previous = usersTrendData.length >= 2 ? usersTrendData[usersTrendData.length - 2].count : 0;
            } else {
              latest = usersTrendData[usersTrendData.length - 1].count;
              previous = usersTrendData[usersTrendData.length - 2].count;
            }
            
            const change = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
            setUserTrend(`${change >= 0 ? '+' : ''}${change.toFixed(1)}% ${comparisonLabel}`);
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
        // Note: monthlyIncidents is now managed by the trends useEffect, don't overwrite it here
        // setMonthlyIncidents(analyticsResponse.analytics.monthlyIncidents || []);
        
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

      // Try to fetch welfare stats, but don't fail if it doesn't work
      try {
        const welfareParams = new URLSearchParams();
        if (selectedYear) welfareParams.append('year', selectedYear.toString());
        if (monthParam) welfareParams.append('month', monthParam.toString());
        if (dayParam) welfareParams.append('day', dayParam.toString());
        const welfareUrl = welfareParams.toString() ? `/admin/welfare/stats?${welfareParams.toString()}` : '/admin/welfare/stats';
        const welfareResponse = await apiRequest(welfareUrl);
        console.log('Welfare response:', welfareResponse);
        
        if (welfareResponse.success && welfareResponse.stats) {
          // Check if there are active welfare settings OR if there's any welfare data
          const hasActive = welfareResponse.stats.activeSettings > 0;
          const hasData = (welfareResponse.stats.safeReports || 0) + 
                         (welfareResponse.stats.needsHelpReports || 0) + 
                         (welfareResponse.stats.notSubmitted || 0) > 0;
          
          // Show welfare chart if there are active settings OR if there's data to display
          const shouldShowWelfare = hasActive || hasData;
          setHasActiveWelfare(shouldShowWelfare);
          
          if (shouldShowWelfare) {
            setWelfareStats({
              safeReports: welfareResponse.stats.safeReports || 0,
              needsHelpReports: welfareResponse.stats.needsHelpReports || 0,
              notSubmitted: welfareResponse.stats.notSubmitted || 0,
              uniqueUsers: welfareResponse.stats.uniqueUsers || 0
            });
            console.log('Welfare stats set:', {
              safeReports: welfareResponse.stats.safeReports || 0,
              needsHelpReports: welfareResponse.stats.needsHelpReports || 0,
              notSubmitted: welfareResponse.stats.notSubmitted || 0
            });
          } else {
            setWelfareStats(null);
            console.log('Welfare not shown - no active settings and no data');
          }
        } else {
          console.warn('Welfare response missing success or stats:', welfareResponse);
          setWelfareStats(null);
          setHasActiveWelfare(false);
        }
      } catch (error) {
        console.warn('Welfare stats endpoint not available, using fallback data:', error);
        setWelfareStats(null);
        setHasActiveWelfare(false);
      }

      // Try to fetch response time data, but don't fail if it doesn't work
      try {
        const responseTimeResponse = await adminDashboardApi.getResponseTimeByType(responseTimePeriod, responseTimeLimit, selectedYear, monthParam, dayParam);
        if (responseTimeResponse.success && responseTimeResponse.responseTimeData) {
          setResponseTimeData(responseTimeResponse.responseTimeData || []);
        }
      } catch (error) {
        console.warn('Response time endpoint not available, using fallback data:', error);
        setResponseTimeData([]);
      }

      // Try to fetch individual response time data
      try {
        const individualResponseTimeResponse = await adminDashboardApi.getResponseTimeIndividual(200, responseTimePeriod, responseTimeLimit, selectedYear, monthParam, dayParam);
        if (individualResponseTimeResponse.success && individualResponseTimeResponse.incidents) {
          setIndividualResponseTimeData(individualResponseTimeResponse.incidents || []);
        }
      } catch (error) {
        console.warn('Individual response time endpoint not available, using fallback data:', error);
        setIndividualResponseTimeData([]);
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
    isIncident?: boolean; // For incidents, decrease is good (green), increase is bad (red)
  }> = ({ title, value, icon, color, trend, isIncident = false }) => {
    // Parse trend to determine if it's positive or negative
    let trendColor = 'text-green-600';
    let trendIcon = 'ri-arrow-up-line';
    
    if (trend) {
      const isPositive = trend.startsWith('+');
      const isNegative = trend.startsWith('-');
      
      if (isIncident) {
        // For incidents: decrease (negative) = good (green), increase (positive) = bad (red)
        if (isNegative) {
          trendColor = 'text-green-600';
          trendIcon = 'ri-arrow-down-line';
        } else if (isPositive) {
          trendColor = 'text-red-600';
          trendIcon = 'ri-arrow-up-line';
        }
      } else {
        // For users: increase (positive) = good (green), decrease (negative) = bad (red)
        if (isPositive) {
          trendColor = 'text-green-600';
          trendIcon = 'ri-arrow-up-line';
        } else if (isNegative) {
          trendColor = 'text-red-600';
          trendIcon = 'ri-arrow-down-line';
        }
      }
    }
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value?.toLocaleString() || '0'}</p>
            {trend && (
              <p className={`text-sm ${trendColor} mt-1`}>
                <i className={`${trendIcon} mr-1`}></i>
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
  };

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
      </div>

      {/* Date Filters and Page Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap flex items-center">
              <i className="ri-calendar-2-line mr-2 text-blue-600"></i>
              Filter by Date:
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[100px]"
              >
                {getYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  setSelectedMonth(newMonth);
                  // Reset day to "All Days" when month changes
                  setSelectedDay(0);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
              >
                {getMonths().map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Day:</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                disabled={selectedMonth === 0}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 min-w-[100px]"
              >
                {getDays(selectedYear, selectedMonth).map(day => (
                  <option key={day} value={day}>
                    {day === 0 ? 'All Days' : day.toString()}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                const today = new Date();
                setSelectedYear(today.getFullYear());
                setSelectedMonth(today.getMonth() + 1);
                setSelectedDay(today.getDate());
              }}
              className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100 transition-colors border border-blue-200 flex items-center whitespace-nowrap"
            >
              <i className="ri-calendar-line mr-1.5"></i>
              Today
            </button>
          </div>

          {/* Page Header Actions */}
          <div className="flex items-center space-x-3">
            <div className="relative export-dropdown-container">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <i className="ri-download-line mr-2"></i>
                Export Data
                <i className={`ri-arrow-down-s-line ml-1 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`}></i>
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="py-1.5">
                    <button
                      onClick={exportAllData}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center transition-colors border-b border-gray-100"
                    >
                      <i className="ri-download-cloud-line mr-3 text-lg text-green-600"></i>
                      <span className="font-semibold">Export All Data</span>
                    </button>
                    <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                      Individual Exports
                    </div>
                    <button
                      onClick={exportDashboardStats}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors"
                    >
                      <i className="ri-bar-chart-line mr-3 text-lg text-blue-500"></i>
                      <span>Dashboard Statistics</span>
                    </button>
                    <button
                      onClick={exportIncidentTypes}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center transition-colors"
                    >
                      <i className="ri-pie-chart-line mr-3 text-lg text-red-500"></i>
                      <span>Incident Types</span>
                    </button>
                    <button
                      onClick={exportWelfareData}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center transition-colors"
                    >
                      <i className="ri-pie-chart-2-line mr-3 text-lg text-orange-500"></i>
                      <span>Welfare Distribution</span>
                    </button>
                    <button
                      onClick={exportTrendsData}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center transition-colors"
                    >
                      <i className="ri-line-chart-line mr-3 text-lg text-green-500"></i>
                      <span>Trends Data</span>
                    </button>
                    <button
                      onClick={exportPeakHoursData}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center transition-colors"
                    >
                      <i className="ri-time-line mr-3 text-lg text-yellow-500"></i>
                      <span>Peak Hours Analysis</span>
                    </button>
                    <button
                      onClick={exportLocationData}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center transition-colors"
                    >
                      <i className="ri-map-pin-line mr-3 text-lg text-purple-500"></i>
                      <span>Location Data</span>
                    </button>
                    <button
                      onClick={exportResponseTimeData}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center transition-colors"
                    >
                      <i className="ri-timer-line mr-3 text-lg text-indigo-500"></i>
                      <span>Response Time Analysis</span>
                    </button>
                  </div>
                </div>
              )}
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Incidents"
          value={stats.totalIncidents}
          icon="ri-error-warning-line"
          color="bg-red-500"
          trend={incidentTrend || undefined}
          isIncident={true}
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
      <div className={`grid grid-cols-1 ${hasActiveWelfare ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
        {/* Most Common Incident Types Chart */}
        <div ref={incidentTypesChartRef}>
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
        </div>

        {/* Welfare Chart - Only show if there's an active welfare setting */}
        {hasActiveWelfare && welfareStats && (
          <div ref={welfareChartRef}>
            <PieChart
              data={[
                { name: 'Safe', count: welfareStats.safeReports },
                { name: 'Needs Help', count: welfareStats.needsHelpReports },
                { name: 'Not Submitted', count: welfareStats.notSubmitted }
              ]}
              title="Welfare Status Overview"
              dataKey="count"
              nameKey="name"
              height={300}
              colors={{
                "Safe": "#10B981",
                "Needs Help": "#EF4444",
                "Not Submitted": "#6b7280"
              }}
            />
          </div>
        )}
      </div>

      {/* Monthly Trends Line Chart with Filter */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Incident Trends Analysis</h3>
           
          </div>
          {trendsLoading || (monthlyIncidents.length === 0 && !trendsLoading) ? (
            <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">
                  {trendsLoading ? 'Loading trends data...' : 'Loading chart data...'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Based on selected date filters
                </p>
              </div>
            </div>
          ) : monthlyIncidents.length > 0 ? (
            <div ref={trendsChartRef}>
              <LineChart
                data={monthlyIncidents.map(item => ({
                  date: item.period || item.month || 'Unknown',
                  count: item.total_incidents || 0
                }))}
                title="Incident Trends Analysis"
                color={(() => {
                  // Calculate trend: if incidents are increasing (bad), use red; if decreasing (good), use green
                  if (monthlyIncidents.length >= 2) {
                    const firstCount = monthlyIncidents[0].total_incidents || 0;
                    const lastCount = monthlyIncidents[monthlyIncidents.length - 1].total_incidents || 0;
                    // If trending up (increasing), it's bad - use red
                    // If trending down (decreasing), it's good - use green
                    return lastCount > firstCount ? '#EF4444' : '#10B981';
                  }
                  // Default to green if not enough data points
                  return '#10B981';
                })()}
                height={350}
                legendLabel="Total Incidents"
                isIncident={true}
              />
            </div>
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
        <div ref={peakHoursChartRef}>
          <BarChart
            data={formatPeakHoursData(peakHoursData)}
            title={`Peak Hours Analysis - Incident Distribution by Time (${peakHoursDateRange || 'Last 30 Days'})`}
            dataKey="count"
            color="#f59e0b"
            height={350}
          />
        </div>
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
            <div ref={locationChartRef}>
              <StackedBarChart
                data={locationIncidents.length > 0 ? locationIncidents : []}
                title="Risky Areas by Barangay"
                stackKeys={allKeys}
                colors={colors}
                height={400}
              />
            </div>
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

      {/* Response Time Chart */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Response Time Analysis</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowIndividualResponseTime(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !showIndividualResponseTime
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="ri-bar-chart-line mr-2"></i>
                By Type (Average)
              </button>
              <button
                onClick={() => setShowIndividualResponseTime(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showIndividualResponseTime
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="ri-file-list-line mr-2"></i>
                Individual Reports
              </button>
            </div>
          </div>
          {responseTimeLoading || (responseTimeData.length === 0 && individualResponseTimeData.length === 0 && !responseTimeLoading) ? (
            <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">
                  {responseTimeLoading ? 'Loading response time data...' : 'Loading chart data...'}
                </p>
              </div>
            </div>
          ) : !showIndividualResponseTime ? (
            // Average by Type Chart
            <div ref={responseTimeChartRef}>
              <BarChart
                data={responseTimeData.map(item => ({
                  name: item.incident_type,
                  count: item.display_value || parseFloat(item.avg_response_time_hours),
                  incident_count: item.incident_count,
                  avg_response_time_minutes: item.avg_response_time_minutes,
                  avg_response_time_hours: parseFloat(item.avg_response_time_hours),
                  avg_response_time_days: item.avg_response_time_days || 0,
                  display_unit: item.display_unit || 'hours'
                }))}
                title="Response Time per Incident Type"
                dataKey="count"
                color="#3b82f6"
                height={350}
              />
            </div>
          ) : (
            // Individual Reports Chart - Display in minutes
            <div ref={responseTimeChartRef}>
              <BarChart
                data={individualResponseTimeData.map((item, index) => {
                  // Format response time for tooltip based on actual result:
                  // - Minutes if < 60 minutes
                  // - Hours if >= 60 minutes but < 24 hours
                  // - Days if >= 24 hours
                  let responseTimeDisplay = '';
                  if (item.response_time_minutes < 60) {
                    responseTimeDisplay = `${item.response_time_minutes} Minutes`;
                  } else if (item.response_time_hours >= 24) {
                    const days = item.response_time_days || Math.floor(item.response_time_hours / 24);
                    responseTimeDisplay = `${days} ${days === 1 ? 'Day' : 'Days'}`;
                  } else {
                    responseTimeDisplay = `${item.response_time_hours.toFixed(1)} ${item.response_time_hours === 1 ? 'Hour' : 'Hours'}`;
                  }
                  
                  return {
                    name: `#${item.incident_id} ${item.incident_type}`,
                    count: item.response_time_minutes,
                    incident_id: item.incident_id,
                    incident_type: item.incident_type,
                    response_time_minutes: item.response_time_minutes,
                    response_time_hours: item.response_time_hours,
                    response_time_days: item.response_time_days || 0,
                    response_time_display: responseTimeDisplay,
                    display_unit: item.response_time_minutes < 60 ? 'minutes' : (item.response_time_hours >= 24 ? 'days' : 'hours'),
                    date_reported: item.date_reported,
                    status: item.status
                  };
                })}
                title={`Response Time per Individual Incident (Minutes) - Last ${responseTimeLimit} ${responseTimePeriod}`}
                dataKey="count"
                color="#10b981"
                height={350}
              />
            </div>
          )}
          
          {responseTimeData.length === 0 && individualResponseTimeData.length === 0 && !responseTimeLoading && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="ri-information-line text-indigo-500 text-lg mr-3"></i>
                <div>
                  <h4 className="text-indigo-800 font-medium">Response Time Analysis</h4>
                  <p className="text-indigo-600 text-sm mt-1">
                    {!showIndividualResponseTime 
                      ? "This chart shows the average response time (in hours) for each incident type. Response time is calculated as the time from when an incident is reported to when it is first responded to (status changes from 'pending'). Only incidents that have been responded to in the last 12 months are included."
                      : "This chart shows the response time for each individual incident report in minutes. Each bar represents one incident with its actual response time. Response time is calculated as the time from when an incident is reported to when it is first responded to. Only incidents that have been responded to in the last 12 months are included."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
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
              title: exportTitle,
              hideTotalRecords: true
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
              title: exportTitle,
              hideTotalRecords: true
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
              title: exportTitle,
              chartImages: exportChartImages,
              orientation: exportOrientation,
              hideTotalRecords: true
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
