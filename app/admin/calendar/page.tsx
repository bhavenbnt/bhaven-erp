'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const STATUS_STYLE: Record<string, { color: string }> = {
  PENDING: { color: '#B11F39' }, IN_PROGRESS: { color: '#0A0A0A' },
  CONFIRMED: { color: '#555' }, COMPLETED: { color: '#888' }, CANCELLED: { color: '#AAA' },
};
const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };

interface Holiday { holiday_id: number; holiday_date: string; reason: string; }

export default function AdminCalendar() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Record<string, Holiday>>({});
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/equipment').then(({ data }: any) => setEquipmentList(data.data || [])).catch(() => {});
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();

  const loadData = () => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    Promise.all([
      api.get(`/reservations?date_from=${start}&date_to=${end}`),
      api.get(`/holidays?year=${year}&month=${month + 1}`),
    ]).then(([resvRes, holRes]) => {
      setReservations((resvRes as any).data.data || []);
      const hMap: Record<string, Holiday> = {};
      for (const h of ((holRes as any).data.data || []) as Holiday[]) hMap[h.holiday_date] = h;
      setHolidays(hMap);
    }).catch(() => {});
  };

  useEffect(() => { loadData(); }, [year, month]);

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
    if (holidays[d]) return; // 휴무일은 예약관리로 안 감
    router.push(`/admin/reservations?date=${d}`);
  };

  const addHoliday = async () => {
    if (!holidayDate) return;
    try {
      await api.post('/holidays', { holiday_date: holidayDate, reason: holidayReason });
      setHolidayDate(''); setHolidayReason(''); setShowHolidayForm(false);
      setToast('휴무일이 등록되었습니다');
      setTimeout(() => setToast(''), 3000);
      loadData();
    } catch (e: any) { setToast(e.response?.data?.error || '등록 실패'); setTimeout(() => setToast(''), 3000); }
  };

  const removeHoliday = async (id: number) => {
    try {
      await api.delete(`/holidays/${id}`);
      setToast('휴무일이 삭제되었습니다');
      setTimeout(() => setToast(''), 3000);
      loadData();
    } catch { setToast('삭제 실패'); setTimeout(() => setToast(''), 3000); }
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const maxEnd = new Date(); maxEnd.setMonth(maxEnd.getMonth() + 6, 0);
  const maxDate = maxEnd.toISOString().split('T')[0];

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>생산 캘린더</h1>
          <button style={s.holidayBtn} onClick={() => setShowHolidayForm(v => !v)}>
            {Icons.calendarOff({ size: 13, color: showHolidayForm ? '#B11F39' : '#999' })}
            <span>휴무일 관리</span>
          </button>
        </div>
      }
    >
      {/* 휴무일 등록 폼 */}
      {showHolidayForm && (
        <div style={s.holidayCard}>
          <div style={s.holidayFormRow}>
            <div style={s.holidayField}>
              <label style={s.label}>휴무 날짜</label>
              <DatePicker value={holidayDate} onChange={setHolidayDate} minDate={minDate} maxDate={maxDate} />
            </div>
            <div style={{ ...s.holidayField, flex: 2 }}>
              <label style={s.label}>사유</label>
              <input style={s.input} placeholder="예: 설날 연휴, 설비 점검" value={holidayReason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHolidayReason(e.target.value)} />
            </div>
            <button style={s.holidayAddBtn} onClick={addHoliday}>등록</button>
          </div>
          {Object.values(holidays).length > 0 && (
            <div style={s.holidayList}>
              {Object.values(holidays).map(h => (
                <div key={h.holiday_id} style={s.holidayItem}>
                  <span style={s.holidayItemDate}>{h.holiday_date}</span>
                  <span style={s.holidayItemReason}>{h.reason || '-'}</span>
                  <button style={s.holidayDeleteBtn} onClick={() => removeHoliday(h.holiday_id)}>
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            <span style={s.legendItem}><span style={s.legendRect} />휴무</span>
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
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const isHoliday = dateStr ? !!holidays[dateStr] : false;
              const dayReservs = day ? getDayReservs(day) : [];
              const totalKg = dayReservs.reduce((sum, r) => sum + (r.kg_amount ?? 0), 0);

              return (
                <div
                  key={di}
                  style={{
                    ...s.cell,
                    background: isHoliday ? '#FAFAFA' : isToday(day) ? '#FDF8F9' : '#fff',
                    cursor: day && !isHoliday ? 'pointer' : 'default',
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
                        {isHoliday && <span style={s.holidayTag}>휴무</span>}
                        {!isHoliday && totalKg > 0 && <span style={s.kgBadge}>{totalKg}kg</span>}
                      </div>
                      {!isHoliday && (
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
                      )}
                      {isHoliday && (
                        <span style={s.holidayReason}>{holidays[dateStr].reason || ''}</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  holidayBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', background: '#fff', border: '1px solid #EEEEEE',
    borderRadius: 7, fontSize: 12, fontWeight: 500, color: '#666', cursor: 'pointer',
  },

  // ── 휴무일 폼 ──
  holidayCard: {
    background: '#fff', borderRadius: 10, padding: '14px 18px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 10,
  },
  holidayFormRow: { display: 'flex', gap: 12, alignItems: 'flex-end' },
  holidayField: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  input: {
    padding: '0 12px', border: '1px solid #EEEEEE', borderRadius: 7,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38,
  },
  holidayAddBtn: {
    padding: '0 20px', height: 38, background: '#0A0A0A', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  },
  holidayList: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  holidayItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 6,
  },
  holidayItemDate: { fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Space Grotesk', monospace" },
  holidayItemReason: { fontSize: 11, color: '#999' },
  holidayDeleteBtn: {
    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F0F0F0', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#999',
  },

  // ── 월 네비 ──
  monthNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
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
  equipSelect: { border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#333', cursor: 'pointer' },
  legend: { display: 'flex', gap: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#999', fontWeight: 500 },
  legendDot: { width: 6, height: 6, borderRadius: '50%' },
  legendRect: { width: 14, height: 7, borderRadius: 2, background: '#F0F0F0', border: '1px solid #E0E0E0' },

  // ── 캘린더 ──
  calendarCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    flex: 1, display: 'flex', flexDirection: 'column',
  },
  dayHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F0F0F0' },
  dayName: { padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, background: '#FAFAFA' },
  week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 },
  cell: { padding: '8px 8px', display: 'flex', flexDirection: 'column', minHeight: 96 },

  dayTopRow: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 },
  dayNum: { fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" },
  todayNum: {
    color: '#fff', fontWeight: 700, background: '#B11F39', borderRadius: '50%',
    width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
  },
  holidayTag: {
    fontSize: 11, fontWeight: 600, color: '#999', background: '#F0F0F0',
    borderRadius: 3, padding: '1px 4px', border: '1px solid #E8E8E8',
  },
  holidayReason: { fontSize: 11, color: '#CCC', marginTop: 2 },
  kgBadge: {
    fontSize: 11, fontWeight: 700, color: '#B11F39', background: '#FDF2F4',
    borderRadius: 10, padding: '1px 6px', marginLeft: 'auto',
    border: '1px solid #F5D0D6',
  },

  reservList: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  reservBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '3px 6px', borderRadius: 3, background: '#FAFAFA',
    borderLeft: '2px solid #CCC', fontSize: 12,
  },
  reservEquip: { fontWeight: 600, color: '#333' },
  reservStatus: { fontWeight: 600, fontSize: 11 },
  moreCount: { fontSize: 11, color: '#CCC', fontWeight: 500, paddingLeft: 4 },

  toast: {
    position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
    background: '#0A0A0A', color: '#fff', padding: '10px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 500, zIndex: 2000, pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
};
