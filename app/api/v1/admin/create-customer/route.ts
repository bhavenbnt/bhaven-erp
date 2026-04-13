import { NextRequest } from 'next/server';
import { supabase, supabaseAuth } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// POST /api/v1/admin/create-customer — 관리자가 고객 계정 생성
export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;
    const { user } = result;

    const { data: caller } = await supabase.from('users').select('is_super').eq('user_id', user.user_id).single();
    if (!caller?.is_super) return Response.json({ error: '권한이 없습니다.' }, { status: 403 });

    const { email, password, name, company_name, contact_info } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: '이메일, 비밀번호, 담당자명은 필수입니다.' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // 1. Supabase Auth에 유저 생성 (이메일 인증 완료 상태)
    const { error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { role: 'customer' } },
    });

    // signUp은 이미 존재해도 에러를 안 줄 수 있음 — public.users에서 중복 체크
    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    // 2. public.users에 비즈니스 데이터 저장
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: '-', // Supabase Auth가 관리
        name,
        role: 'customer',
        is_active: true,
        is_approved: true,
        company_name: company_name || null,
        contact_info: contact_info || null,
      })
      .select('user_id, email, name, company_name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });
      }
      throw error;
    }

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
