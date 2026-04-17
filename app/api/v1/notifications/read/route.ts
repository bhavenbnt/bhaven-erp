import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// PUT /api/v1/notifications/read — 전체 읽음 처리
export async function PUT(req: NextRequest) {
  const result = requireAuth(req);
  if ('error' in result) return result.error;
  const { user } = result;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.user_id)
    .eq('is_read', false);

  if (error) {
    console.error(error);
    return Response.json({ error: '알림 읽음 처리에 실패했습니다.' }, { status: 500 });
  }

  return Response.json({ status: 'success' });
}
