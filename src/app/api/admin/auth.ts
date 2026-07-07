import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/utils/permissions';

export async function requireAdmin(request: NextRequest) {
  const token = await getToken({ req: request });
  const permissions = Array.isArray(token?.permissions) ? token.permissions : [];

  if (!token || !hasPermission(permissions, 'ROLE_TENANT_ADMIN')) {
    return {
      token: null,
      response: NextResponse.json({ message: 'Admin permission required' }, { status: token ? 403 : 401 }),
    };
  }

  return { token, response: null };
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  return NextResponse.json({ message }, { status: 400 });
}
