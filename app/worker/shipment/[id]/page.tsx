'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const CARRIERS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배', '직접 입력'];

export default function Shipment() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [carrier, setCarrier] = useState('CJ대한통운');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'worker' && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      api.get(`/reservations/${id}`),
      api.get(`/shipments/${id}`).catch(() => null)
    ]).then(([resRes, shipRes]: any[]) => {
      setReservation(resRes.data.data);
      if (shipRes?.data?.data) { setExisting(shipRes.data.data); setDone(true); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  const finalCarrier = carrier === '직접 입력' ? customCarrier : carrier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalCarrier || !trackingNumber) return setError('택배사와 송장번호를 입력해주세요.');
    setSubmitting(true); setError('');
    try {
      await api.post('/shipments', { reservation_id: parseInt(id), carrier: finalCarrier, tracking_number: trackingNumber });
      const { data }: any = await api.get(`/shipments/${id}`);
      setExisting(data.data); setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || '출고 처리 중 오류가 발생했습니다.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Layout title=""><div style={{ padding: 40, color: '#CCC', fontSize: 13 }}>불러오는 중...</div></Layout>;

  const r = reservation;
  const u = r?.users || {};
  const p = r?.products || {};
  const expectedL = r ? (parseFloat(r.kg_amount || 0) * parseFloat(p.yield_rate || 4)).toFixed(1) : '-';
  const companyName = u.company_name || u.name || '고객사';

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => router.push('/worker/shipment')}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={s.pageTitle}>출고 처리</h1>
            <span style={s.idBadge}>#{id}</span>
            {done && <span style={s.doneBadge}>출고 완료</span>}
          </div>
        </div>
      }
    >
      <div style={s.grid}>
        {/* 좌측 */}
        <div style={s.leftCol}>
          {/* 생산 주문 정보 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardDot} />
              <span style={s.cardTitle}>생산 주문 정보</span>
            </div>
            <div style={s.infoGrid}>
              <InfoItem label="예약 번호" value={`#${r?.reservation_id || '-'}`} mono />
              <InfoItem label="업체명" value={companyName} bold />
              <InfoItem label="제품명" value={p.product_name || '-'} />
              <InfoItem label="생산일" value={r?.scheduled_date || '-'} mono />
              <InfoItem label="원두 중량" value={r ? `${r.kg_amount} kg` : '-'} mono />
              <InfoItem label="배정 기기" value={r?.equipment?.name || '-'} />
            </div>
          </div>

          {/* 출고 완료 or 입력 폼 */}
          {done ? (
            <div style={s.doneCard}>
              <div style={s.doneIcon}>
                {Icons.clipboard({ size: 20, color: '#0A0A0A' })}
              </div>
              <div style={s.doneTitle}>출고 처리 완료</div>
              <div style={s.doneInfo}>
                <InfoItem label="택배사" value={existing?.carrier || '-'} />
                <InfoItem label="송장번호" value={existing?.tracking_number || '-'} mono />
              </div>
            </div>
          ) : (
            <form style={s.card} onSubmit={handleSubmit}>
              <div style={s.cardHeader}>
                <div style={{ ...s.cardDot, background: '#B11F39' }} />
                <span style={s.cardTitle}>출고 정보 입력</span>
              </div>
              <div style={s.formRow}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>택배사</label>
                  <div style={s.segRow}>
                    {CARRIERS.filter(c => c !== '직접 입력').map(c => (
                      <button key={c} type="button"
                        style={{ ...s.seg, ...(carrier === c ? s.segOn : {}) }}
                        onClick={() => setCarrier(c)}>{c}</button>
                    ))}
                    <button type="button"
                      style={{ ...s.seg, ...(carrier === '직접 입력' ? s.segOn : {}) }}
                      onClick={() => setCarrier('직접 입력')}>직접 입력</button>
                  </div>
                </div>
              </div>
              {carrier === '직접 입력' && (
                <div style={s.fieldGroup}>
                  <label style={s.label}>택배사명</label>
                  <input style={s.input} placeholder="택배사 입력" value={customCarrier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomCarrier(e.target.value)} />
                </div>
              )}
              <div style={s.fieldGroup}>
                <label style={s.label}>송장번호 <span style={{ color: '#B11F39' }}>*</span></label>
                <input style={s.input} placeholder="송장번호 입력" value={trackingNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackingNumber(e.target.value)} required />
              </div>

              {error && <div style={s.errorBox}>{error}</div>}

              <div style={s.footer}>
                <div style={s.footerHint}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth={2}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  <span>출고 완료 시 카카오 알림톡이 고객에게 발송됩니다</span>
                </div>
                <button type="submit" style={s.submitBtn} disabled={submitting}>
                  {submitting ? '처리 중...' : '출고 처리 완료'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 우측 — 알림톡 미리보기 */}
        <div style={s.previewCol}>
          <div style={s.previewCard}>
            <div style={s.previewHeader}>
              {Icons.message({ size: 13, color: '#999' })}
              <span style={s.previewTitle}>카카오 알림톡 미리보기</span>
            </div>
            <div style={s.previewMsg}>
              <div style={s.previewMsgTitle}>출고 안내</div>
              <div style={s.previewLine}>안녕하세요, <strong>{companyName}</strong>님!</div>
              <div style={s.previewLine}>주문하신 제품이 출고되었습니다.</div>
              <div style={s.previewDivider} />
              <PreviewRow label="제품명" value={p.product_name || '-'} />
              <PreviewRow label="생산량" value={`${expectedL} L`} />
              <PreviewRow label="택배사" value={done ? (existing?.carrier || '-') : (finalCarrier || '(입력 전)')} />
              <PreviewRow label="송장번호" value={done ? (existing?.tracking_number || '-') : (trackingNumber || '(입력 전)')} bold />
              <div style={s.previewDivider} />
              <div style={{ fontSize: 10, color: '#BBB' }}>문의사항은 고객센터로 연락해주세요.</div>
            </div>
            <div style={s.previewNote}>출고 처리 완료 후 자동 발송됩니다</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={s.infoItem}>
      <span style={s.infoLabel}>{label}</span>
      <span style={{ ...s.infoValue, ...(bold ? { fontWeight: 600, color: '#0A0A0A' } : {}), ...(mono ? { fontFamily: "'Space Grotesk', monospace" } : {}) }}>{value}</span>
    </div>
  );
}

function PreviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={s.previewRow}>
      <span>{label}</span>
      <span style={bold ? { fontWeight: 600, color: '#0A0A0A' } : {}}>{value}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: { width: 30, height: 30, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  idBadge: { fontSize: 12, fontWeight: 600, color: '#999', fontFamily: "'Space Grotesk', monospace" },
  doneBadge: { fontSize: 11, fontWeight: 600, color: '#0A0A0A', background: '#F0F0F0', padding: '3px 10px', borderRadius: 20, border: '1px solid #E0E0E0' },

  grid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  previewCol: { display: 'flex', flexDirection: 'column', gap: 12 },

  // 카드
  card: { background: '#fff', borderRadius: 12, padding: '20px 22px', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 14 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  cardDot: { width: 4, height: 18, borderRadius: 2, background: '#0A0A0A' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },

  // 정보 그리드
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F8F8F8' },
  infoLabel: { fontSize: 11, color: '#AAA', fontWeight: 500 },
  infoValue: { fontSize: 13, color: '#333', fontWeight: 500 },

  // 완료 카드
  doneCard: { background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  doneIcon: { width: 44, height: 44, borderRadius: '50%', background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A' },
  doneInfo: { width: '100%', display: 'flex', flexDirection: 'column', gap: 0 },

  // 폼
  formRow: { display: 'flex', gap: 14 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  input: { padding: '0 14px', border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38 },
  segRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  seg: { padding: '6px 12px', fontSize: 12, fontWeight: 500, color: '#888', background: '#F5F5F5', border: '1px solid #EEEEEE', borderRadius: 6, cursor: 'pointer' },
  segOn: { background: '#0A0A0A', color: '#fff', border: '1px solid #0A0A0A' },
  errorBox: { padding: '8px 14px', borderRadius: 8, background: '#FDF2F4', border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500 },
  footer: { display: 'flex', flexDirection: 'column', gap: 10 },
  footerHint: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#BBB' },
  submitBtn: { width: '100%', padding: '12px 0', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)' },

  // 미리보기
  previewCard: { background: '#FCFCFC', borderRadius: 10, padding: '16px 18px', border: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 12 },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  previewTitle: { fontSize: 12, fontWeight: 600, color: '#888' },
  previewMsg: { background: '#fff', borderRadius: 8, padding: '16px', border: '1px solid #EEEEEE', display: 'flex', flexDirection: 'column', gap: 6 },
  previewMsgTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginBottom: 4 },
  previewLine: { fontSize: 12, color: '#555', lineHeight: 1.6 },
  previewDivider: { height: 1, background: '#F0F0F0', margin: '4px 0' },
  previewRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', padding: '2px 0' },
  previewNote: { fontSize: 10, color: '#CCC', textAlign: 'center' },
};
