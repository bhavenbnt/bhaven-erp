import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notify';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req, 'worker', 'admin');
    if ('error' in result) return result.error;

    const { data, error } = await supabase
      .from('shipments')
      .select('reservation_id, shipped_at');

    if (error) throw error;

    return Response.json({ status: 'success', data: data || [] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'worker', 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { reservation_id, carrier, tracking_number } = await req.json();

    if (!reservation_id || !carrier || !tracking_number) {
      return Response.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('shipments')
      .select('shipment_id')
      .eq('reservation_id', reservation_id)
      .single();

    if (existing) {
      return Response.json({ error: '이미 출고 처리된 예약입니다.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('shipments')
      .insert({
        reservation_id,
        carrier,
        tracking_number,
        shipped_by: user.user_id,
      })
      .select()
      .single();

    if (error) throw error;

    // 예약 상태를 COMPLETED로 변경
    await supabase
      .from('reservations')
      .update({ status: 'COMPLETED' })
      .eq('reservation_id', reservation_id);

    // 고객에게 출고 완료 인앱 알림
    const { data: reservation } = await supabase
      .from('reservations')
      .select('user_id, scheduled_date')
      .eq('reservation_id', reservation_id)
      .single();

    if (reservation) {
      await createNotification({
        user_id: reservation.user_id,
        title: '출고 완료',
        message: `${reservation.scheduled_date} 생산 제품이 출고되었습니다. 택배사: ${carrier}, 송장번호: ${tracking_number}`,
        noti_type: 'info',
        reservation_id,
      });
    }

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
