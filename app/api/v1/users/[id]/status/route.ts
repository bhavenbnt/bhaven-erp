import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { id } = await params;
    const { is_active } = await req.json();

    if (typeof is_active !== 'boolean') {
      return Response.json({ error: 'is_active 값이 필요합니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('user_id', id)
      .select('user_id, email, name, is_active')
      .single();

    if (error || !data) {
      return Response.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
