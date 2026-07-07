import { NextRequest, NextResponse } from 'next/server';
import { listAuditEvents } from '@/lib/admin-users';
import { requireAdmin } from '../auth';

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  return NextResponse.json({ events: await listAuditEvents(200) });
}
