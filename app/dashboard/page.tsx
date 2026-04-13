'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '예약 대기', CONFIRMED: '예약 확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소',
};
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888888', bg: '#F8F8F8', border: '#EEEEEE' },
  CANCELLED:   { color: '#AAAAAA', bg: '#FAFAFA', border: '#F0F0F0' },
};

const STAT_ICONS: Record<string, (color: string) => React.ReactNode> = {
  inProgress: (c) => Icons.factory({ size: 16, color: c }),
  pending: (c) => Icons.clipboard({ size: 16, color: c }),
  completed: (c) => Icons.chart({ size: 16, color: c }),
  next: (c) => Icons.calendar({ size: 16, color: c }),
};

export default function Dashboard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get('/reservations/my').then(({ data }) => setReservations(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const thisMonthReservations = reservations.filter(r => isThisMonth(r.scheduled_date));
  const nextConfirmed = reservations
    .filter(r => r.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

  const stats = {
    inProgress: reservations.filter(r => r.status === 'IN_PROGRESS').length,
    pending: reservations.filter(r => r.status === 'PENDING').length,
    completedThisMonth: thisMonthReservations.filter(r => r.status === 'COMPLETED').length,
    nextDate: nextConfirmed?.scheduled_date,
    nextProduct: nextConfirmed ? `${nextConfirmed.products?.product_name || '-'} · ${nextConfirmed.kg_amount}kg` : null,
  };

  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>대시보드</h1>
            <span style={s.dateBadge}>
              {Icons.calendar({ size: 12, color: '#999' })}
              <span>{dateStr}</span>
            </span>
          </div>
          <button onClick={() => router.push('/calendar')} style={s.actionBtn}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>예약 신청</span>
          </button>
        </div>
      }
    >
      {/* 통계 카드 4개 — 동일 높이 */}
      <div style={s.statsRow}>
        {([
          { key: 'inProgress', label: '진행 중', value: `${stats.inProgress}`, unit: '건', sub: '현재 생산 진행 중', dark: true },
          { key: 'pending', label: '예약 대기', value: `${stats.pending}`, unit: '건', sub: '관리자 승인 대기 중', dark: false },
          { key: 'completed', label: '이번 달 완료', value: `${stats.completedThisMonth}`, unit: '건', sub: `${now.getMonth() + 1}월 누적 생산 완료`, dark: false },
          { key: 'next', label: '다음 예약', value: stats.nextDate ? new Date(stats.nextDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-', unit: '', sub: stats.nextProduct || '예정된 예약 없음', dark: false },
        ] as const).map(card => (
          <div key={card.key} style={{ ...s.statCard, ...(card.dark ? s.statCardDark : {}) }}>
            <div style={s.statTop}>
              <div style={{ ...s.statIconWrap, ...(card.dark ? { background: 'rgba(255,255,255,0.08)' } : {}) }}>
                {STAT_ICONS[card.key](card.dark ? 'rgba(255,255,255,0.6)' : '#B11F39')}
              </div>
              <span style={{ ...s.statLabel, ...(card.dark ? { color: 'rgba(255,255,255,0.5)' } : {}) }}>{card.label}</span>
            </div>
            <div style={{ ...s.statValue, ...(card.dark ? { color: '#fff' } : {}), ...(card.key === 'next' ? { fontSize: 24 } : {}) }}>
              {card.value}
              {card.unit && <span style={{ ...s.statUnit, ...(card.dark ? { color: 'rgba(255,255,255,0.35)' } : {}) }}>{card.unit}</span>}
            </div>
            <div style={{ ...s.statSub, ...(card.dark ? { color: 'rgba(255,255,255,0.25)' } : {}) }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 최근 예약 내역 */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>최근 예약 내역</span>
          <Link href="/reservations" style={s.moreLink}>
            <span>전체 보기</span>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>예약번호</th>
                <th style={s.th}>제품명</th>
                <th style={s.th}>품목</th>
                <th style={s.th}>원두(kg)</th>
                <th style={s.th}>생산일</th>
                <th style={s.th}>배정 기기</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {reservations.slice(0, 5).map(r => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                return (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.tdId}>#{r.reservation_id}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.tdMuted}>{r.products?.product_type === 'extract' ? '원액' : r.products?.product_type || '-'}</td>
                    <td style={s.tdMono}>{r.kg_amount}kg</td>
                    <td style={s.td}>{new Date(r.scheduled_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                    <td style={s.tdMuted}>{r.equipment?.name || '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.statusBadge, background: st.bg, color: st.color, borderColor: st.border }}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={7} style={s.emptyRow}>
                    <div style={s.emptyContent}>
                      {Icons.clipboard({ size: 24, color: '#ddd' })}
                      <span>예약 내역이 없습니다</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 바 ──
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%',
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  dateBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: '#999', fontWeight: 500,
    padding: '4px 10px', borderRadius: 20,
    background: '#F5F5F5',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', letterSpacing: 0.1,
    boxShadow: '0 1px 3px rgba(177,31,57,0.25), 0 1px 2px rgba(0,0,0,0.06)',
  },

  // ── 통계 카드 ──
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  statCard: {
    background: '#fff', borderRadius: 12, padding: '20px 22px',
    border: '1px solid #EEEEEE',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column' as const,
    minHeight: 140,
  },
  statCardDark: {
    background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  statTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  statIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    background: '#FDF2F4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: { fontSize: 12, color: '#999', fontWeight: 500 },
  statValue: {
    fontSize: 32, fontWeight: 700, color: '#0A0A0A',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: -0.5, lineHeight: 1, marginBottom: 8,
    flex: 1, display: 'flex', alignItems: 'baseline',
  },
  statUnit: { fontSize: 14, fontWeight: 500, marginLeft: 3, color: '#CCCCCC' },
  statSub: { fontSize: 11, color: '#CCCCCC', lineHeight: 1.3 },

  // ── 테이블 ──
  tableCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  tableHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px', borderBottom: '1px solid #F0F0F0',
  },
  tableTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },
  moreLink: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: 12, color: '#B11F39', textDecoration: 'none', fontWeight: 500,
    padding: '5px 10px', borderRadius: 6,
    border: '1px solid #F5D0D6', background: '#FDF8F9',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: {
    padding: '11px 24px', textAlign: 'left' as const,
    fontSize: 11, color: '#AAA', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
  },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 24px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 24px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdMuted: { padding: '14px 24px', fontSize: 13, color: '#999' },
  tdMono: { padding: '14px 24px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: {
    display: 'inline-block', padding: '4px 0',
    width: 72, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600,
    letterSpacing: 0.2, borderStyle: 'solid', borderWidth: 1,
  },
  emptyRow: { padding: '48px 24px', textAlign: 'center' as const },
  emptyContent: {
    display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    color: '#ccc', fontSize: 13,
  },
};
