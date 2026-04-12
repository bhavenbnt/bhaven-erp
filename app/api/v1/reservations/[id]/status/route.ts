import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notify';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'worker', 'admin');
    if ('error' in result) return result.error;

    const { id } = await params;
    const { status } = await req.json();

    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return Response.json(
        { error: "상태는 'IN_PROGRESS' 또는 'COMPLETED'만 가능합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('reservation_id', id)
      .select('reservation_id')
      .single();

    if (error || !data) {
      return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (status === 'IN_PROGRESS') {
      const { data: resInfo } = await supabase
        .from('reservations')
        .select('user_id, scheduled_date')
        .eq('reservation_id', id)
        .single();
      if (resInfo) {
        await createNotification({
          user_id: resInfo.user_id,
          title: '생산 시작',
          message: `${resInfo.scheduled_date} 예약 생산이 시작되었습니다.`,
          noti_type: 'info',
          reservation_id: parseInt(id),
        });
      }
    }

    return Response.json({ status: 'success', data: { reservation_id: id } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
