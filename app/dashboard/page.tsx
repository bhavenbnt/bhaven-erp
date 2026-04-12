'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

// 브랜드 통일 색상 — 긴급도 기반 페이드 시스템
// 긴급(burgundy) → 진행(dark) → 확정(mid) → 완료(light) → 취소(lightest)
const STATUS_LABEL: Record<string, string> = {
  PENDING: '예약 대기', CONFIRMED: '예약 확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소',
};
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDEDEF' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#E8E8E8' },
  CONFIRMED:   { color: '#555555', bg: '#F0F0F0' },
  COMPLETED:   { color: '#888888', bg: '#F5F5F5' },
  CANCELLED:   { color: '#AAAAAA', bg: '#F5F5F5' },
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

  const action = (
    <button onClick={() => router.push('/calendar')} style={s.actionBtn}>+ 예약 신청</button>
  );

  return (
    <Layout title="대시보드" action={action}>
      {/* 날짜 표시 */}
      <div style={s.dateRow}>
        <span style={s.dateText}>{dateStr}</span>
      </div>

      {/* 통계 카드 4개 - 1줄 */}
      <div style={s.statsRow}>
        {/* 카드1: 진행 중 - 다크 앵커 (유일한 반전 카드) */}
        <div style={{ ...s.statCard, background: '#0A0A0A' }}>
          <div style={{ ...s.statLabel, color: '#777' }}>진행 중</div>
          <div style={{ ...s.statValue, color: '#FFFFFF' }}>{stats.inProgress}건</div>
          <div style={{ ...s.statSub, color: '#555' }}>현재 생산 진행 중인 주문</div>
        </div>
        {/* 카드2~4: 동일한 흰 배경 + 통일된 다크 값 */}
        <div style={s.statCard}>
          <div style={s.statLabel}>예약 대기</div>
          <div style={s.statValue}>{stats.pending}건</div>
          <div style={s.statSub}>관리자 승인 대기 중</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>이번 달 완료</div>
          <div style={s.statValue}>{stats.completedThisMonth}건</div>
          <div style={s.statSub}>{now.getMonth() + 1}월 누적 생산 완료</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>다음 예약</div>
          <div style={{ ...s.statValue, fontSize: 28 }}>
            {stats.nextDate ? new Date(stats.nextDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '-'}
          </div>
          <div style={s.statSub}>{stats.nextProduct || '예정된 예약 없음'}</div>
        </div>
      </div>

      {/* 최근 예약 내역 테이블 */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>최근 예약 내역</span>
          <Link href="/reservations" style={s.moreLink}>전체 보기 →</Link>
        </div>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>예약번호</th>
              <th style={s.th}>제품명</th>
              <th style={s.th}>품목</th>
              <th style={s.th}>원두(kg)</th>
              <th style={s.th}>생산일</th>
              <th style={s.th}>배정 기기</th>
              <th style={s.th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {reservations.slice(0, 5).map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
              return (
                <tr key={r.reservation_id} style={s.tr}>
                  <td style={{ ...s.td, fontWeight: 600 }}>#{r.reservation_id}</td>
                  <td style={s.td}>{r.products?.product_name || '-'}</td>
                  <td style={{ ...s.td, color: '#666' }}>{r.products?.product_type === 'extract' ? '원액' : r.products?.product_type || '-'}</td>
                  <td style={s.td}>{r.kg_amount}kg</td>
                  <td style={s.td}>{new Date(r.scheduled_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                  <td style={{ ...s.td, color: '#666' }}>{r.equipment?.name || '-'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: st.bg, color: st.color }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#999', padding: 32 }}>예약 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  // 상단
  dateRow: { marginBottom: 20 },
  dateText: { fontSize: 13, color: '#888', background: '#F5F5F5', padding: '6px 14px', borderRadius: 6, display: 'inline-block' },
  actionBtn: { padding: '8px 20px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  // 통계 카드
  statsRow: { display: 'flex', gap: 16, marginBottom: 28 },
  statCard: { flex: 1, background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  statLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  statValue: { fontSize: 36, fontWeight: 700, marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif", color: '#0A0A0A' },
  statSub: { fontSize: 11, color: '#999' },

  // 테이블
  tableCard: { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' },
  tableTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A' },
  moreLink: { fontSize: 12, color: '#B11F39', textDecoration: 'none' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#F9F9F9' },
  th: { padding: '12px 24px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 600, borderBottom: '1px solid #f0f0f0' },
  tr: { borderBottom: '1px solid #f8f8f8' },
  td: { padding: '14px 24px', fontSize: 13, color: '#0A0A0A' },
  badge: { padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'inline-block' },
};
