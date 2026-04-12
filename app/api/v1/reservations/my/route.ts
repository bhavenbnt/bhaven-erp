import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;
    const { user } = result;

    const searchParams = req.nextUrl.searchParams;
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    let query = supabase
      .from('reservations')
      .select('*, equipment(name), products(product_name, product_type, container_size, yield_rate)')
      .eq('user_id', user.user_id)
      .order('scheduled_date', { ascending: false });

    if (date_from) query = query.gte('scheduled_date', date_from);
    if (date_to) query = query.lte('scheduled_date', date_to);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
