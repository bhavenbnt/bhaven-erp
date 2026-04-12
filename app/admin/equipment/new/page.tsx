'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function EquipmentForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', equipment_code: '', type: '', divisions: '', min_capacity: '', max_capacity: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  if (!user) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.equipment_code || !form.type || !form.divisions || !form.min_capacity || !form.max_capacity) {
      setError('모든 항목을 입력해주세요.'); return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/equipment', { ...form, divisions: parseInt(form.divisions), min_capacity: parseFloat(form.min_capacity), max_capacity: parseFloat(form.max_capacity) });
      router.push('/admin/equipment');
    } catch (e: any) {
      setError(e.response?.data?.error || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="기기 등록" action={
      <button style={s.backBtn} onClick={() => router.push('/admin/equipment')}>← 기기 목록</button>
    }>
      <div style={s.formCard}>
        <div style={s.sectionTitle}>기기 정보 입력</div>
        <div style={s.row}>
          <Field label="기기명 *" placeholder="예: 중형 1호" value={form.name} onChange={set('name')} />
          <Field label="기기 코드 *" placeholder="예: M-001" value={form.equipment_code} onChange={set('equipment_code')} />
        </div>
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>구분 *</label>
            <select style={s.input} value={form.type} onChange={set('type')}>
              <option value="">선택</option>
              <option value="small">소형</option>
              <option value="medium">중형</option>
              <option value="large">대형</option>
            </select>
          </div>
          <Field label="분할 수 *" placeholder="예: 4" type="number" value={form.divisions} onChange={set('divisions')} />
        </div>
        <div style={s.row}>
          <Field label="최소 용량 (kg) *" placeholder="예: 5" type="number" value={form.min_capacity} onChange={set('min_capacity')} />
          <Field label="최대 용량 (kg) *" placeholder="예: 30" type="number" value={form.max_capacity} onChange={set('max_capacity')} />
        </div>
        {error && <p style={s.error}>{error}</p>}
      </div>
      <div style={s.btnRow}>
        <button style={s.cancelBtn} onClick={() => router.push('/admin/equipment')}>취소</button>
        <button style={s.submitBtn} onClick={handleSubmit} disabled={loading}>{loading ? '등록 중...' : '기기 등록'}</button>
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</label>
      <input style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}
        type={type} placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}

const s = {
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, color: '#666', cursor: 'pointer' },
  formCard: { background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' as const, gap: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#111' },
  row: { display: 'flex', gap: 16 },
  field: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },
  error: { color: '#EF4444', fontSize: 13, margin: 0 },
  btnRow: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  cancelBtn: { padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  submitBtn: { padding: '11px 24px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
