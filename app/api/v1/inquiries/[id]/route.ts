import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;
    const { user } = result;

    const { id } = await params;

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('inquiry_id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: '문의를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.role !== 'admin' && data.user_id !== user.user_id) {
      return Response.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
