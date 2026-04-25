'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';
import { useDrag } from '@/lib/useDrag';

const STATUS_LABEL: Record<string, string> = { PENDING: '승인 대기', CONFIRMED: '예약 확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888', bg: '#F8F8F8', border: '#EEE' },
  CANCELLED:   { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
};
const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };

export default function AdminReservationDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<any>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const drag = useDrag();
  const [rejectReason, setRejectReason] = useState('');
  const [reassignEqId, setReassignEqId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

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

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setError(''); setTimeout(() => setSuccessMsg(''), 3000); };

  const approve = async () => {
    setError('');
    try { await api.put(`/reservations/${id}/approve`); showSuccess('승인 완료'); load(); }
    catch (e: any) { setError(e.response?.data?.error || '오류'); }
  };
  const openReject = () => { setRejectModal(true); setRejectReason(''); setError(''); };
  const closeReject = () => { setRejectModal(false); setRejectReason(''); };
  const confirmReject = async () => {
    if (!rejectReason.trim()) { setError('반려 사유를 입력해주세요.'); return; }
    try { await api.put(`/reservations/${id}/reject`, { reason: rejectReason }); closeReject(); showSuccess('반려 처리됨'); load(); }
    catch (e: any) { setError(e.response?.data?.error || '오류'); }
  };
  const doReschedule = async () => {
    if (!rescheduleDate) return setError('새 날짜를 선택해주세요.');
    setRescheduling(true); setError('');
    try { await api.put(`/reservations/${id}/reschedule`, { scheduled_date: rescheduleDate, reason: rescheduleReason }); showSuccess('날짜 변경 완료'); setRescheduleDate(''); setRescheduleReason(''); load(); }
    catch (e: any) { setError(e.response?.data?.error || '오류'); }
    finally { setRescheduling(false); }
  };
  const doReassign = async () => {
    if (!reassignEqId) return setError('기기를 선택해주세요.');
    if (!reassignReason.trim()) return setError('배정 사유를 입력해주세요.');
    setReassigning(true); setError('');
    try { await api.put(`/reservations/${id}/reassign`, { equipment_id: parseInt(reassignEqId), reason: reassignReason }); showSuccess('기기 재배정 완료'); setReassignReason(''); load(); }
    catch (e: any) { setError(e.response?.data?.error || '오류'); }
    finally { setReassigning(false); }
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const maxEnd = new Date(); maxEnd.setMonth(maxEnd.getMonth() + 3, 0);
  const maxDate = maxEnd.toISOString().split('T')[0];

  if (!reservation) return <Layout title=""><div style={{ padding: 40, color: '#CCC', fontSize: 13 }}>불러오는 중...</div></Layout>;

  const r = reservation;
  const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
  const isPending = r.status === 'PENDING';
  const isEditable = ['PENDING', 'CONFIRMED'].includes(r.status);

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/admin/reservations')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>예약 #{id}</h1>
            <span style={{ ...s.statusTag, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
              {STATUS_LABEL[r.status]}
            </span>
          </div>
          {isPending && (
            <div style={s.topActions}>
              <button style={s.rejectTopBtn} onClick={openReject}>반려</button>
              <button style={s.approveTopBtn} onClick={approve}>승인</button>
            </div>
          )}
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
            <p style={s.modalSub}>사유를 입력하면 고객에게 알림이 발송됩니다.</p>
            <textarea style={s.modalTextarea} placeholder="예: 원두 미입고, 설비 점검 등"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus />
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={closeReject}>취소</button>
              <button style={s.modalConfirm} onClick={confirmReject}>반려 확정</button>
            </div>
          </div>
        </div>
      )}

      {/* 알림 */}
      {successMsg && <div style={s.successBox}>{successMsg}</div>}
      {error && !rejectModal && <div style={s.errorBox}>{error}</div>}

      <div style={s.grid}>
        {/* 좌측: 정보 */}
        <div style={s.leftCol}>
          {/* 예약 정보 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardDot} />
              <span style={s.cardTitle}>예약 정보</span>
            </div>
            <div style={s.infoGrid}>
              <InfoItem label="예약 번호" value={`#${r.reservation_id}`} mono />
              <InfoItem label="업체명" value={r.users?.company_name || '-'} bold />
              <InfoItem label="담당자" value={r.users?.name || '-'} />
              <InfoItem label="연락처" value={r.users?.contact_info || '-'} />
              <InfoItem label="생산일" value={r.scheduled_date} mono />
              <InfoItem label="배정 기기" value={r.equipment?.name ? `${r.equipment.name} (${TYPE_LABEL[r.equipment.type] || ''})` : '-'} />
            </div>
          </div>

          {/* 제품 정보 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardDot} />
              <span style={s.cardTitle}>제품 정보</span>
            </div>
            <div style={s.infoGrid}>
              <InfoItem label="제품명" value={r.products?.product_name || '-'} bold />
              <InfoItem label="품목" value={r.products?.product_type === 'extract' ? '원액' : r.products?.product_type === 'can' ? '캔' : '-'} />
              <InfoItem label="용기" value={r.products?.container_size || '-'} />
              <InfoItem label="원두 중량" value={`${r.kg_amount} kg`} mono />
              <InfoItem label="수율" value={`${r.products?.yield_rate || '-'} L/kg`} />
              <InfoItem label="예상 생산량" value={`${r.expected_output_liter || '-'} L`} highlight />
            </div>
            {r.notes && (
              <>
                <div style={s.divider} />
                <div style={s.noteRow}>
                  <span style={s.noteLabel}>비고</span>
                  <span style={s.noteValue}>{r.notes}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 우측: 관리 액션 */}
        <div style={s.rightCol}>
          {isEditable && (
            <>
              {/* 날짜 변경 */}
              <div style={s.actionCard}>
                <div style={s.actionHeader}>
                  {Icons.calendar({ size: 14, color: '#999' })}
                  <span style={s.actionTitle}>날짜 변경</span>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>새 생산 날짜</label>
                  <DatePicker value={rescheduleDate} onChange={setRescheduleDate} minDate={minDate} maxDate={maxDate} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>변경 사유</label>
                  <input style={s.input} placeholder="설비 점검 등" value={rescheduleReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRescheduleReason(e.target.value)} />
                </div>
                <button style={s.actionBtn} onClick={doReschedule} disabled={rescheduling}>
                  {rescheduling ? '처리 중...' : '날짜 변경'}
                </button>
              </div>

              {/* 수동 기기 배정 */}
              <div style={s.actionCard}>
                <div style={s.actionHeader}>
                  {Icons.settings({ size: 14, color: '#999' })}
                  <span style={s.actionTitle}>수동 기기 배정</span>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>기기 선택</label>
                  <select style={s.select} value={reassignEqId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReassignEqId(e.target.value)}>
                    <option value="">기기 선택...</option>
                    {equipment.filter((e: any) => e.status === 'NORMAL').map((e: any) => (
                      <option key={e.equipment_id} value={e.equipment_id}>
                        {e.name} ({TYPE_LABEL[e.type]}, {e.max_capacity}kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>배정 사유 <span style={{ color: '#B11F39' }}>*</span></label>
                  <input style={s.input} placeholder="고객 요청, 기기 고장 등" value={reassignReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReassignReason(e.target.value)} />
                </div>
                <button style={s.actionBtn} onClick={doReassign} disabled={reassigning}>
                  {reassigning ? '처리 중...' : '기기 재배정'}
                </button>
              </div>

              {/* 취소 처리 */}
              {r.status === 'CONFIRMED' && (
                <button style={s.cancelOrderBtn} onClick={openReject}>취소 처리</button>
              )}
            </>
          )}

          {!isEditable && (
            <div style={s.actionCard}>
              <div style={s.actionHeader}>
                {Icons.clipboard({ size: 14, color: '#999' })}
                <span style={s.actionTitle}>처리 완료</span>
              </div>
              <p style={s.completedText}>이 예약은 {STATUS_LABEL[r.status]} 상태입니다.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, mono, bold, highlight }: { label: string; value: string; mono?: boolean; bold?: boolean; highlight?: boolean }) {
  return (
    <div style={s.infoItem}>
      <span style={s.infoLabel}>{label}</span>
      <span style={{
        ...s.infoValue,
        ...(mono ? { fontFamily: "'Space Grotesk', monospace" } : {}),
        ...(bold ? { fontWeight: 600, color: '#0A0A0A' } : {}),
        ...(highlight ? { color: '#B11F39', fontWeight: 700 } : {}),
      }}>{value}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 30, height: 30, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 7,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
  },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  statusTag: {
    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, letterSpacing: 0.2,
  },
  topActions: { display: 'flex', gap: 8 },
  rejectTopBtn: {
    padding: '8px 20px', background: '#fff', color: '#999',
    border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  approveTopBtn: {
    padding: '8px 20px', background: '#0A0A0A', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  // ── 알림 ──
  successBox: { padding: '10px 16px', borderRadius: 8, background: '#F0F0F0', border: '1px solid #E0E0E0', color: '#555', fontSize: 12, fontWeight: 500, marginBottom: 12 },
  errorBox: { padding: '10px 16px', borderRadius: 8, background: '#FDF2F4', border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500, marginBottom: 12 },

  // ── 그리드 ──
  grid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 12 },

  // ── 카드 ──
  card: {
    background: '#fff', borderRadius: 12, padding: '20px 22px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  cardDot: { width: 4, height: 18, borderRadius: 2, background: '#B11F39' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },
  divider: { height: 1, background: '#F0F0F0' },

  // ── 정보 그리드 ──
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F8F8F8' },
  infoLabel: { fontSize: 11, color: '#AAA', fontWeight: 500 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: 500 },
  noteRow: { display: 'flex', gap: 12 },
  noteLabel: { fontSize: 11, color: '#AAA', fontWeight: 500, flexShrink: 0 },
  noteValue: { fontSize: 13, color: '#333' },

  // ── 액션 카드 ──
  actionCard: {
    background: '#FCFCFC', borderRadius: 10, padding: '16px 18px',
    border: '1px solid #F0F0F0',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  actionHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 12, fontWeight: 600, color: '#888' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  input: {
    padding: '8px 12px', border: '1px solid #EEEEEE', borderRadius: 7,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#fff',
  },
  select: {
    padding: '8px 12px', border: '1px solid #EEEEEE', borderRadius: 7,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#fff',
  },
  actionBtn: {
    width: '100%', padding: '9px 0', background: '#0A0A0A', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  cancelOrderBtn: {
    width: '100%', padding: '10px 0', background: '#fff', color: '#B11F39',
    border: '1px solid #F5D0D6', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  completedText: { fontSize: 12, color: '#BBB', margin: 0 },

  // ── 모달 ──
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
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
  modalCancel: { padding: '9px 20px', background: '#fff', color: '#666', border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  modalConfirm: { padding: '9px 20px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)' },
};
