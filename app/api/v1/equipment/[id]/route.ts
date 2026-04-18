import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;

    const { id } = await params;

    const { data, error } = await supabase
      .from('equipment')
      .select('*, equipment_history(*)')
      .eq('equipment_id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: '설비를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { id } = await params;
    const { name, status } = await req.json();

    const { data, error } = await supabase
      .from('equipment')
      .update({ name, status })
      .eq('equipment_id', id)
      .select()
      .single();

    if (error || !data) {
      return Response.json({ error: '설비를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { data: caller } = await supabase.from('users').select('is_super').eq('user_id', user.user_id).single();
    if (!caller?.is_super) return Response.json({ error: '권한이 없습니다.' }, { status: 403 });

    const { id } = await params;

    // 진행 중인 예약 확인
    const { data: active } = await supabase
      .from('reservations')
      .select('reservation_id')
      .eq('equipment_id', id)
      .in('status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
      .limit(1);

    if (active && active.length > 0) {
      return Response.json({ error: '진행 중인 예약이 있어 삭제할 수 없습니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('equipment').delete().eq('equipment_id', id);
    if (error) throw error;

    return Response.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
