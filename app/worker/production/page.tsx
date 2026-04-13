'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const STATUS_STYLE: Record<string, { color: string }> = {
  PENDING: { color: '#B11F39' }, IN_PROGRESS: { color: '#0A0A0A' },
  CONFIRMED: { color: '#555' }, COMPLETED: { color: '#888' },
};

export default function WorkerProduction() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker' && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    api.get(`/reservations?date_from=${start}&date_to=${end}`)
      .then(({ data }: any) => setReservations((data.data || []).filter((r: any) => r.status !== 'CANCELLED')))
      .catch(() => {});
  }, [year, month]);

  if (!user) return null;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  if (weeks.length > 0 && weeks[weeks.length - 1].every(d => d === null)) weeks.pop();

  const today = new Date();
  const isToday = (d: number | null) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getDayData = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items = reservations.filter(r => r.scheduled_date?.startsWith(d));
    return { count: items.length, kg: items.reduce((s, r) => s + (r.kg_amount || 0), 0), items };
  };

  const monthTotal = reservations.length;
  const monthKg = reservations.reduce((s, r) => s + (r.kg_amount || 0), 0);
  const monthCompleted = reservations.filter(r => r.status === 'COMPLETED').length;
  const completionRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

  return (
    <Layout title="" action={<div style={s.topBar}><h1 style={s.pageTitle}>생산 이력</h1></div>}>
      {/* 월간 통계 */}
      <div style={s.statsRow}>
        <div style={s.statCard}><span style={s.statLabel}>이번 달 생산</span><span style={s.statValue}>{monthTotal}<span style={s.statUnit}>건</span></span></div>
        <div style={s.statCard}><span style={s.statLabel}>총 중량</span><span style={s.statValue}>{monthKg}<span style={s.statUnit}>kg</span></span></div>
        <div style={s.statCard}><span style={s.statLabel}>완료율</span><span style={{ ...s.statValue, color: '#B11F39' }}>{completionRate}<span style={s.statUnit}>%</span></span></div>
      </div>

      {/* 월 네비 */}
      <div style={s.monthNav}>
        <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month - 1))}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg></button>
        <span style={s.monthLabel}>{year}년 {month + 1}월</span>
        <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month + 1))}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg></button>
        <button style={s.todayBtn} onClick={() => setCurrent(new Date())}>오늘</button>
      </div>

      {/* 캘린더 */}
      <div style={s.calendarCard}>
        <div style={s.dayHeader}>
          {DAYS.map((d, i) => <div key={d} style={{ ...s.dayName, color: i === 0 ? '#B11F39' : i === 6 ? '#666' : '#999' }}>{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={s.week}>
            {Array(7).fill(null).map((_, di) => {
              const day = week[di] ?? null;
              const data = day ? getDayData(day) : null;
              return (
                <div key={di} style={{ ...s.cell, background: isToday(day) ? '#FDF8F9' : '#fff', cursor: day && data && data.count > 0 ? 'pointer' : 'default', opacity: day === null ? 0.15 : 1, borderRight: di < 6 ? '1px solid #F0F0F0' : 'none', borderBottom: wi < weeks.length - 1 ? '1px solid #F0F0F0' : 'none' }}
                  onClick={() => day && data && data.count > 0 && router.push(`/worker/production/${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}>
                  {day !== null && (<>
                    <div style={s.dayTopRow}>
                      <span style={{ ...s.dayNum, color: di === 0 ? '#B11F39' : di === 6 ? '#666' : '#333', ...(isToday(day) ? s.todayNum : {}) }}>{day}</span>
                      {data && data.kg > 0 && <span style={s.kgBadge}>{data.kg}kg</span>}
                    </div>
                    {data && data.count > 0 && (
                      <div style={s.reservList}>
                        {data.items.slice(0, 2).map((r: any) => {
                          const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                          return <div key={r.reservation_id} style={{ ...s.reservBadge, borderLeftColor: ss.color }}><span style={s.reservEquip}>{r.equipment?.name}</span></div>;
                        })}
                        {data.count > 2 && <span style={s.moreCount}>+{data.count - 2}</span>}
                      </div>
                    )}
                  </>)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 },
  statCard: { background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#999', fontWeight: 500 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Space Grotesk', sans-serif", display: 'flex', alignItems: 'baseline' },
  statUnit: { fontSize: 12, fontWeight: 500, marginLeft: 2, color: '#CCC' },
  monthNav: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  navBtn: { width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  monthLabel: { fontSize: 16, fontWeight: 700, color: '#0A0A0A', minWidth: 100, textAlign: 'center', letterSpacing: -0.3 },
  todayBtn: { padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#666', background: '#F5F5F5', border: '1px solid #EEEEEE', borderRadius: 6, cursor: 'pointer', marginLeft: 4 },
  calendarCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', flex: 1, display: 'flex', flexDirection: 'column' },
  dayHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F0F0F0' },
  dayName: { padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, background: '#FAFAFA' },
  week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 },
  cell: { padding: '8px 6px', display: 'flex', flexDirection: 'column', minHeight: 80 },
  dayTopRow: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 },
  dayNum: { fontSize: 12, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" },
  todayNum: { color: '#fff', fontWeight: 700, background: '#B11F39', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 },
  kgBadge: { fontSize: 9, fontWeight: 700, color: '#B11F39', background: '#FDF2F4', borderRadius: 10, padding: '1px 6px', marginLeft: 'auto', border: '1px solid #F5D0D6' },
  reservList: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  reservBadge: { padding: '3px 6px', borderRadius: 3, background: '#FAFAFA', borderLeft: '2px solid #CCC', fontSize: 9 },
  reservEquip: { fontWeight: 600, color: '#333' },
  moreCount: { fontSize: 9, color: '#CCC', fontWeight: 500, paddingLeft: 4 },
};
