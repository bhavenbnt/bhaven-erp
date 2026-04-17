import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/notifications — 내 알림 목록
export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;
    const { user } = result;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    const unread = (data ?? []).filter((n) => !n.is_read).length;
    return Response.json({ status: 'success', data, unread });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
