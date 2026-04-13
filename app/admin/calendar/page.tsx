'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0' },
  CONFIRMED:   { color: '#555', bg: '#F5F5F5' },
  COMPLETED:   { color: '#888', bg: '#F8F8F8' },
  CANCELLED:   { color: '#AAA', bg: '#FAFAFA' },
};
const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };

export default function AdminCalendar() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/equipment').then(({ data }: any) => setEquipmentList(data.data || [])).catch(() => {});
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    api.get(`/reservations?date_from=${start}&date_to=${end}`)
      .then(({ data }: any) => setReservations(data.data || []))
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

  const getDayReservs = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.filter((r: any) => {
      if (!r.scheduled_date?.startsWith(d)) return false;
      if (r.status === 'CANCELLED') return false;
      if (selectedEquipmentId !== null && r.equipment_id !== selectedEquipmentId) return false;
      return true;
    });
  };

  const handleDayClick = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    router.push(`/admin/reservations?date=${d}`);
  };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>생산 캘린더</h1>
        </div>
      }
    >
      {/* 월 네비 + 필터 */}
      <div style={s.monthNav}>
        <div style={s.monthNavLeft}>
          <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month - 1))}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span style={s.monthLabel}>{year}년 {month + 1}월</span>
          <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month + 1))}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button style={s.todayBtn} onClick={() => setCurrent(new Date())}>오늘</button>
        </div>
        <div style={s.filterRow}>
          <div style={s.equipFilter}>
            {Icons.settings({ size: 13, color: '#999' })}
            <select style={s.equipSelect} value={selectedEquipmentId ?? ''}
              onChange={(e) => setSelectedEquipmentId(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">전체 기기</option>
              {equipmentList.filter(e => e.status === 'NORMAL').map((eq: any) => (
                <option key={eq.equipment_id} value={eq.equipment_id}>{eq.name}</option>
              ))}
            </select>
          </div>
          <div style={s.legend}>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#B11F39' }} />대기</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#0A0A0A' }} />생산중</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#888' }} />완료</span>
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <div style={s.calendarCard}>
        <div style={s.dayHeader}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ ...s.dayName, color: i === 0 ? '#B11F39' : i === 6 ? '#666' : '#999' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={s.week}>
            {Array(7).fill(null).map((_, di) => {
              const day = week[di] ?? null;
              const dayReservs = day ? getDayReservs(day) : [];
              const totalKg = dayReservs.reduce((sum, r) => sum + (r.kg_amount ?? 0), 0);

              return (
                <div
                  key={di}
                  style={{
                    ...s.cell,
                    background: isToday(day) ? '#FDF8F9' : '#fff',
                    cursor: day ? 'pointer' : 'default',
                    opacity: day === null ? 0.15 : 1,
                    borderRight: di < 6 ? '1px solid #F0F0F0' : 'none',
                    borderBottom: wi < weeks.length - 1 ? '1px solid #F0F0F0' : 'none',
                  }}
                  onClick={() => day && handleDayClick(day)}
                >
                  {day !== null && (
                    <>
                      <div style={s.dayTopRow}>
                        <span style={{
                          ...s.dayNum,
                          color: di === 0 ? '#B11F39' : di === 6 ? '#666' : '#333',
                          ...(isToday(day) ? s.todayNum : {}),
                        }}>{day}</span>
                        {totalKg > 0 && <span style={s.kgBadge}>{totalKg}kg</span>}
                      </div>
                      <div style={s.reservList}>
                        {dayReservs.slice(0, 2).map((r: any) => {
                          const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                          return (
                            <div key={r.reservation_id} style={{ ...s.reservBadge, borderLeftColor: ss.color }}>
                              <span style={s.reservEquip}>{r.equipment?.name}</span>
                              <span style={{ ...s.reservStatus, color: ss.color }}>{STATUS_LABEL[r.status]}</span>
                            </div>
                          );
                        })}
                        {dayReservs.length > 2 && <span style={s.moreCount}>+{dayReservs.length - 2}</span>}
                      </div>
                    </>
                  )}
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
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },

  // ── 월 네비 ──
  monthNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  monthNavLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 8,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
  },
  monthLabel: { fontSize: 16, fontWeight: 700, color: '#0A0A0A', minWidth: 100, textAlign: 'center', letterSpacing: -0.3 },
  todayBtn: {
    padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#666',
    background: '#F5F5F5', border: '1px solid #EEEEEE', borderRadius: 6, cursor: 'pointer', marginLeft: 4,
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: 14 },
  equipFilter: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '0 12px', height: 34, background: '#fff', borderRadius: 8, border: '1px solid #EEEEEE',
  },
  equipSelect: {
    border: 'none', background: 'transparent', outline: 'none',
    fontSize: 13, color: '#333', cursor: 'pointer',
  },
  legend: { display: 'flex', gap: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#999', fontWeight: 500 },
  legendDot: { width: 6, height: 6, borderRadius: '50%' },

  // ── 캘린더 ──
  calendarCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    flex: 1, display: 'flex', flexDirection: 'column',
  },
  dayHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F0F0F0' },
  dayName: { padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, background: '#FAFAFA' },
  week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 },
  cell: { padding: '8px 6px', display: 'flex', flexDirection: 'column', minHeight: 90 },

  dayTopRow: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 },
  dayNum: { fontSize: 12, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" },
  todayNum: {
    color: '#fff', fontWeight: 700, background: '#B11F39', borderRadius: '50%',
    width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
  },
  kgBadge: {
    fontSize: 9, fontWeight: 700, color: '#B11F39', background: '#FDF2F4',
    borderRadius: 10, padding: '1px 6px', marginLeft: 'auto',
    border: '1px solid #F5D0D6',
  },

  reservList: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  reservBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '3px 6px', borderRadius: 3, background: '#FAFAFA',
    borderLeft: '2px solid #CCC', fontSize: 9,
  },
  reservEquip: { fontWeight: 600, color: '#333' },
  reservStatus: { fontWeight: 600, fontSize: 8 },
  moreCount: { fontSize: 9, color: '#CCC', fontWeight: 500, paddingLeft: 4 },
};
