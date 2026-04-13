'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const STATUS_LABEL: Record<string, string> = { PENDING: '승인 대기', CONFIRMED: '확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888', bg: '#F8F8F8', border: '#EEE' },
  CANCELLED:   { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
};

function ProductionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get(`/reservations?date_from=${dateParam}&date_to=${dateParam}`)
      .then(({ data }: any) => setList((data.data || []).filter((r: any) => r.status !== 'CANCELLED')))
      .catch(() => {});
  }, [dateParam]);

  if (!user) return null;

  const dateLabel = new Date(dateParam + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const isToday = dateParam === new Date().toISOString().split('T')[0];

  const totalKg = list.reduce((sum, r) => sum + (r.kg_amount || 0), 0);
  const totalL = list.reduce((sum, r) => sum + (r.expected_output_liter || 0), 0);
  const inProgress = list.filter(r => r.status === 'IN_PROGRESS').length;
  const confirmed = list.filter(r => r.status === 'CONFIRMED').length;

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/admin/calendar')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>생산 현황</h1>
            {isToday && <span style={s.todayBadge}>오늘</span>}
          </div>
        </div>
      }
    >
      {/* 날짜 + 요약 */}
      <div style={s.summaryRow}>
        <div style={s.dateCard}>
          {Icons.calendar({ size: 16, color: '#999' })}
          <span style={s.dateLabel}>{dateLabel}</span>
        </div>
        <div style={s.summaryChips}>
          <span style={s.chip}>{list.length}건</span>
          <span style={s.chip}>{totalKg}kg</span>
          <span style={s.chip}>{totalL}L</span>
          {inProgress > 0 && <span style={{ ...s.chip, ...s.chipActive }}>생산 중 {inProgress}</span>}
          {confirmed > 0 && <span style={s.chip}>확정 {confirmed}</span>}
        </div>
      </div>

      {/* 테이블 */}
      <div style={s.tableCard}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>업체명</th>
                <th style={s.th}>제품명</th>
                <th style={s.th}>중량</th>
                <th style={s.th}>예상 생산량</th>
                <th style={s.th}>배정 기기</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상세</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} style={s.emptyRow}>
                  <div style={s.emptyContent}>
                    {Icons.factory({ size: 24, color: '#DDD' })}
                    <span>{isToday ? '오늘' : '해당 날짜에'} 예정된 생산이 없습니다</span>
                  </div>
                </td></tr>
              )}
              {list.map((r: any) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                return (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.tdId}>{r.reservation_id}</td>
                    <td style={s.tdName}>{r.users?.company_name || r.users?.name || '-'}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.tdMono}>{r.kg_amount}kg</td>
                    <td style={s.tdMono}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</td>
                    <td style={s.tdMuted}>{r.equipment?.name || '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button style={s.detailBtn} onClick={() => router.push(`/admin/reservations/${r.reservation_id}`)}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default function ProductionPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5F5F5' }} />}><ProductionContent /></Suspense>;
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 30, height: 30, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 7,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
  },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  todayBadge: {
    fontSize: 11, fontWeight: 600, color: '#B11F39', background: '#FDF2F4',
    padding: '3px 10px', borderRadius: 20, border: '1px solid #F5D0D6',
  },

  summaryRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  dateCard: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#0A0A0A' },
  dateLabel: {},
  summaryChips: { display: 'flex', gap: 6 },
  chip: {
    fontSize: 12, fontWeight: 600, color: '#888', background: '#F0F0F0',
    padding: '4px 12px', borderRadius: 20, border: '1px solid #E8E8E8',
  },
  chipActive: { color: '#B11F39', background: '#FDF2F4', border: '1px solid #F5D0D6' },

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
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMuted: { padding: '14px 20px', fontSize: 13, color: '#999' },
  tdMono: { padding: '14px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 72, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    borderStyle: 'solid', borderWidth: 1,
  },
  detailBtn: {
    width: 28, height: 28, border: '1px solid #EEEEEE', background: '#fff',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#999', margin: '0 auto',
  },
  emptyRow: { padding: '60px 20px', textAlign: 'center' as const },
  emptyContent: {
    display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    color: '#CCC', fontSize: 13,
  },
};
