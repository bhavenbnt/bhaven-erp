'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const STATUS_COLOR: Record<string, string> = { PENDING: '#f59e0b', CONFIRMED: '#3b82f6', IN_PROGRESS: '#10b981', COMPLETED: '#6b7280', CANCELLED: '#ef4444' };
const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };

interface Equipment {
  equipment_id: number;
  name: string;
  type: string;
}

export default function AdminCalendar() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/equipment')
      .then(({ data }: any) => setEquipmentList(data.data || []))
      .catch(() => {});
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
    setSelectedDay(d);
  };

  const modalReservs = selectedDay
    ? reservations.filter((r: any) => {
        if (!r.scheduled_date?.startsWith(selectedDay)) return false;
        if (selectedEquipmentId !== null && r.equipment_id !== selectedEquipmentId) return false;
        return true;
      })
    : [];

  // Group by equipment for modal summary
  const byEquip: Record<string, { name: string; items: any[] }> = {};
  for (const r of modalReservs.filter(r => r.status !== 'CANCELLED')) {
    const k = String(r.equipment_id);
    const name = r.equipment?.name || `기기 ${r.equipment_id}`;
    if (!byEquip[k]) byEquip[k] = { name, items: [] };
    byEquip[k].items.push(r);
  }

  return (
    <Layout title="전체 생산 캘린더">
      {/* 날짜 상세 모달 */}
      {selectedDay && (
        <div style={s.overlay} onClick={() => setSelectedDay(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>{selectedDay} 예약 현황</span>
              <button style={s.modalClose} onClick={() => setSelectedDay(null)}>✕</button>
            </div>

            {/* 기기별 요약 */}
            {Object.values(byEquip).length > 0 && (
              <div style={s.equipSummary}>
                {Object.values(byEquip).map((eq) => (
                  <div key={eq.name} style={s.equipChip}>
                    <span style={s.equipChipName}>{eq.name}</span>
                    <span style={s.equipChipKg}>{eq.items.reduce((s, r) => s + (r.kg_amount ?? 0), 0)}kg</span>
                  </div>
                ))}
              </div>
            )}

            {modalReservs.length === 0 ? (
              <div style={s.modalEmpty}>예약이 없습니다.</div>
            ) : (
              <div style={s.modalList}>
                {modalReservs.map((r: any) => (
                  <div key={r.reservation_id} style={s.modalItem}>
                    <div style={s.modalItemLeft}>
                      <span style={{ ...s.statusDot, background: STATUS_COLOR[r.status] }} />
                      <div>
                        <div style={s.modalCompany}>{r.users?.company_name || r.users?.name}</div>
                        <div style={s.modalMeta}>
                          {r.equipment?.name} · {r.kg_amount}kg · {r.products?.product_name}
                        </div>
                      </div>
                    </div>
                    <span style={{ ...s.statusBadge, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status] }}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={s.calHeader}>
        <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month - 1))}>‹</button>
        <span style={s.monthLabel}>{year}년 {month + 1}월</span>
        <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month + 1))}>›</button>
        <select
          value={selectedEquipmentId ?? ''}
          onChange={(e) => setSelectedEquipmentId(e.target.value === '' ? null : Number(e.target.value))}
          style={s.equipFilter}
        >
          <option value="">전체 기기</option>
          {equipmentList.map((eq) => (
            <option key={eq.equipment_id} value={eq.equipment_id}>{eq.name}</option>
          ))}
        </select>
        <div style={s.legend}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <span key={k} style={s.legendItem}><span style={{ ...s.legendDot, background: STATUS_COLOR[k] }} />{v}</span>
          ))}
        </div>
      </div>

      <div style={s.calendar}>
        <div style={s.dayHeader}>
          {DAYS.map((d, i) => <div key={d} style={{ ...s.dayName, color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#999' }}>{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={s.week}>
            {Array(7).fill(null).map((_, di) => {
              const day = week[di];
              const dayReservs = day ? getDayReservs(day) : [];
              const totalKg = dayReservs.reduce((s, r) => s + (r.kg_amount ?? 0), 0);
              return (
                <div
                  key={di}
                  style={{ ...s.cell, background: isToday(day) ? '#fff5f5' : '#fff', cursor: day ? 'pointer' : 'default' }}
                  onClick={() => day && handleDayClick(day)}
                >
                  {day && (
                    <>
                      <div style={{ ...s.dayNum, color: di === 0 ? '#ef4444' : di === 6 ? '#3b82f6' : '#333', ...(isToday(day) ? { color: '#B11F39', fontWeight: 700 } : {}) }}>
                        {day}
                        {totalKg > 0 && <span style={s.totalKgBadge}>{totalKg}kg</span>}
                      </div>
                      <div style={s.reservList}>
                        {dayReservs.slice(0, 3).map((r: any) => (
                          <div key={r.reservation_id} style={{ ...s.reservBadge, background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status], borderLeft: `2px solid ${STATUS_COLOR[r.status]}` }}>
                            <span style={s.badgeEquip}>{r.equipment?.name}</span>
                            <span>{r.users?.company_name || r.users?.name} / {r.kg_amount}kg</span>
                          </div>
                        ))}
                        {dayReservs.length > 3 && <div style={s.more}>+{dayReservs.length - 3}건 더보기</div>}
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

const s = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 14, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f0f0f0' },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999', lineHeight: 1 },
  equipSummary: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, padding: '12px 20px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' },
  equipChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#0A0A0A', borderRadius: 20, padding: '4px 12px' },
  equipChipName: { fontSize: 11, color: '#aaa' },
  equipChipKg: { fontSize: 12, fontWeight: 700, color: '#fff' },
  modalEmpty: { padding: '40px 20px', textAlign: 'center' as const, color: '#aaa', fontSize: 13 },
  modalList: { overflowY: 'auto' as const, maxHeight: 400 },
  modalItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb' },
  modalItemLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  modalCompany: { fontSize: 13, fontWeight: 600, color: '#111' },
  modalMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12 },
  calHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  equipFilter: { border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 10px', fontSize: 13, background: '#fff', cursor: 'pointer', color: '#333' },
  navBtn: { width: 32, height: 32, border: '1px solid #e0e0e0', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  monthLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', minWidth: 100, textAlign: 'center' as const },
  legend: { display: 'flex', gap: 16, marginLeft: 16 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  calendar: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' },
  dayHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f0f0f0', background: '#1a1a1a' },
  dayName: { padding: '10px 0', textAlign: 'center' as const, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 },
  week: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f0f0f0' },
  cell: { minHeight: 90, padding: '8px 6px', borderRight: '1px solid #f0f0f0' },
  dayNum: { fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 },
  totalKgBadge: { fontSize: 9, fontWeight: 700, color: '#B11F39', background: '#B11F3912', borderRadius: 10, padding: '1px 5px' },
  reservList: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  reservBadge: { padding: '2px 5px', borderRadius: 3, fontSize: 10, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  badgeEquip: { fontWeight: 700, marginRight: 3 },
  more: { fontSize: 10, color: '#3b82f6', paddingLeft: 5, cursor: 'pointer' },
};
