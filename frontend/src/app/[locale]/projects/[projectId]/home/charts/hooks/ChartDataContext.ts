import { createContext, useContext } from 'react';
import { ChartData } from './useChartHooks';

export type ChartContextType = {
  chartData: ChartData | null;
  loading: boolean;
  error: string | null;
  dateRange: { start: string; end: string };
  setDateRange: (dateRange: { start: string; end: string }) => void;
  filterDataByDateRange: (start: string, end: string) => Promise<void>;
  resetData: () => Promise<void>;
};

// Create a context with a default value
export const ChartDataContext = createContext<ChartContextType>({
  chartData: null,
  loading: true,
  error: null,
  dateRange: { start: '', end: '' },
  setDateRange: () => {},
  filterDataByDateRange: async () => {},
  resetData: async () => {},
});

// Custom hook to use the chart context
export const useChartContext = () => useContext(ChartDataContext);
