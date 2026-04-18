import { NextRequest } from 'next/server';
import { supabaseAuth } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// PUT /api/v1/auth/password — 비밀번호 변경
export async function PUT(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ('error' in result) return result.error;
    const { user } = result;

    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return Response.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return Response.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }
    if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return Response.json({ error: '비밀번호는 영문과 숫자를 포함해야 합니다.' }, { status: 400 });
    }

    // 1. 현재 비밀번호 확인 + auth user id 획득
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (signInError || !signInData?.user?.id) {
      return Response.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const authUserId = signInData.user.id;

    // 2. Admin API로 비밀번호 변경 (service role key 사용)
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: new_password }),
    });

    if (!updateRes.ok) {
      const errorBody = await updateRes.text();
      console.error('Password update failed:', errorBody);
      return Response.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 });
    }

    return Response.json({ status: 'success', message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
