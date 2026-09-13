import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ChartOptions } from 'chart.js';
import Config from '@/config/config';

const apiServer = Config.apiServer;

export type ChartData = {
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
    }>;
  };
};

export type DateRange = {
  start: string;
  end: string;
};

// Custom hook for chart data fetching
export function useChartData(accessToken: string, email: string) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [originalData, setOriginalData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [defaultDateRange, setDefaultDateRange] = useState<DateRange>({ start: '', end: '' });

  // Get data range from chart data
  const getDataDateRange = useCallback((data: ChartData): DateRange => {
    if (!data?.chartData?.labels?.length) return { start: '', end: '' };

    const sortedDates = [...data.chartData.labels].sort();
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    };
  }, []);

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const url = `${apiServer}/charts/user-cases?email=${encodeURIComponent(email)}`;
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
        
        setOriginalData({ chartData });
        setChartData({ chartData });

        // Set default date range from data
        const range = getDataDateRange({ chartData });
        setDefaultDateRange(range);
        setDateRange(range);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [accessToken, email, getDataDateRange]);

  // Filter chart data by date range
  const filterDataByDateRange = useCallback(
    (start: string, end: string) => {
      if (!originalData || !start || !end) return;

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Filter the data
      const filteredLabels = originalData.chartData.labels.filter((label) => {
        const date = new Date(label);
        return date >= startDate && date <= endDate;
      });

      const labelIndices = filteredLabels.map((label) => originalData.chartData.labels.indexOf(label));

      const filteredDatasets = originalData.chartData.datasets.map((dataset) => ({
        ...dataset,
        data: labelIndices.map((index) => dataset.data[index]),
      }));

      setChartData({
        chartData: {
          labels: filteredLabels,
          datasets: filteredDatasets,
        },
      });
    },
    [originalData]
  );

  // Reset to original data
  const resetData = useCallback(() => {
    setDateRange(defaultDateRange);
    setChartData(originalData);
  }, [originalData, defaultDateRange]);

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

// Custom hook for chart options
export function useChartOptions(showGrid: boolean, showFill: boolean) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme-based colors
  const chartColors = useMemo(
    () => ({
      primary: '#0070F0',
      background: isDark ? 'rgba(0, 112, 240, 0.2)' : 'rgba(0, 112, 240, 0.1)',
      text: isDark ? '#fff' : '#000',
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      tooltip: {
        bg: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      },
    }),
    [isDark]
  );

  // Create chart options
  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          display: false,
          position: 'top',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 10 },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: chartColors.tooltip.bg,
          titleColor: chartColors.text,
          bodyColor: chartColors.text,
          borderColor: chartColors.tooltip.border,
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          caretSize: 6,
          callbacks: {
            label: (context) => `${context.dataset.label || ''}: ${context.parsed.y} cases`,
          },
        },
        title: { display: false },
      },
      scales: {
        x: {
          grid: {
            display: showGrid,
            color: chartColors.grid,
            drawTicks: false,
            tickLength: 8,
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: { size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            display: showGrid,
            color: chartColors.grid,
            drawTicks: false,
          },
          ticks: {
            precision: 0,
            callback: (value) => `${value} cases`,
            font: { size: 11 },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 2,
          borderJoinStyle: 'round',
          capBezierPoints: true,
        },
        point: {
          radius: 3,
          hoverRadius: 5,
          borderWidth: 2,
          hoverBorderWidth: 2,
          backgroundColor: isDark ? chartColors.text : chartColors.primary,
          hoverBackgroundColor: isDark ? chartColors.text : chartColors.primary,
        },
      },
      hover: {
        mode: 'nearest',
        intersect: false,
      },
      layout: {
        padding: { top: 10, right: 20, bottom: 10, left: 10 },
      },
    }),
    [showGrid, chartColors, isDark]
  );

  // Prepare dataset styling
  const getDatasetStyling = useCallback(
    (dataset: any) => ({
      ...dataset,
      borderColor: chartColors.primary,
      backgroundColor: showFill ? chartColors.background : 'transparent',
      tension: 0.4,
      fill: showFill,
      pointBackgroundColor: isDark ? chartColors.text : chartColors.primary,
    }),
    [chartColors, showFill, isDark]
  );

  return { options, chartColors, getDatasetStyling };
}
