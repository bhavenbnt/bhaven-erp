'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };
const STATUS_LABEL: Record<string, string> = { NORMAL: '정상', MAINTENANCE: '점검중', BROKEN: '고장' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  NORMAL:      { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  MAINTENANCE: { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  BROKEN:      { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
};


export default function AdminEquipment() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => { api.get('/equipment').then(({ data }: any) => setEquipment(data.data || [])).catch(() => {}); }, []);

  if (!user) return null;

  const grouped: Record<string, any[]> = { small: [], medium: [], large: [], custom: [] };
  equipment.forEach(e => {
    if (['small', 'medium', 'large'].includes(e.type)) grouped[e.type].push(e);
    else grouped.custom.push(e);
  });


  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>기기 관리</h1>
            <span style={s.totalBadge}>{equipment.length}대</span>
          </div>
          <button style={s.addBtn} onClick={() => router.push('/admin/equipment/new')}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>기기 등록</span>
          </button>
        </div>
      }
    >
      {/* 카테고리별 카드 */}
      <div style={s.categoryGrid}>
        {([
          { key: 'small', label: '소형', desc: '1~10kg · 4분할' },
          { key: 'medium', label: '중형', desc: '10~20kg · 단일' },
          { key: 'large', label: '대형', desc: '25~60kg · 단일' },
          { key: 'custom', label: '직접 입력', desc: '사용자 정의' },
        ]).map(cat => {
          const items = grouped[cat.key] || [];
          const normal = items.filter((e: any) => e.status === 'NORMAL').length;
          return (
            <div key={cat.key} style={s.categoryCard}>
              <div style={s.categoryHeader}>
                <div style={s.categoryLeft}>
                  <span style={s.categoryTitle}>{cat.label}</span>
                  <span style={s.categoryDesc}>{cat.desc}</span>
                </div>
                <div style={s.categoryStats}>
                  <span style={s.categoryCount}>{items.length}대</span>
                  <span style={s.categoryNormal}>가동 {normal}</span>
                </div>
              </div>
              {items.length > 0 ? (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>코드</th>
                      <th style={s.th}>기기명</th>
                      <th style={s.th}>용량</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                      <th style={{ ...s.th, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e: any) => {
                      const ss = STATUS_STYLE[e.status] || STATUS_STYLE.NORMAL;
                      return (
                        <tr key={e.equipment_id} style={s.tr}>
                          <td style={s.tdCode}>{e.equipment_code}</td>
                          <td style={s.tdName}>{e.name}</td>
                          <td style={s.tdMono}>{e.min_capacity}~{e.max_capacity}kg</td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>
                              {STATUS_LABEL[e.status]}
                            </span>
                          </td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <button style={s.editBtn} onClick={() => router.push(`/admin/equipment/${e.equipment_id}`)}>
                              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={s.categoryEmpty}>등록된 기기 없음</div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontWeight: 600, color: '#999', background: '#F0F0F0', padding: '3px 10px', borderRadius: 20 },
  addBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },

  // ── 카테고리 그리드 ──
  categoryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  categoryCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  categoryHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #F0F0F0',
  },
  categoryLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  categoryTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A' },
  categoryDesc: { fontSize: 11, color: '#BBB' },
  categoryStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  categoryCount: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Space Grotesk', sans-serif" },
  categoryNormal: { fontSize: 10, color: '#999' },
  categoryEmpty: { padding: '24px', textAlign: 'center', color: '#DDD', fontSize: 12 },

  // ── 테이블 ──
  tableCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: {
    padding: '12px 20px', textAlign: 'left' as const,
    fontSize: 11, color: '#AAA', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
  },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '13px 20px', fontSize: 13, color: '#333' },
  tdCode: { padding: '13px 20px', fontSize: 12, color: '#999', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  tdName: { padding: '13px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600 },
  tdMono: { padding: '13px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  typeBadge: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 6,
    fontSize: 11, fontWeight: 600, color: '#555', background: '#F0F0F0', border: '1px solid #E8E8E8',
  },
  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 64, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    borderStyle: 'solid', borderWidth: 1,
  },
  editBtn: {
    width: 28, height: 28, border: '1px solid #EEEEEE', background: '#fff',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#999', margin: '0 auto',
  },
  emptyRow: { padding: '60px 20px', textAlign: 'center' as const },
  emptyContent: {
    display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    color: '#CCC', fontSize: 13,
  },

  // ── 페이지네이션 ──
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '14px 20px', borderTop: '1px solid #F0F0F0',
  },
  pageBtn: {
    width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#666',
  },
  pageNum: {
    width: 32, height: 32, border: 'none', background: 'transparent',
    borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },
};
