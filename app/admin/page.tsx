'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayProduction: 0, pending: 0, monthlyDone: 0, activeEquipment: 0 });
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const [resvRes, equipRes] = await Promise.all([
      api.get('/reservations').catch(() => ({ data: { data: [] } })),
      api.get('/equipment').catch(() => ({ data: { data: [] } })),
    ]);
    const all: any[] = (resvRes as any).data.data || [];
    setPendingList(all.filter((r: any) => r.status === 'PENDING').slice(0, 10));
    setStats({
      todayProduction: all.filter((r: any) => r.scheduled_date === today && r.status === 'IN_PROGRESS').length,
      pending: all.filter((r: any) => r.status === 'PENDING').length,
      monthlyDone: all.filter((r: any) => r.status === 'COMPLETED' && r.scheduled_date >= monthStart).length,
      activeEquipment: ((equipRes as any).data.data || []).filter((e: any) => e.status === 'NORMAL').length,
    });
  };

  useEffect(() => { load(); }, []);

  if (!user) return null;

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

  return (
    <Layout title="관리자 대시보드">
      {/* 반려 모달 */}
      {rejectModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalTitle}>예약 반려</div>
            <p style={s.modalSub}>반려 사유를 입력하면 고객에게 알림이 발송됩니다.</p>
            <textarea
              style={s.modalTextarea}
              placeholder="예: 원두 미입고, 설비 점검 일정 등"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              autoFocus
            />
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={closeReject}>취소</button>
              <button style={s.modalConfirm} onClick={confirmReject}>반려 확정</button>
            </div>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div style={s.statsRow}>
        <StatCard label="오늘 생산 진행" value={`${stats.todayProduction}건`} dark />
        <StatCard label="승인 대기" value={`${stats.pending}건`} highlight />
        <StatCard label="이번 달 완료" value={`${stats.monthlyDone}건`} />
        <StatCard label="가동 중 기기" value={`${stats.activeEquipment}대`} />
      </div>

      {/* 승인 대기 목록 */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>승인 대기 목록</span>
          <span style={s.countBadge}>{stats.pending}건</span>
          <button style={s.viewAllBtn} onClick={() => router.push('/admin/reservations')}>전체 보기 →</button>
        </div>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['#', '업체명', '제품', '용량', '예약일', '처리'].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {pendingList.length === 0 && (
              <tr><td colSpan={6} style={s.empty}>승인 대기 예약이 없습니다.</td></tr>
            )}
            {pendingList.map((r: any) => (
              <tr key={r.reservation_id} style={s.tr}>
                <td style={{ ...s.td, color: '#999', textAlign: 'center' as const }}>{r.reservation_id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{r.users?.company_name || r.users?.name}</td>
                <td style={s.td}>{r.products?.product_name}</td>
                <td style={s.td}>{r.kg_amount}kg</td>
                <td style={s.td}>{r.scheduled_date}</td>
                <td style={s.td}>
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
    </Layout>
  );
}

function StatCard({ label, value, dark, highlight }: { label: string; value: string; dark?: boolean; highlight?: boolean }) {
  return (
    <div style={{ ...s.statCard, ...(dark ? s.statDark : {}), ...(highlight ? s.statHighlight : {}) }}>
      <div style={{ ...s.statLabel, color: dark ? '#999' : '#777' }}>{label}</div>
      <div style={{ ...s.statValue, color: dark ? '#fff' : highlight ? '#B11F39' : '#0A0A0A' }}>{value}</div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 28, width: 420, display: 'flex', flexDirection: 'column' as const, gap: 14 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  modalSub: { fontSize: 13, color: '#666', margin: 0 },
  modalTextarea: { padding: 12, border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, resize: 'vertical' as const, minHeight: 80, outline: 'none', fontFamily: 'inherit' },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancel: { padding: '9px 20px', background: '#fff', color: '#555', border: '1px solid #E0E0E0', borderRadius: 7, fontSize: 13, cursor: 'pointer' },
  modalConfirm: { padding: '9px 20px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 10, padding: '24px 28px', border: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  statDark: { background: '#0A0A0A', border: 'none' },
  statHighlight: {},
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 36, fontWeight: 700, letterSpacing: -2, fontFamily: 'Space Grotesk, sans-serif' },
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 24px', borderBottom: '1px solid #E0E0E0' },
  tableTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  countBadge: { background: '#B11F39', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12 },
  viewAllBtn: { marginLeft: 'auto', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '12px 20px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '0 20px', height: 60, fontSize: 14, color: '#0A0A0A', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 40, color: '#aaa', fontSize: 14 },
  actionBtns: { display: 'flex', gap: 8 },
  approveBtn: { background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { background: '#fff', color: '#666', border: '1px solid #E0E0E0', borderRadius: 4, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
};
