'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const PRODUCT_TYPE_LABEL: Record<string, string> = { extract: '원액', can: '캔' };
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function ReservationComplete() {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    const data = sessionStorage.getItem('reservationComplete');
    if (!data) { router.replace('/reservations'); return; }
    setState(JSON.parse(data));
  }, []);

  if (!user) return null;
  if (!state) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;
  };

  return (
    <div style={styles.page}>
      {/* 단계 표시 */}
      <div style={styles.stepRow}>
        <StepDot done label="예약 정보 입력" />
        <div style={styles.stepLine} />
        <StepDot active label="신청 완료" />
        <div style={styles.stepLine} />
        <StepDot label="관리자 승인 대기" />
      </div>

      {/* 완료 메시지 */}
      <div style={styles.successArea}>
        <div style={styles.checkCircle}>✓</div>
        <div style={styles.successTitle}>예약 신청이 완료되었습니다!</div>
        <div style={styles.successSub}>관리자 승인 후 카카오톡 알림톡으로 일정을 안내드립니다.</div>
      </div>

      {/* 요약 카드 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>예약 요약</div>
        <div style={styles.divider} />
        <SummaryRow label="예약 번호" value={state.reservations?.map((r: any) => `RV-${r.reservation_id}`).join(', ') || '-'} bold />
        <SummaryRow label="품목" value={PRODUCT_TYPE_LABEL[state.product_type] || '-'} />
        <SummaryRow label="제품명" value={state.product_name || '-'} />
        <SummaryRow label="원두 중량" value={state.kg_amount ? `${state.kg_amount} kg` : '-'} />
        <SummaryRow label="예상 생산량" value={state.expectedOutput ? `${state.expectedOutput} L` : '-'} />
        <SummaryRow label="희망 날짜" value={formatDate(state.scheduled_date)} />
        {state.reservations?.map((r: any, i: number) => (
          <SummaryRow key={i} label={`배정 기기 ${state.reservations.length > 1 ? i + 1 : ''}`} value={`${r.equipment_name} (${r.assigned_kg}kg)`} />
        ))}
      </div>

      {/* 버튼 */}
      <div style={styles.btnRow}>
        <button style={styles.btnSecondary} onClick={() => router.push('/reservations')}>내 예약 현황 보기</button>
        <button style={styles.btnPrimary} onClick={() => router.push('/dashboard')}>홈으로</button>
      </div>
    </div>
  );
}

function StepDot({ done, active, label }: { done?: boolean; active?: boolean; label: string }) {
  return (
    <div style={styles.stepItem}>
      <div style={{ ...styles.stepDot, background: done ? '#22C55E' : active ? '#B11F39' : '#E5E7EB', color: (done || active) ? '#fff' : '#9CA3AF' }}>
        {done ? '✓' : ''}
      </div>
      <span style={{ ...styles.stepLabel, color: active ? '#111' : done ? '#22C55E' : '#9CA3AF', fontWeight: active ? 600 : 400 }}>{label}</span>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={{ ...styles.summaryValue, fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F5F5F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 48, fontFamily: "'Noto Sans KR', sans-serif" },
  stepRow: { display: 'flex', alignItems: 'center', gap: 0, width: 400 },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 },
  stepDot: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 },
  stepLine: { flex: 1, height: 2, background: '#E5E7EB', alignSelf: 'flex-start', marginTop: 16 },
  stepLabel: { fontSize: 11, textAlign: 'center' },
  successArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  checkCircle: { width: 88, height: 88, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#fff', fontWeight: 700 },
  successTitle: { fontSize: 24, fontWeight: 700, color: '#111' },
  successSub: { fontSize: 14, color: '#666' },
  card: { background: '#fff', borderRadius: 12, padding: 28, width: 480, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid #E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#111' },
  divider: { height: 1, background: '#F3F4F6' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  summaryLabel: { color: '#6B7280', fontSize: 13 },
  summaryValue: { color: '#111', fontSize: 13 },
  btnRow: { display: 'flex', gap: 12, width: 480, justifyContent: 'flex-end' },
  btnPrimary: { padding: '11px 24px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
};
