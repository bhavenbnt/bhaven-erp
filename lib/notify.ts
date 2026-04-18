import { supabase } from '@/lib/supabase';

interface NotifyOptions {
  user_id: number;
  title: string;
  message: string;
  noti_type?: string;
  reservation_id?: number;
}

export async function createNotification(opts: NotifyOptions) {
  await supabase.from('notifications').insert({
    user_id: opts.user_id,
    title: opts.title,
    message: opts.message,
    noti_type: opts.noti_type ?? 'info',
    reservation_id: opts.reservation_id ?? null,
  });
}

// 예약 신청 → 관리자 전체에게 알림
export async function notifyAdminsNewReservation(reservation_id: number, company_name: string, scheduled_date: string) {
  const { data: admins } = await supabase
    .from('users')
    .select('user_id')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (!admins?.length) return;
  await supabase.from('notifications').insert(
    admins.map((a) => ({
      user_id: a.user_id,
      title: '신규 예약 신청',
      message: `${company_name}님의 ${scheduled_date} 생산 예약이 접수되었습니다.`,
      noti_type: 'reservation',
      reservation_id,
    }))
  );
}

// 예약 승인 → 고객에게 알림
export async function notifyCustomerApproved(user_id: number, reservation_id: number, scheduled_date: string) {
  await createNotification({
    user_id,
    title: '예약 승인',
    message: `${scheduled_date} 생산 예약이 승인되었습니다.`,
    noti_type: 'approval',
    reservation_id,
  });
}

// 예약 반려/취소 → 고객에게 알림
export async function notifyCustomerCancelled(user_id: number, reservation_id: number, scheduled_date: string, reason?: string) {
  await createNotification({
    user_id,
    title: '예약 취소/반려',
    message: `${scheduled_date} 생산 예약이 취소되었습니다.${reason ? ` 사유: ${reason}` : ''}`,
    noti_type: 'cancellation',
    reservation_id,
  });
}

// 작업자 전체에게 알림 (생산 시작 등)
export async function notifyWorkersScheduleChange(message: string, reservation_id?: number) {
  const { data: workers } = await supabase
    .from('users')
    .select('user_id')
    .eq('role', 'worker')
    .eq('is_active', true);

  if (!workers?.length) return;
  await supabase.from('notifications').insert(
    workers.map((w) => ({
      user_id: w.user_id,
      title: '일정 변경 알림',
      message,
      noti_type: 'schedule',
      reservation_id: reservation_id ?? null,
    }))
  );
}
