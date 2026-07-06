export const TargetStatus = {
  IN_SYNC: 'in_sync',
  PENDING: 'pending',
  ERROR: 'error',
  REGISTERED: 'registered',
  UNKNOWN: 'unknown',
};

export type TargetStatus = (typeof TargetStatus)[keyof typeof TargetStatus];

export const TargetStatusColors: Record<TargetStatus, string> = {
  in_sync: '#2ee6a0',
  pending: '#f4c543',
  error: '#ef5e5e',
  registered: '#33b8dc',
  unknown: '#9aa6b2',
};

export interface Target {
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  lastModifiedAt: number;
  name: string;
  description: string;
  controllerId: string;
  updateStatus: TargetStatus;
  status?: string;
  securityToken: string;
  requestAttributes: boolean;

  // Optional fields that aren't in your actual data
  lastControllerRequestAt?: number;
  installedAt?: number;
  ipAddress?: string;
  address?: string;
  pollStatus?: {
    lastRequestAt: number;
    nextExpectedRequestAt: number;
    overdue: boolean;
  };
  targetType?: number;
  targetTypeName?: string;
  autoConfirmActive?: boolean;
  ota?: {
    product?: string;
    os?: string;
    servicePack?: string;
    backend?: string;
    dashboard?: string;
    webui?: string;
    watchdog?: string;
    pilot?: string;
    kernel?: string;
    hwrev?: string;
    abSlot?: string;
    stm32?: string;
    pic?: string;
    pcb?: string;
    attributes?: Record<string, string>;
    installedDistribution?: string;
    assignedDistribution?: string;
  };
}

export function isTargetStatus(value: any): value is TargetStatus {
  return typeof value === 'string' && Object.values(TargetStatus).includes(value);
}

export function isTarget(obj: any): obj is Target {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return (
    typeof obj.createdBy === 'string' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.lastModifiedBy === 'string' &&
    typeof obj.lastModifiedAt === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.controllerId === 'string' &&
    isTargetStatus(obj.updateStatus) &&
    typeof obj.securityToken === 'string' &&
    typeof obj.requestAttributes === 'boolean' &&
    (obj.status === undefined || typeof obj.status === 'string') &&
    (obj.lastControllerRequestAt === undefined || typeof obj.lastControllerRequestAt === 'number') &&
    (obj.installedAt === undefined || typeof obj.installedAt === 'number') &&
    (obj.ipAddress === undefined || typeof obj.ipAddress === 'string') &&
    (obj.address === undefined || typeof obj.address === 'string') &&
    (obj.pollStatus === undefined ||
      (typeof obj.pollStatus === 'object' &&
        obj.pollStatus !== null &&
        typeof obj.pollStatus.lastRequestAt === 'number' &&
        typeof obj.pollStatus.nextExpectedRequestAt === 'number' &&
        typeof obj.pollStatus.overdue === 'boolean')) &&
    (obj.targetType === undefined || typeof obj.targetType === 'number') &&
    (obj.targetTypeName === undefined || typeof obj.targetTypeName === 'string') &&
    (obj.autoConfirmActive === undefined || typeof obj.autoConfirmActive === 'boolean')
  );
}

export function isTargetRecord(value: unknown): value is Record<string, Target> {
  if (typeof value !== 'object' || value === null) return false;

  return Object.entries(value).every(([key, val]) => typeof key === 'string' && isTarget(val));
}
