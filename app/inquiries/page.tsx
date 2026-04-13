'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'PENDING', label: '대기중' },
  { key: 'IN_PROGRESS', label: '처리중' },
  { key: 'RESOLVED', label: '완료' },
];

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', IN_PROGRESS: '처리중', RESOLVED: '완료' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  RESOLVED:    { color: '#888888', bg: '#F8F8F8', border: '#EEEEEE' },
};

const PAGE_SIZE = 10;

export default function Inquiries() {
  const router = useRouter();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);
  useEffect(() => { api.get('/inquiries/my').then(({ data }) => setInquiries(data.data || [])).catch(() => {}); }, []);

  if (!user) return null;

  const filtered = tab === 'all' ? inquiries : inquiries.filter(i => i.status === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleTab = (key: string) => { setTab(key); setPage(1); };
  const getCount = (key: string) => key === 'all' ? inquiries.length : inquiries.filter(i => i.status === key).length;

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>관리자 문의</h1>
            <span style={s.totalBadge}>{inquiries.length}건</span>
          </div>
          <button onClick={() => router.push('/inquiries/new')} style={s.actionBtn}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>새 문의</span>
          </button>
        </div>
      }
    >
      {/* 안내 배너 */}
      <div style={s.banner}>
        <div style={s.bannerIcon}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#B11F39" strokeWidth={2}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
        </div>
        <div>
          <span style={s.bannerTitle}>자동 문의 전환 안내</span>
          <span style={s.bannerText}> — 가용 용량 초과 시 예약이 문의로 전환됩니다. 관리자가 검토 후 일정을 조율합니다.</span>
        </div>
      </div>

      {/* 필터 탭 */}
      <div style={s.tabRow}>
        {TABS.map(t => {
          const count = getCount(t.key);
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => handleTab(t.key)}
              style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
              <span>{t.label}</span>
              {count > 0 && <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>{count}</span>}
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
                <th style={s.th}>번호</th>
                <th style={s.th}>제품명</th>
                <th style={s.th}>품목</th>
                <th style={s.th}>중량</th>
                <th style={s.th}>희망일</th>
                <th style={s.th}>접수일</th>
                <th style={s.th}>관리자 응답</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(inq => {
                const ss = STATUS_STYLE[inq.status] || STATUS_STYLE.PENDING;
                return (
                  <tr key={inq.inquiry_id} style={s.tr} onClick={() => router.push(`/inquiries/${inq.inquiry_id}`)}>
                    <td style={s.tdId}>#{inq.inquiry_id}</td>
                    <td style={s.tdName}>{inq.product_name || '-'}</td>
                    <td style={s.tdMuted}>{inq.product_type === 'extract' ? '원액' : inq.product_type === 'can' ? '캔' : '-'}</td>
                    <td style={s.tdMono}>{inq.kg_amount ? `${inq.kg_amount}kg` : '-'}</td>
                    <td style={s.td}>{inq.desired_date || '-'}</td>
                    <td style={s.td}>{new Date(inq.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                    <td style={s.tdResponse}>{inq.admin_response ? inq.admin_response.slice(0, 30) + (inq.admin_response.length > 30 ? '...' : '') : '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>
                        {STATUS_LABEL[inq.status] || inq.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} style={s.emptyRow}>
                    <div style={s.emptyContent}>
                      {Icons.message({ size: 24, color: '#DDD' })}
                      <span>접수된 문의가 없습니다</span>
                    </div>
                  </td>
                </tr>
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
            <span style={s.pageInfo}>{filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span>
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
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },

  // ── 배너 ──
  banner: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', borderRadius: 8, marginBottom: 12,
    background: '#FDF2F4', border: '1px solid #F5D0D6',
  },
  bannerIcon: { flexShrink: 0 },
  bannerTitle: { fontSize: 12, fontWeight: 700, color: '#B11F39' },
  bannerText: { fontSize: 12, color: '#B11F39', opacity: 0.7 },

  // ── 탭 ──
  tabRow: { display: 'flex', gap: 4, marginBottom: 12, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th: {
    padding: '12px 20px', textAlign: 'left' as const,
    fontSize: 11, color: '#AAA', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
  },
  tr: { borderBottom: '1px solid #F5F5F5', cursor: 'pointer' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMuted: { padding: '14px 20px', fontSize: 13, color: '#999' },
  tdMono: { padding: '14px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  tdResponse: { padding: '14px 20px', fontSize: 12, color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 64, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    borderStyle: 'solid', borderWidth: 1,
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
