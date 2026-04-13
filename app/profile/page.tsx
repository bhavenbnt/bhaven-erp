'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import api from '@/lib/api';

const ROLE_LABEL: Record<string, string> = { admin: '관리자', worker: '작업자', customer: '고객사' };

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState({ name: '', company_name: '', contact_info: '', email: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [editing, setEditing] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [infoSuccess, setInfoSuccess] = useState(false);

  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);
  useEffect(() => {
    if (user) setInfo({ name: user.name || '', company_name: user.company_name || '', contact_info: user.contact_info || '', email: user.email || '' });
  }, [user]);

  if (!user) return null;

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(false);
    if (pw.next.length < 6) { setPwMsg('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (pw.next !== pw.confirm) { setPwMsg('새 비밀번호가 일치하지 않습니다.'); return; }
    try {
      await api.put('/auth/password', { current_password: pw.current, new_password: pw.next });
      setPwMsg('비밀번호가 변경되었습니다.');
      setPwSuccess(true);
      setPw({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwMsg(err.response?.data?.error || '변경에 실패했습니다.');
    }
  };

  const handleInfoSave = async () => {
    setInfoSuccess(false);
    try {
      await api.put('/auth/profile', {
        name: info.name, company_name: info.company_name, contact_info: info.contact_info,
      });
      setInfoMsg('정보가 저장되었습니다.');
      setInfoSuccess(true);
      setEditing(false);
    } catch (err: any) {
      setInfoMsg(err.response?.data?.error || '저장에 실패했습니다.');
    }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <Layout
      title=""
      action={
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>프로필 설정</h1>
        </div>
      }
    >
      <div style={s.grid}>
        {/* 좌측: 프로필 카드 + 업체 정보 */}
        <div style={s.col}>
          {/* 프로필 카드 */}
          <div style={s.profileCard}>
            <div style={s.profileTop}>
              <div style={s.avatar}>{info.name?.[0]?.toUpperCase() || info.email?.[0]?.toUpperCase()}</div>
              <div style={s.profileInfo}>
                <div style={s.profileName}>{info.name || '-'}</div>
                <div style={s.profileEmail}>{info.email}</div>
              </div>
              <span style={s.roleBadge}>{ROLE_LABEL[user.role] || user.role}</span>
            </div>
          </div>

          {/* 업체 정보 */}
          <div style={s.card}>
            <div style={s.cardHeaderRow}>
              <div style={s.cardHeader}>
                <div style={s.cardHeaderDot} />
                <span style={s.cardTitle}>업체 정보</span>
              </div>
              {!editing ? (
                <button style={s.editBtn} onClick={() => { setEditing(true); setInfoMsg(''); }}>
                  {Icons.settings({ size: 12, color: '#999' })}
                  <span>수정</span>
                </button>
              ) : (
                <div style={s.editBtnRow}>
                  <button style={s.cancelEditBtn} onClick={() => { setEditing(false); setInfoMsg(''); }}>취소</button>
                  <button style={s.saveEditBtn} onClick={handleInfoSave}>저장</button>
                </div>
              )}
            </div>
            {infoMsg && (
              <div style={{ ...s.msgBox, background: infoSuccess ? '#F0F0F0' : '#FDF2F4', color: infoSuccess ? '#555' : '#B11F39', borderColor: infoSuccess ? '#E0E0E0' : '#F5D0D6' }}>
                {infoMsg}
              </div>
            )}
            <div style={s.fields}>
              <div style={s.row2}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>업체명</label>
                  {editing ? (
                    <input style={s.input} value={info.company_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInfo({ ...info, company_name: e.target.value })} />
                  ) : (
                    <div style={s.readonlyField}>{info.company_name || '-'}</div>
                  )}
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>담당자명</label>
                  {editing ? (
                    <input style={s.input} value={info.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInfo({ ...info, name: e.target.value })} />
                  ) : (
                    <div style={s.readonlyField}>{info.name || '-'}</div>
                  )}
                </div>
              </div>
              <div style={s.row2}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>연락처</label>
                  {editing ? (
                    <input style={s.input} value={info.contact_info} placeholder="010-0000-0000" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInfo({ ...info, contact_info: e.target.value })} />
                  ) : (
                    <div style={s.readonlyField}>{info.contact_info || '-'}</div>
                  )}
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>이메일 <span style={{ color: '#CCC', fontWeight: 400 }}>(변경 불가)</span></label>
                  <div style={s.readonlyField}>{info.email || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 비밀번호 변경 + 계정 */}
        <div style={s.col}>
          {/* 비밀번호 변경 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardHeaderDot} />
              <span style={s.cardTitle}>비밀번호 변경</span>
            </div>
            <form onSubmit={handlePwChange} style={s.fields}>
              <div style={s.fieldGroup}>
                <label style={s.label}>현재 비밀번호</label>
                <input style={s.input} type="password" placeholder="현재 비밀번호 입력"
                  value={pw.current} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, current: e.target.value })} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>새 비밀번호</label>
                <input style={s.input} type="password" placeholder="6자 이상"
                  value={pw.next} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, next: e.target.value })} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>새 비밀번호 확인</label>
                <input style={s.input} type="password" placeholder="새 비밀번호 다시 입력"
                  value={pw.confirm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
              {pwMsg && (
                <div style={{ ...s.msgBox, background: pwSuccess ? '#F0F0F0' : '#FDF2F4', color: pwSuccess ? '#555' : '#B11F39', borderColor: pwSuccess ? '#E0E0E0' : '#F5D0D6' }}>
                  {pwMsg}
                </div>
              )}
              <button style={s.saveBtn} type="submit">비밀번호 변경</button>
            </form>
          </div>

          {/* 계정 */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ ...s.cardHeaderDot, background: '#CCC' }} />
              <span style={s.cardTitle}>계정</span>
            </div>
            <div style={s.accountRow}>
              <div>
                <div style={s.accountLabel}>로그아웃</div>
                <div style={s.accountDesc}>현재 세션을 종료합니다</div>
              </div>
              <button style={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  // ── 상단 ──
  topBar: { display: 'flex', alignItems: 'center', width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },

  // ── 그리드 ──
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' },
  col: { display: 'flex', flexDirection: 'column', gap: 14 },

  // ── 프로필 카드 ──
  profileCard: {
    background: '#0A0A0A', borderRadius: 12, padding: '20px 22px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  profileTop: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: '50%', background: 'rgba(177,31,57,0.8)',
    color: '#fff', fontWeight: 700, fontSize: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  profileInfo: { flex: 1 },
  profileName: { color: '#f7f8f8', fontSize: 16, fontWeight: 700 },
  profileEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  roleBadge: {
    fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.1)',
    padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
  },

  // ── 카드 ──
  card: {
    background: '#fff', borderRadius: 12, padding: '20px 22px',
    border: '1px solid #EEEEEE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  cardHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  cardHeaderDot: { width: 4, height: 18, borderRadius: 2, background: '#B11F39' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: -0.2 },
  editBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', background: '#fff', border: '1px solid #EEEEEE',
    borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#666', cursor: 'pointer',
  },
  editBtnRow: { display: 'flex', gap: 6 },
  cancelEditBtn: {
    padding: '5px 14px', background: '#fff', border: '1px solid #EEEEEE',
    borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#999', cursor: 'pointer',
  },
  saveEditBtn: {
    padding: '5px 14px', background: '#0A0A0A', border: 'none',
    borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
  },

  // ── 필드 ──
  fields: { display: 'flex', flexDirection: 'column', gap: 14 },
  row2: { display: 'flex', gap: 14 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: 600, color: '#888' },
  readonlyField: {
    padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#0A0A0A', fontWeight: 500,
    background: '#FAFAFA', border: '1px solid #F0F0F0',
  },
  input: {
    padding: '10px 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 40,
  },
  msgBox: {
    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    borderWidth: 1, borderStyle: 'solid',
  },
  saveBtn: {
    padding: '11px', background: '#0A0A0A', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },

  // ── 계정 ──
  accountRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0F0F0',
  },
  accountLabel: { fontSize: 13, fontWeight: 600, color: '#333' },
  accountDesc: { fontSize: 11, color: '#BBB', marginTop: 2 },
  logoutBtn: {
    padding: '8px 18px', background: '#fff', color: '#B11F39',
    border: '1px solid #F5D0D6', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
};
