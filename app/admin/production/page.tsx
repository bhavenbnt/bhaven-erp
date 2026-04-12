'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', CONFIRMED: '#3B82F6', IN_PROGRESS: '#10B981', COMPLETED: '#6B7280', CANCELLED: '#EF4444' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', CONFIRMED: '#EFF6FF', IN_PROGRESS: '#ECFDF5', COMPLETED: '#F3F4F6', CANCELLED: '#FEF2F2' };

export default function TodayProduction() {
  const router = useRouter();
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get(`/reservations?date_from=${today}&date_to=${today}`)
      .then(({ data }: any) => setList((data.data || []).filter((r: any) => r.status !== 'CANCELLED')))
      .catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <Layout title="오늘 생산 확인">
      <div style={s.dateRow}>
        <span style={s.dateLabel}>{todayLabel}</span>
        <span style={s.badge}>{list.length}건</span>
      </div>
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['#', '업체명', '제품명', '중량', '예상 생산량', '기기', '상태'].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} style={s.empty}>오늘 예정된 생산이 없습니다.</td></tr>}
            {list.map((r: any) => (
              <tr key={r.reservation_id} style={s.tr}>
                <td style={{ ...s.td, color: '#999', textAlign: 'center' as const }}>{r.reservation_id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{r.users?.company_name || r.users?.name}</td>
                <td style={s.td}>{r.products?.product_name}</td>
                <td style={s.td}>{r.kg_amount}kg</td>
                <td style={s.td}>{r.expected_output_liter}L</td>
                <td style={s.td}>{r.equipment?.name}</td>
                <td style={s.td}>
                  <span style={{ ...s.statusBadge, background: STATUS_BG[r.status], color: STATUS_COLOR[r.status] }}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

const s = {
  dateRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  dateLabel: { fontSize: 16, fontWeight: 600, color: '#1a1a1a' },
  badge: { background: '#B11F39', color: '#fff', fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 12 },
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 40, color: '#aaa', fontSize: 14 },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
};
