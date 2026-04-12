'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', CONFIRMED: '#3B82F6', IN_PROGRESS: '#10B981', COMPLETED: '#6B7280', CANCELLED: '#EF4444' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', CONFIRMED: '#EFF6FF', IN_PROGRESS: '#ECFDF5', COMPLETED: '#F3F4F6', CANCELLED: '#FEF2F2' };

export default function AdminReservations() {
  const router = useRouter();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: '', dateFrom: '', dateTo: '', search: '' });

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/reservations').then(({ data }: any) => setReservations(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  const filtered = reservations.filter((r: any) => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.dateFrom && r.scheduled_date < filter.dateFrom) return false;
    if (filter.dateTo && r.scheduled_date > filter.dateTo) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!(r.users?.company_name || '').toLowerCase().includes(q) && !(r.products?.product_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilter(f => ({ ...f, [k]: e.target.value }));

  return (
    <Layout title="예약 관리" action={
      <span style={s.countBadge}>총 {filtered.length}건</span>
    }>
      <div style={s.filterRow}>
        <select style={s.select} value={filter.status} onChange={set('status')}>
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input style={s.input} type="date" value={filter.dateFrom} onChange={set('dateFrom')} />
        <input style={s.input} type="date" value={filter.dateTo} onChange={set('dateTo')} />
        <input style={{ ...s.input, flex: 1 }} placeholder="업체명 또는 제품명 검색" value={filter.search} onChange={set('search')} />
      </div>

      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['#', '업체명', '제품명', '중량', '생산량', '예약일', '기기', '상태', ''].map((h, i) => <th key={i} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={s.empty}>예약 내역이 없습니다.</td></tr>}
            {filtered.map((r: any) => (
              <tr key={r.reservation_id} style={s.tr}>
                <td style={{ ...s.td, color: '#999', textAlign: 'center' as const }}>{r.reservation_id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{r.users?.company_name || r.users?.name}</td>
                <td style={s.td}>{r.products?.product_name}</td>
                <td style={s.td}>{r.kg_amount}kg</td>
                <td style={s.td}>{r.expected_output_liter}L</td>
                <td style={s.td}>{r.scheduled_date}</td>
                <td style={s.td}>{r.equipment?.name}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: STATUS_BG[r.status], color: STATUS_COLOR[r.status] }}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td style={s.td}>
                  <button style={s.detailBtn} onClick={() => router.push(`/admin/reservations/${r.reservation_id}`)}>상세</button>
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
  countBadge: { background: '#F5F5F5', color: '#666', fontSize: 13, padding: '5px 12px', borderRadius: 6, border: '1px solid #E0E0E0' },
  filterRow: { display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' as const },
  select: { padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 7, fontSize: 13, background: '#fff', outline: 'none' },
  input: { padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 7, fontSize: 13, background: '#fff', outline: 'none' },
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 40, color: '#aaa', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  detailBtn: { color: '#B11F39', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' },
};
