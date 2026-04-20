'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888', bg: '#F8F8F8', border: '#EEE' },
  CANCELLED:   { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
};
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function WorkerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [tomorrowCount, setTomorrowCount] = useState(0);
  const [weekData, setWeekData] = useState<{ date: Date; count: number; kg: number }[]>([]);
  const [equipFilter, setEquipFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker' && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => {
    const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
    const tmrStr = tmr.toISOString().split('T')[0];
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    Promise.all([
      api.get(`/reservations?date_from=${selectedDate}&date_to=${selectedDate}`).catch(() => ({ data: { data: [] } })),
      api.get(`/reservations?date_from=${tmrStr}&date_to=${tmrStr}`).catch(() => ({ data: { data: [] } })),
      api.get(`/reservations?date_from=${weekStart.toISOString().split('T')[0]}&date_to=${weekEnd.toISOString().split('T')[0]}`).catch(() => ({ data: { data: [] } })),
    ]).then(([todayRes, tmrRes, weekRes]: any[]) => {
      setTodayList((todayRes.data.data || []).filter((r: any) => r.status !== 'CANCELLED'));
      setTomorrowCount((tmrRes.data.data || []).filter((r: any) => r.status !== 'CANCELLED').length);

      const all = (weekRes.data.data || []).filter((r: any) => r.status !== 'CANCELLED');
      const week = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        const items = all.filter((r: any) => r.scheduled_date === ds);
        return { date: d, count: items.length, kg: items.reduce((s: number, r: any) => s + (r.kg_amount || 0), 0) };
      });
      setWeekData(week);
    });
  };

  useEffect(() => { load(); setPage(1); }, [selectedDate]);

  if (!user) return null;

  const total = todayList.length;
  const inProgress = todayList.filter(r => r.status === 'IN_PROGRESS').length;
  const completed = todayList.filter(r => r.status === 'COMPLETED').length;
  const totalKg = todayList.reduce((sum, r) => sum + (r.kg_amount || 0), 0);
  const filtered = useMemo(() => equipFilter === 'all' ? todayList : todayList.filter(r => {
    if (equipFilter === 'custom') return !['small', 'medium', 'large'].includes(r.equipment?.type);
    return r.equipment?.type === equipFilter;
  }), [todayList, equipFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const getTypeCount = (key: string) => key === 'all' ? todayList.length : todayList.filter(r => {
    if (key === 'custom') return !['small', 'medium', 'large'].includes(r.equipment?.type);
    return r.equipment?.type === key;
  }).length;
  const handleFilter = (key: string) => { setEquipFilter(key); setPage(1); };
  const selectedD = new Date(selectedDate + 'T00:00:00');
  const dateStr = selectedD.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  const handleStatus = async (id: number, status: string) => {
    await api.put(`/reservations/${id}/status`, { status }).catch(() => {});
    load();
  };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>대시보드</h1>
            {isToday && <span style={s.todayTag}>오늘</span>}
          </div>
          <div style={s.topRight}>
            <DatePicker value={selectedDate} onChange={setSelectedDate} minDate="2026-01-01" maxDate="2027-12-31" align="right" />
            {!isToday && <button style={s.todayBtn} onClick={() => setSelectedDate(todayStr)}>오늘</button>}
          </div>
        </div>
      }
    >
      {/* 통계 카드 */}
      <div style={s.statsRow}>
        <div style={{ ...s.statCard, ...s.statCardDark }}>
          <div style={s.statTop}>
            <div style={{ ...s.statIconWrap, background: 'rgba(255,255,255,0.08)' }}>{Icons.factory({ size: 16, color: 'rgba(255,255,255,0.6)' })}</div>
            <span style={{ ...s.statLabel, color: 'rgba(255,255,255,0.5)' }}>오늘 총 작업</span>
          </div>
          <div style={{ ...s.statValue, color: '#fff' }}>{total}<span style={{ ...s.statUnit, color: 'rgba(255,255,255,0.35)' }}>건</span></div>
          <div style={{ ...s.statSub, color: 'rgba(255,255,255,0.25)' }}>총 {totalKg}kg</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statTop}><div style={s.statIconWrap}>{Icons.settings({ size: 16, color: '#B11F39' })}</div><span style={s.statLabel}>생산 중</span></div>
          <div style={s.statValue}>{inProgress}<span style={s.statUnit}>건</span></div>
          <div style={s.statSub}>현재 진행 중</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statTop}><div style={s.statIconWrap}>{Icons.chart({ size: 16, color: '#B11F39' })}</div><span style={s.statLabel}>완료</span></div>
          <div style={s.statValue}>{completed}<span style={s.statUnit}>건</span></div>
          <div style={s.statSub}>오늘 완료</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statTop}><div style={s.statIconWrap}>{Icons.calendar({ size: 16, color: '#B11F39' })}</div><span style={s.statLabel}>내일 예정</span></div>
          <div style={s.statValue}>{tomorrowCount}<span style={s.statUnit}>건</span></div>
          <div style={s.statSub}>내일 생산 예정</div>
        </div>
      </div>

      <div style={s.bottomRow}>
        {/* 기기 종류별 카드 */}
        <div style={s.categoryCol}>
          {/* 기기 필터 */}
          <div style={s.filterRow}>
            {[
              { key: 'all', label: '전체' },
              { key: 'small', label: '소형' },
              { key: 'medium', label: '중형' },
              { key: 'large', label: '대형' },
              { key: 'custom', label: '기타' },
            ].map(f => {
              const count = getTypeCount(f.key);
              const active = equipFilter === f.key;
              return (
                <button key={f.key} onClick={() => handleFilter(f.key)}
                  style={{ ...s.filterBtn, ...(active ? s.filterBtnActive : {}) }}>
                  <span>{f.label}</span>
                  {count > 0 && <span style={{ ...s.filterCount, ...(active ? s.filterCountActive : {}) }}>{count}</span>}
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
                    <th style={s.th}>기기</th>
                    <th style={s.th}>업체</th>
                    <th style={s.th}>제품</th>
                    <th style={s.th}>중량</th>
                    <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                    <th style={{ ...s.th, textAlign: 'center' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} style={s.emptyRow}>
                      <div style={s.emptyContent}>{Icons.factory({ size: 24, color: '#DDD' })}<span>예정된 작업이 없습니다</span></div>
                    </td></tr>
                  )}
                  {paginated.map((r: any) => {
                    const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                    return (
                      <tr key={r.reservation_id} style={s.tr}>
                        <td style={s.tdName}>{r.equipment?.name || '-'}</td>
                        <td style={s.td}>{r.users?.company_name || r.users?.name || '-'}</td>
                        <td style={s.td}>{r.products?.product_name || '-'}</td>
                        <td style={s.tdMono}>{r.kg_amount}kg</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>{STATUS_LABEL[r.status]}</span>
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
        </div>

        {/* 이번 주 */}
        <div style={s.weekCard}>
          <div style={s.weekHeader}>
            {Icons.calendar({ size: 13, color: '#999' })}
            <span style={s.weekTitle}>이번 주</span>
          </div>
          <div style={s.weekList}>
            {weekData.map((d, i) => {
              const ds = d.date.toISOString().split('T')[0];
              const isT = ds === todayStr;
              const isSel = ds === selectedDate;
              return (
                <div key={i}
                  style={{ ...s.weekRow, ...(isSel ? s.weekRowSelected : {}), cursor: d.count > 0 ? 'pointer' : 'default' }}
                  onClick={() => d.count > 0 ? setSelectedDate(ds) : null}>
                  <div style={s.weekRowLeft}>
                    <span style={{ ...s.weekDayLabel, color: isT ? '#B11F39' : i === 0 ? '#B11F39' : '#555' }}>{DAY_KO[i]}</span>
                    <span style={{ ...s.weekDateLabel, color: isSel ? '#0A0A0A' : '#999' }}>{d.date.getMonth() + 1}/{d.date.getDate()}</span>
                  </div>
                  <div style={s.weekRowRight}>
                    {d.count > 0 ? (
                      <>
                        <span style={s.weekRowCount}>{d.count}건</span>
                        <span style={s.weekRowKg}>{d.kg}kg</span>
                      </>
                    ) : (
                      <span style={s.weekRowEmpty}>-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button style={s.historyLink} onClick={() => router.push('/worker/production')}>
            <span>생산 이력 전체 보기</span>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  topRight: { display: 'flex', alignItems: 'center', gap: 8 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  todayTag: { fontSize: 11, fontWeight: 600, color: '#B11F39', background: '#FDF2F4', padding: '3px 10px', borderRadius: 20, border: '1px solid #F5D0D6' },
  todayBtn: { padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#666', background: '#F5F5F5', border: '1px solid #EEEEEE', borderRadius: 6, cursor: 'pointer' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 },
  statCard: { background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', minHeight: 120 },
  statCardDark: { background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  statTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  statIconWrap: { width: 28, height: 28, borderRadius: 7, background: '#FDF2F4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: '#999', fontWeight: 500 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.5, marginBottom: 4, display: 'flex', alignItems: 'baseline' },
  statUnit: { fontSize: 14, fontWeight: 500, marginLeft: 2, color: '#CCC' },
  statSub: { fontSize: 11, color: '#CCC' },

  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'start' },

  // 카테고리 카드
  categoryCol: { display: 'flex', flexDirection: 'column', gap: 10 },
  filterRow: { display: 'flex', gap: 4, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer' },
  filterBtnActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  filterCount: { fontSize: 10, fontWeight: 700, color: '#CCC', background: '#F0F0F0', borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  filterCountActive: { color: '#fff', background: 'rgba(255,255,255,0.2)' },
  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 380px)' },
  tableWrap: { overflowX: 'auto', flex: 1 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 20px', borderTop: '1px solid #F0F0F0', marginTop: 'auto' },
  pageBtn: { width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageNum: { width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 600 },
  th: { padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, color: '#AAA', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '12px 16px', fontSize: 13, color: '#333' },
  tdId: { padding: '12px 16px', fontSize: 12, color: '#999', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  tdName: { padding: '12px 16px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMono: { padding: '12px 16px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: { display: 'inline-block', padding: '4px 0', width: 56, textAlign: 'center' as const, borderRadius: 6, fontSize: 11, fontWeight: 600, borderStyle: 'solid', borderWidth: 1 },
  emptyRow: { padding: '48px 16px', textAlign: 'center' as const },
  emptyContent: { display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, color: '#CCC', fontSize: 13 },
  actionBtns: { display: 'flex', gap: 4, justifyContent: 'center' },
  startBtn: { padding: '5px 12px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  completeBtn: { padding: '5px 12px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  shipBtn: { padding: '5px 12px', background: '#fff', color: '#B11F39', border: '1px solid #F5D0D6', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },


  // 이번 주
  weekCard: {
    background: '#fff', borderRadius: 12, padding: '16px 18px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  weekHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  weekTitle: { fontSize: 13, fontWeight: 700, color: '#0A0A0A' },
  weekList: { display: 'flex', flexDirection: 'column', gap: 2 },
  weekRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', borderRadius: 6, transition: 'background 0.1s',
  },
  weekRowSelected: { background: '#FDF8F9', border: '1px solid #F5D0D6' },
  weekRowLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  weekDayLabel: { fontSize: 12, fontWeight: 600, width: 16 },
  weekDateLabel: { fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" },
  weekRowRight: { display: 'flex', alignItems: 'center', gap: 8 },
  weekRowCount: { fontSize: 12, fontWeight: 600, color: '#0A0A0A' },
  weekRowKg: { fontSize: 11, color: '#999', fontFamily: "'Space Grotesk', sans-serif" },
  weekRowEmpty: { fontSize: 12, color: '#DDD' },
  historyLink: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '8px 0', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 6,
    fontSize: 11, fontWeight: 500, color: '#999', cursor: 'pointer',
  },
};
