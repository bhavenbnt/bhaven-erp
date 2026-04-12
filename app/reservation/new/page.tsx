'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import useIsMobile from '@/hooks/useIsMobile';

const PRODUCT_TYPES = [
  { key: 'extract', label: '원액' },
  { key: 'can', label: '캔' },
];
const CONTAINERS = ['500ml', '1L', '2L'];

function ReservationNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get('date') || '';
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [form, setForm] = useState({
    product_type: 'extract',
    container_size: '1L',
    product_name: '',
    yield_rate: 4.0,
    kg_amount: '',
    notes: '',
    scheduled_date: selectedDate,
  });
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [pastProducts, setPastProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [yieldHint, setYieldHint] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    api.get('/reservations/my').then(({ data }) => {
      const seen = new Set<string>();
      const unique = (data.data || [])
        .filter((r: any) => r.products?.product_name)
        .filter((r: any) => {
          if (seen.has(r.products.product_name)) return false;
          seen.add(r.products.product_name);
          return true;
        })
        .slice(0, 3)
        .map((r: any) => ({ ...r.products, scheduled_date: r.scheduled_date, kg_amount: r.kg_amount }));
      setPastProducts(unique);
    }).catch(() => {});
  }, []);

  const set = (key: string) => (val: any) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!form.scheduled_date) { setAvailableSlots([]); return; }
    api.get(`/reservations/available-slots?start_date=${form.scheduled_date}&end_date=${form.scheduled_date}`)
      .then(({ data }) => setAvailableSlots(data.data || []))
      .catch(() => setAvailableSlots([]));
  }, [form.scheduled_date]);

  useEffect(() => {
    if (!form.product_name || form.product_name.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/yield?product_name=${encodeURIComponent(form.product_name)}`);
        if ((data as any).yield_rate) {
          setForm(f => ({ ...f, yield_rate: (data as any).yield_rate }));
          setYieldHint(`이전 수율 자동 입력: ${(data as any).yield_rate}L/kg`);
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [form.product_name]);

  if (!user) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const nextMonthEnd = new Date();
  nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1, 0);
  const maxDate = nextMonthEnd.toISOString().split('T')[0];

  const recallProduct = (p: any) => {
    setForm(f => ({
      ...f,
      product_name: p.product_name,
      yield_rate: parseFloat(p.yield_rate) || 4.0,
      product_type: p.product_type || 'extract',
    }));
  };

  const expectedOutput = form.kg_amount && form.yield_rate
    ? (parseFloat(form.kg_amount as string) * parseFloat(String(form.yield_rate))).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!form.product_name || !form.kg_amount || !form.scheduled_date) {
      setError('제품명, 원두 중량, 생산 희망일을 입력해주세요.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/reservations', {
        product_name: form.product_name,
        product_type: form.product_type,
        container_size: form.container_size,
        kg_amount: parseFloat(form.kg_amount as string),
        yield_rate: parseFloat(String(form.yield_rate)),
        scheduled_date: form.scheduled_date,
        notes: form.notes,
      });
      sessionStorage.setItem('reservationComplete', JSON.stringify({
        reservations: data.reservations,
        scheduled_date: form.scheduled_date,
        product_name: form.product_name,
        product_type: form.product_type,
        kg_amount: form.kg_amount,
        expectedOutput,
      }));
      router.push('/reservation/complete');
    } catch (err: any) {
      const msg = err.response?.data?.error || '예약 신청에 실패했습니다.';
      if (msg.includes('가용 슬롯이 부족')) {
        sessionStorage.setItem('inquiryPrefill', JSON.stringify({
          product_name: form.product_name,
          product_type: form.product_type,
          kg_amount: form.kg_amount,
          desired_date: form.scheduled_date,
          message: `[자동 전환] ${form.scheduled_date}에 ${form.kg_amount}kg 생산 요청 — 슬롯 부족으로 문의 전환되었습니다.`,
        }));
        router.push('/inquiries/new');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="예약 신청">
      <div style={styles.stepBadge}>STEP 1 / 예약 정보 입력</div>

      <div style={{ ...styles.body, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* 좌측 폼 */}
        <div style={{ ...styles.formCol, minWidth: 0 }}>
          {/* 이전 주문 불러오기 */}
          {pastProducts.length > 0 && (
            <div style={styles.recallBox}>
              <div style={styles.recallHeader}>
                <span style={styles.recallBadge}>이전 주문</span>
                <span style={styles.recallTitle}>불러오기</span>
                <span style={styles.recallSub}>— 선택 시 아래 폼이 자동으로 채워집니다</span>
              </div>
              <div style={styles.recallDivider} />
              {pastProducts.map((p, i) => (
                <div key={i} style={styles.recallItem}>
                  <div style={styles.recallLeft}>
                    <span style={{ ...styles.recallTypeBadge, background: p.product_type === 'extract' ? '#B11F39' : '#374151' }}>
                      {p.product_type === 'extract' ? '원액' : '캔'}
                    </span>
                    <span style={styles.recallName}>{p.product_name}</span>
                    <span style={styles.recallMeta}>{p.kg_amount}kg · 수율 {p.yield_rate}L/kg · {p.scheduled_date}</span>
                  </div>
                  <button style={styles.recallBtn} onClick={() => recallProduct(p)}>불러오기</button>
                </div>
              ))}
            </div>
          )}

          {/* 기본 정보 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>기본 정보</div>
            <div style={styles.divider} />

            <label style={styles.label}>품목 선택</label>
            <div style={styles.toggleRow}>
              {PRODUCT_TYPES.map(t => (
                <button key={t.key} style={{ ...styles.toggleBtn, ...(form.product_type === t.key ? styles.toggleActive : styles.toggleInactive) }}
                  onClick={() => set('product_type')(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={styles.divider} />
            <label style={styles.label}>용기 선택</label>
            <div style={styles.chipRow}>
              {CONTAINERS.map(c => (
                <button key={c} style={{ ...styles.chip, ...(form.container_size === c ? styles.chipActive : styles.chipInactive) }}
                  onClick={() => set('container_size')(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 제품 정보 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>제품 정보</div>
            <div style={styles.divider} />

            <div style={styles.field}>
              <label style={styles.label}>제품명</label>
              <input style={styles.input} placeholder="프리미엄 콜드브루" value={form.product_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('product_name')(e.target.value)} />
            </div>

            <div style={{ ...styles.fieldRow, flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={styles.field}>
                <label style={styles.label}>수율 (1kg당 생산량 L)</label>
                <input style={styles.input} type="number" step="0.1" min="0.1" placeholder="4.0"
                  value={form.yield_rate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('yield_rate')(e.target.value)} />
                {yieldHint && <p style={{ fontSize: 11, color: '#10B981', margin: '2px 0 0' }}>{yieldHint}</p>}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>원두 중량 (kg)</label>
                <input style={styles.input} type="number" step="1" min="1" placeholder="20"
                  value={form.kg_amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('kg_amount')(e.target.value)} />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>생산 희망일</label>
              <input style={styles.input} type="date" value={form.scheduled_date}
                min={minDate} max={maxDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('scheduled_date')(e.target.value)} />
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>예약 가능 기간: {minDate} ~ {maxDate}</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>비고 (선택)</label>
              <textarea style={styles.textarea} placeholder="특수 로스팅 원두, 특이사항 없음"
                value={form.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('notes')(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 우측 요약 */}
        <div style={{ ...styles.summaryCol, width: isMobile ? '100%' : 300, flexShrink: isMobile ? undefined : 0 }}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryTitle}>예약 요약</div>
            <div style={styles.summaryDivider} />
            <SummaryRow label="생산일" value={form.scheduled_date || '—'} />
            <SummaryRow label="품목" value={form.product_type === 'extract' ? '원액' : '캔'} />
            <SummaryRow label="원두 중량" value={form.kg_amount ? `${form.kg_amount} kg` : '—'} />
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>예상 생산량</span>
              <span style={styles.summaryBig}>{expectedOutput ? `${expectedOutput} L` : '—'}</span>
            </div>
            <div style={styles.summaryDivider} />
            {form.scheduled_date && availableSlots.length > 0 && (
              <>
                <div style={{ color: '#999', fontSize: 11 }}>해당 날짜 가용 기기</div>
                {availableSlots.map((e: any) => (
                  <div key={e.equipment_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#aaa' }}>{e.name}</span>
                    <span style={{ color: e.available_capacity <= 5 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                      {e.available_capacity}kg 남음
                    </span>
                  </div>
                ))}
                <div style={styles.summaryDivider} />
              </>
            )}
            {form.scheduled_date && availableSlots.length === 0 && (
              <div style={{ fontSize: 11, color: '#EF4444' }}>해당 날짜 가용 기기 없음 — 문의로 접수하세요</div>
            )}
            <div style={styles.summaryNote}>
              수율 {form.yield_rate}L/kg 기준 계산<br />
              신청 완료 즉시 슬롯이 점유됩니다.
            </div>
          </div>

          <div style={styles.actionBox}>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? '처리 중...' : '신청 완료'}
            </button>
            <button style={styles.cancelBtn} onClick={() => router.back()}>취소</button>
            <div style={styles.warning}>
              ⚠ 신청 완료 버튼 클릭 시 즉시 슬롯이 점유되며, 취소 시 관리자에게 문의하세요.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ReservationNew() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationNewContent />
    </Suspense>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stepBadge: { display: 'inline-block', background: '#FCE7EC', color: '#B11F39', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 4, marginBottom: 16 },
  body: { display: 'flex', gap: 32, alignItems: 'flex-start' },
  formCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 20 },
  summaryCol: { width: 300, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 },
  recallBox: { background: '#EFF6FF', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  recallHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  recallBadge: { background: '#1D4ED8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 },
  recallTitle: { color: '#1E3A8A', fontSize: 13, fontWeight: 700 },
  recallSub: { color: '#6B7280', fontSize: 11 },
  recallDivider: { height: 1, background: '#BFDBFE' },
  recallItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 6, padding: '10px 14px' },
  recallLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  recallTypeBadge: { color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
  recallName: { fontSize: 13, fontWeight: 600, color: '#0A0A0A' },
  recallMeta: { fontSize: 11, color: '#9CA3AF' },
  recallBtn: { background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  section: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A' },
  divider: { height: 1, background: '#F0F0F0' },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  toggleRow: { display: 'flex', gap: 12 },
  toggleBtn: { padding: '12px 20px', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  toggleActive: { background: '#0A0A0A', color: '#fff' },
  toggleInactive: { background: '#fff', color: '#888', border: '1px solid #e0e0e0' },
  chipRow: { display: 'flex', gap: 8 },
  chip: { padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: 'none' },
  chipActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  chipInactive: { background: '#fff', color: '#888', border: '1px solid #E0E0E0' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldRow: { display: 'flex', gap: 16 },
  input: { padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#1a1a1a', background: '#fff' },
  textarea: { padding: 14, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#1a1a1a', resize: 'vertical', minHeight: 72, fontFamily: 'inherit' },
  summaryCard: { background: '#0A0A0A', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  summaryTitle: { color: '#fff', fontSize: 14, fontWeight: 700 },
  summaryDivider: { height: 1, background: '#2A2A2A' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#666', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: 600 },
  summaryBig: { color: '#B11F39', fontSize: 22, fontWeight: 700 },
  summaryNote: { color: '#555', fontSize: 11, lineHeight: 1.6 },
  actionBox: { display: 'flex', flexDirection: 'column', gap: 12 },
  submitBtn: { width: '100%', height: 52, background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { width: '100%', height: 44, background: '#fff', color: '#666', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  warning: { background: '#FEF3C7', color: '#92400E', fontSize: 11, padding: '10px 14px', borderRadius: 6, lineHeight: 1.6 },
  error: { color: '#B11F39', fontSize: 13, margin: 0 },
};
