import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { id } = await params;
    const { admin_response, status } = await req.json();

    const { data, error } = await supabase
      .from('inquiries')
      .update({ admin_response, status })
      .eq('inquiry_id', id)
      .select()
      .single();

    if (error || !data) {
      return Response.json({ error: '문의를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
