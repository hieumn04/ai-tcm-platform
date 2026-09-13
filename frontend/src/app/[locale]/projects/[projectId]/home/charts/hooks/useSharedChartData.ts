import { useState, useEffect, useCallback } from 'react';
import { ChartData } from './useChartHooks';
import Config from '@/config/config';

const apiServer = Config.apiServer;

// Cache for storing chart data by email
const chartDataCache: Record<
  string,
  {
    data: ChartData;
    timestamp: number;
  }
> = {};

// Expiration time for cache (15 minutes)
const CACHE_EXPIRATION_TIME = 15 * 60 * 1000;

export function useSharedChartData(accessToken: string, email: string) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [originalData, setOriginalData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [defaultDateRange, setDefaultDateRange] = useState({ start: '', end: '' });

  // Get data range from chart data
  const getDataDateRange = useCallback((data: ChartData) => {
    if (!data?.chartData?.labels?.length) return { start: '', end: '' };

    const sortedDates = [...data.chartData.labels].sort();
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    };
  }, []);

  // Fetch data from API
  const fetchChartData = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      let url = `${apiServer}/charts/user-cases?email=${encodeURIComponent(email)}`;
      
      // Add date range parameters if provided
      if (startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      
      // The API returns: { success: true, data: { chartData: {...} } }
      // We need to extract result.data.chartData
      const chartData = result.data?.chartData || { labels: [], datasets: [] };
      
      const wrappedData = { chartData };

      // Update cache only if this is the default data (no date range)
      if (!startDate && !endDate) {
        const now = Date.now();
        chartDataCache[email] = {
          data: wrappedData,
          timestamp: now,
        };
        setOriginalData(wrappedData);
        
        // Set default date range from data
        const range = getDataDateRange(wrappedData);
        setDefaultDateRange(range);
        setDateRange(range);
      }

      setChartData(wrappedData);
      return wrappedData;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [accessToken, email, getDataDateRange]);

  // Initial data fetch - use cached data or fetch from API
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if we have valid cached data
        const now = Date.now();
        const cachedItem = chartDataCache[email];

        if (cachedItem && now - cachedItem.timestamp < CACHE_EXPIRATION_TIME) {
          setOriginalData(cachedItem.data);
          setChartData(cachedItem.data);

          // Set default date range from data
          const range = getDataDateRange(cachedItem.data);
          setDefaultDateRange(range);
          setDateRange(range);

          setLoading(false);
          return;
        }

        // Fetch fresh data
        await fetchChartData();
      } catch (error) {
        // Error already handled in fetchChartData
      }
    };

    initializeData();
  }, [fetchChartData, email, getDataDateRange]);

  // Filter chart data by date range - now makes API call
  const filterDataByDateRange = useCallback(
    async (start: string, end: string) => {
      if (!start || !end) {
        setError('Please provide both start and end dates');
        return;
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (startDate > endDate) {
        setError('Start date cannot be after end date');
        return;
      }

      try {
        // Fetch data for the specific date range
        await fetchChartData(start, end);
        setDateRange({ start, end });
        setError(null);
      } catch (error) {
        console.error('Error filtering data by date range:', error);
      }
    },
    [fetchChartData]
  );

  // Reset to original data - fetches default range
  const resetData = useCallback(async () => {
    try {
      setDateRange(defaultDateRange);
      if (originalData) {
        setChartData(originalData);
      } else {
        // Refetch default data if not available
        await fetchChartData();
      }
      setError(null);
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  }, [originalData, defaultDateRange, fetchChartData]);

  return {
    chartData,
    loading,
    error,
    dateRange,
    setDateRange,
    defaultDateRange,
    filterDataByDateRange,
    resetData,
  };
}
