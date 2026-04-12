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

export default function Equipment() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get('/equipment').then(({ data }) => setEquipment(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  const grouped: Record<string, any[]> = { small: [], medium: [], large: [] };
  equipment.forEach(e => { if (grouped[e.type]) grouped[e.type].push(e); });

  return (
    <Layout title="기기/설비">
      {/* 요약 카드 */}
      <div style={styles.summaryGrid}>
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} style={styles.summaryCard}>
            <div style={{ ...styles.summaryBadge, background: TYPE_COLOR[type] + '20', color: TYPE_COLOR[type] }}>
              {TYPE_LABEL[type]}
            </div>
            <div style={styles.summaryCount}>{items.length}대</div>
            <div style={styles.summaryDetail}>
              {items.length > 0 ? `${items[0].min_capacity}~${items[0].max_capacity}kg` : '-'}
            </div>
            <div style={styles.summaryStatus}>
              정상 {items.filter(e => e.status === 'NORMAL').length}대 · 점검 {items.filter(e => e.status !== 'NORMAL').length}대
            </div>
          </div>
        ))}
      </div>

      {/* 기기 목록 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>전체 기기 현황</div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>기기명</th>
              <th style={styles.th}>구분</th>
              <th style={styles.th}>용량 범위</th>
              <th style={styles.th}>분할 수</th>
              <th style={styles.th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map(e => (
              <tr key={e.equipment_id} style={styles.tr}>
                <td style={styles.td}>{e.name}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.typeBadge, background: TYPE_COLOR[e.type] + '18', color: TYPE_COLOR[e.type] }}>
                    {TYPE_LABEL[e.type]}
                  </span>
                </td>
                <td style={styles.td}>{e.min_capacity}~{e.max_capacity}kg</td>
                <td style={styles.td}>{e.divisions}분할</td>
                <td style={styles.td}>
                  <span style={{ ...styles.typeBadge, background: STATUS_COLOR[e.status] + '18', color: STATUS_COLOR[e.status] }}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </td>
              </tr>
            ))}
            {equipment.length === 0 && (
              <tr><td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#aaa', padding: 32 }}>등록된 기기가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  summaryCard: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  summaryBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 8 },
  summaryCount: { fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 },
  summaryDetail: { fontSize: 12, color: '#888', marginBottom: 4 },
  summaryStatus: { fontSize: 11, color: '#aaa' },
  card: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' },
  cardTitle: { padding: '16px 20px', fontSize: 14, fontWeight: 600, color: '#1a1a1a', borderBottom: '1px solid #f0f0f0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#fafafa' },
  th: { padding: '10px 20px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 500 },
  tr: { borderBottom: '1px solid #f8f8f8' },
  td: { padding: '12px 20px', fontSize: 13, color: '#333' },
  typeBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 },
};
