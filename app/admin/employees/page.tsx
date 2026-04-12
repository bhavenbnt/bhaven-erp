'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Employees() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => api.get('/users?role=worker').then(({ data }: any) => setEmployees(data.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!user) return null;

  const toggle = async (u: any) => {
    await api.put(`/users/${u.user_id}/status`, { is_active: !u.is_active }).catch(() => {});
    load();
  };

  const changeRole = async (userId: number, newRole: string) => {
    if (newRole === 'admin' && !confirm('관리자로 승격하시겠습니까?')) return;
    if (newRole === 'worker' && !confirm('작업자로 변경하시겠습니까?')) return;
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || '변경에 실패했습니다.');
    }
  };

  return (
    <Layout title="직원 관리">
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['#', '이름', '이메일', '연락처', '등록일', '역할', '상태', ''].map((h, i) => <th key={i} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && <tr><td colSpan={8} style={s.empty}>등록된 직원이 없습니다.</td></tr>}
            {employees.map((u: any) => (
              <tr key={u.user_id} style={s.tr}>
                <td style={{ ...s.td, color: '#999', textAlign: 'center' as const }}>{u.user_id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{u.name}</td>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}>{u.contact_info || '-'}</td>
                <td style={s.td}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: u.role === 'admin' ? '#EFF6FF' : '#F5F5F5', color: u.role === 'admin' ? '#1D4ED8' : '#555' }}>
                    {u.role === 'admin' ? '관리자' : '작업자'}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: u.is_active ? '#ECFDF5' : '#FEF2F2', color: u.is_active ? '#10B981' : '#EF4444' }}>
                    {u.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={{ ...s.td, display: 'flex', gap: 8 }}>
                  <button style={s.toggleBtn} onClick={() => toggle(u)}>{u.is_active ? '비활성화' : '활성화'}</button>
                  {u.role === 'worker' && (
                    <button style={{ ...s.toggleBtn, color: '#1D4ED8', borderColor: '#BFDBFE' }} onClick={() => changeRole(u.user_id, 'admin')}>관리자로 승격</button>
                  )}
                  {u.role === 'admin' && (
                    <button style={{ ...s.toggleBtn, color: '#B45309', borderColor: '#FDE68A' }} onClick={() => changeRole(u.user_id, 'worker')}>작업자로 변경</button>
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

const s = {
  tableCard: { background: '#fff', borderRadius: 10, border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { background: '#0A0A0A' },
  th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, color: '#999', fontWeight: 500 },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '14px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' as const },
  empty: { textAlign: 'center' as const, padding: 40, color: '#aaa', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  toggleBtn: { padding: '5px 12px', background: '#F5F5F5', color: '#555', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};
