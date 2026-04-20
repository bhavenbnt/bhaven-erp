import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company_name, contact_info, role_title } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return Response.json({ error: '비밀번호는 영문과 숫자를 포함해야 합니다.' }, { status: 400 });
    }

    // 1. Supabase Auth Admin API로 유저 생성
    const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'customer' } }),
      cache: 'no-store',
    });

    if (!authRes.ok) {
      const err = await authRes.json().catch(() => ({}));
      if (err.msg?.includes('already') || err.msg?.includes('exist')) {
        return Response.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
      }
      return Response.json({ error: err.msg || '계정 생성에 실패했습니다.' }, { status: 400 });
    }

    // 2. public.users에 저장
    const { data, error } = await supabase
      .from('users')
      .insert({
        email, password: '-', name, role: 'customer',
        is_active: true, is_approved: true,
        company_name, contact_info, role_title,
      })
      .select('user_id, email, name, role')
      .single();

    if (error) {
      if (error.code === '23505') return Response.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
      throw error;
    }

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
