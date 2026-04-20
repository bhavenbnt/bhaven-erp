import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if ('error' in authResult) return authResult.error;

    const searchParams = req.nextUrl.searchParams;
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const min_kg = parseFloat(searchParams.get('min_kg') || '0');

    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date와 end_date가 필요합니다.' }, { status: 400 });
    }

    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('equipment_id, name, type, min_capacity, max_capacity, divisions, status')
      .neq('status', 'BROKEN');

    if (equipError) throw equipError;

    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('equipment_id, kg_amount, scheduled_date')
      .neq('status', 'CANCELLED')
      .gte('scheduled_date', start_date)
      .lte('scheduled_date', end_date);

    if (resError) throw resError;

    // 날짜별 + 기기별 사용량 맵
    const usageByDate: Record<string, Record<number, number>> = {};
    for (const res of reservations ?? []) {
      const d = res.scheduled_date;
      if (!usageByDate[d]) usageByDate[d] = {};
      usageByDate[d][res.equipment_id] = (usageByDate[d][res.equipment_id] ?? 0) + (res.kg_amount ?? 0);
    }

    // 단일 날짜 요청 (기존 호환) vs 범위 요청
    if (start_date === end_date) {
      const dateUsage = usageByDate[start_date] || {};
      const slots = (equipment ?? [])
        .map((eq) => {
          const used = dateUsage[eq.equipment_id] ?? 0;
          const available_capacity = eq.status === 'MAINTENANCE' ? 0 : eq.max_capacity - used;
          return { ...eq, used_capacity: used, available_capacity };
        })
        .filter((eq) => eq.available_capacity > 0)
        .filter((eq) => min_kg <= 0 || eq.available_capacity >= min_kg);
      return Response.json({ status: 'success', data: slots });
    }

    // 범위 요청: 날짜별 가용 기기 수 반환
    const dates: string[] = [];
    const cur = new Date(start_date + 'T00:00:00');
    const endD = new Date(end_date + 'T00:00:00');
    while (cur <= endD) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    const byDate: Record<string, { available: number; total: number }> = {};
    for (const d of dates) {
      const dateUsage = usageByDate[d] || {};
      let available = 0;
      let total = 0;
      for (const eq of equipment ?? []) {
        if (eq.status === 'MAINTENANCE') continue;
        const used = dateUsage[eq.equipment_id] ?? 0;
        const remaining = eq.max_capacity - used;
        if (min_kg > 0 && eq.max_capacity < min_kg) continue; // 기기 최대용량이 요청보다 작으면 제외
        total++;
        if (remaining > 0 && (min_kg <= 0 || remaining >= min_kg)) available++;
      }
      byDate[d] = { available, total };
    }

    return Response.json({ status: 'success', data: byDate });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
