import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { inquiry_id, product_name, product_type, kg_amount, scheduled_date, equipment_id, notes } =
      await req.json();

    if (!product_name || !kg_amount || !scheduled_date || !equipment_id) {
      return Response.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    // products 먼저 insert
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        product_name,
        product_type: product_type || 'extract',
        kg_amount,
        user_id: user.user_id,
      })
      .select('product_id')
      .single();

    if (productError) throw productError;

    // reservations insert — admin 수동 배정, 즉시 CONFIRMED
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        user_id: user.user_id,
        product_id: product.product_id,
        equipment_id,
        kg_amount,
        scheduled_date,
        notes: `[긴급생산] ${notes || ''}`.trim(),
        status: 'CONFIRMED',
      })
      .select('reservation_id')
      .single();

    if (resError) throw resError;

    // 문의가 있으면 RESOLVED 처리
    if (inquiry_id) {
      await supabase
        .from('inquiries')
        .update({ status: 'RESOLVED' })
        .eq('inquiry_id', inquiry_id);
    }

    return Response.json(
      { status: 'success', data: { reservation_id: reservation.reservation_id } },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
