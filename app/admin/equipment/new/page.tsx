'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const TYPES = [
  { key: 'small', label: '소형', desc: '1~10kg, 4분할' },
  { key: 'medium', label: '중형', desc: '10~20kg, 단일' },
  { key: 'large', label: '대형', desc: '25~60kg, 단일' },
  { key: 'custom', label: '직접 입력', desc: '용량/분할 수동 설정' },
];

export default function EquipmentNew() {
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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setType = (type: string) => {
    const defaults: Record<string, { divisions: string; min_capacity: string; max_capacity: string }> = {
      small: { divisions: '4', min_capacity: '1', max_capacity: '10' },
      medium: { divisions: '1', min_capacity: '10', max_capacity: '20' },
      large: { divisions: '1', min_capacity: '25', max_capacity: '60' },
      custom: { divisions: '', min_capacity: '', max_capacity: '' },
    };
    setForm(f => ({ ...f, type: type === 'custom' ? '' : type, ...(defaults[type] || {}) }));
  };
  const isCustom = !['small', 'medium', 'large'].includes(form.type) && (form.type === '' || form.type === undefined);
  const selectedTypeKey = form.type || (isCustom ? 'custom' : '');

  const canSubmit = form.name && form.equipment_code && form.type && form.divisions && form.min_capacity && form.max_capacity;

  const handleSubmit = async () => {
    if (!canSubmit) { setError('모든 항목을 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/equipment', { ...form, divisions: parseInt(form.divisions), min_capacity: parseFloat(form.min_capacity), max_capacity: parseFloat(form.max_capacity) });
      router.push('/admin/equipment');
    } catch (e: any) {
      setError(e.response?.data?.error || '등록에 실패했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/admin/equipment')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>기기 등록</h1>
          </div>
        </div>
      }
    >
      <div style={s.formCard}>
        <div style={s.formHeader}>
          <div style={s.formHeaderDot} />
          <span style={s.formHeaderTitle}>기기 정보</span>
        </div>

        {/* 구분 선택 */}
        <div style={s.fieldGroup}>
          <label style={s.label}>구분 <span style={s.req}>*</span></label>
          <div style={s.typeRow}>
            {TYPES.map(t => (
              <button key={t.key} style={{ ...s.typeBtn, ...(selectedTypeKey === t.key ? s.typeBtnActive : {}) }}
                onClick={() => setType(t.key)}>
                <span style={s.typeBtnLabel}>{t.label}</span>
                <span style={s.typeBtnDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={s.divider} />

        {/* 기기명 · 코드 */}
        <div style={s.row2}>
          <div style={s.fieldGroup}>
            <label style={s.label}>기기명 <span style={s.req}>*</span></label>
            <input style={s.input} placeholder="예: 중형 7호" value={form.name} onChange={set('name')} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>기기 코드 <span style={s.req}>*</span></label>
            <input style={s.input} placeholder="예: MD-007" value={form.equipment_code} onChange={set('equipment_code')} />
          </div>
        </div>

        <div style={s.divider} />

        {/* 용량 · 분할 */}
        <div style={s.row3}>
          <div style={s.fieldGroup}>
            <label style={s.label}>최소 용량</label>
            {isCustom ? (
              <div style={s.inputWrap}>
                <input style={s.inputInner} type="number" placeholder="1" value={form.min_capacity} onChange={set('min_capacity')} />
                <span style={s.inputSuffix}>kg</span>
              </div>
            ) : (
              <div style={s.readonlyField}>{form.min_capacity}kg</div>
            )}
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>최대 용량</label>
            {isCustom ? (
              <div style={s.inputWrap}>
                <input style={s.inputInner} type="number" placeholder="60" value={form.max_capacity} onChange={set('max_capacity')} />
                <span style={s.inputSuffix}>kg</span>
              </div>
            ) : (
              <div style={s.readonlyField}>{form.max_capacity}kg</div>
            )}
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>분할 수</label>
            {isCustom ? (
              <div style={s.inputWrap}>
                <input style={s.inputInner} type="number" placeholder="1" value={form.divisions} onChange={set('divisions')} />
                <span style={s.inputSuffix}>분할</span>
              </div>
            ) : (
              <div style={s.readonlyField}>{form.divisions}분할</div>
            )}
          </div>
        </div>

        <div style={s.divider} />

        {error && <div style={s.errorBox}>{error}</div>}

        <div style={s.footer}>
          <div style={s.hint}>
            {Icons.settings({ size: 12, color: '#BBB' })}
            <span>소형/중형/대형은 용량 고정, 직접 입력은 자유 설정</span>
          </div>
          <div style={s.btnRow}>
            <button style={s.cancelBtn} onClick={() => router.push('/admin/equipment')}>취소</button>
            <button style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.4 }}
              onClick={handleSubmit} disabled={loading || !canSubmit}>
              {loading ? '등록 중...' : '기기 등록'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
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

  formCard: {
    background: '#fff', borderRadius: 12, padding: '22px 24px',
    border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  formHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  formHeaderDot: { width: 4, height: 18, borderRadius: 2, background: '#B11F39' },
  formHeaderTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.3 },
  divider: { height: 1, background: '#F0F0F0' },

  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  req: { color: '#B11F39' },
  row2: { display: 'flex', gap: 14 },
  row3: { display: 'flex', gap: 14 },

  // 구분 선택
  typeRow: { display: 'flex', gap: 10 },
  typeBtn: {
    flex: 1, padding: '14px 16px', border: '1px solid #EEEEEE', borderRadius: 10,
    background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3,
    textAlign: 'left',
  },
  typeBtnActive: { background: '#0A0A0A', border: '1px solid #0A0A0A', color: '#fff' },
  typeBtnLabel: { fontSize: 14, fontWeight: 700, color: 'inherit' },
  typeBtnDesc: { fontSize: 10, opacity: 0.5, color: 'inherit' },

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

  readonlyField: {
    padding: '0 14px', height: 38, display: 'flex', alignItems: 'center',
    borderRadius: 8, fontSize: 13, color: '#0A0A0A', fontWeight: 500,
    background: '#F5F5F5', border: '1px solid #F0F0F0',
  },
  errorBox: {
    padding: '8px 14px', borderRadius: 8, background: '#FDF2F4',
    border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500,
  },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hint: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#BBB' },
  btnRow: { display: 'flex', gap: 8 },
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
