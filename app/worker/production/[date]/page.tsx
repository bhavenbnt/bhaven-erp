'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'IN_PROGRESS', label: '생산중' },
  { key: 'COMPLETED', label: '완료' },
];

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888', bg: '#F8F8F8', border: '#EEE' },
  CANCELLED:   { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
};
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const PAGE_SIZE = 10;

export default function ProductionDetail() {
  const params = useParams();
  const date = params.date as string;
  const router = useRouter();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker' && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => {
    api.get(`/reservations?date_from=${date}&date_to=${date}`)
      .then(({ data }: any) => setReservations((data.data || []).filter((r: any) => r.status !== 'CANCELLED')))
      .catch(() => {});
  };
  useEffect(() => { load(); }, [date]);

  if (!user) return null;

  const d = new Date(date + 'T00:00:00');
  const dateLabel = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;
  const isToday = date === new Date().toISOString().split('T')[0];

  const filtered = tab === 'all' ? reservations : reservations.filter(r => r.status === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleTab = (key: string) => { setTab(key); setPage(1); };
  const getCount = (key: string) => key === 'all' ? reservations.length : reservations.filter(r => r.status === key).length;

  const totalKg = reservations.reduce((s, r) => s + (r.kg_amount || 0), 0);
  const totalL = reservations.reduce((s, r) => s + (r.expected_output_liter || 0), 0);

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/worker/production')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>{dateLabel}</h1>
            {isToday && <span style={s.todayBadge}>오늘</span>}
          </div>
        </div>
      }
    >
      {/* 통계 */}
      <div style={s.statsRow}>
        <div style={s.statCard}><span style={s.statLabel}>총 작업</span><span style={s.statValue}>{reservations.length}<span style={s.statUnit}>건</span></span></div>
        <div style={s.statCard}><span style={s.statLabel}>총 중량</span><span style={s.statValue}>{totalKg}<span style={s.statUnit}>kg</span></span></div>
        <div style={s.statCard}><span style={s.statLabel}>예상 생산량</span><span style={s.statValue}>{totalL}<span style={s.statUnit}>L</span></span></div>
      </div>

      {/* 탭 */}
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

      {/* 테이블 */}
      <div style={s.tableCard}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>기기</th>
                <th style={s.th}>업체</th>
                <th style={s.th}>제품</th>
                <th style={s.th}>중량</th>
                <th style={s.th}>생산량</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={8} style={s.emptyRow}>
                  <div style={s.emptyContent}>
                    {Icons.factory({ size: 24, color: '#DDD' })}
                    <span>해당 날짜에 작업이 없습니다</span>
                  </div>
                </td></tr>
              )}
              {paginated.map((r: any) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                return (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.tdId}>{r.reservation_id}</td>
                    <td style={s.tdName}>{r.equipment?.name || '-'}</td>
                    <td style={s.td}>{r.users?.company_name || r.users?.name || '-'}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.tdMono}>{r.kg_amount}kg</td>
                    <td style={s.tdMono}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {r.status === 'CONFIRMED' && <span style={{ fontSize: 11, color: '#999' }}>생산 대기</span>}
                      {r.status === 'IN_PROGRESS' && <button style={s.shipBtn} onClick={() => router.push(`/worker/shipment/${r.reservation_id}`)}>출고 처리</button>}
                      {r.status === 'COMPLETED' && <span style={{ fontSize: 11, color: '#BBB' }}>처리 완료</span>}
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
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: { width: 30, height: 30, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  todayBadge: { fontSize: 11, fontWeight: 600, color: '#B11F39', background: '#FDF2F4', padding: '3px 10px', borderRadius: 20, border: '1px solid #F5D0D6' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 },
  statCard: { background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#999', fontWeight: 500 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Space Grotesk', sans-serif", display: 'flex', alignItems: 'baseline' },
  statUnit: { fontSize: 12, fontWeight: 500, marginLeft: 2, color: '#CCC' },

  tabRow: { display: 'flex', gap: 4, marginBottom: 10, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
  tab: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer' },
  tabActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  tabCount: { fontSize: 10, fontWeight: 700, color: '#CCC', background: '#F0F0F0', borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  tabCountActive: { color: '#fff', background: 'rgba(255,255,255,0.2)' },

  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', minHeight: 'calc(100vh - 380px)', display: 'flex', flexDirection: 'column' },
  tableWrap: { overflowX: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 750 },
  th: { padding: '12px 20px', textAlign: 'left' as const, fontSize: 11, color: '#AAA', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMono: { padding: '14px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: { display: 'inline-block', padding: '4px 0', width: 56, textAlign: 'center' as const, borderRadius: 6, fontSize: 11, fontWeight: 600, borderStyle: 'solid', borderWidth: 1 },
  shipBtn: { padding: '5px 14px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  emptyRow: { padding: '60px 20px', textAlign: 'center' as const },
  emptyContent: { display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, color: '#CCC', fontSize: 13 },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 20px', borderTop: '1px solid #F0F0F0', marginTop: 'auto' },
  pageBtn: { width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageNum: { width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },
};
