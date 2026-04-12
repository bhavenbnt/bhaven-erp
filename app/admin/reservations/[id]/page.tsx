'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '승인 대기', CONFIRMED: '예약 확정', IN_PROGRESS: '생산중', COMPLETED: '생산 완료', CANCELLED: '취소됨' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', CONFIRMED: '#3B82F6', IN_PROGRESS: '#10B981', COMPLETED: '#6B7280', CANCELLED: '#EF4444' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', CONFIRMED: '#EFF6FF', IN_PROGRESS: '#ECFDF5', COMPLETED: '#F3F4F6', CANCELLED: '#FEF2F2' };
const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };
const TYPE_PRODUCT: Record<string, string> = { extract: '원액', can: '캔' };

export default function AdminReservationDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<any>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reassignEqId, setReassignEqId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [notifyKakao, setNotifyKakao] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => api.get(`/reservations/${id}`).then(({ data }: any) => setReservation(data.data)).catch(() => {});
  useEffect(() => {
    load();
    api.get('/equipment').then(({ data }: any) => setEquipment(data.data || [])).catch(() => {});
  }, [id]);

  if (!user) return null;

  const approve = async () => {
    setError('');
    await api.put(`/reservations/${id}/approve`).catch((e: any) => setError(e.response?.data?.error || '오류'));
    load();
  };

  const openReject = () => { setRejectModal(true); setRejectReason(''); setError(''); };
  const closeReject = () => { setRejectModal(false); setRejectReason(''); };
  const confirmReject = async () => {
    if (!rejectReason.trim()) { setError('반려 사유를 입력해주세요.'); return; }
    await api.put(`/reservations/${id}/reject`, { reason: rejectReason }).catch((e: any) => setError(e.response?.data?.error || '오류'));
    closeReject();
    load();
  };

  const doReschedule = async () => {
    if (!rescheduleDate) return setError('새 날짜를 선택해주세요.');
    setRescheduling(true); setError(''); setRescheduleSuccess(false);
    try {
      await api.put(`/reservations/${id}/reschedule`, { scheduled_date: rescheduleDate, reason: rescheduleReason, notify_kakao: notifyKakao });
      setRescheduleSuccess(true);
      setRescheduleDate('');
      setRescheduleReason('');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setRescheduling(false);
    }
  };

  const doReassign = async () => {
    if (!reassignEqId) return setError('기기를 선택해주세요.');
    if (!reassignReason.trim()) return setError('배정 사유를 입력해주세요.');
    setReassigning(true); setError(''); setReassignSuccess(false);
    try {
      await api.put(`/reservations/${id}/reassign`, { equipment_id: parseInt(reassignEqId), reason: reassignReason });
      setReassignSuccess(true);
      setReassignReason('');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setReassigning(false);
    }
  };

  if (!reservation) return <Layout title="예약 상세"><div style={{ padding: 32, color: '#999' }}>불러오는 중...</div></Layout>;

  const infoRows = [
    { label: '예약 번호', value: `RV-${reservation.reservation_id}` },
    { label: '업체명', value: reservation.users?.company_name || reservation.users?.name },
    { label: '담당자', value: reservation.users?.name },
    { label: '연락처', value: reservation.users?.contact_info || '-' },
    { label: '생산일', value: reservation.scheduled_date },
    { label: '기기', value: `${reservation.equipment?.name} (${TYPE_LABEL[reservation.equipment?.type] || ''})` },
  ];
  const productRows = [
    { label: '제품명', value: reservation.products?.product_name },
    { label: '품목', value: TYPE_PRODUCT[reservation.products?.product_type] },
    { label: '용기', value: reservation.products?.container_size || '-' },
    { label: '원두 중량', value: `${reservation.kg_amount} kg` },
    { label: '수율', value: `${reservation.products?.yield_rate} L/kg` },
    { label: '예상 생산량', value: `${reservation.expected_output_liter} L` },
    { label: '비고', value: reservation.notes || '없음' },
  ];

  return (
    <Layout title="예약 상세" action={
      <button style={s.backBtn} onClick={() => router.push('/admin/reservations')}>← 예약 목록</button>
    }>
      {/* 반려 모달 */}
      {rejectModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalTitle}>예약 반려 / 취소 처리</div>
            <p style={s.modalSub}>사유를 입력하면 고객에게 카카오톡 알림이 발송됩니다.</p>
            <textarea
              style={s.modalTextarea}
              placeholder="예: 원두 미입고, 설비 점검 일정, 고객 요청 등"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              autoFocus
            />
            {error && <p style={{ color: '#B11F39', fontSize: 12, margin: 0 }}>{error}</p>}
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={closeReject}>취소</button>
              <button style={s.modalConfirm} onClick={confirmReject}>확정</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.grid}>
        <div style={s.left}>
          <InfoCard title="예약 정보" rows={infoRows} />
          <InfoCard title="제품 정보" rows={productRows} />
        </div>
        <div style={s.right}>
          <div style={s.card}>
            <div style={s.cardTitle}>현재 상태</div>
            <div style={s.divider} />
            <span style={{ ...s.statusBadge, background: STATUS_BG[reservation.status], color: STATUS_COLOR[reservation.status] }}>
              {STATUS_LABEL[reservation.status]}
            </span>
          </div>
          {reservation.status === 'PENDING' && (
            <div style={s.card}>
              <div style={s.cardTitle}>예약 처리</div>
              <div style={s.divider} />
              <p style={s.tip}>예약을 승인하거나 반려하세요.</p>
              <button style={s.approveBtn} onClick={approve}>승인</button>
              <div style={{ height: 8 }} />
              <button style={s.rejectBtn} onClick={openReject}>반려</button>
              {error && <p style={s.error}>{error}</p>}
            </div>
          )}
          {reservation.status === 'CONFIRMED' && (
            <div style={s.card}>
              <div style={s.cardTitle}>예약 관리</div>
              <div style={s.divider} />
              <button style={s.rejectBtn} onClick={openReject}>취소 처리</button>
            </div>
          )}
          {['PENDING', 'CONFIRMED'].includes(reservation.status) && (
            <div style={s.card}>
              <div style={s.cardTitle}>날짜 변경</div>
              <div style={s.divider} />
              <div style={s.field}>
                <label style={s.fieldLabel}>새 생산 날짜</label>
                <input
                  type="date"
                  style={s.select}
                  value={rescheduleDate}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  onChange={e => setRescheduleDate(e.target.value)}
                />
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>변경 사유</label>
                <textarea
                  style={s.textarea}
                  placeholder="예: 설비 점검으로 인한 일정 조정"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  rows={2}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={notifyKakao} onChange={e => setNotifyKakao(e.target.checked)} />
                고객에게 카카오톡 알림 발송
              </label>
              {rescheduleSuccess && <p style={{ color: '#10B981', fontSize: 12, margin: 0 }}>날짜가 변경되었습니다.</p>}
              <button style={s.reassignBtn} onClick={doReschedule} disabled={rescheduling}>
                {rescheduling ? '처리 중...' : '날짜 변경 적용'}
              </button>
            </div>
          )}
          {['PENDING', 'CONFIRMED'].includes(reservation.status) && (
            <div style={s.card}>
              <div style={s.cardTitle}>수동 기기 배정</div>
              <div style={s.divider} />
              <p style={s.tip}>자동 배정을 무시하고 관리자가 직접 기기를 지정합니다. 사유 기록이 필수입니다.</p>
              <div style={s.field}>
                <label style={s.fieldLabel}>기기 선택</label>
                <select style={s.select} value={reassignEqId} onChange={e => setReassignEqId(e.target.value)}>
                  <option value="">기기 선택...</option>
                  {equipment.filter((e: any) => e.status === 'NORMAL').map((e: any) => (
                    <option key={e.equipment_id} value={e.equipment_id}>
                      {e.name} ({e.type === 'small' ? '소형' : e.type === 'medium' ? '중형' : '대형'}, 최대 {e.max_capacity}kg)
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>배정 사유 (필수)</label>
                <textarea
                  style={s.textarea}
                  placeholder="예: 대형 기기 고장으로 중형으로 변경, 고객 요청"
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  rows={3}
                />
              </div>
              {reassignSuccess && <p style={{ color: '#10B981', fontSize: 12, margin: 0 }}>기기가 재배정되었습니다.</p>}
              <button style={s.reassignBtn} onClick={doReassign} disabled={reassigning}>
                {reassigning ? '처리 중...' : '수동 배정 적용'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{title}</div>
      <div style={s.divider} />
      {rows.map(r => (
        <div key={r.label} style={s.infoRow}>
          <span style={s.infoLabel}>{r.label}</span>
          <span style={s.infoValue}>{r.value}</span>
        </div>
      ))}
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
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, color: '#666', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 },
  left: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  right: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  card: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  divider: { height: 1, background: '#F3F4F6' },
  infoRow: { display: 'flex', padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
  infoLabel: { width: 90, fontSize: 13, color: '#888', flexShrink: 0 },
  infoValue: { fontSize: 13, color: '#1a1a1a', fontWeight: 500 },
  statusBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' as const },
  tip: { fontSize: 12, color: '#888', lineHeight: 1.6, margin: 0 },
  approveBtn: { width: '100%', padding: 12, background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { width: '100%', padding: 12, background: '#fff', color: '#666', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  error: { color: '#B11F39', fontSize: 13, margin: 0 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: 500, color: '#374151' },
  select: { padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' },
  textarea: { padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit' },
  reassignBtn: { width: '100%', padding: 11, background: '#374151', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
