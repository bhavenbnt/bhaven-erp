'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function ReservationCancel() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;
  };

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    try {
      await api.put(`/reservations/${id}/cancel`);
      router.push('/reservations');
    } catch (err: any) {
      setError(err.response?.data?.error || '취소 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* 경고 영역 */}
      <div style={styles.warnArea}>
        <div style={styles.warnIcon}>!</div>
        <div style={styles.warnTitle}>예약을 취소하시겠습니까?</div>
        <div style={styles.warnSub}>취소 시 해당 날짜 슬롯이 즉시 해제되며, 이 작업은 되돌릴 수 없습니다.</div>
      </div>

      {/* 예약 정보 카드 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>취소할 예약 정보</div>
        <div style={styles.divider} />
        {reservation ? (
          <>
            <InfoRow label="예약 번호" value={`RV-${reservation.reservation_id}`} />
            <InfoRow label="생산 날짜" value={formatDate(reservation.scheduled_date)} />
            <InfoRow label="품목 / 중량" value={`${reservation.products?.product_name || '-'} / ${reservation.kg_amount} kg`} />
            <InfoRow label="기기" value={reservation.equipment?.name || '-'} />
          </>
        ) : (
          <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 16 }}>불러오는 중...</div>
        )}
        <div style={styles.noticeBanner}>
          <span>⚠</span>
          <span>취소 처리 후 관리자에게 카카오톡 알림이 발송됩니다.</span>
        </div>
      </div>

      {/* 버튼 */}
      <div style={styles.btnRow}>
        <button style={styles.btnSecondary} onClick={() => router.back()}>돌아가기</button>
        <button style={styles.btnDanger} onClick={handleCancel} disabled={loading || !reservation}>
          {loading ? '처리 중...' : '예약 취소 확정'}
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ color: '#9CA3AF', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F5F5F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 48, fontFamily: "'Noto Sans KR', sans-serif" },
  warnArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  warnIcon: { width: 72, height: 72, borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  warnTitle: { fontSize: 22, fontWeight: 700, color: '#111' },
  warnSub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  card: { background: '#fff', borderRadius: 12, padding: 28, width: 480, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid #E5E7EB' },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#374151' },
  divider: { height: 1, background: '#F3F4F6' },
  noticeBanner: { display: 'flex', alignItems: 'center', gap: 8, background: '#FFF7ED', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: '#92400E', marginTop: 4 },
  btnRow: { display: 'flex', gap: 12, width: 480, justifyContent: 'flex-end' },
  btnSecondary: { padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  btnDanger: { padding: '11px 24px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { color: '#EF4444', fontSize: 13 },
};
