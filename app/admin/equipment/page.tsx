'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };
const TYPE_COLOR: Record<string, string> = { small: '#3b82f6', medium: '#10b981', large: '#f59e0b' };
const STATUS_LABEL: Record<string, string> = { NORMAL: '정상', MAINTENANCE: '점검중', BROKEN: '고장' };
const STATUS_COLOR: Record<string, string> = { NORMAL: '#10b981', MAINTENANCE: '#f59e0b', BROKEN: '#ef4444' };

export default function AdminEquipment() {
  const router = useRouter();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/equipment').then(({ data }: any) => setEquipment(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  const grouped: Record<string, any[]> = { small: [], medium: [], large: [] };
  equipment.forEach((e: any) => { if (grouped[e.type]) grouped[e.type].push(e); });

  return (
    <Layout title="기기 관리" action={
      <button style={s.addBtn} onClick={() => router.push('/admin/equipment/new')}>+ 기기 등록</button>
    }>
      <div style={s.summaryRow}>
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} style={s.summaryCard}>
            <span style={{ ...s.typeBadge, background: TYPE_COLOR[type] + '20', color: TYPE_COLOR[type] }}>{TYPE_LABEL[type]}</span>
            <div style={s.summaryCount}>{items.length}대</div>
            <div style={s.summaryMeta}>정상 {items.filter(e => e.status === 'NORMAL').length}대 · 점검 {items.filter(e => e.status !== 'NORMAL').length}대</div>
          </div>
        ))}
      </div>

      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['기기명', '코드', '구분', '용량 범위', '분할 수', '상태', ''].map((h, i) => <th key={i} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {equipment.length === 0 && <tr><td colSpan={7} style={s.empty}>등록된 기기가 없습니다.</td></tr>}
            {equipment.map((e: any) => (
              <tr key={e.equipment_id} style={s.tr}>
                <td style={{ ...s.td, fontWeight: 500 }}>{e.name}</td>
                <td style={{ ...s.td, color: '#888', fontSize: 12 }}>{e.equipment_code}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: TYPE_COLOR[e.type] + '18', color: TYPE_COLOR[e.type] }}>{TYPE_LABEL[e.type]}</span>
                </td>
                <td style={s.td}>{e.min_capacity}~{e.max_capacity}kg</td>
                <td style={s.td}>{e.divisions}분할</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: STATUS_COLOR[e.status] + '18', color: STATUS_COLOR[e.status] }}>{STATUS_LABEL[e.status]}</span>
                </td>
                <td style={s.td}>
                  <button style={s.editBtn} onClick={() => router.push(`/admin/equipment/${e.equipment_id}`)}>수정</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

const s = {
  addBtn: { padding: '8px 16px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  summaryCard: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const, gap: 6 },
  typeBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' as const },
  summaryCount: { fontSize: 28, fontWeight: 700, color: '#1a1a1a' },
  summaryMeta: { fontSize: 11, color: '#aaa' },
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 40, color: '#aaa', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 },
  editBtn: { color: '#B11F39', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' },
};
