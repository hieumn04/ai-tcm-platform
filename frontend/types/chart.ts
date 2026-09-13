import { ApexOptions } from 'apexcharts';

export type ChartDataType = {
  series: ApexOptions['series'];
  options: ApexOptions;
};

export type TimeUnit = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface TimeBasedChartProps {
  projectId: string;
  accessToken: string;
  email: string;
  title?: string;
}

export type CaseTypeCountType = {
  type: number;
  count: number;
};

export type CasePriorityCountType = {
  priority: number;
  count: number;
};

export type FolderCaseCount = {
  folderId: number;
  folderName: string;
  caseCount: number;
};
