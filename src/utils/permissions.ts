export const TENANT_ADMIN_ROLE = 'ROLE_TENANT_ADMIN';

export function hasPermission(permissions: string[] | undefined, required: string | string[]) {
  const permissionList = permissions ?? [];
  if (permissionList.includes(TENANT_ADMIN_ROLE)) {
    return true;
  }

  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((permission) => permissionList.includes(permission));
}

export function primaryRoleLabel(permissions: string[] | undefined) {
  const permissionList = permissions ?? [];
  if (permissionList.includes(TENANT_ADMIN_ROLE)) {
    return 'Admin';
  }
  if (permissionList.includes('APPROVE_ROLLOUT')) {
    return 'Approver';
  }
  if (permissionList.includes('CREATE_ROLLOUT') || permissionList.includes('HANDLE_ROLLOUT')) {
    return 'Operator';
  }
  return 'Viewer';
}
