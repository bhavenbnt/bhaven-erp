import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');

    let query = supabase.from('equipment').select('equipment_id, name, equipment_code, type, status, min_capacity, max_capacity, divisions').order('name', { ascending: true });

    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const body = await req.json();

    const { data, error } = await supabase
      .from('equipment')
      .insert(body)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: '이미 사용 중인 설비 코드입니다.' }, { status: 409 });
      }
      throw error;
    }

    await supabase.from('equipment_history').insert({
      equipment_id: data.equipment_id,
      action: 'CREATED',
      details: body,
    });

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
