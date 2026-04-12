'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import useIsMobile from '@/hooks/useIsMobile';
import { useAuth } from '@/lib/AuthContext';

const CARRIERS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배', '직접 입력'];

export default function Shipment() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
    else if (user.role !== 'worker') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      api.get(`/reservations/${id}`),
      api.get(`/shipments/${id}`).catch(() => null)
    ]).then(([resRes, shipRes]: any[]) => {
      setReservation(resRes.data.data);
      if (shipRes?.data?.data) {
        setExisting(shipRes.data.data);
        setDone(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  const finalCarrier = carrier === '직접 입력' ? customCarrier : carrier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalCarrier || !trackingNumber) return setError('택배사와 송장번호를 입력해주세요.');
    setSubmitting(true);
    setError('');
    try {
      await api.post('/shipments', { reservation_id: parseInt(id), carrier: finalCarrier, tracking_number: trackingNumber });
      const { data }: any = await api.get(`/shipments/${id}`);
      setExisting(data.data);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || '출고 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout title="출고 처리"><div style={{ padding: 40, color: '#9CA3AF', textAlign: 'center' }}>불러오는 중...</div></Layout>;

  const r = reservation;
  const u = r?.users || {};
  const p = r?.products || {};
  const expectedL = r ? (parseFloat(r.kg_amount || 0) * parseFloat(p.yield_rate || 4)).toFixed(1) : '-';
  const kakaoCarrier = done ? (existing?.carrier || finalCarrier) : finalCarrier;
  const kakaoTracking = done ? (existing?.tracking_number || trackingNumber) : trackingNumber;
  const companyName = u.company_name || u.name || '고객사';

  return (
    <Layout title="출고 처리">
      <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px' }}>
        {/* Left */}
        <div style={s.leftCol}>
          {/* Production info card */}
          <div style={s.card}>
            <div style={s.cardTitle}>생산 주문 정보</div>
            <div style={s.divider} />
            <InfoRow label="예약 번호" value={`RV-${r?.reservation_id || '-'}`} bold />
            <InfoRow label="업체명" value={companyName} />
            <InfoRow label="제품명" value={p.product_name || '-'} />
            <InfoRow label="원두 중량 → 생산량" value={r ? `${r.kg_amount} kg → ${expectedL} L` : '-'} />
            <InfoRow label="생산일" value={r?.scheduled_date || '-'} />
            <InfoRow label="배정 기기" value={r?.equipment?.name || '-'} />
          </div>

          {/* Shipment form */}
          {done ? (
            <div style={{ ...s.card, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginBottom: 8 }}>출고 처리 완료</div>
              <InfoRow label="택배사" value={existing?.carrier || '-'} />
              <InfoRow label="송장번호" value={existing?.tracking_number || '-'} />
            </div>
          ) : (
            <form style={s.card} onSubmit={handleSubmit}>
              <div style={s.cardTitle}>출고 정보 입력</div>
              <div style={s.divider} />

              <div style={s.notice}>
                카카오 알림톡으로 출고 안내가 발송됩니다.
              </div>

              <div style={s.field}>
                <label style={s.label}>택배사</label>
                <select style={s.select} value={carrier} onChange={e => setCarrier(e.target.value)}>
                  {CARRIERS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {carrier === '직접 입력' && (
                <div style={s.field}>
                  <label style={s.label}>택배사 직접 입력</label>
                  <input style={s.input} placeholder="택배사명 입력" value={customCarrier} onChange={e => setCustomCarrier(e.target.value)} />
                </div>
              )}
              <div style={s.field}>
                <label style={s.label}>송장번호</label>
                <input style={s.input} placeholder="송장번호 입력" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} required />
              </div>

              {error && <p style={{ color: '#EF4444', fontSize: 12, margin: 0 }}>{error}</p>}
              <button type="submit" style={s.submitBtn} disabled={submitting}>
                {submitting ? '처리 중...' : '출고 처리 완료'}
              </button>
            </form>
          )}

          <button style={s.backBtn} onClick={() => router.push('/worker')}>← 대시보드로</button>
        </div>

        {/* Right — Kakao preview */}
        <div style={s.kakaoPanel}>
          <div style={s.kakaoHeader}>카카오 알림톡 미리보기</div>
          <div style={s.kakaoMsg}>
            <div style={s.kakaoTitle}>📦 출고 안내</div>
            <div style={s.kakaoLine}>안녕하세요, <b>{companyName}</b>님!</div>
            <div style={s.kakaoLine}>주문하신 제품이 출고되었습니다.</div>
            <div style={s.kakaoDivider} />
            <div style={s.kakaoRow}><span>제품명</span><span>{p.product_name || '-'}</span></div>
            <div style={s.kakaoRow}><span>생산량</span><span>{expectedL} L</span></div>
            <div style={s.kakaoRow}><span>택배사</span><span>{kakaoCarrier || '(입력 전)'}</span></div>
            <div style={s.kakaoRow}><span>송장번호</span><b>{kakaoTracking || '(입력 전)'}</b></div>
            <div style={s.kakaoDivider} />
            <div style={{ fontSize: 11, color: '#888' }}>문의사항은 고객센터로 연락해주세요.</div>
          </div>
          <div style={s.kakaoNote}>실제 발송은 출고 처리 완료 후 자동으로 전송됩니다.</div>
        </div>
      </div>
    </Layout>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F9FAFB' }}>
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: '#111' }}>{value}</span>
    </div>
  );
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' as const },
  leftCol: { display: 'flex', flexDirection: 'column' as const, gap: 14 },
  card: { background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 18, display: 'flex', flexDirection: 'column' as const, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#374151' },
  divider: { height: 1, background: '#F3F4F6', margin: '2px 0' },
  notice: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400E' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label: { fontSize: 12, fontWeight: 500, color: '#374151' },
  select: { padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' },
  input: { padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' },
  submitBtn: { padding: '12px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' as const, padding: 0 },
  kakaoPanel: { background: '#FEF9C3', borderRadius: 12, border: '1px solid #FDE68A', padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 10 },
  kakaoHeader: { fontSize: 13, fontWeight: 700, color: '#92400E' },
  kakaoMsg: { background: '#fff', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 6, border: '1px solid #FDE68A' },
  kakaoTitle: { fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 },
  kakaoLine: { fontSize: 13, color: '#374151', lineHeight: 1.6 },
  kakaoDivider: { height: 1, background: '#F3F4F6', margin: '4px 0' },
  kakaoRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', padding: '2px 0' },
  kakaoNote: { fontSize: 11, color: '#92400E', textAlign: 'center' as const },
};
