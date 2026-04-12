import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { id } = await params;

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('holiday_id', id);

    if (error) throw error;

    return Response.json({ status: 'success', data: { holiday_id: id } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
