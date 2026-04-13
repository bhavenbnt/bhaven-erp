import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// PUT /api/v1/auth/profile — 본인 프로필 수정
export async function PUT(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;
    const { user } = result;

    const { name, company_name, contact_info } = await req.json();

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (company_name !== undefined) updates.company_name = company_name;
    if (contact_info !== undefined) updates.contact_info = contact_info;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', user.user_id)
      .select('user_id, email, name, company_name, contact_info, role')
      .single();

    if (error || !data) {
      return Response.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
