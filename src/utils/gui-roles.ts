export type GuiRole = 'admin' | 'operator' | 'approver' | 'viewer';

export const GUI_ROLE_OPTIONS: Array<{ value: GuiRole; label: string; description: string }> = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full GUI and hawkBit management access.',
  },
  {
    value: 'operator',
    label: 'Operator',
    description: 'Creates and handles rollouts, but cannot approve them.',
  },
  {
    value: 'approver',
    label: 'Approver',
    description: 'Approves rollouts, but cannot create or handle them.',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only fleet, rollout, and distribution access.',
  },
];

export const GUI_ROLE_LABELS: Record<GuiRole, string> = GUI_ROLE_OPTIONS.reduce(
  (acc, role) => ({
    ...acc,
    [role.value]: role.label,
  }),
  {} as Record<GuiRole, string>
);

export function permissionsForGuiRole(role: GuiRole) {
  switch (role) {
    case 'admin':
      return ['ROLE_TENANT_ADMIN'];
    case 'operator':
      return [
        'READ_TARGET',
        'CREATE_TARGET',
        'UPDATE_TARGET',
        'READ_TARGET_TYPE',
        'READ_DISTRIBUTION_SET',
        'READ_ROLLOUT',
        'CREATE_ROLLOUT',
        'UPDATE_ROLLOUT',
        'HANDLE_ROLLOUT',
      ];
    case 'approver':
      return ['READ_TARGET', 'READ_DISTRIBUTION_SET', 'READ_ROLLOUT', 'APPROVE_ROLLOUT'];
    case 'viewer':
      return ['READ_TARGET', 'READ_TARGET_TYPE', 'READ_DISTRIBUTION_SET', 'READ_ROLLOUT'];
  }
}

export function isGuiRole(value: string): value is GuiRole {
  return value === 'admin' || value === 'operator' || value === 'approver' || value === 'viewer';
}
