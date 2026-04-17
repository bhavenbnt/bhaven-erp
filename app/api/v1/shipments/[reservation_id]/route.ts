import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reservation_id: string }> }
) {
  try {
    const result = requireAuth(req, 'worker', 'admin');
    if ('error' in result) return result.error;

    const { reservation_id } = await params;

    const { data, error } = await supabase
      .from('shipments')
      .select('*, users!shipments_shipped_by_fkey(name)')
      .eq('reservation_id', reservation_id)
      .single();

    if (error || !data) {
      return Response.json({ error: '출고 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
