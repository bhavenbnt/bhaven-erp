'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import useIsMobile from '@/hooks/useIsMobile';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const STATUS_COLOR: Record<string, string> = { PENDING: '#f59e0b', CONFIRMED: '#3b82f6', IN_PROGRESS: '#10b981', COMPLETED: '#6b7280', CANCELLED: '#ef4444' };
const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '예약완료', IN_PROGRESS: '생산중', COMPLETED: '생산완료', CANCELLED: '취소' };

interface EquipmentSlot {
  equipment_id: number;
  name: string;
  available_capacity: number;
  max_capacity: number;
}

interface Holiday {
  holiday_date: string;
  reason: string;
}

interface DayModalState {
  day: number;
  dateStr: string;
  slots: EquipmentSlot[];
  anchorRect: DOMRect;
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, EquipmentSlot[]>>({});
  const [holidays, setHolidays] = useState<Record<string, Holiday>>({});
  const [modal, setModal] = useState<DayModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const slotRequests = Array.from({ length: daysInMonth }, (_, i) => {
      const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return api.get(`/reservations/available-slots?start_date=${d}&end_date=${d}`)
        .then((res) => ({ date: d, slots: res.data.data || [] as EquipmentSlot[] }))
        .catch(() => ({ date: d, slots: [] as EquipmentSlot[] }));
    });

    Promise.all([
      api.get(`/reservations/my?date_from=${start}&date_to=${end}`),
      api.get(`/holidays?year=${year}&month=${month + 1}`),
      Promise.all(slotRequests),
    ]).then(([resvRes, holidayRes, slotResults]) => {
      setReservations(resvRes.data.data || []);

      const hMap: Record<string, Holiday> = {};
      for (const h of (holidayRes.data.data || []) as Holiday[]) {
        hMap[h.holiday_date] = h;
      }
      setHolidays(hMap);

      const sMap: Record<string, EquipmentSlot[]> = {};
      for (const { date, slots } of slotResults) {
        sMap[date] = slots;
      }
      setSlotsByDate(sMap);
    }).catch(() => {});
  }, [year, month]);

  // Close modal on outside click
  useEffect(() => {
    if (!modal) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-modal="day-slots"]') && !target.closest('[data-day-cell]')) {
        setModal(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modal]);

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

  const today = new Date();
  const isToday = (d: number | null) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // 기획서 2.1: 상시 "이번달 + 다음달" 2개월치 오픈
  const maxMonth = today.getMonth() + 1; // 다음달 (0-based: +1)
  const maxYear = today.getFullYear() + (maxMonth > 11 ? 1 : 0);
  const normalizedMaxMonth = maxMonth % 12;
  const canGoNext = year < maxYear || (year === maxYear && month < normalizedMaxMonth);

  const handleDayClick = (day: number, e: React.MouseEvent<HTMLDivElement>) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // If holiday, show toast and stop
    if (holidays[dateStr]) {
      const reason = holidays[dateStr].reason;
      showToast(`휴무일입니다${reason ? `: ${reason}` : ''}`);
      return;
    }

    const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isPast) return;

    const slots = slotsByDate[dateStr] || [];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setModal({ day, dateStr, slots, anchorRect: rect });
  };

  const handleReserve = () => {
    if (!modal) return;
    setModal(null);
    router.push(`/reservation/new?date=${modal.dateStr}`);
  };

  const action = (
    <button onClick={() => router.push('/reservation/new')} style={styles.actionBtn}>+ 예약 신청</button>
  );

  return (
    <Layout title="예약 캘린더" action={action}>
      {/* 헤더 */}
      <div style={styles.calHeader}>
        <button style={styles.navBtn} onClick={() => setCurrent(new Date(year, month - 1))}>{'<'}</button>
        <span style={styles.monthLabel}>{year}년 {month + 1}월</span>
        <button style={{ ...styles.navBtn, opacity: canGoNext ? 1 : 0.3, pointerEvents: canGoNext ? 'auto' : 'none' }}
          onClick={() => canGoNext && setCurrent(new Date(year, month + 1))}>{'>'}</button>
        <div style={styles.legend}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <span key={k} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: STATUS_COLOR[k] }} />{v}
            </span>
          ))}
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#9CA3AF' }} />휴무
          </span>
        </div>
      </div>

      {/* 달력 */}
      <div style={styles.calendar}>
        <div style={styles.dayHeader}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ ...styles.dayName, color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#aaa' }}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} style={styles.week}>
            {Array(7).fill(null).map((_, di) => {
              const day = week[di];
              const dayReservs = day ? getDayReservations(day) : [];
              const isPast = day !== null && new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const isHoliday = dateStr ? !!holidays[dateStr] : false;

              let cellBg = isToday(day) ? '#fff5f5' : '#fff';
              if (isHoliday) cellBg = '#F3F4F6';

              const isClickable = day !== null && !isPast;

              return (
                <div
                  key={di}
                  data-day-cell
                  style={{
                    ...styles.cell,
                    minHeight: isMobile ? 60 : 90,
                    background: cellBg,
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: isPast ? 0.5 : 1,
                  }}
                  onClick={(e) => day !== null && !isPast && handleDayClick(day, e)}
                >
                  {day && (
                    <>
                      <div style={{
                        ...styles.dayNum,
                        color: di === 0 ? '#ef4444' : di === 6 ? '#3b82f6' : '#333',
                        ...(isToday(day) ? styles.todayNum : {}),
                      }}>
                        {day}
                        {isToday(day) && <span style={styles.todayDot} />}
                        {isHoliday && (
                          <span style={styles.holidayBadge}>휴무</span>
                        )}
                      </div>
                      <div style={styles.reservList}>
                        {dayReservs.slice(0, isMobile ? 1 : 3).map((r: any) => (
                          <div key={r.reservation_id} style={{ ...styles.reservBadge, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status], borderLeft: `2px solid ${STATUS_COLOR[r.status]}` }}>
                            {r.products?.product_name || '예약'} / {r.kg_amount}kg
                          </div>
                        ))}
                        {dayReservs.length > (isMobile ? 1 : 3) && (
                          <div style={styles.moreReserv}>
                            {isMobile ? `+${dayReservs.length - 1}건` : `+${dayReservs.length - 3}건 더보기`}
                          </div>
                        )}
                      </div>
                      {!isPast && !isHoliday && (
                        <div style={styles.clickHint}>클릭하여 용량 확인</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 날짜별 기기 잔여 용량 모달 */}
      {modal && (
        <div
          data-modal="day-slots"
          style={{
            ...styles.modalOverlay,
            top: modal.anchorRect.bottom + window.scrollY + 4,
            left: Math.min(modal.anchorRect.left + window.scrollX, window.innerWidth - 260),
          }}
        >
          <div style={styles.modalHeader}>
            <span style={styles.modalTitle}>{modal.dateStr} 잔여 용량</span>
            <button style={styles.modalClose} onClick={() => setModal(null)}>✕</button>
          </div>
          {modal.slots.length === 0 ? (
            <div style={styles.modalEmpty}>예약 가능한 기기가 없습니다.</div>
          ) : (
            <div style={styles.modalSlotList}>
              {modal.slots.map((s) => (
                <div key={s.equipment_id} style={styles.modalSlotRow}>
                  <span style={styles.modalEquipName}>{s.name}</span>
                  <span style={{
                    ...styles.modalCapacity,
                    color: s.available_capacity <= 5 ? '#EF4444' : '#10B981',
                  }}>
                    {s.available_capacity}kg 남음
                  </span>
                </div>
              ))}
            </div>
          )}
          {modal.slots.length > 0 && (
            <button style={styles.reserveBtn} onClick={handleReserve}>예약 신청</button>
          )}
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  actionBtn: { padding: '8px 16px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  calHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  navBtn: { width: 28, height: 28, border: '1px solid #e0e0e0', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', minWidth: 100, textAlign: 'center' },
  legend: { display: 'flex', gap: 16, marginLeft: 16, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  calendar: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', position: 'relative' },
  dayHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f0f0f0', background: '#1a1a1a' },
  dayName: { padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 },
  week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f0f0f0' },
  cell: { minHeight: 90, padding: '8px 6px', borderRight: '1px solid #f0f0f0', position: 'relative' },
  dayNum: { fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  todayNum: { color: '#B11F39', fontWeight: 700 },
  todayDot: { width: 5, height: 5, background: '#B11F39', borderRadius: '50%' },
  holidayBadge: { fontSize: 9, fontWeight: 700, color: '#6B7280', background: '#E5E7EB', borderRadius: 3, padding: '1px 4px', marginLeft: 2 },
  reservList: { display: 'flex', flexDirection: 'column', gap: 2 },
  reservBadge: { padding: '2px 5px', borderRadius: 3, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  moreReserv: { fontSize: 10, color: '#999', paddingLeft: 5 },
  clickHint: { position: 'absolute', bottom: 4, right: 6, fontSize: 9, color: '#ccc' },
  // Modal
  modalOverlay: {
    position: 'fixed',
    zIndex: 1000,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: 16,
    minWidth: 240,
    maxWidth: 280,
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 13, fontWeight: 700, color: '#111827' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9CA3AF', padding: '0 2px' },
  modalEmpty: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' },
  modalSlotList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  modalSlotRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#F9FAFB', borderRadius: 6 },
  modalEquipName: { fontSize: 12, color: '#374151', fontWeight: 500 },
  modalCapacity: { fontSize: 12, fontWeight: 700 },
  reserveBtn: { width: '100%', padding: '9px 0', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  // Toast
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1F2937',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    zIndex: 2000,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
};
