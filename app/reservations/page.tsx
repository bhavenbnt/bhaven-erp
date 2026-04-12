'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'PENDING', label: '승인 대기' },
  { key: 'CONFIRMED', label: '예약 확정' },
  { key: 'IN_PROGRESS', label: '생산 중' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'CANCELLED', label: '취소' },
];
const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', CONFIRMED: '예약확정', IN_PROGRESS: '생산중', COMPLETED: '생산완료', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#f59e0b', CONFIRMED: '#3b82f6', IN_PROGRESS: '#10b981', COMPLETED: '#6b7280', CANCELLED: '#ef4444' };

export default function MyReservations() {
  const [tab, setTab] = useState('all');
  const [reservations, setReservations] = useState<any[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get('/reservations/my').then(({ data }) => setReservations(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  const filtered = tab === 'all' ? reservations : reservations.filter(r => r.status === tab);

  const action = (
    <button onClick={() => router.push('/calendar')} style={styles.actionBtn}>+ 예약 신청</button>
  );

  return (
    <Layout title="내 예약 현황" action={action}>
      {/* 탭 */}
      <div style={styles.tabs}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 예약 목록 */}
      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.empty}>예약 내역이 없습니다.</div>
        )}
        {filtered.map(r => (
          <div key={r.reservation_id} style={styles.item} onClick={() => router.push(`/reservations/${r.reservation_id}`)}>
            <div style={styles.itemLeft}>
              <div style={styles.itemHeader}>
                <span style={styles.reservId}>#{r.reservation_id}</span>
                <span style={{ ...styles.badge, background: STATUS_COLOR[r.status] + '18', color: STATUS_COLOR[r.status] }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <div style={styles.itemTitle}>{r.products?.product_name || '-'}</div>
              <div style={styles.itemMeta}>
                중량 {r.kg_amount}kg · 기기 {r.equipment?.name || '-'} · {new Date(r.scheduled_date).toLocaleDateString('ko-KR')}
              </div>
            </div>
            <div style={styles.itemRight}>
              <span style={styles.expectedOutput}>예상 생산량</span>
              <span style={styles.outputValue}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  actionBtn: { padding: '8px 16px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, background: '#fff', borderRadius: 8, padding: 4, width: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  tab: { padding: '7px 20px', border: 'none', background: 'transparent', borderRadius: 6, fontSize: 13, color: '#888', cursor: 'pointer' },
  tabActive: { background: '#B11F39', color: '#fff', fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14, background: '#fff', borderRadius: 10 },
  item: { background: '#fff', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' },
  itemLeft: { flex: 1 },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  reservId: { fontSize: 13, fontWeight: 600, color: '#333' },
  badge: { padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 },
  itemTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 },
  itemMeta: { fontSize: 12, color: '#999' },
  itemRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  expectedOutput: { fontSize: 11, color: '#aaa' },
  outputValue: { fontSize: 20, fontWeight: 700, color: '#1a1a1a' },
};
