'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const STATUS_LABEL: Record<string, string> = { COMPLETED: '생산 완료', IN_PROGRESS: '생산 중' };
const PAGE_SIZE = 10;

export default function ShipmentList() {
  const router = useRouter();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker' && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/reservations')
      .then(({ data }: any) => setReservations(
        (data.data || []).filter((r: any) => r.status === 'COMPLETED' || r.status === 'IN_PROGRESS')
      ))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const totalPages = Math.max(1, Math.ceil(reservations.length / PAGE_SIZE));
  const paginated = reservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout
      title=""
      action={<div style={s.topBar}><h1 style={s.pageTitle}>출고 관리</h1><span style={s.totalBadge}>{reservations.length}건</span></div>}
    >
      <div style={s.tableCard}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>업체</th>
                <th style={s.th}>제품</th>
                <th style={s.th}>중량</th>
                <th style={s.th}>생산량</th>
                <th style={s.th}>기기</th>
                <th style={s.th}>생산일</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>출고</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={9} style={s.emptyRow}>
                  <div style={s.emptyContent}>
                    {Icons.clipboard({ size: 24, color: '#DDD' })}
                    <span>출고 대상이 없습니다</span>
                  </div>
                </td></tr>
              )}
              {paginated.map((r: any) => (
                <tr key={r.reservation_id} style={s.tr}>
                  <td style={s.tdId}>{r.reservation_id}</td>
                  <td style={s.tdName}>{r.users?.company_name || r.users?.name || '-'}</td>
                  <td style={s.td}>{r.products?.product_name || '-'}</td>
                  <td style={s.tdMono}>{r.kg_amount}kg</td>
                  <td style={s.tdMono}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</td>
                  <td style={s.tdMuted}>{r.equipment?.name || '-'}</td>
                  <td style={s.td}>{new Date(r.scheduled_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <span style={{ ...s.statusBadge, ...(r.status === 'COMPLETED' ? s.badgeComplete : s.badgeProgress) }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <button style={s.shipBtn} onClick={() => router.push(`/worker/shipment/${r.reservation_id}`)}>
                      출고 처리
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={{ ...s.pageBtn, opacity: page > 1 ? 1 : 0.3 }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} style={{ ...s.pageNum, ...(p === page ? s.pageNumActive : {}) }} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button style={{ ...s.pageBtn, opacity: page < totalPages ? 1 : 0.3 }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <span style={s.pageInfo}>{reservations.length}건 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, reservations.length)}</span>
          </div>
        )}
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', gap: 10, width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontWeight: 600, color: '#999', background: '#F0F0F0', padding: '3px 10px', borderRadius: 20 },
  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th: { padding: '12px 20px', textAlign: 'left' as const, fontSize: 11, color: '#AAA', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMuted: { padding: '14px 20px', fontSize: 13, color: '#999' },
  tdMono: { padding: '14px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: { display: 'inline-block', padding: '4px 0', width: 72, textAlign: 'center' as const, borderRadius: 6, fontSize: 11, fontWeight: 600, borderStyle: 'solid', borderWidth: 1 },
  badgeComplete: { color: '#888', background: '#F8F8F8', borderColor: '#EEE' },
  badgeProgress: { color: '#0A0A0A', background: '#F0F0F0', borderColor: '#E0E0E0' },
  shipBtn: { padding: '5px 14px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  emptyRow: { padding: '60px 20px', textAlign: 'center' as const },
  emptyContent: { display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, color: '#CCC', fontSize: 13 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 20px', borderTop: '1px solid #F0F0F0' },
  pageBtn: { width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageNum: { width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },
};
