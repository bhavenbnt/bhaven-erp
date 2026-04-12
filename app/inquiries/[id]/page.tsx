'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<string, string> = { PENDING: '대기중', IN_PROGRESS: '처리중', RESOLVED: '처리완료' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#D97706', IN_PROGRESS: '#3B82F6', RESOLVED: '#10B981' };
const STATUS_BG: Record<string, string> = { PENDING: '#FEF3C7', IN_PROGRESS: '#EFF6FF', RESOLVED: '#ECFDF5' };
const TYPE_LABEL: Record<string, string> = { extract: '원액', can: '캔' };

export default function InquiryDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<any>(null);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get(`/inquiries/${id}`).then(({ data }) => setInquiry(data.data)).catch(() => {});
  }, [id]);

  if (!user) return null;

  if (!inquiry) return (
    <Layout title="문의 상세">
      <div style={{ padding: 32, color: '#999' }}>불러오는 중...</div>
    </Layout>
  );

  return (
    <Layout title="문의 상세" action={
      <button onClick={() => router.push('/inquiries')} style={styles.backBtn}>← 문의 목록</button>
    }>
      <div style={styles.grid}>
        {/* 좌측: 내 문의 내용 */}
        <div style={styles.left}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>문의 정보</div>
              <span style={{ ...styles.statusBadge, background: STATUS_BG[inquiry.status], color: STATUS_COLOR[inquiry.status] }}>
                {STATUS_LABEL[inquiry.status]}
              </span>
            </div>
            <div style={styles.divider} />
            <InfoRow label="접수 번호" value={`INQ-${inquiry.inquiry_id}`} />
            <InfoRow label="접수일" value={new Date(inquiry.created_at).toLocaleDateString('ko-KR')} />
            {inquiry.product_type && <InfoRow label="품목" value={TYPE_LABEL[inquiry.product_type] || inquiry.product_type} />}
            {inquiry.product_name && <InfoRow label="제품명" value={inquiry.product_name} />}
            {inquiry.kg_amount && <InfoRow label="원두 중량" value={`${inquiry.kg_amount} kg`} />}
            {inquiry.desired_date && <InfoRow label="희망 날짜" value={new Date(inquiry.desired_date + 'T00:00:00').toLocaleDateString('ko-KR')} />}
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>문의 내용</div>
            <div style={styles.divider} />
            <div style={styles.messageBox}>{inquiry.message}</div>
          </div>
        </div>

        {/* 우측: 관리자 답변 */}
        <div style={styles.right}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>관리자 답변</div>
            <div style={styles.divider} />
            {inquiry.admin_response ? (
              <>
                <div style={styles.adminBox}>{inquiry.admin_response}</div>
                {inquiry.responded_at && (
                  <div style={styles.respondedAt}>답변일: {new Date(inquiry.responded_at).toLocaleDateString('ko-KR')}</div>
                )}
              </>
            ) : (
              <div style={styles.pendingMsg}>
                <div style={styles.pendingIcon}>🕐</div>
                <div style={styles.pendingText}>관리자 검토 중입니다.</div>
                <div style={styles.pendingSubText}>답변이 등록되면 카카오톡으로 알림드립니다.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
      <span style={{ width: 90, fontSize: 13, color: '#888', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 },
  left: { display: 'flex', flexDirection: 'column', gap: 16 },
  right: {},
  card: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 },
  divider: { height: 1, background: '#F3F4F6', margin: '-8px 0' },
  messageBox: { background: '#F9FAFB', borderRadius: 8, padding: 16, fontSize: 14, color: '#333', lineHeight: 1.7, border: '1px solid #F3F4F6' },
  adminBox: { background: '#F0FDF4', borderRadius: 8, padding: 16, fontSize: 14, color: '#166534', lineHeight: 1.7, border: '1px solid #BBF7D0' },
  respondedAt: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  pendingMsg: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 },
  pendingIcon: { fontSize: 32 },
  pendingText: { fontSize: 14, fontWeight: 600, color: '#374151' },
  pendingSubText: { fontSize: 12, color: '#9CA3AF' },
};
