import { GuiRole } from '@/utils/gui-roles';

const roleAccounts: Record<GuiRole, { username: string; passwordEnv: string; fallback: string }> = {
  admin: { username: 'admin', passwordEnv: 'HAWKBIT_ADMIN_PASSWORD', fallback: 'str-admin-change-me' },
  operator: { username: 'operator', passwordEnv: 'HAWKBIT_OPERATOR_PASSWORD', fallback: 'operator-change-me' },
  approver: { username: 'approver', passwordEnv: 'HAWKBIT_APPROVER_PASSWORD', fallback: 'approver-change-me' },
  viewer: { username: 'viewer', passwordEnv: 'HAWKBIT_VIEWER_PASSWORD', fallback: 'viewer-change-me' },
};

export function getHawkbitAuthForRole(role: GuiRole) {
  const account = roleAccounts[role];
  const password = process.env[account.passwordEnv] ?? account.fallback;
  return Buffer.from(`${account.username}:${password}`).toString('base64');
}
