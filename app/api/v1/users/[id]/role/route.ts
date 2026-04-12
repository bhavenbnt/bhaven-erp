import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = requireAuth(req, 'admin');
  if ('error' in result) return result.error;

  const { id } = await params;
  const { role } = await req.json();

  // Only allow worker↔admin transitions
  if (!['admin', 'worker'].includes(role)) {
    return Response.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('user_id', id)
    .select('user_id, email, name, role')
    .single();

  if (error || !data) return Response.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  return Response.json({ status: 'success', data });
}
