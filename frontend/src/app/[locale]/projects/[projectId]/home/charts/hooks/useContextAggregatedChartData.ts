import { useState, useEffect, useCallback } from 'react';
import { ChartData } from './useChartHooks';
import { useChartContext } from './ChartDataContext';

export type TimeUnit = 'weekly' | 'monthly' | 'quarterly';

export function useContextAggregatedChartData(timeUnit: TimeUnit) {
  const {
    chartData: originalData,
    loading,
    error,
    dateRange,
    setDateRange,
    filterDataByDateRange: originalFilterByDateRange,
    resetData: originalResetData,
  } = useChartContext();

  const [aggregatedData, setAggregatedData] = useState<ChartData | null>(null);

  // Get quarter for a date
  const getQuarter = useCallback((date: Date): number => {
    return Math.floor(date.getMonth() / 3) + 1;
  }, []);

  // Get week label with week of month format
  const getWeekLabel = useCallback((date: Date): string => {
    // Get week of the month (1-5)
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7);

    // Get month abbreviation
    const monthAbbr = date.toLocaleString('default', { month: 'short' });

    return `Week ${weekOfMonth} / ${monthAbbr}`;
  }, []);

  // Get month label
  const getMonthLabel = useCallback((date: Date): string => {
    return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
  }, []);

  // Get quarter label
  const getQuarterLabel = useCallback(
    (date: Date): string => {
      const quarter = getQuarter(date);
      return `Q${quarter} ${date.getFullYear()}`;
    },
    [getQuarter]
  );

  // Sort period labels based on time unit
  const sortPeriodLabels = useCallback(
    (labels: string[]) => {
      return [...labels].sort((a, b) => {
        if (timeUnit === 'weekly') {
          // For the Week N/Month format
          const [weekPartA, monthPartA] = a.split(' / ');
          const [weekPartB, monthPartB] = b.split(' / ');

          // Extract the week numbers
          const weekNumberA = parseInt(weekPartA.replace('Week ', ''));
          const weekNumberB = parseInt(weekPartB.replace('Week ', ''));

          // Get the month index for comparison
          const monthIndexA = new Date(Date.parse(`1 ${monthPartA} ${new Date().getFullYear()}`)).getMonth();
          const monthIndexB = new Date(Date.parse(`1 ${monthPartB} ${new Date().getFullYear()}`)).getMonth();

          // Compare by month first, then by week number
          if (monthIndexA !== monthIndexB) {
            return monthIndexA - monthIndexB;
          }
          return weekNumberA - weekNumberB;
        }

        if (timeUnit === 'quarterly') {
          // Sort quarters by year and quarter number
          const [quarterA, yearA] = a.split(' ');
          const [quarterB, yearB] = b.split(' ');
          const yearDiff = Number(yearA) - Number(yearB);
          if (yearDiff !== 0) return yearDiff;
          return Number(quarterA.substring(1)) - Number(quarterB.substring(1));
        }

        // For monthly, use string comparison (will sort by year then month)
        return a.localeCompare(b);
      });
    },
    [timeUnit]
  );

  // Group data by specified time unit
  useEffect(() => {
    if (!originalData?.chartData) return;

    const { labels, datasets } = originalData.chartData;

    // Group data by time unit
    const groupedData: Record<string, { [datasetLabel: string]: number }> = {};

    labels.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      let periodKey: string;

      switch (timeUnit) {
        case 'weekly':
          periodKey = getWeekLabel(date);
          break;
        case 'monthly':
          periodKey = getMonthLabel(date);
          break;
        case 'quarterly':
          periodKey = getQuarterLabel(date);
          break;
      }

      // Initialize the group if it doesn't exist
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = {};
        datasets.forEach((ds) => {
          groupedData[periodKey][ds.label] = 0;
        });
      }

      // Add data for each dataset
      datasets.forEach((ds) => {
        groupedData[periodKey][ds.label] += ds.data[index];
      });
    });

    // Convert grouped data back to chart format
    const periodLabels = sortPeriodLabels(Object.keys(groupedData));

    // Create new datasets with grouped data
    const newDatasets = datasets.map((ds) => {
      return {
        label: ds.label,
        data: periodLabels.map((period) => groupedData[period][ds.label]),
      };
    });

    setAggregatedData({
      chartData: {
        labels: periodLabels,
        datasets: newDatasets,
      },
    });
  }, [originalData, timeUnit, getWeekLabel, getMonthLabel, getQuarterLabel, sortPeriodLabels]);

  // Pass through the filter and reset methods
  const filterDataByDateRange = originalFilterByDateRange;
  const resetData = originalResetData;

  return {
    chartData: aggregatedData,
    loading,
    error,
    dateRange,
    setDateRange,
    filterDataByDateRange,
    resetData,
  };
}
