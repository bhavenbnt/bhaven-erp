'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import { useDrag } from '@/lib/useDrag';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', CONFIRMED: '예약 확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소',
};
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888888', bg: '#F8F8F8', border: '#EEEEEE' },
  CANCELLED:   { color: '#AAAAAA', bg: '#FAFAFA', border: '#F0F0F0' },
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayProduction: 0, pending: 0, monthlyDone: 0, activeEquipment: 0 });
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const drag = useDrag();
  const [rejectReason, setRejectReason] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const [resvRes, equipRes] = await Promise.all([
      api.get(`/reservations?date_from=${monthStart}`).catch(() => ({ data: { data: [] } })),
      api.get('/equipment').catch(() => ({ data: { data: [] } })),
    ]);
    const all: any[] = (resvRes as any).data.data || [];
    setAllReservations(all);
    setPendingList(all.filter((r: any) => r.status === 'PENDING'));
    setStats({
      todayProduction: all.filter((r: any) => r.scheduled_date === today && (r.status === 'IN_PROGRESS' || r.status === 'CONFIRMED')).length,
      pending: all.filter((r: any) => r.status === 'PENDING').length,
      monthlyDone: all.filter((r: any) => r.status === 'COMPLETED' && r.scheduled_date >= monthStart).length,
      activeEquipment: ((equipRes as any).data.data || []).filter((e: any) => e.status === 'NORMAL').length,
    });
  };

  useEffect(() => { load(); }, []);

  if (!user) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const approve = async (id: number) => {
    await api.put(`/reservations/${id}/approve`).catch((e: any) => alert(e.response?.data?.error || '오류'));
    load();
  };
  const openReject = (id: number) => { setRejectModal({ id }); setRejectReason(''); };
  const closeReject = () => { setRejectModal(null); setRejectReason(''); };
  const confirmReject = async () => {
    if (!rejectReason.trim()) return alert('반려 사유를 입력해주세요.');
    await api.put(`/reservations/${rejectModal!.id}/reject`, { reason: rejectReason }).catch((e: any) => alert(e.response?.data?.error || '오류'));
    closeReject();
    load();
  };

  const totalPages = Math.max(1, Math.ceil(pendingList.length / PAGE_SIZE));
  const paginated = pendingList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        </div>
      }
    >
      {/* 반려 모달 */}
      {rejectModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, ...drag.modalStyle }}>
            <div style={{ ...s.modalHeader, ...drag.handleStyle }} onMouseDown={drag.onMouseDown}>
              <span style={s.modalTitle}>예약 반려</span>
              <button style={s.modalClose} onClick={() => { closeReject(); drag.reset(); }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <p style={s.modalSub}>반려 사유를 입력하면 고객에게 알림이 발송됩니다.</p>
            <textarea style={s.modalTextarea} placeholder="예: 원두 미입고, 설비 점검 일정 등"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus />
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={closeReject}>취소</button>
              <button style={s.modalConfirm} onClick={confirmReject}>반려 확정</button>
            </div>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div style={s.statsRow}>
        <div style={{ ...s.statCard, ...s.statCardDark }}>
          <div style={s.statTop}>
            <div style={{ ...s.statIconWrap, background: 'rgba(255,255,255,0.08)' }}>
              {Icons.factory({ size: 16, color: 'rgba(255,255,255,0.6)' })}
            </div>
            <span style={{ ...s.statLabel, color: 'rgba(255,255,255,0.5)' }}>오늘 생산</span>
          </div>
          <div style={{ ...s.statValue, color: '#fff' }}>{stats.todayProduction}<span style={{ ...s.statUnit, color: 'rgba(255,255,255,0.35)' }}>건</span></div>
          <div style={{ ...s.statSub, color: 'rgba(255,255,255,0.25)' }}>오늘 생산 예정 주문</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statTop}>
            <div style={s.statIconWrap}>{Icons.clipboard({ size: 16, color: '#B11F39' })}</div>
            <span style={s.statLabel}>승인 대기</span>
          </div>
          <div style={s.statValue}>{stats.pending}<span style={s.statUnit}>건</span></div>
          <div style={s.statSub}>처리 필요</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statTop}>
            <div style={s.statIconWrap}>{Icons.chart({ size: 16, color: '#B11F39' })}</div>
            <span style={s.statLabel}>이번 달 완료</span>
          </div>
          <div style={s.statValue}>{stats.monthlyDone}<span style={s.statUnit}>건</span></div>
          <div style={s.statSub}>{now.getMonth() + 1}월 누적</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statTop}>
            <div style={s.statIconWrap}>{Icons.settings({ size: 16, color: '#B11F39' })}</div>
            <span style={s.statLabel}>가동 중 기기</span>
          </div>
          <div style={s.statValue}>{stats.activeEquipment}<span style={s.statUnit}>대</span></div>
          <div style={s.statSub}>정상 운영</div>
        </div>
      </div>

      {/* 승인 대기 */}
      <div>
        {/* 승인 대기 */}
        <div style={s.tableCard}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>승인 대기</span>
            {stats.pending > 0 && <span style={s.pendingBadge}>{stats.pending}</span>}
            <Link href="/admin/reservations" style={s.moreLink}>
              <span>전체 보기</span>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>업체명</th>
                  <th style={s.th}>제품</th>
                  <th style={s.th}>용량</th>
                  <th style={s.th}>예약일</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={6} style={s.emptyRow}>
                    <div style={s.emptyContent}>
                      {Icons.clipboard({ size: 20, color: '#DDD' })}
                      <span>대기 중인 예약이 없습니다</span>
                    </div>
                  </td></tr>
                )}
                {paginated.map((r: any) => (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.tdId}>{r.reservation_id}</td>
                    <td style={s.tdName}>{r.users?.company_name || r.users?.name || '-'}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.tdMono}>{r.kg_amount}kg</td>
                    <td style={s.td}>{new Date(r.scheduled_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <div style={s.actionBtns}>
                        <button style={s.approveBtn} onClick={() => approve(r.reservation_id)}>승인</button>
                        <button style={s.rejectBtn} onClick={() => openReject(r.reservation_id)}>반려</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <span style={s.pageInfo}>{pendingList.length}건 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, pendingList.length)}</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  dateBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: '#999', fontWeight: 500,
    padding: '4px 10px', borderRadius: 20, background: '#F5F5F5',
  },

  // ── 통계 카드 ──
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  statCard: {
    background: '#fff', borderRadius: 12, padding: '20px 22px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column', minHeight: 130,
  },
  statCardDark: {
    background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  statTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  statIconWrap: {
    width: 30, height: 30, borderRadius: 8, background: '#FDF2F4',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statLabel: { fontSize: 12, color: '#999', fontWeight: 500 },
  statValue: {
    fontSize: 32, fontWeight: 700, color: '#0A0A0A',
    fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.5,
    lineHeight: 1, marginBottom: 8, display: 'flex', alignItems: 'baseline',
  },
  statUnit: { fontSize: 14, fontWeight: 500, marginLeft: 2, color: '#CCC' },
  statSub: { fontSize: 11, color: '#CCC', lineHeight: 1.3 },

  // ── 테이블 2열 ──
  tableCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  tableHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '16px 20px', borderBottom: '1px solid #F0F0F0',
  },
  tableTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },
  pendingBadge: {
    fontSize: 10, fontWeight: 700, color: '#B11F39', background: '#FDF2F4',
    borderRadius: 10, padding: '2px 7px', border: '1px solid #F5D0D6',
  },
  moreLink: {
    display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto',
    fontSize: 12, color: '#B11F39', textDecoration: 'none', fontWeight: 500,
    padding: '5px 10px', borderRadius: 6,
    border: '1px solid #F5D0D6', background: '#FDF8F9',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 16px', textAlign: 'left' as const,
    fontSize: 11, color: '#AAA', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
  },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '12px 16px', fontSize: 13, color: '#333' },
  tdId: { padding: '12px 16px', fontSize: 12, color: '#999', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  tdName: { padding: '12px 16px', fontSize: 13, color: '#0A0A0A', fontWeight: 600 },
  tdMono: { padding: '12px 16px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 72, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    borderStyle: 'solid', borderWidth: 1,
  },
  emptyRow: { padding: '40px 16px', textAlign: 'center' as const },
  emptyContent: {
    display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    color: '#CCC', fontSize: 13,
  },
  actionBtns: { display: 'flex', gap: 6, justifyContent: 'center' },
  approveBtn: {
    background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 6,
    padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  rejectBtn: {
    background: '#fff', color: '#999', border: '1px solid #EEEEEE', borderRadius: 6,
    padding: '6px 14px', fontSize: 11, cursor: 'pointer',
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

  // ── 반려 모달 ──
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: '24px 28px', width: 420,
    display: 'flex', flexDirection: 'column', gap: 14,
    border: '1px solid #EEEEEE', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: 2, lineHeight: 0 },
  modalSub: { fontSize: 12, color: '#999', margin: 0 },
  modalTextarea: {
    padding: '10px 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, resize: 'vertical', minHeight: 80, outline: 'none',
    fontFamily: 'inherit', background: '#FAFAFA',
  },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancel: {
    padding: '9px 20px', background: '#fff', color: '#666',
    border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, cursor: 'pointer',
  },
  modalConfirm: {
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },
};
