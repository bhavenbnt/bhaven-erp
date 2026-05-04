import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// 자동 배정: 가용 기기 중 가장 여유 있는 기기에 배정
async function findBestEquipment(kg_amount: number, scheduled_date: string): Promise<number | null> {
  const { data: equipment } = await supabase
    .from('equipment')
    .select('equipment_id, max_capacity, status')
    .eq('status', 'NORMAL');

  const { data: existingRes } = await supabase
    .from('reservations')
    .select('equipment_id, kg_amount')
    .eq('scheduled_date', scheduled_date)
    .neq('status', 'CANCELLED');

  const usageMap: Record<number, number> = {};
  for (const r of existingRes ?? []) {
    usageMap[r.equipment_id] = (usageMap[r.equipment_id] ?? 0) + (r.kg_amount ?? 0);
  }

  const available = (equipment ?? [])
    .map(eq => ({
      equipment_id: eq.equipment_id,
      remaining: eq.max_capacity - (usageMap[eq.equipment_id] ?? 0),
    }))
    .filter(eq => eq.remaining >= kg_amount)
    .sort((a, b) => b.remaining - a.remaining);

  return available[0]?.equipment_id ?? null;
}

// 강제 생성 시: 아무 정상 기기나 반환
async function getAnyEquipment(): Promise<number | null> {
  const { data } = await supabase
    .from('equipment')
    .select('equipment_id')
    .eq('status', 'NORMAL')
    .limit(1)
    .single();
  return data?.equipment_id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { user_id, company_name, product_name, product_type, container_size, kg_amount, yield_rate, scheduled_date, notes, force } =
      await req.json();

    // 필수값 검증
    if (!product_name || !kg_amount || !scheduled_date) {
      return Response.json({ error: '제품명, 중량, 생산일은 필수입니다.' }, { status: 400 });
    }
    if (!user_id && !company_name) {
      return Response.json({ error: '고객사를 선택하거나 업체명을 입력해주세요.' }, { status: 400 });
    }

    // 휴무일 체크
    const { data: holiday } = await supabase
      .from('holidays')
      .select('holiday_id')
      .eq('holiday_date', scheduled_date)
      .maybeSingle();

    if (holiday) {
      return Response.json({ error: '해당 날짜는 휴무일입니다. 다른 날짜를 선택해주세요.' }, { status: 400 });
    }

    // 장비 배정
    let equipmentId = await findBestEquipment(kg_amount, scheduled_date);

    if (!equipmentId && !force) {
      return Response.json({ error: `해당일 용량이 부족합니다. 강제 생성하려면 확인 후 다시 시도해주세요.` }, { status: 400 });
    }

    if (!equipmentId && force) {
      equipmentId = await getAnyEquipment();
      if (!equipmentId) {
        return Response.json({ error: '등록된 정상 기기가 없습니다.' }, { status: 400 });
      }
    }

    let resolvedUserId = user_id;

    if (user_id) {
      const { data: customer, error: custError } = await supabase
        .from('users')
        .select('user_id, role')
        .eq('user_id', user_id)
        .eq('role', 'customer')
        .maybeSingle();

      if (custError) {
        console.error('Customer lookup failed:', custError.message);
        return Response.json({ error: '고객 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
      }

      if (!customer) {
        return Response.json({ error: '존재하지 않는 고객입니다.' }, { status: 400 });
      }
    } else {
      resolvedUserId = result.user.user_id;
    }

    const finalNotes = company_name && !user_id
      ? `[직접입력] 업체: ${company_name}${notes ? ' | ' + notes : ''}`
      : (notes || null);

    // 제품 생성
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        product_name,
        product_type: product_type || 'extract',
        container_size: container_size || '1L',
        yield_rate: yield_rate || 4.0,
        user_id: resolvedUserId,
      })
      .select('product_id')
      .single();

    if (productError) throw productError;

    // 예약 생성 (CONFIRMED, 장비 배정)
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        user_id: resolvedUserId,
        product_id: product.product_id,
        equipment_id: equipmentId,
        kg_amount,
        scheduled_date,
        notes: finalNotes,
        status: 'CONFIRMED',
      })
      .select('reservation_id, user_id, product_id, kg_amount, scheduled_date, status, notes')
      .single();

    if (resError) {
      await supabase.from('products').delete().eq('product_id', product.product_id);
      throw resError;
    }

    return Response.json({ status: 'success', data: reservation }, { status: 201 });
  } catch (err: any) {
    console.error('POST /admin/create-reservation error:', err?.message, err?.code, err?.details, err?.hint);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
