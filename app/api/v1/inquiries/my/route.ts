import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;
    const { user } = result;

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
