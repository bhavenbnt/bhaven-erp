'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', IN_PROGRESS: '처리중', RESOLVED: '처리완료' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', IN_PROGRESS: '#3B82F6', RESOLVED: '#10B981' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', IN_PROGRESS: '#EFF6FF', RESOLVED: '#ECFDF5' };
const TYPE_LABEL: Record<string, string> = { extract: '원액', can: '캔' };

export default function Inquiries() {
  const router = useRouter();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get('/inquiries/my').then(({ data }) => setInquiries(data.data || [])).catch(() => {});
  }, []);

  if (!user) return null;

  const action = (
    <button onClick={() => router.push('/inquiries/new')} style={styles.newBtn}>+ 새 문의 신청</button>
  );

  return (
    <Layout title="관리자 문의" action={action}>
      {/* 안내 배너 */}
      <div style={styles.banner}>
        <span style={styles.bannerIcon}>⚠</span>
        <div>
          <div style={styles.bannerTitle}>자동 문의 전환 안내</div>
          <div style={styles.bannerText}>요청하신 날짜의 가용 용량이 초과되어 예약이 관리자 문의로 전환될 수 있습니다. 관리자가 검토 후 일정을 조율하여 연락드립니다.</div>
        </div>
      </div>

      {/* 문의 목록 */}
      <div style={styles.listHeader}>문의 내역</div>
      <div style={styles.list}>
        {inquiries.length === 0 && (
          <div style={styles.empty}>접수된 문의가 없습니다.</div>
        )}
        {inquiries.map(inq => (
          <div key={inq.inquiry_id} style={styles.card} onClick={() => router.push(`/inquiries/${inq.inquiry_id}`)}>
            <div style={styles.cardTop}>
              <div style={styles.cardLeft}>
                <div style={styles.cardTitleRow}>
                  {inq.product_type && <span style={styles.typeBadge}>{TYPE_LABEL[inq.product_type] || inq.product_type}</span>}
                  <span style={styles.cardName}>{inq.product_name || '문의'}</span>
                </div>
                <div style={styles.cardMeta}>
                  {inq.kg_amount && <span>{inq.kg_amount}kg</span>}
                  {inq.desired_date && <span>· 희망일 {inq.desired_date}</span>}
                  <span>· {new Date(inq.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, background: STATUS_BG[inq.status], color: STATUS_COLOR[inq.status] }}>
                {STATUS_LABEL[inq.status]}
              </span>
            </div>
            {inq.admin_response && (
              <>
                <div style={styles.cardDivider} />
                <div style={styles.adminMsg}>관리자 메시지: {inq.admin_response}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  newBtn: { padding: '8px 16px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  banner: { display: 'flex', alignItems: 'flex-start', gap: 16, background: '#FEF3C7', borderRadius: 8, padding: 16, marginBottom: 24 },
  bannerIcon: { fontSize: 18, color: '#D97706', flexShrink: 0 },
  bannerTitle: { fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 },
  bannerText: { fontSize: 13, color: '#92400E', lineHeight: 1.6 },
  listHeader: { fontSize: 16, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { textAlign: 'center', color: '#aaa', padding: '48px 0', fontSize: 14 },
  card: { background: '#fff', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  cardLeft: { display: 'flex', flexDirection: 'column', gap: 6 },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 6 },
  typeBadge: { background: '#B11F39', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
  cardName: { fontSize: 13, fontWeight: 600, color: '#0A0A0A' },
  cardMeta: { display: 'flex', gap: 6, fontSize: 11, color: '#9CA3AF' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 },
  cardDivider: { height: 1, background: '#F3F4F6' },
  adminMsg: { padding: '10px 20px', fontSize: 12, color: '#444' },
};
