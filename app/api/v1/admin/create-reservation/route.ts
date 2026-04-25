import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

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
      .single();

    if (holiday) {
      return Response.json({ error: '해당 날짜는 휴무일입니다. 다른 날짜를 선택해주세요.' }, { status: 400 });
    }

    // 용량 검증 (force가 아닌 경우)
    if (!force) {
      const { data: equipment } = await supabase
        .from('equipment')
        .select('equipment_id, max_capacity, status')
        .neq('status', 'BROKEN')
        .neq('status', 'MAINTENANCE');

      const { data: existingRes } = await supabase
        .from('reservations')
        .select('equipment_id, kg_amount')
        .eq('scheduled_date', scheduled_date)
        .neq('status', 'CANCELLED');

      const usageMap: Record<number, number> = {};
      for (const r of existingRes ?? []) {
        usageMap[r.equipment_id] = (usageMap[r.equipment_id] ?? 0) + (r.kg_amount ?? 0);
      }

      const eqList = (equipment ?? []).map(eq => ({
        max_capacity: eq.max_capacity,
        remaining: eq.max_capacity - (usageMap[eq.equipment_id] ?? 0),
      })).filter(eq => eq.remaining > 0).sort((a, b) => b.remaining - a.remaining);

      let remaining = kg_amount;
      for (const eq of eqList) {
        if (remaining <= 0) break;
        remaining -= Math.min(remaining, eq.remaining);
      }

      if (remaining > 0) {
        return Response.json({ error: `해당일 용량이 부족합니다 (초과 ${remaining}kg). 강제 생성하려면 확인 후 다시 시도해주세요.` }, { status: 400 });
      }
    }

    let resolvedUserId = user_id;

    if (user_id) {
      // 기존 고객 확인
      const { data: customer } = await supabase
        .from('users')
        .select('user_id, role')
        .eq('user_id', user_id)
        .eq('role', 'customer')
        .single();

      if (!customer) {
        return Response.json({ error: '존재하지 않는 고객입니다.' }, { status: 400 });
      }
    } else {
      // 직접 입력: 관리자 본인 user_id로 생성, 업체명은 notes에 포함
      resolvedUserId = result.user.user_id;
    }

    // notes에 직접입력 업체명 추가
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
        kg_amount,
        yield_rate: yield_rate || 4.0,
        user_id: resolvedUserId,
      })
      .select('product_id')
      .single();

    if (productError) throw productError;

    // 예약 생성 (CONFIRMED, 장비 미배정)
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        user_id: resolvedUserId,
        product_id: product.product_id,
        equipment_id: null,
        kg_amount,
        scheduled_date,
        notes: finalNotes,
        status: 'CONFIRMED',
      })
      .select('reservation_id, user_id, product_id, kg_amount, scheduled_date, status, notes')
      .single();

    if (resError) {
      // 고아 제품 정리
      await supabase.from('products').delete().eq('product_id', product.product_id);
      throw resError;
    }

    return Response.json({ status: 'success', data: reservation }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
