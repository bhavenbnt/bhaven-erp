'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

export default function CustomerDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ type: 'suspend' | 'unsuspend' | 'delete' } | null>(null);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => {
    api.get('/users?role=customer').then(({ data }: any) => {
      const found = (data.data || []).find((u: any) => String(u.user_id) === id);
      setCustomer(found || null);
    }).catch(() => {});
    api.get('/reservations').then(({ data }: any) => {
      setReservations((data.data || []).filter((r: any) => String(r.user_id) === id).slice(0, 10));
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  if (!user) return null;

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const suspend = async () => {
    await api.put(`/users/${id}/status`, { is_active: false }).catch(() => {});
    setConfirmModal(null);
    showSuccess('계정이 정지되었습니다');
    load();
  };

  const unsuspend = async () => {
    await api.put(`/users/${id}/status`, { is_active: true }).catch(() => {});
    setConfirmModal(null);
    showSuccess('계정이 활성화되었습니다');
    load();
  };

  const deleteCustomer = async () => {
    // soft delete: is_active = false + deleted_at 설정
    await api.put(`/users/${id}/status`, { is_active: false }).catch(() => {});
    setConfirmModal(null);
    router.push('/admin/customers');
  };

  if (!customer) return <Layout title=""><div style={{ padding: 40, color: '#CCC', fontSize: 13 }}>불러오는 중...</div></Layout>;

  const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
    PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
    IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
    CONFIRMED:   { color: '#555', bg: '#F5F5F5', border: '#EBEBEB' },
    COMPLETED:   { color: '#888', bg: '#F8F8F8', border: '#EEE' },
    CANCELLED:   { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
  };
  const STATUS_LABEL: Record<string, string> = { PENDING: '대기', CONFIRMED: '확정', IN_PROGRESS: '생산중', COMPLETED: '완료', CANCELLED: '취소' };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/admin/customers')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>{customer.company_name || customer.name}</h1>
          </div>
        </div>
      }
    >
      {successMsg && <div style={s.successBox}>{successMsg}</div>}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalTitle}>
              {confirmModal.type === 'suspend' && '계정을 정지하시겠습니까?'}
              {confirmModal.type === 'unsuspend' && '계정 정지를 해제하시겠습니까?'}
              {confirmModal.type === 'delete' && '계정을 삭제하시겠습니까?'}
            </div>
            <p style={s.modalSub}>
              {confirmModal.type === 'suspend' && '정지된 계정은 로그인할 수 없습니다. 정지 해제로 복구할 수 있습니다.'}
              {confirmModal.type === 'unsuspend' && '해제하면 고객이 다시 로그인하고 예약할 수 있습니다.'}
              {confirmModal.type === 'delete' && '삭제된 계정은 복구할 수 없습니다. 이 작업은 되돌릴 수 없습니다.'}
            </p>
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => setConfirmModal(null)}>취소</button>
              <button style={confirmModal.type === 'delete' ? s.modalDanger : s.modalConfirm}
                onClick={() => {
                  if (confirmModal.type === 'suspend') suspend();
                  else if (confirmModal.type === 'unsuspend') unsuspend();
                  else deleteCustomer();
                }}>
                {confirmModal.type === 'suspend' && '정지'}
                {confirmModal.type === 'unsuspend' && '해제'}
                {confirmModal.type === 'delete' && '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.grid}>
        {/* 좌측: 고객 정보 + 예약 내역 */}
        <div style={s.leftCol}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardDot} />
              <span style={s.cardTitle}>고객사 정보</span>
            </div>
            <div style={s.infoGrid}>
              <InfoItem label="업체명" value={customer.company_name || '-'} bold />
              <InfoItem label="담당자" value={customer.name || '-'} />
              <InfoItem label="이메일" value={customer.email} />
              <InfoItem label="연락처" value={customer.contact_info || '-'} />
              <InfoItem label="등록일" value={new Date(customer.created_at).toLocaleDateString('ko-KR')} />
              <InfoItem label="마지막 로그인" value={customer.last_login ? new Date(customer.last_login).toLocaleDateString('ko-KR') : '-'} />
            </div>
          </div>

          {/* 예약 관리 바로가기 */}
          <div style={s.linkCard} onClick={() => router.push(`/admin/reservations?search=${encodeURIComponent(customer.company_name || customer.name)}`)}>
            {Icons.clipboard({ size: 16, color: '#999' })}
            <span style={s.linkText}>예약 관리에서 이 고객사 예약 보기</span>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth={2} strokeLinecap="round" style={{ marginLeft: 'auto' }}><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </div>

        {/* 우측: 계정 관리 */}
        <div style={s.rightCol}>
          <div style={s.actionCard}>
            <div style={s.actionHeader}>
              {Icons.user({ size: 14, color: '#999' })}
              <span style={s.actionTitle}>계정 관리</span>
            </div>
            <div style={s.statusRow}>
              <span style={s.statusLabel}>상태</span>
              <span style={{ ...s.statusValue, color: customer.is_active ? '#0A0A0A' : '#B11F39' }}>
                {customer.is_active ? '활성' : '정지됨'}
              </span>
            </div>
            <div style={s.divider} />
            {customer.is_active ? (
              <button style={s.suspendBtn} onClick={() => setConfirmModal({ type: 'suspend' })}>계정 정지</button>
            ) : (
              <button style={s.unsuspendBtn} onClick={() => setConfirmModal({ type: 'unsuspend' })}>계정 정지 해제</button>
            )}
            <button style={s.deleteBtn} onClick={() => setConfirmModal({ type: 'delete' })}>계정 삭제</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={s.infoItem}>
      <span style={s.infoLabel}>{label}</span>
      <span style={{ ...s.infoValue, ...(bold ? { fontWeight: 600, color: '#0A0A0A' } : {}) }}>{value}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 30, height: 30, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 7,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
  },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  successBox: { padding: '10px 16px', borderRadius: 8, background: '#F0F0F0', border: '1px solid #E0E0E0', color: '#555', fontSize: 12, fontWeight: 500, marginBottom: 12 },

  grid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 12 },

  card: {
    background: '#fff', borderRadius: 12, padding: '20px 22px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  cardDot: { width: 4, height: 18, borderRadius: 2, background: '#B11F39' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },
  countBadge: { fontSize: 11, fontWeight: 600, color: '#999', background: '#F0F0F0', padding: '2px 8px', borderRadius: 10, marginLeft: 'auto' },
  divider: { height: 1, background: '#F0F0F0' },

  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F8F8F8' },
  infoLabel: { fontSize: 11, color: '#AAA', fontWeight: 500 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: 500 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, color: '#AAA', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' },
  tr: { borderBottom: '1px solid #F5F5F5', cursor: 'pointer' },
  td: { padding: '12px 16px', fontSize: 13, color: '#333' },
  tdId: { padding: '12px 16px', fontSize: 12, color: '#999', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  tdMono: { padding: '12px 16px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 56, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, borderStyle: 'solid', borderWidth: 1,
  },

  linkCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#fff', borderRadius: 10, padding: '14px 18px',
    border: '1px solid #EEEEEE', cursor: 'pointer',
  },
  linkText: { fontSize: 13, fontWeight: 500, color: '#555' },

  actionCard: {
    background: '#FCFCFC', borderRadius: 10, padding: '16px 18px',
    border: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 12,
  },
  actionHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 12, fontWeight: 600, color: '#888' },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#999' },
  statusValue: { fontSize: 12, fontWeight: 600 },
  suspendBtn: {
    width: '100%', padding: '10px 0', background: '#fff', color: '#999',
    border: '1px solid #EEEEEE', borderRadius: 7, fontSize: 12, cursor: 'pointer',
  },
  unsuspendBtn: {
    width: '100%', padding: '10px 0', background: '#0A0A0A', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  deleteBtn: {
    width: '100%', padding: '10px 0', background: '#fff', color: '#B11F39',
    border: '1px solid #F5D0D6', borderRadius: 7, fontSize: 12, cursor: 'pointer',
  },

  // ── 확인 모달 ──
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: {
    background: '#fff', borderRadius: 12, padding: '24px 28px', width: 400,
    display: 'flex', flexDirection: 'column', gap: 14,
    border: '1px solid #EEEEEE', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  modalSub: { fontSize: 12, color: '#999', margin: 0, lineHeight: 1.5 },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancel: { padding: '9px 20px', background: '#fff', color: '#666', border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  modalConfirm: { padding: '9px 20px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  modalDanger: { padding: '9px 20px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)' },
};
