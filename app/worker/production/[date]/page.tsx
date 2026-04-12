'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import useIsMobile from '@/hooks/useIsMobile';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '진행중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#3B82F6', IN_PROGRESS: '#8B5CF6', COMPLETED: '#10B981', CANCELLED: '#9CA3AF' };
const STATUS_BG: Record<string, string> = { PENDING: '#FFFBEB', CONFIRMED: '#EFF6FF', IN_PROGRESS: '#F5F3FF', COMPLETED: '#ECFDF5', CANCELLED: '#F9FAFB' };
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function ProductionDetail() {
  const params = useParams();
  const date = params.date as string;
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get(`/reservations?date_from=${date}&date_to=${date}`)
      .then(({ data }: any) => setReservations(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  if (!user) return null;

  const formatDate = (ds: string) => {
    const d = new Date(ds + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;
  };

  const totalKg = reservations.filter((r: any) => r.status !== 'CANCELLED').reduce((s: number, r: any) => s + parseFloat(r.kg_amount || 0), 0);
  const completed = reservations.filter((r: any) => r.status === 'COMPLETED').length;
  const total = reservations.filter((r: any) => r.status !== 'CANCELLED').length;

  const filtered = filter === 'ALL' ? reservations : reservations.filter((r: any) => r.status === filter);

  const handleStatus = async (id: number, status: string) => {
    await api.put(`/reservations/${id}/status`, { status }).catch(() => {});
    const { data }: any = await api.get(`/reservations?date_from=${date}&date_to=${date}`);
    setReservations(data.data || []);
  };

  return (
    <Layout title="생산 이력 상세">
      {/* Header */}
      <div style={s.headerRow}>
        <button style={s.backBtn} onClick={() => router.push('/worker/production')}>← 돌아가기</button>
        <h2 style={{ ...s.dateTitle, fontSize: isMobile ? 15 : 18 }}>{date ? formatDate(date) : ''} 생산 이력</h2>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        <MiniStat label="총 작업" value={total} />
        <MiniStat label="완료" value={completed} />
        <MiniStat label="총 생산량" value={`${totalKg.toFixed(0)}kg`} />
      </div>

      {/* Filter */}
      <div style={s.filterRow}>
        {['ALL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(st => (
          <button key={st} style={{ ...s.filterBtn, background: filter === st ? '#B11F39' : '#fff', color: filter === st ? '#fff' : '#374151', borderColor: filter === st ? '#B11F39' : '#E5E7EB' }}
            onClick={() => setFilter(st)}>
            {st === 'ALL' ? '전체' : STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {/* 모바일: 카드 리스트 */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={s.empty}>불러오는 중...</div>}
          {!loading && filtered.length === 0 && <div style={s.empty}>해당하는 작업이 없습니다.</div>}
          {filtered.map((r: any) => (
            <div key={r.reservation_id} style={card.wrap}>
              <div style={card.topRow}>
                <span style={card.reservationId}>RV-{r.reservation_id}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: STATUS_BG[r.status], color: STATUS_COLOR[r.status] }}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <div style={card.company}>{r.users?.company_name || r.users?.name || '-'}</div>
              <div style={card.row}>
                <span style={card.label}>제품명</span>
                <span style={card.value}>{r.products?.product_name || '-'}</span>
              </div>
              <div style={card.row}>
                <span style={card.label}>기기</span>
                <span style={card.value}>{r.equipment?.name || '-'}</span>
              </div>
              <div style={card.row}>
                <span style={card.label}>중량</span>
                <span style={card.value}>{r.kg_amount} kg</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {r.status === 'CONFIRMED' && (
                  <button style={s.actBtn('#8B5CF6')} onClick={() => handleStatus(r.reservation_id, 'IN_PROGRESS')}>시작</button>
                )}
                {r.status === 'IN_PROGRESS' && (
                  <button style={s.actBtn('#10B981')} onClick={() => handleStatus(r.reservation_id, 'COMPLETED')}>완료</button>
                )}
                {(r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') && (
                  <button style={s.actBtn('#3B82F6')} onClick={() => router.push(`/worker/shipment/${r.reservation_id}`)}>출고</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* PC: 테이블 */
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['예약번호', '업체명', '제품명', '기기', '중량', '상태', '액션'].map((h, i) => (
                  <th key={i} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={s.empty}>불러오는 중...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} style={s.empty}>해당하는 작업이 없습니다.</td></tr>}
              {filtered.map((r: any) => (
                <tr key={r.reservation_id} style={s.tr}>
                  <td style={s.td}>RV-{r.reservation_id}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{r.users?.company_name || r.users?.name || '-'}</td>
                  <td style={s.td}>{r.products?.product_name || '-'}</td>
                  <td style={s.td}>{r.equipment?.name || '-'}</td>
                  <td style={s.td}>{r.kg_amount} kg</td>
                  <td style={s.td}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: STATUS_BG[r.status], color: STATUS_COLOR[r.status] }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.status === 'CONFIRMED' && (
                        <button style={s.actBtn('#8B5CF6')} onClick={() => handleStatus(r.reservation_id, 'IN_PROGRESS')}>시작</button>
                      )}
                      {r.status === 'IN_PROGRESS' && (
                        <button style={s.actBtn('#10B981')} onClick={() => handleStatus(r.reservation_id, 'COMPLETED')}>완료</button>
                      )}
                      {(r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') && (
                        <button style={s.actBtn('#3B82F6')} onClick={() => router.push(`/worker/shipment/${r.reservation_id}`)}>출고</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{value}</span>
    </div>
  );
}

const s = {
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '4px 8px' },
  dateTitle: { fontSize: 18, fontWeight: 700, color: '#111', margin: 0 },
  statsRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const },
  filterRow: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const },
  filterBtn: { padding: '6px 14px', border: '1px solid', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '13px 14px', fontSize: 13, color: '#333', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 32, color: '#9CA3AF', fontSize: 13 },
  actBtn: (color: string): React.CSSProperties => ({ padding: '4px 10px', background: color, color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer' }),
};

// 모바일 카드 스타일
const card: Record<string, React.CSSProperties> = {
  wrap: { background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  reservationId: { fontSize: 12, color: '#9CA3AF', fontWeight: 500 },
  company: { fontSize: 15, fontWeight: 700, color: '#111', marginTop: 2 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#6B7280' },
  value: { fontSize: 13, color: '#333', fontWeight: 500 },
};
