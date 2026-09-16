import { CaseType, PlatformEvidenceType } from './case';
import { DevStatus } from './devStatus';

type RunType = {
  id: number;
  name: string;
  configurations: number;
  description: string;
  state: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  runCases?: RunCaseType[];
};

type PlatformStatusType = {
  id: string;
  platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api';
};

type RunCaseStatusType = {
  id?: string; // UUID
  platformId?: string;
  runCaseId?: number;
  status: number;
  platformStatus: PlatformStatusType;
};

type RunCaseType = {
  id: number;
  runId: number;
  caseId: number;
  statuses: RunCaseStatusType[];
  editState: 'notChanged' | 'changed' | 'new' | 'deleted';
  createdAt: string;
  updatedAt: string;
  markedForDeletion?: boolean;
  aiAssessment?: any;
  case?: CaseType;
  Case: {
    id: number;
    title: string;
    priority: number;
    type: number;
    folderId: number;
    devStatuses: DevStatus[];
    platformEvidences: PlatformEvidenceType[];
    evidenceByPlatform: { [platform: string]: PlatformEvidenceType };
  };
};

type RunStatusCountType = {
  status: number;
  count: number;
};

type ProgressSeriesType = {
  name: string;
  data: number[];
};

type RunsMessages = {
  runList: string;
  run: string;
  newRun: string;
  editRun: string;
  deleteRun: string;
  duplicateRun: string;
  id: string;
  name: string;
  description: string;
  lastUpdate: string;
  actions: string;
  runName: string;
  runDescription: string;
  close: string;
  create: string;
  update: string;
  duplicate: string;
  pleaseEnter: string;
  noRunsFound: string;
  areYouSure: string;
  delete: string;
};

type RunMessages = {
  backToRuns: string;
  updating: string;
  update: string;
  updatedTestRun: string;
  progress: string;
  refresh: string;
  id: string;
  title: string;
  pleaseEnter: string;
  description: string;
  priority: string;
  status: string;
  appStatus: string;
  beStatus: string;
  autoStatus: string;
  actions: string;
  selectTestCase: string;
  testCaseSelection: string;
  includeInRun: string;
  excludeFromRun: string;
  noCasesFound: string;
  areYouSureLeave: string;
  type: string;
  testDetail: string;
  steps: string;
  preconditions: string;
  expectedResult: string;
  detailsOfTheStep: string;
  close: string;
  testingBadge?: string;
  liveCollaborativeTesting?: string;
};

export type {
  RunType,
  RunCaseType,
  RunStatusCountType,
  ProgressSeriesType,
  RunsMessages,
  RunMessages,
  RunCaseStatusType,
  PlatformStatusType,
};
