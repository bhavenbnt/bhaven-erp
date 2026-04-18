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
      .select('equipment_id, max_capacity')
      .eq('equipment_id', equipment_id)
      .single();

    if (equipError || !equipment) {
      return Response.json({ error: '설비를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: current, error: fetchError } = await supabase
      .from('reservations')
      .select('status, kg_amount, scheduled_date')
      .eq('reservation_id', id)
      .single();

    if (fetchError || !current) {
      return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      return Response.json({ error: '재배정할 수 없는 상태입니다.' }, { status: 400 });
    }

    // 용량 검증: 해당 기기의 같은 날짜 기존 예약 kg 합산 + 현재 예약 kg가 max_capacity 초과 시 거부
    const { data: existingReservations, error: existingError } = await supabase
      .from('reservations')
      .select('kg_amount')
      .eq('equipment_id', equipment_id)
      .eq('scheduled_date', current.scheduled_date)
      .neq('status', 'CANCELLED')
      .neq('reservation_id', id);

    if (existingError) throw existingError;

    const usedCapacity = (existingReservations ?? []).reduce(
      (sum: number, r: { kg_amount: number }) => sum + (r.kg_amount ?? 0),
      0
    );

    if (usedCapacity + (current.kg_amount ?? 0) > equipment.max_capacity) {
      return Response.json(
        { error: '해당 기기의 잔여 용량이 부족합니다.' },
        { status: 422 }
      );
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
