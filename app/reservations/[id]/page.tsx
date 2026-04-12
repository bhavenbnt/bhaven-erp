'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STEPS = [
  { key: 'PENDING', label: '신청완료' },
  { key: 'CONFIRMED', label: '예약확정' },
  { key: 'IN_PROGRESS', label: '생산중' },
  { key: 'COMPLETED', label: '생산완료' },
];
const STEP_INDEX: Record<string, number> = { PENDING: 0, CONFIRMED: 1, IN_PROGRESS: 2, COMPLETED: 3, CANCELLED: -1 };
const STATUS_COLOR: Record<string, string> = { PENDING: '#f59e0b', CONFIRMED: '#3b82f6', IN_PROGRESS: '#10b981', COMPLETED: '#6b7280' };

export default function ReservationDetail() {
  const params = useParams();
  const id = params.id as string;
  const [reservation, setReservation] = useState<any>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get('/reservations/my').then(({ data }) => {
      const found = data.data?.find((r: any) => String(r.reservation_id) === id);
      setReservation(found || null);
    }).catch(() => {});
  }, [id]);

  if (!user) return null;
  if (!reservation) return <Layout title="예약 상세"><div style={{ padding: 32, color: '#999' }}>불러오는 중...</div></Layout>;

  const stepIdx = STEP_INDEX[reservation.status] ?? 0;

  return (
    <Layout title="예약 상세" action={
      <button onClick={() => router.back()} style={styles.backBtn}>← 내 예약 현황으로</button>
    }>
      <div style={styles.grid}>
        {/* 좌측 */}
        <div style={styles.left}>
          {/* 진행 단계 */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>진행 현황</div>
            <div style={styles.steps}>
              {STEPS.map((step, i) => (
                <div key={step.key} style={styles.stepItem}>
                  <div style={{ ...styles.stepCircle, background: i <= stepIdx ? STATUS_COLOR[STEPS[i].key] || '#B11F39' : '#e0e0e0', color: i <= stepIdx ? '#fff' : '#aaa' }}>
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <div style={{ ...styles.stepLabel, color: i <= stepIdx ? '#1a1a1a' : '#aaa' }}>{step.label}</div>
                  {i < STEPS.length - 1 && <div style={{ ...styles.stepLine, background: i < stepIdx ? '#B11F39' : '#e0e0e0' }} />}
                </div>
              ))}
            </div>
          </div>

          {/* 예약 정보 */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>예약 정보</div>
            <div style={styles.infoGrid}>
              <InfoRow label="날짜" value={new Date(reservation.scheduled_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} />
              <InfoRow label="제품명" value={reservation.products?.product_name || '-'} />
              <InfoRow label="용기" value={reservation.products?.container_size || '-'} />
              <InfoRow label="중량" value={`${reservation.kg_amount}kg`} />
              <InfoRow label="수율" value={(() => { const total = reservation.expected_output_liter ?? (reservation.kg_amount * (reservation.products?.yield_rate ?? 4)); const rate = reservation.products?.yield_rate ?? 4; return `예상 ${total.toFixed(1)}L (${reservation.kg_amount}kg × ${rate}L/kg)`; })()} />
              <InfoRow label="기기" value={reservation.equipment?.name || '-'} />
              <InfoRow label="비고" value={reservation.notes || '없음'} />
            </div>
          </div>
        </div>

        {/* 우측 */}
        <div style={styles.right}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>예약 관리</div>
            <p style={styles.manageTip}>예약 취소는 생산 3일 전까지 가능합니다. 이후에는 관리자에게 문의하세요.</p>
            <button style={styles.cancelBtn} onClick={() => router.push(`/reservations/${id}/cancel`)}>
              예약 취소
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ width: 80, fontSize: 13, color: '#888', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 },
  left: { display: 'flex', flexDirection: 'column', gap: 16 },
  right: {},
  card: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 },
  steps: { display: 'flex', alignItems: 'flex-start', gap: 0 },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, zIndex: 1 },
  stepLabel: { fontSize: 11, marginTop: 6, textAlign: 'center' },
  stepLine: { position: 'absolute', top: 16, left: '50%', width: '100%', height: 2 },
  infoGrid: {},
  manageTip: { fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 16 },
  cancelBtn: { width: '100%', padding: '12px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
