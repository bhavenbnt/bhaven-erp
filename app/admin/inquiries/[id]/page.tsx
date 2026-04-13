'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', IN_PROGRESS: '처리중', RESOLVED: '완료' };
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  RESOLVED:    { color: '#888', bg: '#F8F8F8', border: '#EEE' },
};
const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };

export default function AdminInquiryDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [emgDate, setEmgDate] = useState('');
  const [emgEquipmentId, setEmgEquipmentId] = useState('');
  const [emgKg, setEmgKg] = useState('');
  const [emgNotes, setEmgNotes] = useState('');
  const [emgLoading, setEmgLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => api.get(`/inquiries/${id}`).then(({ data }: any) => {
    setInquiry(data.data);
    setResponse(data.data.admin_response || '');
  }).catch(() => {});

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    api.get('/equipment').then(({ data }: any) => setEquipmentList((data.data || []).filter((e: any) => e.status === 'NORMAL'))).catch(() => {});
  }, []);

  if (!user) return null;

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setError(''); setTimeout(() => setSuccessMsg(''), 3000); };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const maxEnd = new Date(); maxEnd.setMonth(maxEnd.getMonth() + 3, 0);
  const maxDate = maxEnd.toISOString().split('T')[0];

  const respond = async () => {
    setError('');
    try {
      await api.put(`/inquiries/${id}/respond`, { admin_response: response, status: newStatus });
      showSuccess('답변이 저장되었습니다.');
      load();
    } catch (e: any) { setError(e.response?.data?.error || '오류'); }
  };

  const submitEmergency = async () => {
    setError('');
    if (!emgDate || !emgEquipmentId || !emgKg) { setError('생산일, 배정 기기, 중량은 필수입니다.'); return; }
    setEmgLoading(true);
    try {
      await api.post('/admin/emergency', {
        inquiry_id: id, product_name: inquiry.product_name || '긴급생산',
        product_type: inquiry.product_type || 'extract', kg_amount: Number(emgKg),
        scheduled_date: emgDate, equipment_id: Number(emgEquipmentId), notes: emgNotes,
      });
      showSuccess('긴급 생산이 등록되었습니다.');
      load();
    } catch (e: any) { setError(e.response?.data?.error || '오류'); }
    finally { setEmgLoading(false); }
  };

  if (!inquiry) return <Layout title=""><div style={{ padding: 40, color: '#CCC', fontSize: 13 }}>불러오는 중...</div></Layout>;

  const ss = STATUS_STYLE[inquiry.status] || STATUS_STYLE.PENDING;

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/admin/inquiries')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>문의 #{id}</h1>
            <span style={{ ...s.statusTag, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
              {STATUS_LABEL[inquiry.status]}
            </span>
          </div>
        </div>
      }
    >
      {successMsg && <div style={s.successBox}>{successMsg}</div>}
      {error && <div style={s.errorBox}>{error}</div>}

      <div style={s.grid}>
        {/* 좌측: 문의 정보 */}
        <div style={s.leftCol}>
          {/* 문의 정보 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardDot} />
              <span style={s.cardTitle}>문의 정보</span>
            </div>
            <div style={s.infoGrid}>
              <InfoItem label="접수 번호" value={`#${inquiry.inquiry_id}`} mono />
              <InfoItem label="업체명" value={inquiry.users?.company_name || inquiry.users?.name || '-'} bold />
              <InfoItem label="연락처" value={inquiry.users?.contact_info || '-'} />
              <InfoItem label="접수일" value={new Date(inquiry.created_at).toLocaleDateString('ko-KR')} />
              <InfoItem label="제품명" value={inquiry.product_name || '-'} />
              <InfoItem label="품목" value={inquiry.product_type === 'extract' ? '원액' : inquiry.product_type === 'can' ? '캔' : '-'} />
              <InfoItem label="중량" value={inquiry.kg_amount ? `${inquiry.kg_amount}kg` : '-'} mono />
              <InfoItem label="희망일" value={inquiry.desired_date || '-'} />
            </div>
          </div>

          {/* 문의 내용 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardDot} />
              <span style={s.cardTitle}>문의 내용</span>
            </div>
            <div style={s.messageBox}>{inquiry.message}</div>
          </div>

          {/* 긴급 생산 (PENDING일 때만) */}
          {inquiry.status === 'PENDING' && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={{ ...s.cardDot, background: '#B11F39' }} />
                <span style={s.cardTitle}>긴급 생산 세팅</span>
              </div>
              <div style={s.emgRow}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>생산일</label>
                  <DatePicker value={emgDate} onChange={setEmgDate} minDate={minDate} maxDate={maxDate} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>배정 기기</label>
                  <select style={s.select} value={emgEquipmentId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEmgEquipmentId(e.target.value)}>
                    <option value="">기기 선택</option>
                    {equipmentList.map((eq: any) => (
                      <option key={eq.equipment_id} value={eq.equipment_id}>{eq.name} ({TYPE_LABEL[eq.type]}, {eq.max_capacity}kg)</option>
                    ))}
                  </select>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>중량(kg)</label>
                  <div style={s.inputWrap}>
                    <input style={s.inputInner} type="number" placeholder="20" min={1} value={emgKg}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmgKg(e.target.value)} />
                    <span style={s.inputSuffix}>kg</span>
                  </div>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>비고</label>
                  <input style={s.input} placeholder="선택" value={emgNotes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmgNotes(e.target.value)} />
                </div>
              </div>
              <button style={s.emgBtn} onClick={submitEmergency} disabled={emgLoading}>
                {emgLoading ? '처리 중...' : '긴급 생산 등록'}
              </button>
            </div>
          )}
        </div>

        {/* 우측: 답변 */}
        <div style={s.rightCol}>
          <div style={s.actionCard}>
            <div style={s.actionHeader}>
              {Icons.message({ size: 14, color: '#999' })}
              <span style={s.actionTitle}>답변 처리</span>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>관리자 답변</label>
              <textarea style={s.textarea} rows={5} placeholder="답변 내용을 입력하세요..."
                value={response} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponse(e.target.value)} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>상태 변경</label>
              <div style={s.segRow}>
                <button style={{ ...s.seg, ...(newStatus === 'IN_PROGRESS' ? s.segOn : {}) }}
                  onClick={() => setNewStatus('IN_PROGRESS')}>처리중</button>
                <button style={{ ...s.seg, ...(newStatus === 'RESOLVED' ? s.segOn : {}) }}
                  onClick={() => setNewStatus('RESOLVED')}>완료</button>
              </div>
            </div>
            <button style={s.respondBtn} onClick={respond}>답변 저장</button>
          </div>

          {inquiry.admin_response && (
            <div style={s.prevResponse}>
              <div style={s.prevResponseHeader}>
                {Icons.message({ size: 12, color: '#BBB' })}
                <span>이전 답변</span>
              </div>
              <p style={s.prevResponseText}>{inquiry.admin_response}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div style={s.infoItem}>
      <span style={s.infoLabel}>{label}</span>
      <span style={{
        ...s.infoValue,
        ...(mono ? { fontFamily: "'Space Grotesk', monospace" } : {}),
        ...(bold ? { fontWeight: 600, color: '#0A0A0A' } : {}),
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
  statusTag: { fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, letterSpacing: 0.2 },

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
  cardDot: { width: 4, height: 18, borderRadius: 2, background: '#0A0A0A' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },

  // ── 정보 그리드 ──
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F8F8F8' },
  infoLabel: { fontSize: 11, color: '#AAA', fontWeight: 500 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: 500 },

  // ── 문의 내용 ──
  messageBox: {
    background: '#FAFAFA', borderRadius: 8, padding: 16,
    fontSize: 13, color: '#333', lineHeight: 1.7, border: '1px solid #F0F0F0',
  },

  // ── 긴급 생산 ──
  emgRow: { display: 'flex', gap: 12, alignItems: 'flex-end' },
  emgBtn: {
    width: '100%', padding: '10px 0', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },

  // ── 필드 ──
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  input: {
    padding: '8px 12px', border: '1px solid #EEEEEE', borderRadius: 7,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38,
  },
  inputWrap: {
    display: 'flex', alignItems: 'center', border: '1px solid #EEEEEE',
    borderRadius: 7, background: '#FAFAFA', overflow: 'hidden', height: 38,
  },
  inputInner: {
    flex: 1, padding: '0 12px', border: 'none', background: 'transparent',
    fontSize: 13, outline: 'none', color: '#0A0A0A', height: '100%',
  },
  inputSuffix: {
    padding: '0 10px', fontSize: 11, color: '#BBB', fontWeight: 500,
    borderLeft: '1px solid #EEEEEE', background: '#F5F5F5',
    height: '100%', display: 'flex', alignItems: 'center',
  },
  select: {
    padding: '8px 12px', border: '1px solid #EEEEEE', borderRadius: 7,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38,
  },
  textarea: {
    padding: '10px 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA',
    resize: 'vertical', minHeight: 100, fontFamily: 'inherit', lineHeight: 1.5,
  },

  // ── Segment ──
  segRow: { display: 'inline-flex', background: '#F0F0F0', borderRadius: 7, padding: 2, height: 38, alignItems: 'center' },
  seg: {
    padding: '0 16px', height: 34, fontSize: 12, fontWeight: 600, color: '#888',
    background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  segOn: { background: '#0A0A0A', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },

  // ── 우측 액션 ──
  actionCard: {
    background: '#FCFCFC', borderRadius: 10, padding: '16px 18px',
    border: '1px solid #F0F0F0',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  actionHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 12, fontWeight: 600, color: '#888' },
  respondBtn: {
    width: '100%', padding: '10px 0', background: '#0A0A0A', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  prevResponse: {
    background: '#FAFAFA', borderRadius: 10, padding: '14px 16px',
    border: '1px solid #F0F0F0',
  },
  prevResponseHeader: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#BBB', fontWeight: 500, marginBottom: 8 },
  prevResponseText: { fontSize: 12, color: '#888', lineHeight: 1.6, margin: 0 },
};
