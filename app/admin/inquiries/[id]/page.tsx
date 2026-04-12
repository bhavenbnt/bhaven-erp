'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

interface Equipment {
  equipment_id: number;
  name: string;
  type: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', IN_PROGRESS: '처리중', RESOLVED: '처리완료' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', IN_PROGRESS: '#3B82F6', RESOLVED: '#10B981' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', IN_PROGRESS: '#EFF6FF', RESOLVED: '#ECFDF5' };
const TYPE_LABEL: Record<string, string> = { extract: '원액', can: '캔' };

export default function AdminInquiryDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 긴급 생산 세팅 상태
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [emgDate, setEmgDate] = useState('');
  const [emgEquipmentId, setEmgEquipmentId] = useState('');
  const [emgKg, setEmgKg] = useState('');
  const [emgNotes, setEmgNotes] = useState('');
  const [emgError, setEmgError] = useState('');
  const [emgSuccess, setEmgSuccess] = useState(false);
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
    api.get('/equipment').then(({ data }: any) => {
      setEquipmentList((data.data as Equipment[]).filter((eq) => eq.status === 'NORMAL'));
    }).catch(() => {});
  }, []);

  if (!user) return null;

  const submitEmergency = async () => {
    setEmgError(''); setEmgSuccess(false);
    if (!emgDate || !emgEquipmentId || !emgKg) {
      setEmgError('생산일, 배정 기기, 중량은 필수입니다.');
      return;
    }
    setEmgLoading(true);
    try {
      await api.post('/admin/emergency', {
        inquiry_id: id,
        product_name: inquiry.product_name || '긴급생산',
        product_type: inquiry.product_type || 'extract',
        kg_amount: Number(emgKg),
        scheduled_date: emgDate,
        equipment_id: Number(emgEquipmentId),
        notes: emgNotes,
      });
      setEmgSuccess(true);
      load();
    } catch (e: any) {
      setEmgError(e.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setEmgLoading(false);
    }
  };

  const respond = async () => {
    setError(''); setSuccess(false);
    try {
      await api.put(`/inquiries/${id}/respond`, { admin_response: response, status: newStatus });
      setSuccess(true);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || '오류가 발생했습니다.');
    }
  };

  if (!inquiry) return <Layout title="문의 처리"><div style={{ padding: 32, color: '#999' }}>불러오는 중...</div></Layout>;

  const infoRows = [
    { label: '접수 번호', value: `INQ-${inquiry.inquiry_id}` },
    { label: '업체명', value: inquiry.users?.company_name || inquiry.users?.name },
    { label: '연락처', value: inquiry.users?.contact_info || '-' },
    { label: '품목', value: TYPE_LABEL[inquiry.product_type] || '-' },
    { label: '제품명', value: inquiry.product_name || '-' },
    { label: '중량', value: inquiry.kg_amount ? `${inquiry.kg_amount}kg` : '-' },
    { label: '희망일', value: inquiry.desired_date || '-' },
    { label: '접수일', value: new Date(inquiry.created_at).toLocaleDateString('ko-KR') },
  ];

  return (
    <Layout title="문의 처리" action={
      <button style={s.backBtn} onClick={() => router.push('/admin/inquiries')}>← 문의 목록</button>
    }>
      <div style={s.grid}>
        <div style={s.left}>
          <div style={s.card}>
            <div style={s.cardTitle}>문의 정보</div>
            <div style={s.divider} />
            {infoRows.map(r => (
              <div key={r.label} style={s.infoRow}>
                <span style={s.infoLabel}>{r.label}</span>
                <span style={s.infoValue}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>문의 내용</div>
            <div style={s.divider} />
            <div style={s.messageBox}>{inquiry.message}</div>
          </div>

          {inquiry.status === 'PENDING' && (
            <div style={s.card}>
              <div style={s.cardTitle}>긴급 생산 세팅</div>
              <div style={s.divider} />
              <div style={s.fieldRow}>
                <label style={s.fieldLabel}>생산일</label>
                <input
                  type="date"
                  style={s.fieldInput}
                  value={emgDate}
                  onChange={(e) => setEmgDate(e.target.value)}
                />
              </div>
              <div style={s.fieldRow}>
                <label style={s.fieldLabel}>배정 기기</label>
                <select
                  style={s.fieldInput}
                  value={emgEquipmentId}
                  onChange={(e) => setEmgEquipmentId(e.target.value)}
                >
                  <option value="">기기 선택</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.equipment_id} value={eq.equipment_id}>
                      {eq.name} ({eq.type})
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.fieldRow}>
                <label style={s.fieldLabel}>중량(kg)</label>
                <input
                  type="number"
                  style={s.fieldInput}
                  placeholder="예: 20"
                  value={emgKg}
                  onChange={(e) => setEmgKg(e.target.value)}
                  min={1}
                />
              </div>
              <div style={s.fieldRow}>
                <label style={s.fieldLabel}>비고</label>
                <input
                  type="text"
                  style={s.fieldInput}
                  placeholder="추가 메모 (선택)"
                  value={emgNotes}
                  onChange={(e) => setEmgNotes(e.target.value)}
                />
              </div>
              <button
                style={{ ...s.submitBtn, background: '#DC2626', opacity: emgLoading ? 0.6 : 1 }}
                onClick={submitEmergency}
                disabled={emgLoading}
              >
                {emgLoading ? '처리 중...' : '긴급 생산 등록'}
              </button>
              {emgError && <p style={s.error}>{emgError}</p>}
              {emgSuccess && <p style={s.success}>긴급 생산이 등록되었습니다. 문의가 처리완료로 변경됩니다.</p>}
            </div>
          )}
        </div>
        <div style={s.right}>
          <div style={s.card}>
            <div style={s.cardTitle}>답변 처리</div>
            <div style={s.divider} />
            <span style={{ ...s.statusBadge, background: STATUS_BG[inquiry.status], color: STATUS_COLOR[inquiry.status] }}>
              {STATUS_LABEL[inquiry.status]}
            </span>
            <textarea style={s.textarea} rows={6} placeholder="답변 내용을 입력하세요..." value={response} onChange={e => setResponse(e.target.value)} />
            <select style={s.select} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="IN_PROGRESS">처리중</option>
              <option value="RESOLVED">처리완료</option>
            </select>
            <button style={s.submitBtn} onClick={respond}>답변 저장</button>
            {error && <p style={s.error}>{error}</p>}
            {success && <p style={s.success}>저장되었습니다.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, color: '#666', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 },
  left: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  right: {} as React.CSSProperties,
  card: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  divider: { height: 1, background: '#F3F4F6' },
  infoRow: { display: 'flex', padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
  infoLabel: { width: 80, fontSize: 13, color: '#888', flexShrink: 0 },
  infoValue: { fontSize: 13, color: '#1a1a1a', fontWeight: 500 },
  messageBox: { background: '#F9FAFB', borderRadius: 8, padding: 16, fontSize: 14, color: '#333', lineHeight: 1.7, border: '1px solid #F3F4F6' },
  statusBadge: { display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' as const },
  textarea: { padding: 12, border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit' },
  select: { padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fff' },
  submitBtn: { padding: 12, background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { color: '#EF4444', fontSize: 13, margin: 0 },
  success: { color: '#10B981', fontSize: 13, margin: 0 },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 12 },
  fieldLabel: { width: 76, fontSize: 13, color: '#555', flexShrink: 0 },
  fieldInput: { flex: 1, padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fff' } as React.CSSProperties,
};
