'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';

const PRODUCT_TYPES = [
  { key: '', label: '선택 안함' },
  { key: 'extract', label: '원액' },
  { key: 'can', label: '캔' },
];

export default function InquiryNew() {
  const router = useRouter();
  const { user } = useAuth();
  const [prefill, setPrefill] = useState<any>(null);

  const [form, setForm] = useState({
    product_type: '', desired_date: '', product_name: '', kg_amount: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    const data = sessionStorage.getItem('inquiryPrefill');
    if (data) {
      const p = JSON.parse(data);
      setPrefill(p);
      setForm(f => ({ ...f, ...p }));
      sessionStorage.removeItem('inquiryPrefill');
    }
  }, []);

  if (!user) return null;

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const threeMonthEnd = new Date(); threeMonthEnd.setMonth(threeMonthEnd.getMonth() + 3, 0);
  const maxDate = threeMonthEnd.toISOString().split('T')[0];

  const set = (key: string) => (val: any) => setForm(f => ({ ...f, [key]: typeof val === 'object' && val?.target ? val.target.value : val }));

  const handleSubmit = async () => {
    if (!form.message) { setError('문의 내용을 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/inquiries', {
        product_type: form.product_type || undefined,
        product_name: form.product_name || undefined,
        kg_amount: form.kg_amount ? parseFloat(form.kg_amount) : undefined,
        desired_date: form.desired_date || undefined,
        message: form.message,
      });
      router.push('/inquiries');
    } catch (err: any) {
      setError(err.response?.data?.error || '문의 접수에 실패했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.back()}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>새 문의 신청</h1>
          </div>
        </div>
      }
    >
      {/* 자동 전환 알림 */}
      {prefill?.message && (
        <div style={s.alertBanner}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#B11F39" strokeWidth={2}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <span>{prefill.desired_date}에 가용 슬롯이 부족하여 문의로 전환되었습니다. 내용을 확인 후 접수해 주세요.</span>
        </div>
      )}

      <div style={s.body}>
        {/* 폼 카드 */}
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.formHeaderDot} />
            <span style={s.formHeaderTitle}>문의 내용</span>
          </div>
          <p style={s.formDesc}>캘린더 예약이 어려운 일정을 관리자에게 직접 문의하세요.</p>

          {/* 품목 · 제품명 */}
          <div style={s.row2}>
            <div style={s.fieldGroup}>
              <label style={s.label}>품목</label>
              <div style={s.segRow}>
                {PRODUCT_TYPES.map(t => (
                  <button key={t.key} style={{ ...s.seg, ...(form.product_type === t.key ? s.segOn : {}) }}
                    onClick={() => set('product_type')(t.key)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>제품명</label>
              <input style={s.input} placeholder="예) 프리미엄 콜드브루 (선택)" value={form.product_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('product_name')(e.target.value)} />
            </div>
          </div>

          <div style={s.divider} />

          {/* 중량 · 희망일 */}
          <div style={s.row2}>
            <div style={s.fieldGroup}>
              <label style={s.label}>원두 중량</label>
              <div style={s.inputWrap}>
                <input style={s.inputInner} type="number" placeholder="20" min="1" value={form.kg_amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('kg_amount')(e.target.value)} />
                <span style={s.inputSuffix}>kg</span>
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>희망 날짜</label>
              <DatePicker value={form.desired_date} onChange={(d) => set('desired_date')(d)}
                minDate={minDate} maxDate={maxDate} />
            </div>
          </div>

          {/* 문의 내용 */}
          <div style={s.fieldGroup}>
            <label style={s.label}>문의 내용 / 요청 사항 <span style={s.req}>*</span></label>
            <textarea style={s.textarea} rows={5}
              placeholder="예: 특정 날짜에 대형 기기 긴급 생산 요청, 기타 특이사항 등 자유롭게 작성해 주세요."
              value={form.message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('message')(e.target.value)} />
          </div>

          <div style={s.divider} />

          {/* 하단 */}
          <div style={s.notice}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth={2}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <span>문의 접수 후 관리자가 검토하여 알림톡으로 안내드립니다.</span>
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.footer}>
            <button style={s.cancelBtn} onClick={() => router.push('/inquiries')}>취소</button>
            <button style={{ ...s.submitBtn, opacity: form.message ? 1 : 0.4 }}
              onClick={handleSubmit} disabled={loading || !form.message}>
              {loading ? '접수 중...' : '문의 접수'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
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

  // ── 알림 ──
  alertBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 8, marginBottom: 14,
    background: '#FDF2F4', border: '1px solid #F5D0D6',
    fontSize: 12, color: '#B11F39', fontWeight: 500, lineHeight: 1.5,
  },

  // ── 바디 ──
  body: {},

  // ── 폼 카드 ──
  formCard: {
    background: '#fff', borderRadius: 12, padding: '22px 24px',
    border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  formHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  formHeaderDot: { width: 4, height: 18, borderRadius: 2, background: '#B11F39' },
  formHeaderTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.3 },
  formDesc: { fontSize: 12, color: '#999', margin: 0, lineHeight: 1.5 },
  divider: { height: 1, background: '#F0F0F0' },

  // ── 필드 ──
  row2: { display: 'flex', gap: 14, alignItems: 'flex-end' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  req: { color: '#B11F39' },
  input: {
    padding: '0 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38,
  },
  inputWrap: {
    display: 'flex', alignItems: 'center', border: '1px solid #EEEEEE',
    borderRadius: 8, background: '#FAFAFA', overflow: 'hidden', height: 38,
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
  textarea: {
    padding: '10px 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA',
    resize: 'vertical', minHeight: 100, fontFamily: 'inherit', lineHeight: 1.5,
  },
  segRow: { display: 'inline-flex', background: '#F0F0F0', borderRadius: 7, padding: 2, height: 38, alignItems: 'center' },
  seg: {
    padding: '0 13px', height: 34, fontSize: 12, fontWeight: 600, color: '#888',
    background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  segOn: { background: '#0A0A0A', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },

  // ── 하단 ──
  notice: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#BBB',
  },
  errorBox: {
    padding: '8px 14px', borderRadius: 8, background: '#FDF2F4',
    border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500,
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  cancelBtn: {
    padding: '10px 24px', background: '#fff', color: '#666',
    border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 32px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },
};
