import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'customer');
    if ('error' in result) return result.error;
    const { user } = result;

    const { id } = await params;

    const { data: current, error: fetchError } = await supabase
      .from('reservations')
      .select('status, user_id')
      .eq('reservation_id', id)
      .single();

    if (fetchError || !current) {
      return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (current.user_id !== user.user_id) {
      return Response.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      return Response.json({ error: '취소할 수 없는 상태입니다.' }, { status: 400 });
    }

    // 생산 3일 전까지만 취소 가능
    const { data: resDate } = await supabase
      .from('reservations')
      .select('scheduled_date')
      .eq('reservation_id', id)
      .single();

    if (resDate?.scheduled_date) {
      const scheduled = new Date(resDate.scheduled_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        return Response.json({ error: '생산 3일 전 이후에는 취소가 불가합니다. 관리자에게 문의하세요.' }, { status: 400 });
      }
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
      reason: '고객 직접 취소',
    });

    return Response.json({ status: 'success', data: { reservation_id: id } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
