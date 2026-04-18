'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/AuthContext';
import { Icons } from '@/components/icons';
import api from '@/lib/api';

const ROLE_LABEL: Record<string, string> = { admin: '관리자', worker: '작업자', customer: '고객사' };

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState({ name: '', company_name: '', contact_info: '', email: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);
  useEffect(() => {
    if (user) setInfo({ name: user.name || '', company_name: user.company_name || '', contact_info: user.contact_info || '', email: user.email || '' });
  }, [user]);

  if (!user) return null;

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    if (pw.current || pw.next || pw.confirm) {
      if (pw.next.length < 8) { showMsg('비밀번호는 8자 이상이어야 합니다.', 'error'); setSaving(false); return; }
      if (!/[a-zA-Z]/.test(pw.next) || !/[0-9]/.test(pw.next)) { showMsg('비밀번호는 영문과 숫자를 포함해야 합니다.', 'error'); setSaving(false); return; }
      if (pw.next !== pw.confirm) { showMsg('새 비밀번호가 일치하지 않습니다.', 'error'); setSaving(false); return; }
      try { await api.put('/auth/password', { current_password: pw.current, new_password: pw.next }); }
      catch (err: any) { showMsg(err.response?.data?.error || '비밀번호 변경에 실패했습니다.', 'error'); setSaving(false); return; }
    }
    try {
      await api.put('/auth/profile', { name: info.name, company_name: info.company_name, contact_info: info.contact_info });
      setPw({ current: '', next: '', confirm: '' });
      showMsg('변경사항이 저장되었습니다.', 'success');
    } catch (err: any) { showMsg(err.response?.data?.error || '저장에 실패했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Layout title="" action={<div style={s.topBar}><h1 style={s.pageTitle}>프로필 설정</h1></div>}>
      <div style={s.wrapper}>
        {/* 프로필 헤더 */}
        <div style={s.profileCard}>
          <div style={s.avatar}>{info.name?.[0]?.toUpperCase() || info.email?.[0]?.toUpperCase()}</div>
          <div style={s.profileInfo}>
            <div style={s.profileName}>{info.name || '-'}</div>
            <div style={s.profileEmail}>{info.email}</div>
          </div>
          <span style={s.roleBadge}>{ROLE_LABEL[user.role] || user.role}</span>
        </div>

        {/* 내 정보 카드 */}
        <div style={s.card}>
          {/* 업체 정보 */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              {Icons.building({ size: 15, color: '#B11F39' })}
              <span style={s.sectionTitle}>기본 정보</span>
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>업체명</label>
              <input style={s.input} value={info.company_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInfo({ ...info, company_name: e.target.value })} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>담당자명</label>
              <input style={s.input} value={info.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInfo({ ...info, name: e.target.value })} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>연락처</label>
              <input style={s.input} value={info.contact_info} placeholder="010-0000-0000"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInfo({ ...info, contact_info: e.target.value })} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>이메일</label>
              <div style={s.staticValue}>{info.email}</div>
            </div>
          </div>

          <div style={s.divider} />

          {/* 비밀번호 */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              {Icons.settings({ size: 15, color: '#0A0A0A' })}
              <span style={s.sectionTitle}>비밀번호</span>
              <span style={s.sectionHint}>변경하지 않으려면 비워두세요</span>
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>현재 비밀번호</label>
              <input style={s.input} type="password" placeholder="현재 비밀번호"
                value={pw.current} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>새 비밀번호</label>
              <input style={s.input} type="password" placeholder="8자 이상, 영문+숫자"
                value={pw.next} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, next: e.target.value })} />
            </div>
            <div style={s.fieldRow}>
              <label style={s.label}>새 비밀번호 확인</label>
              <input style={s.input} type="password" placeholder="다시 입력"
                value={pw.confirm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
          </div>

          <div style={s.divider} />

          {/* 메시지 + 저장 */}
          {msg && (
            <div style={{ ...s.msgBox, background: msgType === 'success' ? '#F0F0F0' : '#FDF2F4', color: msgType === 'success' ? '#555' : '#B11F39', borderColor: msgType === 'success' ? '#E0E0E0' : '#F5D0D6' }}>
              {msg}
            </div>
          )}
          <div style={s.footer}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { display: 'flex', alignItems: 'center', width: '100%' },
  pageTitle: { fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },

  wrapper: { maxWidth: 520 },

  // 프로필 헤더
  profileCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: '#0A0A0A', borderRadius: '12px 12px 0 0', padding: '20px 24px',
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%', background: 'rgba(177,31,57,0.8)',
    color: '#fff', fontWeight: 700, fontSize: 17,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  profileInfo: { flex: 1 },
  profileName: { color: '#f7f8f8', fontSize: 15, fontWeight: 700 },
  profileEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  roleBadge: {
    fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.1)',
    padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
  },

  // 카드 (프로필 헤더와 연결)
  card: {
    background: '#fff', borderRadius: '0 0 12px 12px', padding: '24px',
    border: '1px solid #EEEEEE', borderTop: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column', gap: 0,
  },

  // 섹션
  section: { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#0A0A0A' },
  sectionHint: { fontSize: 11, color: '#CCC', marginLeft: 'auto' },
  divider: { height: 1, background: '#F0F0F0', margin: '20px 0' },

  // 필드 (가로 배치: 라벨 | 인풋)
  fieldRow: { display: 'flex', alignItems: 'center', gap: 16 },
  label: { fontSize: 13, fontWeight: 500, color: '#888', width: 110, flexShrink: 0 },
  input: {
    flex: 1, padding: '10px 14px', border: '1px solid #EEEEEE', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#0A0A0A', background: '#FAFAFA', height: 40,
  },
  staticValue: {
    flex: 1, padding: '10px 14px', fontSize: 13, color: '#999',
  },

  // 하단
  msgBox: { padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, borderWidth: 1, borderStyle: 'solid', marginBottom: 8 },
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: 4 },
  saveBtn: {
    padding: '10px 28px', background: '#B11F39', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(177,31,57,0.25)',
  },
};
