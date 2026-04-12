import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { notifyCustomerCancelled, notifyWorkersScheduleChange } from '@/lib/notify';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { id } = await params;
    const { reason } = await req.json();

    const { data: current, error: fetchError } = await supabase
      .from('reservations')
      .select('status, user_id, scheduled_date')
      .eq('reservation_id', id)
      .single();

    if (fetchError || !current) {
      return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      return Response.json({ error: '취소할 수 없는 상태입니다.' }, { status: 400 });
    }

    await supabase
      .from('reservations')
      .update({ status: 'CANCELLED' })
      .eq('reservation_id', id);

    await supabase.from('reservation_status_logs').insert({
      reservation_id: id,
      changed_by: user.user_id,
      old_status: current.status,
      new_status: 'CANCELLED',
      reason,
    });

    // 고객에게 취소 알림
    await notifyCustomerCancelled(current.user_id, parseInt(id), current.scheduled_date, reason);
    // 작업자들에게 일정 변경 알림
    await notifyWorkersScheduleChange(`${current.scheduled_date} 예약이 취소되었습니다.`, parseInt(id));

    return Response.json({ status: 'success', data: { reservation_id: id } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
