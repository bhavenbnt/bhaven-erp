'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Customers() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => api.get('/users?role=customer').then(({ data }: any) => setCustomers(data.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!user) return null;

  const filtered = customers.filter((u: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.company_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const toggle = async (u: any) => {
    await api.put(`/users/${u.user_id}/status`, { is_active: !u.is_active }).catch(() => {});
    load();
  };

  const approve = async (u: any) => {
    await api.put(`/users/${u.user_id}/approve`).catch(() => {});
    load();
  };

  return (
    <Layout title="고객사 관리">
      <div style={s.filterRow}>
        <input style={s.input} placeholder="업체명 또는 이메일 검색" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={s.count}>총 {filtered.length}개사</span>
      </div>
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['#', '업체명', '담당자', '이메일', '연락처', '등록일', '상태', '승인', ''].map((h, i) => <th key={i} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={s.empty}>등록된 고객사가 없습니다.</td></tr>}
            {filtered.map((u: any) => (
              <tr key={u.user_id} style={s.tr}>
                <td style={{ ...s.td, color: '#999', textAlign: 'center' as const }}>{u.user_id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{u.company_name || '-'}</td>
                <td style={s.td}>{u.name}</td>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}>{u.contact_info || '-'}</td>
                <td style={s.td}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: u.is_active ? '#ECFDF5' : '#FEF2F2', color: u.is_active ? '#10B981' : '#EF4444' }}>
                    {u.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: u.is_approved ? '#ECFDF5' : '#FEF2F2', color: u.is_approved ? '#10B981' : '#EF4444' }}>
                    {u.is_approved ? '승인됨' : '미승인'}
                  </span>
                </td>
                <td style={{ ...s.td, display: 'flex', gap: 6 }}>
                  <button style={s.toggleBtn} onClick={() => toggle(u)}>{u.is_active ? '비활성화' : '활성화'}</button>
                  {!u.is_approved && (
                    <button style={s.approveBtn} onClick={() => approve(u)}>승인</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  filterRow: { display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' as const },
  input: { flex: 1, padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 7, fontSize: 13, background: '#fff', outline: 'none' },
  count: { fontSize: 13, color: '#666', whiteSpace: 'nowrap' as const },
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 40, color: '#aaa', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  toggleBtn: { padding: '5px 12px', background: '#F5F5F5', color: '#555', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  approveBtn: { padding: '5px 12px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
};
