import { CaseAutoStatus } from '@/src/enums/CaseAutoStatus';
import { UserType } from './user';
import { DevStatus, StatusType } from './devStatus';
import { RunCaseType } from './run';

type CaseType = {
  id: number;
  title: string;
  state: number;
  priority: number;
  type: number;
  automationStatus: number;
  description: string;
  template: number;
  preConditions: string;
  expectedResults: string;
  folderId: number;
  stepsDetail?: string;
  Steps?: StepType[];
  runCases?: RunCaseType[];
  isAuto?: CaseAutoStatus;
  useAI?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: UserType;
  devStatuses?: DevStatus[];
  statusLabel?: StatusType;
  customId?: string;
  complexity?: '1' | '2' | '3';
  platformEvidences?: PlatformEvidenceType[];
  aiAssessment?: any;
};

type CaseStepType = {
  createdAt?: Date;
  updatedAt?: Date;
  CaseId?: number;
  StepId?: number;
  stepNo: number;
};

type StepType = {
  id: number;
  step: string;
  result: string;
  createdAt: Date;
  updatedAt: Date;
  caseSteps: CaseStepType;
  uid: string;
  editState: 'notChanged' | 'changed' | 'new' | 'deleted';
};

type PlatformEvidenceType = {
  id: number;
  platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api';
  evidenceImageUrls: string[];
  evidenceDescription: string;
};

type CaseAttachmentType = {
  createdAt: Date;
  updatedAt: Date;
  caseId: number;
  attachmentId: number;
};

type AttachmentType = {
  id: number;
  title: string;
  detail: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  caseAttachments: CaseAttachmentType;
};

type CasesMessages = {
  testCaseList: string;
  id: string;
  title: string;
  priority: string;
  actions: string;
  deleteCase: string;
  close: string;
  areYouSure: string;
  delete: string;
  newTestCase: string;
  status: string;
  noCasesFound: string;
  caseTitle: string;
  caseDescription: string;
  create: string;
  createAt: string;
  updateAt: string;
  pleaseEnter: string;
  import: string;
  createdBy: string;
};

type CaseMessages = {
  backToCases: string;
  updating: string;
  update: string;
  updatedTestCase: string;
  basic: string;
  title: string;
  pleaseEnterTitle: string;
  description: string;
  testCaseDescription: string;
  priority: string;
  type: string;
  template: string;
  isAuto: string;
  testDetail: string;
  preconditions: string;
  expectedResult: string;
  step: string;
  text: string;
  steps: string;
  newStep: string;
  detailsOfTheStep: string;
  deleteThisStep: string;
  insertStep: string;
  attachments: string;
  delete: string;
  download: string;
  deleteFile: string;
  clickToUpload: string;
  orDragAndDrop: string;
  maxFileSize: string;
  areYouSureLeave: string;
  import: string;
  useAI: string;
  createdBy: string;
  complexity: string;
};

export type { CaseType, StepType, AttachmentType, CasesMessages, CaseMessages, PlatformEvidenceType };
