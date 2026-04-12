'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const DAY_KO_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export default function ProductionHistory() {
  const router = useRouter();
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    api.get(`/reservations?date_from=${from}&date_to=${to}`)
      .then(({ data }: any) => setReservations(data.data || []))
      .catch(() => {});
  }, [year, month]);

  if (!user) return null;

  const totalReservations = reservations.filter((r: any) => r.status !== 'CANCELLED').length;
  const totalKg = reservations.filter((r: any) => r.status !== 'CANCELLED').reduce((s: number, r: any) => s + parseFloat(r.kg_amount || 0), 0);
  const completed = reservations.filter((r: any) => r.status === 'COMPLETED').length;
  const completionRate = totalReservations > 0 ? Math.round((completed / totalReservations) * 100) : 0;

  // Build calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate: Record<string, any[]> = {};
  reservations.forEach((r: any) => {
    if (r.status !== 'CANCELLED') {
      const d = r.scheduled_date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(r);
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  return (
    <Layout title="생산 이력">
      {/* Stats */}
      <div style={s.statsRow}>
        <StatBox label="이번 달 총 생산" value={`${totalReservations}건`} />
        <StatBox label="총 생산량" value={`${totalKg.toFixed(0)} kg`} />
        <StatBox label="완료율" value={`${completionRate}%`} accent />
      </div>

      {/* Calendar */}
      <div style={s.calendarCard}>
        <div style={s.calHeader}>
          <button style={s.navBtn} onClick={prevMonth}>{'<'}</button>
          <span style={s.calTitle}>{year}년 {month}월</span>
          <button style={s.navBtn} onClick={nextMonth}>{'>'}</button>
        </div>

        {/* Day headers */}
        <div style={s.grid7}>
          {DAY_KO_SHORT.map((d, i) => (
            <div key={i} style={{ ...s.dayHeader, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#6B7280' }}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div style={s.grid7}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} style={s.emptyCell} />;
            const dow = i % 7;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const rList = byDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            return (
              <div key={i} style={{ ...s.dateCell, background: isToday ? '#FFF5F7' : '#fff', cursor: rList.length > 0 ? 'pointer' : 'default' }}
                onClick={() => rList.length > 0 && router.push(`/worker/production/${dateStr}`)}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#374151' }}>{day}</span>
                {rList.length > 0 && (
                  <div style={s.dotArea}>
                    <span style={s.countBadge}>{rList.length}건</span>
                    <span style={{ fontSize: 10, color: '#10B981' }}>{rList.reduce((s: number, r: any) => s + parseFloat(r.kg_amount || 0), 0).toFixed(0)}kg</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: accent ? '#B11F39' : '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.8)' : '#6B7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? '#fff' : '#111' }}>{value}</div>
    </div>
  );
}

const s = {
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  calendarCard: { background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20 },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#374151', padding: '4px 10px', borderRadius: 6 },
  calTitle: { fontSize: 16, fontWeight: 700, color: '#111' },
  grid7: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
  dayHeader: { textAlign: 'center' as const, fontSize: 11, fontWeight: 600, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  dateCell: { minHeight: 72, padding: 6, borderRadius: 6, display: 'flex', flexDirection: 'column' as const, gap: 2, border: '1px solid transparent' },
  emptyCell: { minHeight: 72 },
  dotArea: { display: 'flex', flexDirection: 'column' as const, gap: 1, marginTop: 2 },
  countBadge: { fontSize: 10, fontWeight: 600, color: '#B11F39' },
};
