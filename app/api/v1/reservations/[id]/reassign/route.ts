import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { id } = await params;
    const { equipment_id, reason } = await req.json();

    if (!equipment_id || !reason) {
      return Response.json({ error: 'equipment_id와 reason이 필요합니다.' }, { status: 400 });
    }

    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('equipment_id')
      .eq('equipment_id', equipment_id)
      .single();

    if (equipError || !equipment) {
      return Response.json({ error: '설비를 찾을 수 없습니다.' }, { status: 404 });
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
      return Response.json({ error: '재배정할 수 없는 상태입니다.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ equipment_id })
      .eq('reservation_id', id);

    if (updateError) throw updateError;

    await supabase.from('reservation_status_logs').insert({
      reservation_id: id,
      changed_by: user.user_id,
      old_status: current.status,
      new_status: current.status,
      reason: `[수동 배정] ${reason}`,
    });

    return Response.json({ status: 'success', data: { reservation_id: id } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
