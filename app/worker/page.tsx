'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import useIsMobile from '@/hooks/useIsMobile';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '진행중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#3B82F6', IN_PROGRESS: '#8B5CF6', COMPLETED: '#10B981', CANCELLED: '#9CA3AF' };
const STATUS_BG: Record<string, string> = { PENDING: '#FFFBEB', CONFIRMED: '#EFF6FF', IN_PROGRESS: '#F5F3FF', COMPLETED: '#ECFDF5', CANCELLED: '#F9FAFB' };
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function WorkerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get(`/reservations?date_from=${todayStr}&date_to=${todayStr}`)
      .then(({ data }: any) => setReservations(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const total = reservations.length;
  const completed = reservations.filter((r: any) => r.status === 'COMPLETED').length;
  const inProgress = reservations.filter((r: any) => r.status === 'IN_PROGRESS').length;

  const handleStatus = async (id: number, status: string) => {
    await api.put(`/reservations/${id}/status`, { status }).catch(() => {});
    const { data }: any = await api.get(`/reservations?date_from=${todayStr}&date_to=${todayStr}`);
    setReservations(data.data || []);
  };

  // Mini weekly calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  return (
    <Layout title="작업자 대시보드">
      {/* Stats chips */}
      <div style={s.statsRow}>
        <StatChip label="총 작업" value={total} color="#374151" />
        <StatChip label="완료" value={completed} color="#10B981" />
        <StatChip label="진행중" value={inProgress} color="#8B5CF6" />
      </div>

      <div style={{ ...s.gridRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 240px' }}>
        {/* Equipment / Reservation Cards */}
        <div style={s.cardsSection}>
          <div style={s.sectionTitle}>오늘의 생산 ({today.getMonth() + 1}월 {today.getDate()}일)</div>
          {loading ? (
            <div style={s.empty}>불러오는 중...</div>
          ) : reservations.length === 0 ? (
            <div style={s.empty}>오늘 예정된 작업이 없습니다.</div>
          ) : (
            <div style={s.cardList}>
              {reservations.map((r: any) => (
                <EquipmentCard key={r.reservation_id} r={r} onStatus={handleStatus} onShipment={() => router.push(`/worker/shipment/${r.reservation_id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Mini Weekly Calendar */}
        <div style={s.calendarBox}>
          <div style={s.sectionTitle}>이번 주</div>
          <div style={s.weekRow}>
            {weekDays.map((d, i) => {
              const ds = d.toISOString().split('T')[0];
              const isToday = ds === todayStr;
              const isSun = i === 0;
              return (
                <div key={i} style={{ ...s.dayCell, background: isToday ? '#B11F39' : '#fff', cursor: 'pointer' }}
                  onClick={() => router.push(`/worker/production/${ds}`)}>
                  <div style={{ fontSize: 10, color: isToday ? '#fff' : isSun ? '#EF4444' : '#9CA3AF', marginBottom: 2 }}>{DAY_KO[i]}</div>
                  <div style={{ fontSize: 15, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isSun ? '#EF4444' : '#374151' }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <button style={s.historyBtn} onClick={() => router.push('/worker/production')}>생산 이력 전체 보기 →</button>
        </div>
      </div>
    </Layout>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: '8px 18px' }}>
      <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function EquipmentCard({ r, onStatus, onShipment }: { r: any; onStatus: (id: number, status: string) => void; onShipment: () => void }) {
  const st = r.status;
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{r.equipment?.name || '-'}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: STATUS_BG[st], color: STATUS_COLOR[st] }}>
          {STATUS_LABEL[st] || st}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, fontSize: 12, color: '#6B7280' }}>
        <span>업체: {r.users?.company_name || r.users?.name || '-'}</span>
        <span>제품: {r.products?.product_name || '-'}</span>
        <span>{r.kg_amount} kg</span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {st === 'CONFIRMED' && (
          <button style={s.actionBtn('#8B5CF6')} onClick={() => onStatus(r.reservation_id, 'IN_PROGRESS')}>생산 시작</button>
        )}
        {st === 'IN_PROGRESS' && (
          <>
            <button style={s.actionBtn('#10B981')} onClick={() => onStatus(r.reservation_id, 'COMPLETED')}>생산 완료</button>
            <button style={s.actionBtn('#6B7280')} onClick={() => onShipment()}>출고 처리</button>
          </>
        )}
        {st === 'COMPLETED' && (
          <button style={s.actionBtn('#3B82F6')} onClick={() => onShipment()}>출고 처리</button>
        )}
      </div>
    </div>
  );
}

const s = {
  statsRow: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const },
  gridRow: { display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start' as const },
  cardsSection: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 },
  cardList: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  empty: { textAlign: 'center' as const, padding: 32, color: '#9CA3AF', fontSize: 13, background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB' },
  calendarBox: { background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12 },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  dayCell: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, padding: '6px 2px', borderRadius: 8, border: '1px solid #F3F4F6' },
  historyBtn: { background: 'none', border: 'none', color: '#B11F39', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'right' as const },
  actionBtn: (color: string) => ({ padding: '6px 14px', background: color, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }),
};
