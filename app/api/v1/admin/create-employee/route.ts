import { NextRequest } from 'next/server';
import { supabase, supabaseAuth } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// POST /api/v1/admin/create-employee — 슈퍼관리자가 직원 계정 생성
export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { data: caller } = await supabase.from('users').select('is_super').eq('user_id', user.user_id).single();
    if (!caller?.is_super) return Response.json({ error: '권한이 없습니다.' }, { status: 403 });

    const { email, password, name, role, contact_info } = await req.json();

    if (!email || !password || !name || !role) {
      return Response.json({ error: '이메일, 비밀번호, 이름, 역할은 필수입니다.' }, { status: 400 });
    }
    if (!['admin', 'worker'].includes(role)) {
      return Response.json({ error: '역할은 admin 또는 worker만 가능합니다.' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return Response.json({ error: '비밀번호는 영문과 숫자를 포함해야 합니다.' }, { status: 400 });
    }

    // 1. Supabase Auth
    const { error: authError } = await supabaseAuth.auth.signUp({
      email, password,
      options: { data: { role } },
    });
    if (authError) return Response.json({ error: authError.message }, { status: 400 });

    // 2. public.users
    const { data, error } = await supabase
      .from('users')
      .insert({
        email, password: '-', name, role,
        is_active: true, is_approved: true,
        company_name: '비해이븐',
        contact_info: contact_info || null,
      })
      .select('user_id, email, name, role')
      .single();

    if (error) {
      if (error.code === '23505') return Response.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });
      throw error;
    }

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
