'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

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
  const [todayList, setTodayList] = useState<any[]>([]);
  const [tomorrowCount, setTomorrowCount] = useState(0);
  const [weekData, setWeekData] = useState<{ date: Date; count: number; kg: number }[]>([]);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker' && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => {
    // 오늘
    api.get(`/reservations?date_from=${todayStr}&date_to=${todayStr}`)
      .then(({ data }: any) => setTodayList((data.data || []).filter((r: any) => r.status !== 'CANCELLED')))
      .catch(() => {});

    // 내일
    const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
    const tmrStr = tmr.toISOString().split('T')[0];
    api.get(`/reservations?date_from=${tmrStr}&date_to=${tmrStr}`)
      .then(({ data }: any) => setTomorrowCount((data.data || []).filter((r: any) => r.status !== 'CANCELLED').length))
      .catch(() => {});

    // 이번 주 (일~토)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    api.get(`/reservations?date_from=${weekStart.toISOString().split('T')[0]}&date_to=${weekEnd.toISOString().split('T')[0]}`)
      .then(({ data }: any) => {
        const all = (data.data || []).filter((r: any) => r.status !== 'CANCELLED');
        const week = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          const ds = d.toISOString().split('T')[0];
          const items = all.filter((r: any) => r.scheduled_date === ds);
          return { date: d, count: items.length, kg: items.reduce((s: number, r: any) => s + (r.kg_amount || 0), 0) };
        });
        setWeekData(week);
      }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  if (!user) return null;

  const total = todayList.length;
  const inProgress = todayList.filter(r => r.status === 'IN_PROGRESS').length;
  const completed = todayList.filter(r => r.status === 'COMPLETED').length;
  const totalKg = todayList.reduce((sum, r) => sum + (r.kg_amount || 0), 0);
  const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const maxWeekKg = Math.max(...weekData.map(d => d.kg), 1);

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
            <span style={s.dateBadge}>{Icons.calendar({ size: 12, color: '#999' })}<span>{dateStr}</span></span>
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
        {/* 오늘 생산 테이블 */}
        <div style={s.tableCard}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>오늘의 생산</span>
            <span style={s.countBadge}>{total}건</span>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>기기</th>
                  <th style={s.th}>업체</th>
                  <th style={s.th}>제품</th>
                  <th style={s.th}>중량</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {todayList.length === 0 && (
                  <tr><td colSpan={7} style={s.emptyRow}>
                    <div style={s.emptyContent}>{Icons.factory({ size: 24, color: '#DDD' })}<span>오늘 예정된 작업이 없습니다</span></div>
                  </td></tr>
                )}
                {todayList.map((r: any) => {
                  const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                  return (
                    <tr key={r.reservation_id} style={s.tr}>
                      <td style={s.tdId}>{r.reservation_id}</td>
                      <td style={s.tdName}>{r.equipment?.name || '-'}</td>
                      <td style={s.td}>{r.users?.company_name || r.users?.name || '-'}</td>
                      <td style={s.td}>{r.products?.product_name || '-'}</td>
                      <td style={s.tdMono}>{r.kg_amount}kg</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>{STATUS_LABEL[r.status]}</span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <div style={s.actionBtns}>
                          {r.status === 'CONFIRMED' && <button style={s.startBtn} onClick={() => handleStatus(r.reservation_id, 'IN_PROGRESS')}>생산 시작</button>}
                          {r.status === 'IN_PROGRESS' && <button style={s.completeBtn} onClick={() => handleStatus(r.reservation_id, 'COMPLETED')}>완료</button>}
                          {(r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') && <button style={s.shipBtn} onClick={() => router.push(`/worker/shipment/${r.reservation_id}`)}>출고</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 이번 주 미리보기 */}
        <div style={s.weekCard}>
          <div style={s.weekHeader}>
            {Icons.calendar({ size: 13, color: '#999' })}
            <span style={s.weekTitle}>이번 주</span>
          </div>
          <div style={s.weekGrid}>
            {weekData.map((d, i) => {
              const ds = d.date.toISOString().split('T')[0];
              const isT = ds === todayStr;
              const barH = d.kg > 0 ? Math.max((d.kg / maxWeekKg) * 48, 4) : 0;
              return (
                <div key={i} style={{ ...s.weekDay, cursor: d.count > 0 ? 'pointer' : 'default' }}
                  onClick={() => d.count > 0 && router.push(`/worker/production/${ds}`)}>
                  <div style={s.weekBarWrap}>
                    <div style={{ ...s.weekBar, height: barH, background: isT ? '#B11F39' : '#E0E0E0' }} />
                  </div>
                  <span style={{ ...s.weekKg, color: d.kg > 0 ? '#555' : '#DDD' }}>{d.kg > 0 ? `${d.kg}` : '-'}</span>
                  <span style={{ ...s.weekDayLabel, color: isT ? '#B11F39' : i === 0 ? '#B11F39' : '#999', fontWeight: isT ? 700 : 500 }}>{DAY_KO[i]}</span>
                  <span style={{ ...s.weekDate, color: isT ? '#0A0A0A' : '#BBB', fontWeight: isT ? 700 : 400 }}>{d.date.getDate()}</span>
                  {d.count > 0 && <span style={{ ...s.weekCount, background: isT ? '#B11F39' : '#F0F0F0', color: isT ? '#fff' : '#888' }}>{d.count}</span>}
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
  topLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  dateBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#999', fontWeight: 500, padding: '4px 10px', borderRadius: 20, background: '#F5F5F5' },

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

  // 테이블
  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #F0F0F0' },
  tableTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },
  countBadge: { fontSize: 10, fontWeight: 700, color: '#B11F39', background: '#FDF2F4', borderRadius: 10, padding: '2px 7px', border: '1px solid #F5D0D6' },
  tableWrap: { overflowX: 'auto' },
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
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  weekHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  weekTitle: { fontSize: 13, fontWeight: 700, color: '#0A0A0A' },
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  weekDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  weekBarWrap: { height: 48, display: 'flex', alignItems: 'flex-end' },
  weekBar: { width: 16, borderRadius: 3 },
  weekKg: { fontSize: 9, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" },
  weekDayLabel: { fontSize: 10 },
  weekDate: { fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" },
  weekCount: { fontSize: 9, fontWeight: 700, borderRadius: 8, padding: '1px 5px', minWidth: 16, textAlign: 'center' },
  historyLink: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '8px 0', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 6,
    fontSize: 11, fontWeight: 500, color: '#999', cursor: 'pointer',
  },
};
