'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };
const STATUS_LABEL: Record<string, string> = { NORMAL: '정상', MAINTENANCE: '점검중', BROKEN: '고장' };
const PRODUCT_TYPE_LABEL: Record<string, string> = { extract: '원액', can: '캔' };

export default function EquipmentDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any>(null);
  const [form, setForm] = useState({ name: '', status: 'NORMAL' });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/');
  }, [user, router]);

  useEffect(() => {
    api.get(`/equipment/${id}`).then(({ data }: any) => {
      setEquipment(data.data);
      setForm({ name: data.data.name, status: data.data.status });
    }).catch(() => {});
    api.get(`/equipment/${id}/history`).then(({ data }: any) => {
      setHistory(data.data || []);
    }).catch(() => {});
  }, [id]);

  if (!user) return null;

  const save = async () => {
    setLoading(true); setError(''); setSuccess(false);
    try {
      await api.put(`/equipment/${id}`, { ...equipment, ...form });
      setEquipment((prev: any) => ({ ...prev, ...form }));
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!equipment) return <Layout title="기기 상세"><div style={{ padding: 32, color: '#999' }}>불러오는 중...</div></Layout>;

  const infoRows = [
    { label: '기기명', value: equipment.name },
    { label: '코드', value: equipment.equipment_code },
    { label: '구분', value: TYPE_LABEL[equipment.type] },
    { label: '용량 범위', value: `${equipment.min_capacity}~${equipment.max_capacity}kg` },
    { label: '분할 수', value: `${equipment.divisions}분할` },
    { label: '등록일', value: equipment.registered_date },
    { label: '현재 상태', value: STATUS_LABEL[equipment.status] },
  ];

  const totalKg = history.reduce((sum: number, r: any) => sum + parseFloat(r.kg_amount || 0), 0);
  const totalLiter = history.reduce((sum: number, r: any) => sum + parseFloat(r.expected_output_liter || 0), 0);

  return (
    <Layout title="기기 상세" action={
      <button style={s.backBtn} onClick={() => router.push('/admin/equipment')}>← 기기 목록</button>
    }>
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>기기 정보</div>
          <div style={s.divider} />
          {infoRows.map(r => (
            <div key={r.label} style={s.infoRow}>
              <span style={s.infoLabel}>{r.label}</span>
              <span style={s.infoValue}>{r.value}</span>
            </div>
          ))}
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>상태 변경</div>
          <div style={s.divider} />
          <div style={s.field}><label style={s.label}>기기명</label>
            <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div style={s.field}><label style={s.label}>상태</label>
            <select style={s.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="NORMAL">정상</option>
              <option value="MAINTENANCE">점검중</option>
              <option value="BROKEN">고장</option>
            </select></div>
          <div style={{ padding: '8px 12px', background: '#FEF3C7', borderRadius: 6, fontSize: 12, color: '#92400E' }}>
            ⚠️ 용량(CAP) 및 분할 수는 명세서 정책상 수정 불가합니다. 변경이 필요한 경우 기기를 삭제 후 재등록하세요.
          </div>
          <button style={s.saveBtn} onClick={save} disabled={loading}>{loading ? '저장 중...' : '저장'}</button>
          {success && <p style={s.success}>저장되었습니다.</p>}
          {error && <p style={s.error}>{error}</p>}
          <div style={{ height: 1, background: '#F0F0F0', margin: '8px 0' }} />
          {!deleteConfirm ? (
            <button style={s.deleteBtn} onClick={() => setDeleteConfirm(true)}>기기 삭제</button>
          ) : (
            <div style={s.deleteConfirmBox}>
              <span style={s.deleteConfirmText}>정말 삭제하시겠습니까?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.deleteCancel} onClick={() => setDeleteConfirm(false)}>취소</button>
                <button style={s.deleteConfirmBtn} onClick={async () => {
                  try {
                    await api.delete(`/equipment/${id}`);
                    router.push('/admin/equipment');
                  } catch (e: any) {
                    setError(e.response?.data?.error || '삭제에 실패했습니다.');
                    setDeleteConfirm(false);
                  }
                }}>삭제</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 생산 완료 이력 */}
      <div style={{ ...s.card, marginTop: 20 }}>
        <div style={s.historyHeader}>
          <div style={s.cardTitle}>생산 완료 이력</div>
          <div style={s.statChips}>
            <span style={s.chip}>총 {history.length}건</span>
            <span style={s.chip}>{totalKg.toFixed(1)}kg 처리</span>
            <span style={s.chip}>{totalLiter.toFixed(1)}L 생산</span>
          </div>
        </div>
        <div style={s.divider} />
        {history.length === 0 ? (
          <div style={s.empty}>완료된 생산 이력이 없습니다.</div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>날짜</th>
                  <th style={s.th}>업체</th>
                  <th style={s.th}>제품</th>
                  <th style={s.th}>구분</th>
                  <th style={s.th}>투입량</th>
                  <th style={s.th}>생산량</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r: any) => (
                  <tr key={r.reservation_id} style={s.tr}>
                    <td style={s.td}>{r.scheduled_date}</td>
                    <td style={s.td}>{r.users?.company_name || r.users?.name || '-'}</td>
                    <td style={s.td}>{r.products?.product_name || '-'}</td>
                    <td style={s.td}>{PRODUCT_TYPE_LABEL[r.products?.product_type] || '-'}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{r.kg_amount}kg</td>
                    <td style={{ ...s.td, color: '#10B981', fontWeight: 600 }}>{r.expected_output_liter ? `${r.expected_output_liter}L` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  backBtn: { padding: '7px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, color: '#666', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 },
  card: { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const, gap: 12, alignSelf: 'flex-start' as const },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  divider: { height: 1, background: '#F3F4F6' },
  infoRow: { display: 'flex', padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
  infoLabel: { width: 80, fontSize: 13, color: '#888', flexShrink: 0 },
  infoValue: { fontSize: 13, color: '#1a1a1a', fontWeight: 500 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' },
  saveBtn: { padding: 12, background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  success: { color: '#10B981', fontSize: 13, margin: 0 },
  error: { color: '#B11F39', fontSize: 13, margin: 0 },
  deleteBtn: { width: '100%', padding: 10, background: '#fff', color: '#B11F39', border: '1px solid #F5D0D6', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  deleteConfirmBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#FDF2F4', borderRadius: 8, border: '1px solid #F5D0D6' },
  deleteConfirmText: { fontSize: 13, fontWeight: 600, color: '#B11F39' },
  deleteCancel: { padding: '6px 14px', background: '#fff', color: '#666', border: '1px solid #EEEEEE', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  deleteConfirmBtn: { padding: '6px 14px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statChips: { display: 'flex', gap: 8 },
  chip: { padding: '3px 10px', background: '#F3F4F6', borderRadius: 20, fontSize: 12, color: '#374151', fontWeight: 500 },
  empty: { textAlign: 'center' as const, padding: '32px 0', color: '#aaa', fontSize: 13 },
  tableWrap: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  thead: { background: '#F9FAFB' },
  th: { padding: '10px 12px', textAlign: 'left' as const, fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' as const },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 12px', color: '#1a1a1a' },
};
