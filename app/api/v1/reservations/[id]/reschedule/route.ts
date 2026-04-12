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

    const { id } = await params;
    const { scheduled_date, equipment_id, reason, notify_kakao } = await req.json();

    if (!scheduled_date && !equipment_id) {
      return Response.json(
        { error: 'scheduled_date 또는 equipment_id 중 하나는 필요합니다.' },
        { status: 400 }
      );
    }

    const { data: current, error: fetchError } = await supabase
      .from('reservations')
      .select('status')
      .eq('reservation_id', id)
      .single();

    if (fetchError || !current) {
      return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      return Response.json({ error: '일정 변경할 수 없는 상태입니다.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (scheduled_date) updates.scheduled_date = scheduled_date;
    if (equipment_id) updates.equipment_id = equipment_id;

    await supabase.from('reservations').update(updates).eq('reservation_id', id);

    await supabase.from('reservation_status_logs').insert({
      reservation_id: id,
      changed_by: user.user_id,
      old_status: current.status,
      new_status: current.status,
      reason,
      notify_kakao: notify_kakao ?? false,
    });

    // 날짜 변경 시 고객 인앱 알림
    if (scheduled_date) {
      const { data: resInfo } = await supabase
        .from('reservations')
        .select('user_id')
        .eq('reservation_id', id)
        .single();
      if (resInfo) {
        await createNotification({
          user_id: resInfo.user_id,
          title: '생산 일정 변경',
          message: `생산 일정이 ${scheduled_date}으로 변경되었습니다.${reason ? ` 사유: ${reason}` : ''}`,
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
