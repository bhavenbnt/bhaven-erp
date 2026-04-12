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
    // CAP(min_capacity, max_capacity, divisions)은 명세서상 수정 불가 — name, status만 허용
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
