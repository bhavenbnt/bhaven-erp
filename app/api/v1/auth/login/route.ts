import { NextRequest } from 'next/server';
import { supabase, supabaseAuth } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // Supabase Auth로 인증
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    // public.users에서 role 및 상태 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, email, name, role, is_active, is_super, deleted_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
    if (user.deleted_at) {
      return Response.json({ error: '삭제된 계정입니다. 관리자에게 문의하세요.' }, { status: 403 });
    }
    if (!user.is_active) {
      return Response.json({ error: '계정이 정지되었습니다. 관리자에게 문의하세요.' }, { status: 403 });
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.user_id);

    const token = signToken({ user_id: user.user_id, email: user.email, role: user.role });

    return Response.json({
      status: 'success',
      data: {
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_super: user.is_super || false,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
