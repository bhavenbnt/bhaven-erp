'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Statistics() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    api.get(`/reservations?date_from=${start}&date_to=${end}`)
      .then(({ data }: any) => setReservations(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  if (!user) return null;

  const completed = reservations.filter(r => r.status !== 'CANCELLED');

  // 기기별 집계
  const byEquip: Record<string, { name: string; count: number; kg: number }> = {};
  for (const r of completed) {
    const k = String(r.equipment_id);
    const name = r.equipment?.name || `기기 ${r.equipment_id}`;
    if (!byEquip[k]) byEquip[k] = { name, count: 0, kg: 0 };
    byEquip[k].count++;
    byEquip[k].kg += r.kg_amount ?? 0;
  }
  const equipRows = Object.values(byEquip).sort((a, b) => b.kg - a.kg);

  // 업체별 집계
  const byCompany: Record<string, { name: string; count: number; kg: number }> = {};
  for (const r of completed) {
    const k = String(r.user_id);
    const name = r.users?.company_name || r.users?.name || `고객 ${r.user_id}`;
    if (!byCompany[k]) byCompany[k] = { name, count: 0, kg: 0 };
    byCompany[k].count++;
    byCompany[k].kg += r.kg_amount ?? 0;
  }
  const companyRows = Object.values(byCompany).sort((a, b) => b.kg - a.kg);

  // 요약 통계
  const totalKg = completed.reduce((s, r) => s + (r.kg_amount ?? 0), 0);
  const totalOrders = completed.length;
  const pendingCount = reservations.filter(r => r.status === 'PENDING').length;
  const cancelledCount = reservations.filter(r => r.status === 'CANCELLED').length;

  const maxEquipKg = equipRows[0]?.kg || 1;
  const maxCompKg = companyRows[0]?.kg || 1;

  return (
    <Layout title="통계 대시보드">
      {/* 월 선택 */}
      <div style={s.monthNav}>
        <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month - 1))}>‹</button>
        <span style={s.monthLabel}>{year}년 {month + 1}월</span>
        <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month + 1))}>›</button>
      </div>

      {/* 요약 카드 */}
      <div style={s.summaryRow}>
        <SummaryCard label="총 생산량" value={`${totalKg.toFixed(0)}kg`} dark />
        <SummaryCard label="총 예약 건수" value={`${totalOrders}건`} />
        <SummaryCard label="승인 대기" value={`${pendingCount}건`} highlight />
        <SummaryCard label="취소/반려" value={`${cancelledCount}건`} />
      </div>

      <div style={s.gridTwo}>
        {/* 기기별 생산량 */}
        <div style={s.card}>
          <div style={s.cardTitle}>기기별 생산량</div>
          {loading ? <div style={s.empty}>로딩 중...</div> : equipRows.length === 0 ? (
            <div style={s.empty}>데이터가 없습니다.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['기기명', '예약 수', 'kg 합계', '비율'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {equipRows.map((eq, i) => (
                  <tr key={i} style={s.tr}>
                    <td style={s.td}>{eq.name}</td>
                    <td style={{ ...s.td, textAlign: 'center' as const }}>{eq.count}건</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{eq.kg}kg</td>
                    <td style={{ ...s.td, minWidth: 100 }}>
                      <div style={s.barBg}>
                        <div style={{ ...s.barFill, width: `${(eq.kg / maxEquipKg) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 업체별 생산량 */}
        <div style={s.card}>
          <div style={s.cardTitle}>업체별 생산량</div>
          {loading ? <div style={s.empty}>로딩 중...</div> : companyRows.length === 0 ? (
            <div style={s.empty}>데이터가 없습니다.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['업체명', '예약 수', 'kg 합계', '비율'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {companyRows.map((co, i) => (
                  <tr key={i} style={s.tr}>
                    <td style={s.td}>{co.name}</td>
                    <td style={{ ...s.td, textAlign: 'center' as const }}>{co.count}건</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{co.kg}kg</td>
                    <td style={{ ...s.td, minWidth: 100 }}>
                      <div style={s.barBg}>
                        <div style={{ ...s.barFill, width: `${(co.kg / maxCompKg) * 100}%`, background: '#3B82F6' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ label, value, dark, highlight }: { label: string; value: string; dark?: boolean; highlight?: boolean }) {
  return (
    <div style={{ ...s.summaryCard, ...(dark ? s.summaryDark : {}), ...(highlight ? s.summaryHighlight : {}) }}>
      <div style={{ ...s.summaryLabel, color: dark ? '#999' : '#777' }}>{label}</div>
      <div style={{ ...s.summaryValue, color: dark ? '#fff' : highlight ? '#B11F39' : '#0A0A0A' }}>{value}</div>
    </div>
  );
}

const s = {
  monthNav: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  navBtn: { width: 32, height: 32, border: '1px solid #e0e0e0', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  monthLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', minWidth: 100, textAlign: 'center' as const },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  summaryCard: { background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  summaryDark: { background: '#0A0A0A', border: 'none' },
  summaryHighlight: {},
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 32, fontWeight: 700, letterSpacing: -1 },
  gridTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', padding: '18px 20px', borderBottom: '1px solid #E0E0E0' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '0 16px', height: 52, fontSize: 13, color: '#0A0A0A', verticalAlign: 'middle' as const },
  empty: { padding: '40px 20px', textAlign: 'center' as const, color: '#aaa', fontSize: 13 },
  barBg: { height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', background: '#B11F39', borderRadius: 3, transition: 'width 0.3s' },
};
