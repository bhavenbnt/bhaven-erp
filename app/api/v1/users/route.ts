import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get('role');

    let query = supabase
      .from('users')
      .select('user_id, name, email, role, is_active, is_super, is_approved, company_name, contact_info, created_at, last_login, deleted_at')
      .is('deleted_at', null);

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
