import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notify';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { data: caller } = await supabase.from('users').select('is_super').eq('user_id', user.user_id).single();
    if (!caller?.is_super) return Response.json({ error: '권한이 없습니다.' }, { status: 403 });

    const { id } = await params;

    const { data, error } = await supabase
      .from('users')
      .update({ is_approved: true })
      .eq('user_id', id)
      .select('user_id, email, name, company_name, is_approved')
      .single();

    if (error || !data) {
      return Response.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 해당 고객에게 인앱 알림 발송
    await createNotification({
      user_id: data.user_id,
      title: '계정 승인 완료',
      message: '계정이 승인되었습니다. 이제 예약 신청이 가능합니다.',
      noti_type: 'info',
    });

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
