import { NextRequest, NextResponse } from 'next/server';
import { deleteGuiUser, updateGuiUser } from '@/lib/admin-users';
import { isGuiRole } from '@/utils/gui-roles';
import { apiError, requireAdmin } from '../../auth';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { token, response } = await requireAdmin(request);
  if (response) return response;

  try {
    const body = await request.json();
    const role = body.role === undefined ? undefined : String(body.role);

    if (role !== undefined && !isGuiRole(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    const user = await updateGuiUser({
      id: (await context.params).id,
      username: body.username === undefined ? undefined : String(body.username),
      password: body.password === undefined ? undefined : String(body.password),
      role,
      enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
      actor: typeof token?.username === 'string' ? token.username : 'unknown',
    });

    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { token, response } = await requireAdmin(request);
  if (response) return response;

  try {
    await deleteGuiUser((await context.params).id, typeof token?.username === 'string' ? token.username : 'unknown');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
