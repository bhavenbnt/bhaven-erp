import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company_name, contact_info, role_title } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        role: 'customer',
        is_active: true,
        company_name,
        contact_info,
        role_title,
      })
      .select('user_id, email, name, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
      }
      throw error;
    }

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
