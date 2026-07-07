import { NextRequest, NextResponse } from 'next/server';
import { createGuiUser, listGuiUsers } from '@/lib/admin-users';
import { isGuiRole } from '@/utils/gui-roles';
import { apiError, requireAdmin } from '../auth';

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  return NextResponse.json({ users: await listGuiUsers() });
}

export async function POST(request: NextRequest) {
  const { token, response } = await requireAdmin(request);
  if (response) return response;

  try {
    const body = await request.json();
    const role = String(body.role ?? '');

    if (!isGuiRole(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    const user = await createGuiUser({
      username: String(body.username ?? ''),
      password: String(body.password ?? ''),
      role,
      enabled: Boolean(body.enabled ?? true),
      actor: typeof token?.username === 'string' ? token.username : 'unknown',
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
