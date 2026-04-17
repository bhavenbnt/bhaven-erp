import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req, 'customer');
    if ('error' in result) return result.error;
    const { user } = result;

    const product_name = req.nextUrl.searchParams.get('product_name');
    if (!product_name) return Response.json({ yield_rate: 4 });

    const { data } = await supabase
      .from('products')
      .select('yield_rate')
      .eq('user_id', user.user_id)
      .ilike('product_name', product_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return Response.json({ yield_rate: data?.yield_rate ?? 4 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
