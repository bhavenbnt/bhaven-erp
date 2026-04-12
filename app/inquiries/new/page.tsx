'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function InquiryNew() {
  const router = useRouter();
  const { user } = useAuth();
  const [prefill, setPrefill] = useState<any>(null);

  const [form, setForm] = useState({
    product_type: '',
    desired_date: '',
    product_name: '',
    kg_amount: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

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

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.message) { setError('문의 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="새 문의 신청" action={
      <button onClick={() => router.push('/inquiries')} style={styles.backBtn}>← 문의 목록</button>
    }>
      {prefill?.message && (
        <div style={styles.autoAlert}>
          ⚠ 선택하신 날짜({prefill.desired_date})에 가용 기기 슬롯이 부족하여 문의 접수로 전환되었습니다. 내용을 확인 후 접수해 주세요.
        </div>
      )}
      <div style={styles.pageTitle}>새 문의 신청</div>
      <div style={styles.subText}>
        캘린더 예약이 어려운 일정을 관리자에게 직접 문의하세요. 관리자 검토 후 일정을 조율해 드립니다.
      </div>

      <div style={styles.formCard}>
        <div style={styles.sectionTitle}>문의 내용</div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>품목 선택</label>
            <select style={styles.input} value={form.product_type} onChange={set('product_type')}>
              <option value="">선택 (선택사항)</option>
              <option value="extract">원액</option>
              <option value="can">캔</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>희망 날짜</label>
            <input style={styles.input} type="date" value={form.desired_date} onChange={set('desired_date')} />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>제품명</label>
            <input style={styles.input} placeholder="제품명 (선택사항)" value={form.product_name} onChange={set('product_name')} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>원두 중량 (kg)</label>
            <input style={styles.input} type="number" placeholder="예: 20" min="1" value={form.kg_amount} onChange={set('kg_amount')} />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>문의 내용 / 요청 사항 <span style={{ color: '#EF4444' }}>*</span></label>
          <textarea style={styles.textarea} rows={5}
            placeholder="예: 특정 날짜에 대형 기기 긴급 생산 요청, 기타 특이사항 등 자유롭게 작성해 주세요."
            value={form.message} onChange={set('message')} />
        </div>

        <div style={styles.notice}>
          <span>⚠</span>
          <span>문의 접수 후 관리자가 검토하여 카카오톡 알림톡으로 결과를 안내드립니다.</span>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.btnRow}>
        <button style={styles.btnSecondary} onClick={() => router.push('/inquiries')}>취소</button>
        <button style={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
          {loading ? '접수 중...' : '문의 접수'}
        </button>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#666' },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 8 },
  subText: { fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.6 },
  formCard: { background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#111' },
  row: { display: 'flex', gap: 16 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', color: '#333', background: '#fff', height: 40 },
  textarea: { padding: 12, border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', color: '#333', resize: 'vertical', fontFamily: 'inherit' },
  notice: { display: 'flex', alignItems: 'center', gap: 10, background: '#FFF7ED', padding: 12, borderRadius: 8, fontSize: 12, color: '#92400E' },
  autoAlert: { background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E', marginBottom: 16, lineHeight: 1.6 },
  error: { color: '#EF4444', fontSize: 13 },
  btnRow: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  btnPrimary: { padding: '11px 24px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
};
