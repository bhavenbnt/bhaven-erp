import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { notifyCustomerApproved } from '@/lib/notify';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { id } = await params;

    const { data, error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'CONFIRMED' })
      .eq('reservation_id', id)
      .eq('status', 'PENDING')
      .select('reservation_id, user_id, scheduled_date')
      .single();

    if (updateError || !data) {
      return Response.json(
        { error: '예약을 찾을 수 없거나 승인할 수 없는 상태입니다.' },
        { status: 404 }
      );
    }

    await supabase.from('reservation_status_logs').insert({
      reservation_id: id,
      changed_by: user.user_id,
      old_status: 'PENDING',
      new_status: 'CONFIRMED',
    });

    // 고객에게 승인 알림
    await notifyCustomerApproved(data.user_id, data.reservation_id, data.scheduled_date);

    return Response.json({ status: 'success', data: { reservation_id: id } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
