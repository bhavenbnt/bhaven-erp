import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { data, error } = await supabase
      .from('inquiries')
      .select('inquiry_id, message, status, created_at, user_id, users(name, company_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAuth(req, 'customer');
    if ('error' in result) return result.error;
    const { user } = result;

    const { message } = await req.json();

    if (!message) {
      return Response.json({ error: '문의 내용을 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert({ user_id: user.user_id, message })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
