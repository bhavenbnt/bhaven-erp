'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'IN_PROGRESS', label: '생산 중' },
  { key: 'COMPLETED', label: '생산 완료' },
];

const STATUS_LABEL: Record<string, string> = { IN_PROGRESS: '생산 중', COMPLETED: '생산 완료' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  COMPLETED:   { color: '#888', bg: '#F8F8F8', border: '#EEE' },
};

const PAGE_SIZE = 10;

export default function ShipmentList() {
  const router = useRouter();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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

  const filtered = reservations.filter((r: any) => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (dateFrom && r.scheduled_date < dateFrom) return false;
    if (dateTo && r.scheduled_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.users?.company_name || '').toLowerCase().includes(q)
        && !(r.users?.name || '').toLowerCase().includes(q)
        && !(r.products?.product_name || '').toLowerCase().includes(q)
        && !String(r.reservation_id).includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleTab = (key: string) => { setTab(key); setPage(1); };
  const getCount = (key: string) => key === 'all' ? reservations.length : reservations.filter(r => r.status === key).length;

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>출고 관리</h1>
            <span style={s.totalBadge}>{reservations.length}건</span>
          </div>
          <div style={s.searchWrap}>
            {Icons.clipboard({ size: 14, color: '#BBB' })}
            <input style={s.searchInput} placeholder="업체명, 제품명, 예약번호 검색"
              value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
      }
    >
      {/* 필터: 탭 + 날짜 */}
      <div style={s.filterBar}>
        <div style={s.tabRow}>
          {TABS.map(t => {
            const count = getCount(t.key);
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => handleTab(t.key)}
                style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
                <span>{t.label}</span>
                {count > 0 && <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>{count}</span>}
              </button>
            );
          })}
        </div>
        <div style={s.dateFilterWrap}>
          <DatePicker value={dateFrom} onChange={(d) => { setDateFrom(d); setPage(1); }} minDate="2026-01-01" maxDate="2027-12-31" />
          <span style={s.dateSep}>~</span>
          <DatePicker value={dateTo} onChange={(d) => { setDateTo(d); setPage(1); }} minDate="2026-01-01" maxDate="2027-12-31" align="right" />
          {(dateFrom || dateTo) && (
            <button style={s.dateFilterClear} onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
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
              {paginated.map((r: any) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.IN_PROGRESS;
                return (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.tdId}>{r.reservation_id}</td>
                    <td style={s.tdName}>{r.users?.company_name || r.users?.name || '-'}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.tdMono}>{r.kg_amount}kg</td>
                    <td style={s.tdMono}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</td>
                    <td style={s.tdMuted}>{r.equipment?.name || '-'}</td>
                    <td style={s.td}>{new Date(r.scheduled_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button style={s.shipBtn} onClick={() => router.push(`/worker/shipment/${r.reservation_id}`)}>출고 처리</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
          {filtered.length > 0 && <span style={s.pageInfo}>{filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span>}
        </div>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 16 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontWeight: 600, color: '#999', background: '#F0F0F0', padding: '3px 10px', borderRadius: 20 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 36, background: '#F5F5F5', borderRadius: 8, border: '1px solid #EEEEEE', minWidth: 260 },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0A0A0A', flex: 1 },

  filterBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  tabRow: { display: 'flex', gap: 4, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
  dateFilterWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  dateSep: { fontSize: 12, color: '#CCC', fontWeight: 500 },
  dateFilterClear: { width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F0F0', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#999', marginLeft: 2 },
  tab: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer' },
  tabActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  tabCount: { fontSize: 10, fontWeight: 700, color: '#CCC', background: '#F0F0F0', borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  tabCountActive: { color: '#fff', background: 'rgba(255,255,255,0.2)' },

  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' },
  tableWrap: { overflowX: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th: { padding: '12px 20px', textAlign: 'left' as const, fontSize: 11, color: '#AAA', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMuted: { padding: '14px 20px', fontSize: 13, color: '#999' },
  tdMono: { padding: '14px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: { display: 'inline-block', padding: '4px 0', width: 72, textAlign: 'center' as const, borderRadius: 6, fontSize: 11, fontWeight: 600, borderStyle: 'solid', borderWidth: 1 },
  shipBtn: { padding: '5px 12px', background: '#fff', color: '#B11F39', border: '1px solid #F5D0D6', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  emptyRow: { padding: '60px 20px', textAlign: 'center' as const },
  emptyContent: { display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, color: '#CCC', fontSize: 13 },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 20px', borderTop: '1px solid #F0F0F0', marginTop: 'auto' },
  pageBtn: { width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageNum: { width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },
};
