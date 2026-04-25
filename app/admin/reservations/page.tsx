'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import DatePicker from '@/components/DatePicker';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'PENDING', label: '승인 대기' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'IN_PROGRESS', label: '생산 중' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'CANCELLED', label: '취소' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', CONFIRMED: '확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소',
};
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888888', bg: '#F8F8F8', border: '#EEEEEE' },
  CANCELLED:   { color: '#AAAAAA', bg: '#FAFAFA', border: '#F0F0F0' },
};

const PAGE_SIZE = 10;

const PRODUCT_TYPES = [
  { key: 'extract', label: '원액' },
  { key: 'can', label: '캔' },
];
const CONTAINER_SIZES = [
  { key: '500ml', label: '500ml' },
  { key: '1L', label: '1L' },
  { key: '2L', label: '2L' },
];

function AdminReservationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || '';
  const searchParam = searchParams.get('search') || '';
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState(searchParam);
  const [dateFrom, setDateFrom] = useState(dateParam);
  const [dateTo, setDateTo] = useState(dateParam);
  const [page, setPage] = useState(1);

  // 예약 추가 모달
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerMode, setCustomerMode] = useState<'select' | 'direct'>('select');
  const [customerSearch, setCustomerSearch] = useState('');
  const [createForm, setCreateForm] = useState({
    user_id: '', company_name: '', product_name: '', product_type: 'extract', container_size: '1L',
    kg_amount: '', scheduled_date: '', notes: '',
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  // 용량 검증
  const [capacityStatus, setCapacityStatus] = useState<null | { canFit: boolean; available: number; total: number }>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const loadReservations = () => api.get('/reservations').then(({ data }: any) => setReservations(data.data || [])).catch(() => {});

  useEffect(() => { loadReservations(); }, []);

  // 모달 열릴 때 고객 목록 로드
  useEffect(() => {
    if (showCreate) {
      api.get('/users?role=customer').then(({ data }: any) => setCustomers(data.data || [])).catch(() => {});
    }
  }, [showCreate]);

  // 날짜 + 중량 변경 시 용량 검증
  useEffect(() => {
    const { scheduled_date, kg_amount } = createForm;
    if (!scheduled_date || !kg_amount || Number(kg_amount) <= 0) {
      setCapacityStatus(null); setForceCreate(false); return;
    }
    setCapacityLoading(true);
    api.get(`/reservations/available-slots?start_date=${scheduled_date}&end_date=${scheduled_date}&min_kg=${kg_amount}`)
      .then(({ data }: any) => {
        const info = data.data;
        if (info && typeof info === 'object' && !Array.isArray(info)) {
          // 범위 응답 (동일 날짜)
          const dayInfo = info[scheduled_date];
          if (dayInfo) {
            setCapacityStatus({ canFit: !!dayInfo.canFit, available: dayInfo.available, total: dayInfo.total });
          } else {
            setCapacityStatus(null);
          }
        } else {
          // 단일 날짜 응답 (장비 목록)
          setCapacityStatus({ canFit: Array.isArray(info) && info.length > 0, available: info?.length || 0, total: 0 });
        }
        setForceCreate(false);
      })
      .catch(() => setCapacityStatus(null))
      .finally(() => setCapacityLoading(false));
  }, [createForm.scheduled_date, createForm.kg_amount]);

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (c.company_name || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    const isDirectInput = customerMode === 'direct';
    if (isDirectInput && !createForm.company_name) {
      setCreateError('업체명을 입력해주세요.'); return;
    }
    if (!isDirectInput && !createForm.user_id) {
      setCreateError('고객사를 선택해주세요.'); return;
    }
    if (!createForm.product_name || !createForm.kg_amount || !createForm.scheduled_date) {
      setCreateError('제품명, 중량, 생산일은 필수입니다.'); return;
    }
    if (capacityStatus && !capacityStatus.canFit && !forceCreate) {
      setCreateError('용량이 부족합니다. 강제 생성하려면 "용량 초과 강제 생성"을 체크해주세요.'); return;
    }
    setCreateLoading(true); setCreateError('');
    try {
      const body: any = {
        product_name: createForm.product_name,
        product_type: createForm.product_type,
        container_size: createForm.container_size,
        kg_amount: Number(createForm.kg_amount),
        scheduled_date: createForm.scheduled_date,
        notes: createForm.notes,
        force: forceCreate,
      };
      if (isDirectInput) {
        body.company_name = createForm.company_name;
      } else {
        body.user_id = Number(createForm.user_id);
      }
      await api.post('/admin/create-reservation', body);
      setShowCreate(false);
      setCreateForm({ user_id: '', company_name: '', product_name: '', product_type: 'extract', container_size: '1L', kg_amount: '', scheduled_date: '', notes: '' });
      setCapacityStatus(null); setForceCreate(false); setCustomerMode('select'); setCustomerSearch('');
      loadReservations();
    } catch (e: any) {
      setCreateError(e.response?.data?.error || '예약 생성에 실패했습니다.');
    } finally { setCreateLoading(false); }
  };

  if (!user) return null;

  const filtered = reservations.filter((r: any) => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (dateFrom && r.scheduled_date < dateFrom) return false;
    if (dateTo && r.scheduled_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.users?.company_name || '').toLowerCase().includes(q)
        && !(r.users?.name || '').toLowerCase().includes(q)
        && !(r.products?.product_name || '').toLowerCase().includes(q)
        && !String(r.reservation_id).includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleTab = (key: string) => { setTab(key); setPage(1); };
  const getCount = (key: string) => key === 'all' ? reservations.length : reservations.filter(r => r.status === key).length;

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>예약 관리</h1>
            <span style={s.totalBadge}>{reservations.length}건</span>
          </div>
          <div style={s.topRight}>
            <div style={s.searchWrap}>
              {Icons.dashboard({ size: 14, color: '#BBB' })}
              <input style={s.searchInput} placeholder="업체명, 제품명, 예약번호 검색"
                value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button style={s.createBtn} onClick={() => setShowCreate(true)}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>예약 추가</span>
            </button>
          </div>
        </div>
      }
    >
      {/* 예약 추가 모달 */}
      {showCreate && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>예약 추가</span>
              <button style={s.modalClose} onClick={() => { setShowCreate(false); setCreateError(''); }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <p style={s.modalSub}>관리자가 직접 예약을 생성합니다. 승인 대기 없이 바로 확정됩니다.</p>
            <div style={s.modalField}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={s.modalLabel}>고객사 <span style={{ color: '#B11F39' }}>*</span></label>
                <div style={s.custToggle}>
                  <button style={{ ...s.custToggleBtn, ...(customerMode === 'select' ? s.custToggleActive : {}) }}
                    onClick={() => { setCustomerMode('select'); setCreateForm(f => ({ ...f, company_name: '' })); }}>기존 고객</button>
                  <button style={{ ...s.custToggleBtn, ...(customerMode === 'direct' ? s.custToggleActive : {}) }}
                    onClick={() => { setCustomerMode('direct'); setCreateForm(f => ({ ...f, user_id: '' })); }}>직접 입력</button>
                </div>
              </div>
              {customerMode === 'select' ? (
                <div style={{ position: 'relative' }}>
                  <input style={s.modalInput} placeholder="업체명 또는 이름으로 검색..." value={customerSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerSearch(e.target.value)} />
                  <select style={{ ...s.modalSelect, marginTop: 4 }} value={createForm.user_id}
                    onChange={(e) => setCreateForm(f => ({ ...f, user_id: e.target.value }))}>
                    <option value="">선택해주세요</option>
                    {filteredCustomers.map((c: any) => (
                      <option key={c.user_id} value={c.user_id}>{c.company_name || c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <input style={s.modalInput} placeholder="업체명 입력 (미등록 고객)" value={createForm.company_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, company_name: e.target.value }))} />
              )}
            </div>
            <div style={s.modalRow}>
              <div style={s.modalField}>
                <label style={s.modalLabel}>제품명 <span style={{ color: '#B11F39' }}>*</span></label>
                <input style={s.modalInput} placeholder="제품명 입력" value={createForm.product_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, product_name: e.target.value }))} />
              </div>
              <div style={s.modalField}>
                <label style={s.modalLabel}>원두 중량 (kg) <span style={{ color: '#B11F39' }}>*</span></label>
                <input style={s.modalInput} type="number" placeholder="0" min="1" value={createForm.kg_amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, kg_amount: e.target.value }))} />
              </div>
            </div>
            <div style={s.modalRow}>
              <div style={s.modalField}>
                <label style={s.modalLabel}>품목</label>
                <div style={s.segmentWrap}>
                  {PRODUCT_TYPES.map(t => (
                    <button key={t.key} style={{ ...s.segmentBtn, ...(createForm.product_type === t.key ? s.segmentActive : {}) }}
                      onClick={() => setCreateForm(f => ({ ...f, product_type: t.key }))}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div style={s.modalField}>
                <label style={s.modalLabel}>용기</label>
                <div style={s.segmentWrap}>
                  {CONTAINER_SIZES.map(t => (
                    <button key={t.key} style={{ ...s.segmentBtn, ...(createForm.container_size === t.key ? s.segmentActive : {}) }}
                      onClick={() => setCreateForm(f => ({ ...f, container_size: t.key }))}>{t.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={s.modalField}>
              <label style={s.modalLabel}>생산 희망일 <span style={{ color: '#B11F39' }}>*</span></label>
              <DatePicker value={createForm.scheduled_date}
                onChange={(d) => setCreateForm(f => ({ ...f, scheduled_date: d }))}
                minDate="2026-01-01" maxDate="2027-12-31" />
            </div>
            {/* 용량 검증 배너 */}
            {capacityLoading && (
              <div style={s.capacityBanner}>용량 확인 중...</div>
            )}
            {!capacityLoading && capacityStatus && (
              capacityStatus.canFit ? (
                <div style={s.capacityOk}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                  <span>해당일 생산 가능 (가용 기기 {capacityStatus.available}대)</span>
                </div>
              ) : (
                <div style={s.capacityWarn}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#B11F39" strokeWidth={2.5}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    <span>해당일 용량 부족 (가용 기기 {capacityStatus.available}대 / 전체 {capacityStatus.total}대)</span>
                  </div>
                  <label style={s.forceLabel}>
                    <input type="checkbox" checked={forceCreate} onChange={(e) => setForceCreate(e.target.checked)} style={{ accentColor: '#B11F39' }} />
                    <span>용량 초과 강제 생성</span>
                  </label>
                </div>
              )
            )}
            <div style={s.modalField}>
              <label style={s.modalLabel}>비고</label>
              <input style={s.modalInput} placeholder="선택 사항" value={createForm.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {createError && <div style={s.modalError}>{createError}</div>}
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => { setShowCreate(false); setCreateError(''); }}>취소</button>
              <button style={s.modalConfirm} onClick={handleCreate} disabled={createLoading}>
                {createLoading ? '생성 중...' : (capacityStatus && !capacityStatus.canFit && forceCreate ? '강제 생성' : '예약 생성')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 필터: 탭 + 날짜 */}
      <div style={s.filterBar}>
        <div style={s.tabRow}>
          {TABS.map(t => {
            const count = getCount(t.key);
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => handleTab(t.key)}
                style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
                <span>{t.label}</span>
                {count > 0 && <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>{count}</span>}
              </button>
            );
          })}
        </div>
        <div style={s.dateFilterWrap}>
          <DatePicker value={dateFrom} onChange={(d) => { setDateFrom(d); setPage(1); }} minDate="2026-01-01" maxDate="2027-12-31" />
          <span style={s.dateSep}>~</span>
          <DatePicker value={dateTo} onChange={(d) => { setDateTo(d); setPage(1); }} minDate="2026-01-01" maxDate="2027-12-31" align="right" />
          {(dateFrom || dateTo) && (
            <button style={s.dateFilterClear} onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); router.replace('/admin/reservations'); }}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div style={s.tableCard}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>업체명</th>
                <th style={s.th}>제품명</th>
                <th style={s.th}>중량</th>
                <th style={s.th}>생산량</th>
                <th style={s.th}>예약일</th>
                <th style={s.th}>배정 기기</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상세</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={9} style={s.emptyRow}>
                  <div style={s.emptyContent}>
                    {Icons.clipboard({ size: 24, color: '#DDD' })}
                    <span>예약 내역이 없습니다</span>
                  </div>
                </td></tr>
              )}
              {paginated.map((r: any) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                return (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.tdId}>{r.reservation_id}</td>
                    <td style={s.tdName}>{r.users?.company_name || r.users?.name || '-'}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.tdMono}>{r.kg_amount}kg</td>
                    <td style={s.tdMono}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</td>
                    <td style={s.td}>{new Date(r.scheduled_date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                    <td style={s.tdMuted}>{r.equipment?.name || '-'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.statusBadge, background: ss.bg, color: ss.color, borderColor: ss.border }}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button style={s.detailBtn} onClick={() => router.push(`/admin/reservations/${r.reservation_id}`)}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={{ ...s.pageBtn, opacity: page > 1 ? 1 : 0.3 }} disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} style={{ ...s.pageNum, ...(p === page ? s.pageNumActive : {}) }}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button style={{ ...s.pageBtn, opacity: page < totalPages ? 1 : 0.3 }} disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <span style={s.pageInfo}>{filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function AdminReservations() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5F5F5' }} />}><AdminReservationsContent /></Suspense>;
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 16 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontWeight: 600, color: '#999', background: '#F0F0F0', padding: '3px 10px', borderRadius: 20 },
  createBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)', flexShrink: 0,
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 14px', height: 36, background: '#F5F5F5', borderRadius: 8,
    border: '1px solid #EEEEEE', minWidth: 260,
  },
  searchInput: {
    border: 'none', background: 'transparent', outline: 'none',
    fontSize: 13, color: '#0A0A0A', flex: 1,
  },

  // ── 필터 바 ──
  filterBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  tabRow: { display: 'flex', gap: 4, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 16px', border: 'none', background: 'transparent',
    borderRadius: 7, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer',
  },
  tabActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  tabCount: {
    fontSize: 10, fontWeight: 700, color: '#CCC', background: '#F0F0F0',
    borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
  },
  tabCountActive: { color: '#fff', background: 'rgba(255,255,255,0.2)' },

  // ── 테이블 ──
  tableCard: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: {
    padding: '12px 20px', textAlign: 'left' as const,
    fontSize: 11, color: '#AAA', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
  },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMuted: { padding: '14px 20px', fontSize: 13, color: '#999' },
  tdMono: { padding: '14px 20px', fontSize: 13, color: '#333', fontFamily: "'Space Grotesk', monospace", fontWeight: 500 },
  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 72, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    borderStyle: 'solid', borderWidth: 1,
  },
  detailBtn: {
    width: 28, height: 28, border: '1px solid #EEEEEE', background: '#fff',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#999', margin: '0 auto',
  },
  emptyRow: { padding: '60px 16px', textAlign: 'center' as const },
  emptyContent: {
    display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    color: '#CCC', fontSize: 13,
  },

  // ── 페이지네이션 ──
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '14px 20px', borderTop: '1px solid #F0F0F0',
  },
  pageBtn: {
    width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#666',
  },
  pageNum: {
    width: 32, height: 32, border: 'none', background: 'transparent',
    borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },

  // ── 날짜 필터 ──
  dateFilterWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  dateSep: { fontSize: 12, color: '#CCC', fontWeight: 500 },
  dateFilterClear: {
    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F0F0F0', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#999',
    marginLeft: 2,
  },

  // ── 모달 ──
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: {
    background: '#fff', borderRadius: 12, padding: '24px 28px', width: 480,
    display: 'flex', flexDirection: 'column', gap: 14,
    border: '1px solid #EEEEEE', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: 2, lineHeight: 0 },
  modalSub: { fontSize: 12, color: '#999', margin: 0 },
  modalRow: { display: 'flex', gap: 12 },
  modalField: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1 },
  modalLabel: { fontSize: 11, fontWeight: 600, color: '#888' },
  modalInput: {
    padding: '0 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38,
  },
  modalSelect: {
    padding: '0 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38,
    cursor: 'pointer',
  },
  segmentWrap: {
    display: 'flex', gap: 0, background: '#F5F5F5', borderRadius: 8, padding: 3,
    border: '1px solid #EEEEEE',
  },
  segmentBtn: {
    flex: 1, padding: '6px 0', border: 'none', background: 'transparent',
    borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#999', cursor: 'pointer',
    textAlign: 'center',
  },
  segmentActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  modalError: {
    padding: '8px 14px', borderRadius: 8, background: '#FDF2F4',
    border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500,
  },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancel: { padding: '9px 20px', background: '#fff', color: '#666', border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  modalConfirm: { padding: '9px 20px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)' },
  // 고객 토글
  custToggle: { display: 'flex', gap: 0, background: '#F5F5F5', borderRadius: 6, padding: 2, border: '1px solid #EEEEEE' },
  custToggleBtn: {
    padding: '3px 10px', border: 'none', background: 'transparent',
    borderRadius: 4, fontSize: 11, fontWeight: 500, color: '#999', cursor: 'pointer',
  } as React.CSSProperties,
  custToggleActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  // 용량 배너
  capacityBanner: {
    padding: '8px 14px', borderRadius: 8, background: '#F5F5F5',
    border: '1px solid #EEEEEE', color: '#888', fontSize: 12,
  } as React.CSSProperties,
  capacityOk: {
    padding: '8px 14px', borderRadius: 8, background: '#F0FDF4',
    border: '1px solid #BBF7D0', color: '#16a34a', fontSize: 12, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 6,
  } as React.CSSProperties,
  capacityWarn: {
    padding: '10px 14px', borderRadius: 8, background: '#FDF2F4',
    border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500,
    display: 'flex', flexDirection: 'column', gap: 8,
  } as React.CSSProperties,
  forceLabel: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
    color: '#B11F39', cursor: 'pointer',
  } as React.CSSProperties,
};
