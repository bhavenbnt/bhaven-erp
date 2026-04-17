'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';
import useIsMobile from '@/hooks/useIsMobile';

const PRODUCT_TYPES = [
  { key: 'extract', label: '원액' },
  { key: 'can', label: '캔' },
];
const CONTAINERS = ['500ml', '1L', '2L'];

// 장비 스펙 (BRIEF.md 기준)
const EQUIP_SPEC = [
  { type: 'small', label: '소형', range: '1~10kg', note: '4분할 가능' },
  { type: 'medium', label: '중형', range: '10~20kg', note: '단일 추출' },
  { type: 'large', label: '대형', range: '25~60kg', note: '단일 추출' },
];

function getAssignmentPreview(kg: number) {
  const amount = parseFloat(String(kg));
  if (!amount || amount <= 0) return null;

  // 데드존 (21~24kg) 처리
  if (amount >= 21 && amount <= 24) {
    return { type: 'warning', label: '데드존', desc: '21~24kg는 대형 기기 최소 용량(25kg) 미달. 관리자가 수동 배정합니다.', equip: '수동 배정' };
  }
  // 60kg 초과 → 분할
  if (amount > 60) {
    const splits = Math.ceil(amount / 60);
    return { type: 'info', label: '분할 배정', desc: `${amount}kg → 대형 기기 ${splits}대에 분할 배정됩니다.`, equip: `대형 ×${splits}` };
  }
  // 소형
  if (amount >= 1 && amount <= 10) {
    return { type: 'success', label: '소형 기기', desc: `${amount}kg → 소형 기기(1~10kg)에 자동 배정됩니다.`, equip: '소형' };
  }
  // 중형
  if (amount > 10 && amount <= 20) {
    return { type: 'success', label: '중형 기기', desc: `${amount}kg → 중형 기기(10~20kg)에 자동 배정됩니다.`, equip: '중형' };
  }
  // 대형
  if (amount >= 25 && amount <= 60) {
    return { type: 'success', label: '대형 기기', desc: `${amount}kg → 대형 기기(25~60kg)에 자동 배정됩니다.`, equip: '대형' };
  }
  return null;
}

function ReservationNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get('date') || '';
  const selectedKg = searchParams.get('kg') || '';
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [form, setForm] = useState({
    product_type: 'extract', container_size: '1L', product_name: '',
    yield_rate: 4.0, kg_amount: selectedKg, notes: '', scheduled_date: selectedDate,
  });
  const [pastProducts, setPastProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [yieldHint, setYieldHint] = useState('');

  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);

  useEffect(() => {
    api.get('/reservations/my').then(({ data }) => {
      const seen = new Set<string>();
      const unique = (data.data || [])
        .filter((r: any) => r.products?.product_name)
        .filter((r: any) => { if (seen.has(r.products.product_name)) return false; seen.add(r.products.product_name); return true; })
        .slice(0, 5)
        .map((r: any) => ({ ...r.products, scheduled_date: r.scheduled_date, kg_amount: r.kg_amount }));
      setPastProducts(unique);
    }).catch(() => {});
  }, []);

  const set = (key: string) => (val: any) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!form.product_name || form.product_name.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/yield?product_name=${encodeURIComponent(form.product_name)}`);
        if ((data as any).yield_rate) {
          setForm(f => ({ ...f, yield_rate: (data as any).yield_rate }));
          setYieldHint(`이전 수율: ${(data as any).yield_rate}L/kg`);
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [form.product_name]);

  if (!user) return null;

  // 기획: 상시 2개월치 (이번달 + 다음달 말까지)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const twoMonthEnd = new Date();
  twoMonthEnd.setMonth(twoMonthEnd.getMonth() + 2, 0); // 다음달 말
  const maxDate = twoMonthEnd.toISOString().split('T')[0];

  const recallProduct = (p: any) => {
    setForm(f => ({ ...f, product_name: p.product_name, yield_rate: parseFloat(p.yield_rate) || 4.0, product_type: p.product_type || 'extract' }));
  };

  const expectedOutput = form.kg_amount && form.yield_rate
    ? (parseFloat(form.kg_amount as string) * parseFloat(String(form.yield_rate))).toFixed(1) : null;

  const assignment = form.kg_amount ? getAssignmentPreview(parseFloat(form.kg_amount as string)) : null;
  const canSubmit = form.product_name && form.kg_amount && form.scheduled_date;

  const handleSubmit = async () => {
    if (!canSubmit) { setError('제품명, 원두 중량, 생산 희망일을 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/reservations', {
        product_name: form.product_name, product_type: form.product_type,
        container_size: form.container_size, kg_amount: parseFloat(form.kg_amount as string),
        yield_rate: parseFloat(String(form.yield_rate)), scheduled_date: form.scheduled_date, notes: form.notes,
      });
      sessionStorage.setItem('reservationComplete', JSON.stringify({
        reservations: data.data?.reservations ?? data.reservations, scheduled_date: form.scheduled_date,
        product_name: form.product_name, product_type: form.product_type,
        kg_amount: form.kg_amount, expectedOutput,
      }));
      router.push('/reservation/complete');
    } catch (err: any) {
      const msg = err.response?.data?.error || '예약 신청에 실패했습니다.';
      if (msg.includes('가용 가능한 설비가 없습니다')) {
        sessionStorage.setItem('inquiryPrefill', JSON.stringify({
          product_name: form.product_name, product_type: form.product_type,
          kg_amount: form.kg_amount, desired_date: form.scheduled_date,
          message: `[자동 전환] ${form.scheduled_date}에 ${form.kg_amount}kg — 슬롯 부족`,
        }));
        router.push('/inquiries/new'); return;
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <Layout
      title=""
      action={
        <div style={st.topBar}>
          <div style={st.topLeft}>
            <button style={st.backBtn} onClick={() => router.back()}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 style={st.pageTitle}>예약 신청</h1>
          </div>
        </div>
      }
    >
      <div style={{ ...st.body, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* ── 좌측: 폼 + 하단 보조 정보 ── */}
        <div style={st.formCol}>
          {/* 폼 카드 */}
          <div style={st.formCard}>
            <div style={st.formHeader}>
              <div style={st.formHeaderDot} />
              <span style={st.formHeaderTitle}>예약 정보 입력</span>
            </div>
            <div style={st.row3}>
              <div style={st.fieldGroup}>
                <label style={st.label}>품목</label>
                <div style={st.segRow}>
                  {PRODUCT_TYPES.map(t => (
                    <button key={t.key} style={{ ...st.seg, ...(form.product_type === t.key ? st.segOn : {}) }}
                      onClick={() => set('product_type')(t.key)}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div style={st.fieldGroup}>
                <label style={st.label}>용기</label>
                <div style={st.segRow}>
                  {CONTAINERS.map(c => (
                    <button key={c} style={{ ...st.seg, ...(form.container_size === c ? st.segOn : {}) }}
                      onClick={() => set('container_size')(c)}>{c}</button>
                  ))}
                </div>
              </div>
              <div style={{ ...st.fieldGroup, flex: 2 }}>
                <label style={st.label}>제품명 <span style={st.req}>*</span></label>
                <input style={st.input} placeholder="예) 프리미엄 콜드브루" value={form.product_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('product_name')(e.target.value)} />
              </div>
            </div>
            <div style={st.divider} />
            <div style={st.row4}>
              <div style={st.fieldGroup}>
                <label style={st.label}>수율</label>
                <div style={st.inputWrap}>
                  <input style={st.inputInner} type="number" step="0.1" min="0.1" placeholder="4.0"
                    value={form.yield_rate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('yield_rate')(e.target.value)} />
                  <span style={st.inputSuffix}>L/kg</span>
                </div>
                {yieldHint && <span style={st.hintText}>{yieldHint}</span>}
              </div>
              <div style={st.fieldGroup}>
                <label style={st.label}>원두 중량 <span style={st.req}>*</span></label>
                <div style={st.inputWrap}>
                  <input style={st.inputInner} type="number" step="1" min="1" placeholder="20"
                    value={form.kg_amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('kg_amount')(e.target.value)} />
                  <span style={st.inputSuffix}>kg</span>
                </div>
              </div>
              <div style={{ ...st.fieldGroup, flex: 1.5 }}>
                <label style={st.label}>생산 희망일 <span style={st.req}>*</span></label>
                <DatePicker value={form.scheduled_date} onChange={(d) => set('scheduled_date')(d)}
                  minDate={minDate} maxDate={maxDate} />
              </div>
            </div>
            <div style={st.fieldGroup}>
              <label style={st.label}>비고</label>
              <textarea style={st.textarea} placeholder="특수 로스팅 원두, 포장 요청사항 등 특이사항을 입력해주세요"
                value={form.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('notes')(e.target.value)} />
            </div>
            <div style={st.divider} />
            {error && <div style={st.errorBox}>{error}</div>}
            <div style={st.footer}>
              <div style={st.warningInline}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#B11F39" strokeWidth={2.5}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <span>신청 시 슬롯 즉시 점유</span>
              </div>
              <div style={st.btnRow}>
                <button style={st.cancelBtn} onClick={() => router.back()}>취소</button>
                <button style={{ ...st.submitBtn, opacity: canSubmit ? 1 : 0.4 }}
                  onClick={handleSubmit} disabled={loading || !canSubmit}>
                  {loading ? '처리 중...' : '예약 신청'}
                </button>
              </div>
            </div>
          </div>

          {/* 폼 아래: 이전 주문 + 자동 배정 (2열) */}
          <div style={st.bottomRow}>
            {/* 이전 주문 이력 */}
            <div style={st.bottomCard}>
              <div style={st.bottomHeader}>
                {Icons.clipboard({ size: 13, color: '#999' })}
                <span style={st.bottomTitle}>이전 주문</span>
                <span style={st.bottomSub}>클릭 시 폼에 자동 입력</span>
              </div>
              {pastProducts.length > 0 ? (
                <div style={st.historyTable}>
                  <div style={st.historyHead}>
                    <span style={{ ...st.historyTh, flex: 2 }}>제품명</span>
                    <span style={st.historyTh}>품목</span>
                    <span style={st.historyTh}>수율</span>
                    <span style={st.historyTh}>중량</span>
                    <span style={{ ...st.historyTh, flex: 0.5 }}></span>
                  </div>
                  {pastProducts.map((p, i) => (
                    <div key={i} style={st.historyTableRow} onClick={() => recallProduct(p)}>
                      <span style={{ ...st.historyTd, flex: 2, fontWeight: 600, color: '#0A0A0A' }}>{p.product_name}</span>
                      <span style={st.historyTd}>{p.product_type === 'extract' ? '원액' : '캔'}</span>
                      <span style={st.historyTd}>{p.yield_rate}L/kg</span>
                      <span style={st.historyTd}>{p.kg_amount}kg</span>
                      <span style={{ ...st.historyTd, flex: 0.5, color: '#B11F39', fontWeight: 600 }}>적용</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={st.emptyText}>주문 이력이 없습니다</span>
              )}
            </div>

            {/* 자동 배정 미리보기 */}
            <div style={st.bottomCard}>
              <div style={st.bottomHeader}>
                {Icons.settings({ size: 13, color: '#999' })}
                <span style={st.bottomTitle}>기기 자동 배정</span>
              </div>
              <div style={st.assignContent}>
                {assignment ? (
                  <div style={{ ...st.assignBox, borderLeftColor: assignment.type === 'warning' ? '#B11F39' : assignment.type === 'info' ? '#555' : '#0A0A0A' }}>
                    <div style={st.assignLabel}>
                      <span style={{ ...st.assignBadge, background: assignment.type === 'warning' ? '#FDF2F4' : '#F0F0F0', color: assignment.type === 'warning' ? '#B11F39' : '#555' }}>
                        {assignment.equip}
                      </span>
                    </div>
                    <span style={st.assignDesc}>{assignment.desc}</span>
                  </div>
                ) : (
                  <span style={st.emptyText}>중량 입력 시 배정 기기 미리보기</span>
                )}
                <div style={st.specDivider} />
                <div style={st.specTitle}>장비 용량 기준</div>
                <div style={st.specGrid}>
                  {EQUIP_SPEC.map(sp => (
                    <div key={sp.type} style={st.specRow}>
                      <span style={st.specLabel}>{sp.label}</span>
                      <span style={st.specRange}>{sp.range}</span>
                      <span style={st.specNote}>{sp.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 우측: 요약만 ── */}
        {!isMobile && (
          <div style={st.sideCol}>
            <div style={st.sideCard}>
              <div style={st.sideTitle}>예약 요약</div>
              <div style={st.sideDivider} />
              <SR label="생산일" value={form.scheduled_date || '—'} />
              <SR label="품목 · 용기" value={`${form.product_type === 'extract' ? '원액' : '캔'} · ${form.container_size}`} />
              <SR label="제품명" value={form.product_name || '—'} />
              <SR label="원두 중량" value={form.kg_amount ? `${form.kg_amount} kg` : '—'} />
              <div style={st.sideDivider} />
              <div style={st.sideOutputRow}>
                <span style={st.sideOutputLabel}>예상 생산량</span>
                <span style={st.sideOutputVal}>{expectedOutput ? `${expectedOutput} L` : '—'}</span>
              </div>
              <span style={st.sideNote}>수율 {form.yield_rate}L/kg 기준</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function ReservationNew() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5F5F5' }} />}><ReservationNewContent /></Suspense>;
}

function SR({ label, value }: { label: string; value: string }) {
  return <div style={st.sideRow}><span style={st.sideLabel}>{label}</span><span style={st.sideValue}>{value}</span></div>;
}

const st: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 30, height: 30, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 7,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
  },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },

  // ── 바디 ──
  body: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  formCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 },
  sideCol: { width: 260, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 },

  // ── 폼 카드 (주인공) ──
  formCard: {
    background: '#fff', borderRadius: 12, padding: '22px 24px',
    border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  formHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  formHeaderDot: { width: 4, height: 18, borderRadius: 2, background: '#B11F39' },
  formHeaderTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.3 },
  divider: { height: 1, background: '#F0F0F0' },

  row3: { display: 'flex', gap: 14, alignItems: 'flex-end' },
  row4: { display: 'flex', gap: 12, alignItems: 'flex-end' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  req: { color: '#B11F39' },
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
  textarea: {
    padding: '10px 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA',
    minHeight: 72, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
  },
  hintText: { fontSize: 10, color: '#B11F39', fontWeight: 500 },
  segRow: { display: 'inline-flex', background: '#F0F0F0', borderRadius: 7, padding: 2, height: 38, alignItems: 'center' },
  seg: {
    padding: '0 13px', height: 34, fontSize: 12, fontWeight: 600, color: '#888',
    background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  segOn: { background: '#0A0A0A', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },

  errorBox: {
    padding: '8px 14px', borderRadius: 8, background: '#FDF2F4',
    border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500,
  },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  warningInline: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#B11F39', fontWeight: 500, opacity: 0.7 },
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

  // ── 하단 2열 ──
  bottomRow: { display: 'flex', gap: 14 },
  bottomCard: {
    flex: 1, background: '#FCFCFC', borderRadius: 10, overflow: 'hidden',
    border: '1px solid #F0F0F0',
    display: 'flex', flexDirection: 'column',
  },
  bottomHeader: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
    borderBottom: '1px solid #F0F0F0', background: '#FAFAFA',
  },
  bottomTitle: { fontSize: 12, fontWeight: 600, color: '#888' },
  bottomSub: { fontSize: 11, color: '#CCC', marginLeft: 'auto' },
  emptyText: { fontSize: 12, color: '#CCC', padding: '20px 18px' },

  // ── 이전 주문 테이블 ──
  historyTable: { display: 'flex', flexDirection: 'column' },
  historyHead: { display: 'flex', padding: '10px 18px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' },
  historyTh: { flex: 1, fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyTableRow: {
    display: 'flex', padding: '12px 18px', cursor: 'pointer',
    borderBottom: '1px solid #F5F5F5', alignItems: 'center',
    transition: 'background 0.1s',
  },
  historyTd: { flex: 1, fontSize: 13, color: '#666' },

  // ── 요약 ──
  sideCard: {
    background: '#0A0A0A', borderRadius: 10, padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  sideTitle: { color: '#f7f8f8', fontSize: 12, fontWeight: 700 },
  sideDivider: { height: 1, background: 'rgba(255,255,255,0.06)' },
  sideRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sideLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  sideValue: { color: '#f7f8f8', fontSize: 12, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' },
  sideOutputRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  sideOutputLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  sideOutputVal: { color: '#B11F39', fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" },
  sideNote: { color: 'rgba(255,255,255,0.2)', fontSize: 10 },

  // ── 자동 배정 ──
  assignContent: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  assignBox: {
    padding: '14px 16px', borderRadius: 8, background: '#FAFAFA',
    borderLeft: '3px solid #0A0A0A', display: 'flex', flexDirection: 'column', gap: 6,
  },
  assignLabel: { display: 'flex', alignItems: 'center', gap: 8 },
  assignBadge: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6 },
  assignDesc: { fontSize: 12, color: '#888', lineHeight: 1.5 },
  specDivider: { height: 1, background: '#F0F0F0' },
  specTitle: { fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.5 },
  specGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  specRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  specLabel: {
    fontSize: 12, fontWeight: 700, color: '#0A0A0A', width: 36,
    padding: '3px 0', background: '#F5F5F5', borderRadius: 4, textAlign: 'center',
  },
  specRange: { fontSize: 13, color: '#555', fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" },
  specNote: { fontSize: 11, color: '#BBB' },
};
