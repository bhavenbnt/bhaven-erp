import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// 분할 배정 시뮬레이션: 주어진 kg를 가용 기기들에 분배할 수 있는지 판단
function canAssign(requestKg: number, availableEquipment: { max_capacity: number; remaining: number }[]): boolean {
  if (requestKg <= 0) return true;
  if (availableEquipment.length === 0) return false;

  // 잔여 용량 내림차순 정렬 (큰 기기부터 채움)
  const sorted = [...availableEquipment]
    .filter(eq => eq.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  let remaining = requestKg;
  for (const eq of sorted) {
    if (remaining <= 0) break;
    const fill = Math.min(remaining, eq.remaining);
    remaining -= fill;
  }

  return remaining <= 0;
}

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

    const usageByDate: Record<string, Record<number, number>> = {};
    for (const res of reservations ?? []) {
      const d = res.scheduled_date;
      if (!usageByDate[d]) usageByDate[d] = {};
      usageByDate[d][res.equipment_id] = (usageByDate[d][res.equipment_id] ?? 0) + (res.kg_amount ?? 0);
    }

    // 단일 날짜 요청 (기존 호환)
    if (start_date === end_date) {
      const dateUsage = usageByDate[start_date] || {};
      const slots = (equipment ?? [])
        .map((eq) => {
          const used = dateUsage[eq.equipment_id] ?? 0;
          const available_capacity = eq.status === 'MAINTENANCE' ? 0 : eq.max_capacity - used;
          return { ...eq, used_capacity: used, available_capacity };
        })
        .filter((eq) => eq.available_capacity > 0);
      return Response.json({ status: 'success', data: slots });
    }

    // 범위 요청: 날짜별 가용 판단
    const dates: string[] = [];
    const cur = new Date(start_date + 'T00:00:00');
    const endD = new Date(end_date + 'T00:00:00');
    while (cur <= endD) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    const byDate: Record<string, { available: number; total: number; canFit?: boolean }> = {};
    for (const d of dates) {
      const dateUsage = usageByDate[d] || {};

      // 각 기기의 잔여 용량 계산
      const eqList = (equipment ?? [])
        .filter(eq => eq.status !== 'MAINTENANCE')
        .map(eq => ({
          max_capacity: eq.max_capacity,
          remaining: eq.max_capacity - (dateUsage[eq.equipment_id] ?? 0),
        }));

      const totalEquip = eqList.length;
      const availableEquip = eqList.filter(eq => eq.remaining > 0).length;

      if (min_kg > 0) {
        // 분할 배정 시뮬레이션: 요청 kg를 분배할 수 있는지
        const canFit = canAssign(min_kg, eqList);
        byDate[d] = { available: canFit ? availableEquip : 0, total: totalEquip, canFit };
      } else {
        byDate[d] = { available: availableEquip, total: totalEquip };
      }
    }

    return Response.json({ status: 'success', data: byDate });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
