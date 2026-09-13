export type RoleType = 'app' | 'backend' | 'frontend';
export type StatusType = 'passed' | 'failed' | 'pending';

export interface DevStatus {
  id?: string;
  caseId?: number;
  role: RoleType;
  status: StatusType;
  createdAt?: string; // ISO date string
  createdBy?: string;
  updatedBy?: string;
}
