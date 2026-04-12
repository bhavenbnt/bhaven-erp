import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// PUT /api/v1/notifications/read — 전체 읽음 처리
export async function PUT(req: NextRequest) {
  const result = requireAuth(req);
  if ('error' in result) return result.error;
  const { user } = result;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.user_id)
    .eq('is_read', false);

  return Response.json({ status: 'success' });
}
