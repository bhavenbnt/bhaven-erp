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

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'small', label: '소형' },
  { key: 'medium', label: '중형' },
  { key: 'large', label: '대형' },
];

const PAGE_SIZE = 10;

export default function AdminEquipment() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => { api.get('/equipment').then(({ data }: any) => setEquipment(data.data || [])).catch(() => {}); }, []);

  if (!user) return null;

  const filtered = tab === 'all' ? equipment : equipment.filter(e => e.type === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleTab = (key: string) => { setTab(key); setPage(1); };

  const grouped: Record<string, any[]> = { small: [], medium: [], large: [] };
  equipment.forEach(e => { if (grouped[e.type]) grouped[e.type].push(e); });

  const totalNormal = equipment.filter(e => e.status === 'NORMAL').length;
  const totalMaint = equipment.filter(e => e.status === 'MAINTENANCE').length;
  const totalBroken = equipment.filter(e => e.status === 'BROKEN').length;

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
      {/* 통계 카드 */}
      <div style={s.statsRow}>
        <div style={{ ...s.statCard, ...s.statCardDark }}>
          <div style={s.statTop}>
            <div style={{ ...s.statIconWrap, background: 'rgba(255,255,255,0.08)' }}>
              {Icons.settings({ size: 16, color: 'rgba(255,255,255,0.6)' })}
            </div>
            <span style={{ ...s.statLabel, color: 'rgba(255,255,255,0.5)' }}>전체 기기</span>
          </div>
          <div style={{ ...s.statValue, color: '#fff' }}>{equipment.length}<span style={{ ...s.statUnit, color: 'rgba(255,255,255,0.35)' }}>대</span></div>
          <div style={{ ...s.statSub, color: 'rgba(255,255,255,0.25)' }}>정상 {totalNormal} · 점검 {totalMaint} · 고장 {totalBroken}</div>
        </div>
        {(['small', 'medium', 'large'] as const).map(type => {
          const items = grouped[type] || [];
          const normal = items.filter(e => e.status === 'NORMAL').length;
          return (
            <div key={type} style={s.statCard}>
              <div style={s.statTop}>
                <div style={s.statIconWrap}>{Icons.factory({ size: 16, color: '#B11F39' })}</div>
                <span style={s.statLabel}>{TYPE_LABEL[type]}</span>
              </div>
              <div style={s.statValue}>{items.length}<span style={s.statUnit}>대</span></div>
              <div style={s.statSub}>
                {items.length > 0 ? `${items[0].min_capacity}~${items[0].max_capacity}kg` : '-'} · 가동 {normal}대
              </div>
            </div>
          );
        })}
      </div>

      {/* 필터 탭 */}
      <div style={s.tabRow}>
        {TABS.map(t => {
          const count = t.key === 'all' ? equipment.length : (grouped[t.key]?.length || 0);
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => handleTab(t.key)}
              style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
              <span>{t.label}</span>
              <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* 테이블 */}
      <div style={s.tableCard}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>기기 코드</th>
                <th style={s.th}>기기명</th>
                <th style={s.th}>구분</th>
                <th style={s.th}>용량 범위</th>
                <th style={s.th}>분할</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(e => {
                const ss = STATUS_STYLE[e.status] || STATUS_STYLE.NORMAL;
                return (
                  <tr key={e.equipment_id} style={s.tr}>
                    <td style={s.tdCode}>{e.equipment_code}</td>
                    <td style={s.tdName}>{e.name}</td>
                    <td style={s.td}>
                      <span style={s.typeBadge}>{TYPE_LABEL[e.type]}</span>
                    </td>
                    <td style={s.tdMono}>{e.min_capacity}~{e.max_capacity}kg</td>
                    <td style={s.td}>{e.divisions}분할</td>
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
              {paginated.length === 0 && (
                <tr><td colSpan={7} style={s.emptyRow}>
                  <div style={s.emptyContent}>
                    {Icons.settings({ size: 24, color: '#DDD' })}
                    <span>등록된 기기가 없습니다</span>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={{ ...s.pageBtn, opacity: page > 1 ? 1 : 0.3 }} disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} style={{ ...s.pageNum, ...(p === page ? s.pageNumActive : {}) }}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button style={{ ...s.pageBtn, opacity: page < totalPages ? 1 : 0.3 }} disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <span style={s.pageInfo}>{filtered.length}대 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          </div>
        )}
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

  // ── 통계 카드 ──
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 },
  statCard: {
    background: '#fff', borderRadius: 10, padding: '14px 16px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  statCardDark: {
    background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  statTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  statIconWrap: {
    width: 28, height: 28, borderRadius: 7, background: '#FDF2F4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { fontSize: 12, color: '#999', fontWeight: 500 },
  statValue: {
    fontSize: 24, fontWeight: 700, color: '#0A0A0A',
    fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.5,
    marginBottom: 4, display: 'flex', alignItems: 'baseline',
  },
  statUnit: { fontSize: 14, fontWeight: 500, marginLeft: 2, color: '#CCC' },
  statSub: { fontSize: 11, color: '#CCC' },

  // ── 탭 ──
  tabRow: { display: 'flex', gap: 4, marginBottom: 10, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 16px', border: 'none', background: 'transparent',
    borderRadius: 7, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer',
  },
  tabActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  tabCount: {
    fontSize: 10, fontWeight: 700, color: '#CCC', background: '#F0F0F0',
    borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
  },
  tabCountActive: { color: '#fff', background: 'rgba(255,255,255,0.2)' },

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
