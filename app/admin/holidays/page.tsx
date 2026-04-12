'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Holidays() {
  const router = useRouter();
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [form, setForm] = useState({ holiday_date: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => api.get('/holidays').then(({ data }: any) => setHolidays(data.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!user) return null;

  const add = async () => {
    if (!form.holiday_date) { setError('날짜를 선택해주세요.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/holidays', form);
      setForm({ holiday_date: '', reason: '' });
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/holidays/${id}`).catch(() => {});
    load();
  };

  return (
    <Layout title="휴무일 관리">
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>휴무일 등록</div>
          <div style={s.divider} />
          <div style={s.field}><label style={s.label}>날짜 *</label>
            <input style={s.input} type="date" value={form.holiday_date} onChange={e => setForm(f => ({ ...f, holiday_date: e.target.value }))} /></div>
          <div style={s.field}><label style={s.label}>사유</label>
            <input style={s.input} placeholder="예: 설날 연휴" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
          {error && <p style={s.error}>{error}</p>}
          <button style={s.addBtn} onClick={add} disabled={loading}>등록</button>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>등록된 휴무일</div>
          <div style={s.divider} />
          {holidays.length === 0 && <div style={s.empty}>등록된 휴무일이 없습니다.</div>}
          {holidays.map((h: any) => (
            <div key={h.holiday_id} style={s.item}>
              <div>
                <div style={s.itemDate}>{h.holiday_date}</div>
                <div style={s.itemReason}>{h.reason || '사유 없음'}</div>
              </div>
              <button style={s.deleteBtn} onClick={() => remove(h.holiday_id)}>삭제</button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'flex-start' as const },
  card: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const, gap: 16 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  divider: { height: 1, background: '#F3F4F6' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none' },
  addBtn: { padding: 11, background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { color: '#EF4444', fontSize: 13, margin: 0 },
  empty: { textAlign: 'center' as const, color: '#aaa', padding: '24px', fontSize: 13 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' },
  itemDate: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  itemReason: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { padding: '5px 12px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};
