import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = requireAuth(req, 'admin');
    if ('error' in result) return result.error;

    const { id } = await params;

    const { data, error } = await supabase
      .from('reservations')
      .select(
        'reservation_id, scheduled_date, kg_amount, expected_output_liter, status, users(name, company_name), products(product_name, product_type)'
      )
      .eq('equipment_id', id)
      .eq('status', 'COMPLETED')
      .order('scheduled_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    return Response.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
