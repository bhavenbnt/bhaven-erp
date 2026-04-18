import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { notifyAdminsNewReservation, notifyWorkersScheduleChange } from '@/lib/notify';

interface AssignResult {
  equipment_id: number;
  name: string;
  kg: number;
  isSmall?: boolean;
}

async function autoAssign(
  kg_amount: number,
  scheduled_date: string,
  product_type: string = 'extract'
): Promise<AssignResult[] | null> {
  // 상태가 NORMAL인 기기만 배정 대상 (MAINTENANCE/BROKEN 제외)
  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select('*')
    .eq('status', 'NORMAL')
    .order('max_capacity', { ascending: false });

  if (equipError || !equipment) return null;

  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('equipment_id, kg_amount')
    .neq('status', 'CANCELLED')
    .eq('scheduled_date', scheduled_date);

  if (resError) return null;

  const usageMap: Record<number, number> = {};
  for (const res of reservations ?? []) {
    usageMap[res.equipment_id] = (usageMap[res.equipment_id] ?? 0) + (res.kg_amount ?? 0);
  }

  // For small equipment, use slot-based capacity (4 slots × 3kg each)
  // Count actual reservations (not kg) to determine slot usage
  const { data: slotUsage } = await supabase
    .from('reservations')
    .select('equipment_id, slot_index')
    .neq('status', 'CANCELLED')
    .eq('scheduled_date', scheduled_date);

  const slotCountMap: Record<number, number[]> = {};
  for (const res of slotUsage ?? []) {
    if (res.slot_index != null) {
      if (!slotCountMap[res.equipment_id]) slotCountMap[res.equipment_id] = [];
      slotCountMap[res.equipment_id].push(res.slot_index);
    }
  }

  const available = equipment
    .map((eq) => {
      if (eq.type === 'small') {
        const usedSlots = slotCountMap[eq.equipment_id]?.length ?? 0;
        const freeSlots = 4 - usedSlots;
        return { ...eq, available: freeSlots * 3 };
      }
      return {
        ...eq,
        available: eq.max_capacity - (usageMap[eq.equipment_id] ?? 0),
      };
    })
    .filter((eq) => {
      if (eq.available < eq.min_capacity) return false;
      if (eq.type === 'small' && product_type === 'can') return false;
      return true;
    });

  // 데드존 처리: 21~24kg → 중형(20kg) + 소형(나머지) 강제 분할
  if (kg_amount >= 21 && kg_amount <= 24) {
    const medium = available.find((eq) => eq.type === 'medium' && eq.available >= 20);
    const remainder = kg_amount - 20;
    const small = available.find((eq) => eq.type === 'small' && eq.available >= remainder);
    if (medium && small) {
      return [
        { equipment_id: medium.equipment_id, name: medium.name, kg: 20 },
        { equipment_id: small.equipment_id, name: small.name, kg: remainder, isSmall: true },
      ];
    }
    // 중형+소형 분할 불가 시 일반 배정 로직으로 fallback
  }

  // 단일 기기로 처리 가능한 경우
  const single = available.find((eq) => eq.available >= kg_amount);
  if (single) {
    return [{ equipment_id: single.equipment_id, name: single.name, kg: kg_amount, isSmall: single.type === 'small' }];
  }

  // 여러 기기에 분산 배정 (대형→중형→소형 순)
  let remaining = kg_amount;
  const assignments: AssignResult[] = [];
  for (const eq of available) {
    if (remaining <= 0) break;
    const kg = Math.min(eq.available, remaining);
    assignments.push({ equipment_id: eq.equipment_id, name: eq.name, kg, isSmall: eq.type === 'small' });
    remaining -= kg;
  }

  if (remaining > 0) return null;
  return assignments;
}

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin', 'worker');
    if ('error' in result) return result.error;

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('reservations')
      .select('*, users!reservations_user_id_fkey(name, company_name), equipment(name, type), products(product_name)')
      .order('scheduled_date', { ascending: true });

    if (status) query = query.eq('status', status);
    if (date_from) query = query.gte('scheduled_date', date_from);
    if (date_to) query = query.lte('scheduled_date', date_to);

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    // Client-side search filter for joined fields (company_name, product_name)
    let filtered = data;
    if (search) {
      const term = search.toLowerCase();
      filtered = (data ?? []).filter((r: any) => {
        const companyName = r.users?.company_name?.toLowerCase() ?? '';
        const productName = r.products?.product_name?.toLowerCase() ?? '';
        return companyName.includes(term) || productName.includes(term);
      });
    }

    return Response.json({ status: 'success', data: filtered });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'customer');
    if ('error' in result) return result.error;
    const { user } = result;

    const { product_name, product_type, container_size, kg_amount, yield_rate, scheduled_date, notes } =
      await req.json();

    if (!product_name || !kg_amount || !scheduled_date) {
      return Response.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    // 휴무일 체크
    const { data: holiday } = await supabase
      .from('holidays')
      .select('holiday_id')
      .eq('holiday_date', scheduled_date)
      .single();

    if (holiday) {
      return Response.json({ error: '해당 날짜는 휴무일입니다. 다른 날짜를 선택해주세요.' }, { status: 400 });
    }

    // is_approved 체크
    const { data: userInfo } = await supabase
      .from('users')
      .select('is_approved')
      .eq('user_id', user.user_id)
      .single();

    if (!userInfo?.is_approved) {
      return Response.json({ error: '계정 승인 대기 중입니다. 관리자에게 문의해주세요.' }, { status: 403 });
    }

    const assignments = await autoAssign(kg_amount, scheduled_date, product_type);
    if (!assignments) {
      return Response.json(
        { error: '해당 날짜에 가용 가능한 설비가 없습니다.' },
        { status: 422 }
      );
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        product_name,
        product_type,
        container_size: container_size || '1L',
        kg_amount,
        yield_rate,
        user_id: user.user_id,
      })
      .select('product_id')
      .single();

    if (productError) throw productError;

    // For small equipment assignments, assign next available slot
    const { data: existingSlots } = await supabase
      .from('reservations')
      .select('equipment_id, slot_index')
      .neq('status', 'CANCELLED')
      .eq('scheduled_date', scheduled_date);

    const assignedSlotMap: Record<number, number[]> = {};
    for (const res of existingSlots ?? []) {
      if (res.slot_index != null) {
        if (!assignedSlotMap[res.equipment_id]) assignedSlotMap[res.equipment_id] = [];
        assignedSlotMap[res.equipment_id].push(res.slot_index);
      }
    }

    const getNextSlot = (equipmentId: number): number => {
      const used = assignedSlotMap[equipmentId] ?? [];
      for (let i = 1; i <= 4; i++) {
        if (!used.includes(i)) {
          // Reserve this slot so subsequent assignments to same equipment get different slots
          if (!assignedSlotMap[equipmentId]) assignedSlotMap[equipmentId] = [];
          assignedSlotMap[equipmentId].push(i);
          return i;
        }
      }
      return 1;
    };

    const reservationInserts = assignments.map((a) => ({
      user_id: user.user_id,
      product_id: product.product_id,
      equipment_id: a.equipment_id,
      kg_amount: a.kg,
      scheduled_date,
      notes,
      status: 'PENDING',
      slot_index: a.isSmall ? getNextSlot(a.equipment_id) : null,
    }));

    const { data: createdReservations, error: resError } = await supabase
      .from('reservations')
      .insert(reservationInserts)
      .select('reservation_id');

    if (resError) {
      // Clean up orphaned product
      await supabase.from('products').delete().eq('product_id', product.product_id);
      throw resError;
    }

    // 생성된 예약을 equipment 조인하여 다시 조회
    const reservationIds = createdReservations?.map((r) => r.reservation_id) ?? [];
    const { data: fullReservations } = await supabase
      .from('reservations')
      .select('reservation_id, kg_amount, equipment(name)')
      .in('reservation_id', reservationIds);

    const reservationsWithEquip = (fullReservations ?? []).map((r: any) => ({
      reservation_id: r.reservation_id,
      equipment_name: r.equipment?.name ?? '-',
      assigned_kg: r.kg_amount,
    }));

    // 관리자들에게 신규 예약 알림
    const { data: companyInfo } = await supabase
      .from('users')
      .select('company_name, name')
      .eq('user_id', user.user_id)
      .single();
    const company = (companyInfo as any)?.company_name || (companyInfo as any)?.name || '고객';
    if (createdReservations?.[0]) {
      await notifyAdminsNewReservation(createdReservations[0].reservation_id, company, scheduled_date);
      await notifyWorkersScheduleChange(
        `${company}님의 ${scheduled_date} 생산 예약이 새로 접수되었습니다.`,
        createdReservations[0].reservation_id
      );
    }

    return Response.json(
      {
        status: 'success',
        data: { reservation_ids: reservationIds, reservations: reservationsWithEquip },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
