'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState({ name: '', company_name: '', contact_info: '', email: '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [infoMsg, setInfoMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    if (user) setInfo({ name: user.name || '', company_name: user.company_name || '', contact_info: user.contact_info || '', email: user.email || '' });
  }, [user]);

  if (!user) return null;

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { setPwMsg('새 비밀번호가 일치하지 않습니다.'); return; }
    try {
      await api.put('/auth/password', { current_password: pw.current, new_password: pw.next });
      setPwMsg('비밀번호가 변경되었습니다.');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwMsg(err.response?.data?.error || '변경에 실패했습니다.');
    }
  };

  return (
    <Layout title="프로필 설정">
      <div style={styles.grid}>
        {/* 업체 정보 */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>업체 정보</div>
          <div style={styles.fields}>
            <Field label="업체명" value={info.company_name} readOnly />
            <Field label="고객/KR" value={info.name} readOnly />
            <div style={styles.row}>
              <Field label="개업" value="-" readOnly half />
              <Field label="연락처" value={info.contact_info} readOnly half />
            </div>
            <Field label="이메일" value={info.email} readOnly />
          </div>
          {infoMsg && <p style={styles.msg}>{infoMsg}</p>}
        </div>

        {/* 비밀번호 변경 */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>비밀번호 변경</div>
          <form onSubmit={handlePwChange} style={styles.fields}>
            <Field label="현재 비밀번호" value={pw.current} type="password"
              onChange={(v: string) => setPw({ ...pw, current: v })} />
            <Field label="새 비밀번호" value={pw.next} type="password"
              onChange={(v: string) => setPw({ ...pw, next: v })} />
            <Field label="새 비밀번호 확인" value={pw.confirm} type="password"
              onChange={(v: string) => setPw({ ...pw, confirm: v })} />
            {pwMsg && <p style={{ ...styles.msg, color: pwMsg.includes('변경') ? '#10b981' : '#B11F39' }}>{pwMsg}</p>}
            <button style={styles.saveBtn} type="submit">비밀번호 변경</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly = false, half = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; readOnly?: boolean; half?: boolean;
}) {
  return (
    <div style={{ ...styles.field, ...(half ? { flex: 1 } : {}) }}>
      <label style={styles.label}>{label}</label>
      <input
        style={{ ...styles.input, background: readOnly ? '#f9f9f9' : '#fff' }}
        type={type} value={value}
        onChange={onChange ? (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', borderRadius: 10, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 },
  fields: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, color: '#888' },
  input: { padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 7, fontSize: 14, color: '#333', outline: 'none' },
  saveBtn: { padding: '12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  msg: { fontSize: 12, color: '#B11F39', margin: 0 },
};
