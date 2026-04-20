'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import useIsMobile from '@/hooks/useIsMobile';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const PRESETS = [5, 10, 20, 30, 50];

const STATUS_STYLE: Record<string, { color: string }> = {
  PENDING: { color: '#B11F39' }, IN_PROGRESS: { color: '#0A0A0A' },
  CONFIRMED: { color: '#555' }, COMPLETED: { color: '#888' }, CANCELLED: { color: '#AAA' },
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소',
};

interface EquipmentSlot { equipment_id: number; name: string; type: string; available_capacity: number; max_capacity: number; }
interface Holiday { holiday_date: string; reason: string; }

// 가용 상태 계산
function getAvailability(info: { available: number; total: number; canFit?: boolean } | undefined, hasFilter: boolean) {
  if (!info || info.total === 0) return { count: 0, level: 'none' as const, label: '' };

  // 필터가 있으면 canFit (분할 배정 시뮬레이션 결과) 기준
  if (hasFilter) {
    if (info.canFit === false || info.available === 0) return { count: 0, level: 'none' as const, label: '불가' };
    if (info.available <= 3) return { count: info.available, level: 'limited' as const, label: '가능 (여유 적음)' };
    return { count: info.available, level: 'available' as const, label: '가능' };
  }

  // 필터 없으면 기존 로직
  if (info.available === 0) return { count: 0, level: 'none' as const, label: '마감' };
  if (info.available <= 2) return { count: info.available, level: 'limited' as const, label: `${info.available}대 가능` };
  return { count: info.available, level: 'available' as const, label: `${info.available}대 가능` };
}

const AVAIL_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  available: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  limited:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  none:      { color: '#CCC', bg: '#FAFAFA', border: '#F0F0F0' },
};

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, { available: number; total: number; canFit?: boolean }>>({});
  const [holidays, setHolidays] = useState<Record<string, Holiday>>({});
  const [filterKg, setFilterKg] = useState<number | null>(null);
  const [customKg, setCustomKg] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

    Promise.all([
      api.get(`/reservations/my?date_from=${start}&date_to=${end}`),
      api.get(`/holidays?year=${year}&month=${month + 1}`),
      api.get(`/reservations/available-slots?start_date=${start}&end_date=${end}${filterKg ? `&min_kg=${filterKg}` : ''}`),
    ]).then(([resvRes, holidayRes, slotsRes]) => {
      setReservations(resvRes.data.data || []);
      const hMap: Record<string, Holiday> = {};
      for (const h of (holidayRes.data.data || []) as Holiday[]) hMap[h.holiday_date] = h;
      setHolidays(hMap);
      // 범위 응답: { "2026-04-01": { available: 20, total: 23 }, ... }
      setSlotsByDate(slotsRes.data.data || {});
    }).catch(() => {});
  }, [year, month, filterKg]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  if (!user) return null;

  const getDayReservations = (date: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return reservations.filter(r => r.scheduled_date?.startsWith(d));
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  // 마지막 줄이 전부 null이면 제거 (불필요한 빈 줄)
  if (weeks.length > 0 && weeks[weeks.length - 1].every(d => d === null)) weeks.pop();

  const today = new Date();
  const isToday = (d: number | null) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const maxMonth = today.getMonth() + 1;
  const maxYear = today.getFullYear() + (maxMonth > 11 ? 1 : 0);
  const normalizedMaxMonth = maxMonth % 12;
  const canGoNext = year < maxYear || (year === maxYear && month < normalizedMaxMonth);

  const handlePreset = (kg: number) => {
    if (filterKg === kg) { setFilterKg(null); setCustomKg(''); }
    else { setFilterKg(kg); setCustomKg(''); }
  };
  const handleCustomKg = () => {
    const v = parseInt(customKg);
    if (v > 0) setFilterKg(v);
  };
  const clearFilter = () => { setFilterKg(null); setCustomKg(''); };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (holidays[dateStr]) { showToast(`휴무일입니다${holidays[dateStr].reason ? ` — ${holidays[dateStr].reason}` : ''}`); return; }
    const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isPast) return;
    if (filterKg) {
      const slotInfo = slotsByDate[dateStr];
      const avail = getAvailability(slotInfo, true);
      if (avail.level === 'none') {
        showToast(`${filterKg}kg를 처리할 수 있는 기기가 없습니다`);
        return;
      }
    }
    const query = filterKg ? `?date=${dateStr}&kg=${filterKg}` : `?date=${dateStr}`;
    router.push(`/reservation/new${query}`);
  };

  return (
    <Layout
      title=""
      action={
        <div style={st.topBar}>
          <h1 style={st.pageTitle}>예약 캘린더</h1>
          <button onClick={() => router.push('/reservation/new')} style={st.actionBtn}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>예약 신청</span>
          </button>
        </div>
      }
    >
      {/* 용량 필터 */}
      <div style={st.filterCard}>
        <div style={st.filterTop}>
          <div style={st.filterLabel}>
            {Icons.settings({ size: 14, color: '#999' })}
            <span>생산할 용량을 선택하세요</span>
          </div>
          {filterKg && (
            <button style={st.filterClear} onClick={clearFilter}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
              필터 해제
            </button>
          )}
        </div>
        <div style={st.filterRow}>
          <div style={st.presets}>
            {PRESETS.map(kg => (
              <button
                key={kg}
                style={{ ...st.presetBtn, ...(filterKg === kg ? st.presetActive : {}) }}
                onClick={() => handlePreset(kg)}
              >
                {kg}kg
              </button>
            ))}
          </div>
          <div style={st.customInput}>
            <input
              type="number"
              placeholder="직접 입력"
              value={customKg}
              onChange={e => setCustomKg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomKg()}
              style={st.kgInput}
            />
            <span style={st.kgUnit}>kg</span>
            <button style={st.kgApply} onClick={handleCustomKg}>적용</button>
          </div>
        </div>
        {filterKg && (
          <div style={st.filterInfo}>
            <span style={st.filterInfoDot} />
            <span>{filterKg}kg 이상 처리 가능한 기기만 표시 중</span>
          </div>
        )}
      </div>

      {/* 월 네비게이션 */}
      <div style={st.monthNav}>
        <div style={st.monthNavLeft}>
          <button style={st.navBtn} onClick={() => setCurrent(new Date(year, month - 1))}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span style={st.monthLabel}>{year}년 {month + 1}월</span>
          <button
            style={{ ...st.navBtn, opacity: canGoNext ? 1 : 0.25, pointerEvents: canGoNext ? 'auto' : 'none' }}
            onClick={() => canGoNext && setCurrent(new Date(year, month + 1))}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button style={st.todayBtn} onClick={() => setCurrent(new Date())}>오늘</button>
        </div>
        <div style={st.legend}>
          {filterKg && <>
            <span style={st.legendItem}><span style={{ ...st.legendDot, background: '#16A34A' }} />가능</span>
            <span style={st.legendItem}><span style={{ ...st.legendDot, background: '#D97706' }} />여유 적음</span>
          </>}
          <span style={st.legendItem}><span style={{ ...st.legendDot, background: '#DDD' }} />불가</span>
        </div>
      </div>

      {/* 캘린더 */}
      <div style={st.calendarCard}>
        <div style={st.dayHeader}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ ...st.dayName, color: i === 0 ? '#B11F39' : i === 6 ? '#666' : '#999' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={st.week}>
            {Array(7).fill(null).map((_, di) => {
              const day = week[di] ?? null;
              const dayReservs = day ? getDayReservations(day) : [];
              const isPast = day !== null && new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const isHoliday = dateStr ? !!holidays[dateStr] : false;
              const slotInfo = dateStr ? slotsByDate[dateStr] : undefined;
              const avail = day && !isPast && !isHoliday ? getAvailability(slotInfo, !!filterKg) : null;
              const ac = avail ? AVAIL_COLOR[avail.level] : null;
              // 필터 없으면 미래 날짜는 모두 클릭 가능, 필터 있으면 가능한 날만
              const isClickable = day !== null && !isPast && !isHoliday && (filterKg ? avail?.level !== 'none' : true);

              return (
                <div
                  key={di}
                  style={{
                    ...st.cell,
                    background: isHoliday ? '#FAFAFA' : isToday(day) ? '#FDF8F9' : '#fff',
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: day === null ? 0.15 : isPast ? 0.3 : (filterKg && avail?.level === 'none' && !isHoliday ? 0.4 : 1),
                    borderRight: di < 6 ? '1px solid #F0F0F0' : 'none',
                    borderBottom: wi < weeks.length - 1 ? '1px solid #F0F0F0' : 'none',
                  }}
                  onClick={() => isClickable && handleDayClick(day!)}
                >
                  {day !== null && (
                    <>
                      <div style={st.dayTopRow}>
                        <span style={{
                          ...st.dayNum,
                          color: di === 0 ? '#B11F39' : di === 6 ? '#666' : '#333',
                          ...(isToday(day) ? st.todayNum : {}),
                        }}>{day}</span>
                        {isHoliday && <span style={st.holidayTag}>휴무</span>}
                        {filterKg && avail && !isHoliday && avail.label && (
                          <span style={{ ...st.availTag, color: ac!.color, background: ac!.bg, border: `1px solid ${ac!.border}` }}>
                            {avail.label}
                          </span>
                        )}
                      </div>
                      <div style={st.reservList}>
                        {dayReservs.slice(0, 2).map((r: any) => {
                          const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                          return (
                            <div key={r.reservation_id} style={{ ...st.myReserv, borderLeftColor: ss.color }}>
                              <span style={st.myReservKg}>{r.kg_amount}kg</span>
                              <span style={{ ...st.myReservStatus, color: ss.color }}>{STATUS_LABEL[r.status]}</span>
                            </div>
                          );
                        })}
                        {dayReservs.length > 2 && <span style={st.moreCount}>+{dayReservs.length - 2}</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {toast && <div style={st.toast}>{toast}</div>}
    </Layout>
  );
}

const st: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },

  // ── 용량 필터 ──
  filterCard: {
    background: '#fff', borderRadius: 10, padding: '10px 16px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    marginBottom: 8,
  },
  filterTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  filterLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#555' },
  filterClear: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10, color: '#999', background: 'none', border: '1px solid #E8E8E8',
    borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  presets: { display: 'flex', gap: 4 },
  presetBtn: {
    padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#666',
    background: '#F5F5F5', border: '1px solid #EEEEEE', borderRadius: 6,
    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
    transition: 'all 0.15s',
  },
  presetActive: { background: '#0A0A0A', color: '#fff', border: '1px solid #0A0A0A' },
  customInput: {
    display: 'flex', alignItems: 'center',
    border: '1px solid #EEEEEE', borderRadius: 6, overflow: 'hidden',
    background: '#FAFAFA',
  },
  kgInput: {
    width: 80, padding: '5px 8px', border: 'none', background: 'transparent',
    fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
    color: '#333',
  },
  kgUnit: { fontSize: 10, color: '#AAA', fontWeight: 500, paddingRight: 4 },
  kgApply: {
    padding: '5px 10px', background: '#F0F0F0', border: 'none', borderLeft: '1px solid #EEEEEE',
    fontSize: 10, fontWeight: 600, color: '#555', cursor: 'pointer',
  },
  filterInfo: {
    display: 'flex', alignItems: 'center', gap: 5,
    marginTop: 6, fontSize: 10, color: '#B11F39', fontWeight: 500,
  },
  filterInfoDot: { width: 5, height: 5, borderRadius: '50%', background: '#B11F39', flexShrink: 0 },

  // ── 월 네비 ──
  monthNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 },
  monthNavLeft: { display: 'flex', alignItems: 'center', gap: 6 },
  navBtn: {
    width: 28, height: 28, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 6,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
  },
  monthLabel: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', minWidth: 90, textAlign: 'center', letterSpacing: -0.3 },
  todayBtn: {
    padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#666',
    background: '#F5F5F5', border: '1px solid #EEEEEE', borderRadius: 5, cursor: 'pointer', marginLeft: 2,
  },
  legend: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#999', fontWeight: 500 },
  legendDot: { width: 6, height: 6, borderRadius: '50%' },

  // ── 캘린더 ──
  calendarCard: {
    background: '#fff', borderRadius: 10, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    flex: 1, display: 'flex', flexDirection: 'column',
  },
  dayHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F0F0F0' },
  dayName: { padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, background: '#FAFAFA', textTransform: 'uppercase' },
  week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 },
  cell: { padding: '8px 8px', display: 'flex', flexDirection: 'column' },

  dayTopRow: { display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4, flexWrap: 'wrap' },
  dayNum: { fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" },
  todayNum: {
    color: '#fff', fontWeight: 700, background: '#B11F39', borderRadius: '50%',
    width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
  },
  holidayTag: { fontSize: 11, fontWeight: 600, color: '#999', background: '#F0F0F0', borderRadius: 3, padding: '1px 4px', border: '1px solid #E8E8E8' },
  availTag: { fontSize: 11, fontWeight: 600, borderRadius: 3, padding: '1px 5px', marginLeft: 'auto' },

  reservList: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  myReserv: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '3px 6px', borderRadius: 3, background: '#FAFAFA', borderLeft: '2px solid #CCC', fontSize: 12,
  },
  myReservKg: { fontWeight: 600, color: '#333', fontFamily: "'Space Grotesk', sans-serif" },
  myReservStatus: { fontWeight: 600, fontSize: 11 },
  moreCount: { fontSize: 11, color: '#CCC', fontWeight: 500, paddingLeft: 3 },

  toast: {
    position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
    background: '#0A0A0A', color: '#fff', padding: '10px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 500, zIndex: 2000, pointerEvents: 'none', whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
};
