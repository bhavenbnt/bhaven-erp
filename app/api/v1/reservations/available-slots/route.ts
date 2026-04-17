import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;

    const searchParams = req.nextUrl.searchParams;
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date와 end_date가 필요합니다.' }, { status: 400 });
    }

    // BROKEN 기기 제외, MAINTENANCE는 포함하되 고객에게 용량 0으로 마스킹
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('*')
      .neq('status', 'BROKEN');

    if (equipError) throw equipError;

    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('equipment_id, kg_amount')
      .neq('status', 'CANCELLED')
      .gte('scheduled_date', start_date)
      .lte('scheduled_date', end_date);

    if (resError) throw resError;

    const usageMap: Record<number, number> = {};
    for (const res of reservations ?? []) {
      usageMap[res.equipment_id] = (usageMap[res.equipment_id] ?? 0) + (res.kg_amount ?? 0);
    }

    const result = (equipment ?? [])
      .map((eq) => {
        const used_capacity = usageMap[eq.equipment_id] ?? 0;
        // MAINTENANCE 기기: 고객에게 예약이 찬 것처럼 마스킹 (available_capacity = 0)
        const available_capacity = eq.status === 'MAINTENANCE'
          ? 0
          : eq.max_capacity - used_capacity;
        return { ...eq, used_capacity, available_capacity };
      })
      .filter((eq) => eq.available_capacity > 0);

    return Response.json({ status: 'success', data: result });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
