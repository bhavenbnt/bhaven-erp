'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'admin', label: '관리자' },
  { key: 'worker', label: '작업자' },
];

const PAGE_SIZE = 10;

export default function Employees() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<{ userId: number; action: string; label: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', role: 'worker', contact_info: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  const load = () => {
    Promise.all([
      api.get('/users?role=worker'),
      api.get('/users?role=admin'),
    ]).then(([workerRes, adminRes]) => {
      setEmployees([...((adminRes as any).data.data || []), ...((workerRes as any).data.data || [])]);
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.name) {
      setCreateError('이메일, 비밀번호, 이름은 필수입니다.'); return;
    }
    setCreateLoading(true); setCreateError('');
    try {
      await api.post('/admin/create-employee', createForm);
      setShowCreate(false);
      setCreateForm({ email: '', password: '', name: '', role: 'worker', contact_info: '' });
      load();
    } catch (e: any) {
      setCreateError(e.response?.data?.error || '등록에 실패했습니다.');
    } finally { setCreateLoading(false); }
  };

  if (!user) return null;

  const filtered = employees.filter((u: any) => {
    if (tab === 'admin' && u.role !== 'admin') return false;
    if (tab === 'worker' && u.role !== 'worker') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(u.name || '').toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleTab = (key: string) => { setTab(key); setPage(1); };
  const getCount = (key: string) => {
    if (key === 'all') return employees.length;
    return employees.filter(u => u.role === key).length;
  };

  const execAction = async () => {
    if (!confirmModal) return;
    const { userId, action } = confirmModal;
    try {
      if (action === 'to-admin') await api.put(`/users/${userId}/role`, { role: 'admin' });
      else if (action === 'to-worker') await api.put(`/users/${userId}/role`, { role: 'worker' });
      else if (action === 'suspend') await api.put(`/users/${userId}/status`, { is_active: false });
      else if (action === 'unsuspend') await api.put(`/users/${userId}/status`, { is_active: true });
    } catch {}
    setConfirmModal(null);
    load();
  };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <div style={s.topLeft}>
            <h1 style={s.pageTitle}>직원 관리</h1>
            <span style={s.totalBadge}>{employees.length}명</span>
          </div>
          <div style={s.topRight}>
            <div style={s.searchWrap}>
              {Icons.users({ size: 14, color: '#BBB' })}
              <input style={s.searchInput} placeholder="이름, 이메일 검색"
                value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button style={s.createBtn} onClick={() => setShowCreate(true)}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>직원 등록</span>
            </button>
          </div>
        </div>
      }
    >
      {/* 직원 등록 모달 */}
      {showCreate && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>직원 등록</span>
              <button style={s.modalClose} onClick={() => { setShowCreate(false); setCreateError(''); }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <p style={s.modalSub}>관리자 또는 작업자 계정을 생성합니다.</p>
            <div style={s.modalRow}>
              <div style={s.modalField}>
                <label style={s.modalLabel}>이메일 <span style={{ color: '#B11F39' }}>*</span></label>
                <input style={s.modalInput} placeholder="worker@bhaven.com" value={createForm.email} autoComplete="off"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={s.modalField}>
                <label style={s.modalLabel}>비밀번호 <span style={{ color: '#B11F39' }}>*</span></label>
                <input style={s.modalInput} type="password" placeholder="6자 이상" value={createForm.password} autoComplete="new-password"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <div style={s.modalRow}>
              <div style={s.modalField}>
                <label style={s.modalLabel}>이름 <span style={{ color: '#B11F39' }}>*</span></label>
                <input style={s.modalInput} placeholder="홍길동" value={createForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={s.modalField}>
                <label style={s.modalLabel}>역할</label>
                <div style={s.roleSegRow}>
                  <button type="button" style={{ ...s.roleSeg, ...(createForm.role === 'worker' ? s.roleSegOn : {}) }}
                    onClick={() => setCreateForm(f => ({ ...f, role: 'worker' }))}>작업자</button>
                  <button type="button" style={{ ...s.roleSeg, ...(createForm.role === 'admin' ? s.roleSegOn : {}) }}
                    onClick={() => setCreateForm(f => ({ ...f, role: 'admin' }))}>관리자</button>
                </div>
              </div>
            </div>
            <div style={s.modalField}>
              <label style={s.modalLabel}>연락처</label>
              <input style={s.modalInput} placeholder="010-0000-0000" value={createForm.contact_info}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, contact_info: e.target.value }))} />
            </div>
            {createError && <div style={s.modalError}>{createError}</div>}
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => { setShowCreate(false); setCreateError(''); }}>취소</button>
              <button style={s.modalConfirmBtn} onClick={handleCreate} disabled={createLoading}>
                {createLoading ? '등록 중...' : '직원 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalTitle}>{confirmModal.label}</div>
            <p style={s.modalSub}>이 작업을 진행하시겠습니까?</p>
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => setConfirmModal(null)}>취소</button>
              <button style={s.modalConfirm} onClick={execAction}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
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

      {/* 테이블 */}
      <div style={s.tableCard}>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>이름</th>
                <th style={s.th}>이메일</th>
                <th style={s.th}>연락처</th>
                <th style={s.th}>등록일</th>
                <th style={{ ...s.th, textAlign: 'center' }}>역할</th>
                <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                <th style={{ ...s.th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={8} style={s.emptyRow}>
                  <div style={s.emptyContent}>
                    {Icons.users({ size: 24, color: '#DDD' })}
                    <span>등록된 직원이 없습니다</span>
                  </div>
                </td></tr>
              )}
              {paginated.map((u: any) => (
                <tr key={u.user_id} style={s.tr}>
                  <td style={s.tdId}>{u.user_id}</td>
                  <td style={s.tdName}>{u.name}</td>
                  <td style={s.tdMuted}>{u.email}</td>
                  <td style={s.td}>{u.contact_info || '-'}</td>
                  <td style={s.td}>{new Date(u.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <span style={{ ...s.roleBadge, ...(u.role === 'admin' ? s.roleAdmin : s.roleWorker) }}>
                      {u.role === 'admin' ? '관리자' : '작업자'}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <span style={{ ...s.statusBadge, ...(u.is_active ? s.badgeActive : s.badgeSuspended) }}>
                      {u.is_active ? '정상' : '정지'}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <div style={s.actionBtns}>
                      {u.role === 'worker' && (
                        <button style={s.actionBtn} onClick={() => setConfirmModal({ userId: u.user_id, action: 'to-admin', label: `${u.name}님을 관리자로 승격하시겠습니까?` })}>
                          승격
                        </button>
                      )}
                      {u.role === 'admin' && u.user_id !== user.user_id && (
                        <button style={s.actionBtn} onClick={() => setConfirmModal({ userId: u.user_id, action: 'to-worker', label: `${u.name}님을 작업자로 변경하시겠습니까?` })}>
                          변경
                        </button>
                      )}
                      {u.user_id !== user.user_id && (
                        u.is_active ? (
                          <button style={s.actionBtnDanger} onClick={() => setConfirmModal({ userId: u.user_id, action: 'suspend', label: `${u.name}님의 계정을 정지하시겠습니까?` })}>
                            정지
                          </button>
                        ) : (
                          <button style={s.actionBtn} onClick={() => setConfirmModal({ userId: u.user_id, action: 'unsuspend', label: `${u.name}님의 계정을 활성화하시겠습니까?` })}>
                            해제
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
            <span style={s.pageInfo}>{filtered.length}명 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          </div>
        )}
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  createBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 20px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)', flexShrink: 0,
  },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  totalBadge: { fontSize: 12, fontWeight: 600, color: '#999', background: '#F0F0F0', padding: '3px 10px', borderRadius: 20 },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 14px', height: 36, background: '#F5F5F5', borderRadius: 8, border: '1px solid #EEEEEE', minWidth: 220,
  },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0A0A0A', flex: 1 },

  tabRow: { display: 'flex', gap: 4, marginBottom: 10, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #EEEEEE' },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 16px', border: 'none', background: 'transparent',
    borderRadius: 7, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer',
  },
  tabActive: { background: '#0A0A0A', color: '#fff', fontWeight: 600 },
  tabCount: { fontSize: 10, fontWeight: 700, color: '#CCC', background: '#F0F0F0', borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  tabCountActive: { color: '#fff', background: 'rgba(255,255,255,0.2)' },

  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th: {
    padding: '12px 20px', textAlign: 'left' as const, fontSize: 11, color: '#AAA', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.5, background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
  },
  tr: { borderBottom: '1px solid #F5F5F5' },
  td: { padding: '14px 20px', fontSize: 13, color: '#333' },
  tdId: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" },
  tdName: { padding: '14px 20px', fontSize: 13, color: '#0A0A0A', fontWeight: 500 },
  tdMuted: { padding: '14px 20px', fontSize: 13, color: '#999' },

  roleBadge: {
    display: 'inline-block', padding: '4px 0', width: 56, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, borderWidth: 1, borderStyle: 'solid',
  },
  roleAdmin: { color: '#0A0A0A', background: '#F0F0F0', borderColor: '#E0E0E0' },
  roleWorker: { color: '#555', background: '#F5F5F5', borderColor: '#EBEBEB' },

  statusBadge: {
    display: 'inline-block', padding: '4px 0', width: 48, textAlign: 'center' as const,
    borderRadius: 6, fontSize: 11, fontWeight: 600, borderWidth: 1, borderStyle: 'solid',
  },
  badgeActive: { color: '#0A0A0A', background: '#F0F0F0', borderColor: '#E0E0E0' },
  badgeSuspended: { color: '#B11F39', background: '#FDF2F4', borderColor: '#F5D0D6' },

  actionBtns: { display: 'flex', gap: 4, justifyContent: 'center' },
  actionBtn: {
    padding: '4px 10px', background: '#fff', color: '#555',
    border: '1px solid #EEEEEE', borderRadius: 5, fontSize: 11, cursor: 'pointer',
  },
  actionBtnDanger: {
    padding: '4px 10px', background: '#fff', color: '#B11F39',
    border: '1px solid #F5D0D6', borderRadius: 5, fontSize: 11, cursor: 'pointer',
  },

  emptyRow: { padding: '60px 20px', textAlign: 'center' as const },
  emptyContent: { display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, color: '#CCC', fontSize: 13 },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 20px', borderTop: '1px solid #F0F0F0' },
  pageBtn: { width: 32, height: 32, border: '1px solid #EEEEEE', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' },
  pageNum: { width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  pageInfo: { fontSize: 11, color: '#CCC', marginLeft: 12 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: {
    background: '#fff', borderRadius: 12, padding: '24px 28px', width: 400,
    display: 'flex', flexDirection: 'column', gap: 14,
    border: '1px solid #EEEEEE', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  modalSub: { fontSize: 12, color: '#999', margin: 0 },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancel: { padding: '9px 20px', background: '#fff', color: '#666', border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  modalConfirm: { padding: '9px 20px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  // ── 직원 등록 모달 ──
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: 2, lineHeight: 0 },
  modalRow: { display: 'flex', gap: 12 },
  modalField: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1 },
  modalLabel: { fontSize: 11, fontWeight: 600, color: '#888' },
  modalInput: { padding: '0 14px', border: '1px solid #EEEEEE', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 38 },
  modalError: { padding: '8px 14px', borderRadius: 8, background: '#FDF2F4', border: '1px solid #F5D0D6', color: '#B11F39', fontSize: 12, fontWeight: 500 },
  modalConfirmBtn: { padding: '9px 20px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(177,31,57,0.25)' },
  roleSegRow: { display: 'inline-flex', background: '#F0F0F0', borderRadius: 7, padding: 2, height: 38, alignItems: 'center' },
  roleSeg: { padding: '0 16px', height: 34, fontSize: 12, fontWeight: 600, color: '#888', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' },
  roleSegOn: { background: '#0A0A0A', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
};
