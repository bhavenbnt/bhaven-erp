import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;

    const searchParams = req.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase.from('holidays').select('*');

    if (year && month) {
      const paddedMonth = month.padStart(2, '0');
      const start = `${year}-${paddedMonth}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const end = `${year}-${paddedMonth}-${lastDay}`;
      query = query.gte('holiday_date', start).lte('holiday_date', end);
    } else if (year) {
      query = query.gte('holiday_date', `${year}-01-01`).lte('holiday_date', `${year}-12-31`);
    }

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
      .from('holidays')
      .insert(body)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: '이미 등록된 휴일입니다.' }, { status: 409 });
      }
      throw error;
    }

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
