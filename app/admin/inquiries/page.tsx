'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', IN_PROGRESS: '처리중', RESOLVED: '처리완료' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', IN_PROGRESS: '#3B82F6', RESOLVED: '#10B981' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', IN_PROGRESS: '#EFF6FF', RESOLVED: '#ECFDF5' };

export default function AdminInquiries() {
  const router = useRouter();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get('/inquiries').then(({ data }: any) => setInquiries(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <Layout title="문의 관리">
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['#', '업체명', '제품명', '중량', '희망일', '접수일', '상태', ''].map((h, i) => <th key={i} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 && <tr><td colSpan={8} style={s.empty}>접수된 문의가 없습니다.</td></tr>}
            {inquiries.map((inq: any) => (
              <tr key={inq.inquiry_id} style={s.tr}>
                <td style={{ ...s.td, color: '#999', textAlign: 'center' as const }}>{inq.inquiry_id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{inq.users?.company_name || inq.users?.name}</td>
                <td style={s.td}>{inq.product_name || '-'}</td>
                <td style={s.td}>{inq.kg_amount ? `${inq.kg_amount}kg` : '-'}</td>
                <td style={s.td}>{inq.desired_date || '-'}</td>
                <td style={s.td}>{new Date(inq.created_at).toLocaleDateString('ko-KR')}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: STATUS_BG[inq.status], color: STATUS_COLOR[inq.status] }}>
                    {STATUS_LABEL[inq.status]}
                  </span>
                </td>
                <td style={s.td}>
                  <button style={s.actionBtn} onClick={() => router.push(`/admin/inquiries/${inq.inquiry_id}`)}>처리</button>
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
  actionBtn: { color: '#B11F39', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' },
};
