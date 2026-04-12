'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function Signup() {
  const [form, setForm] = useState({
    email: '', password: '', password_confirm: '',
    company_name: '', contact_info: '', name: '', role_title: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      setError('비밀번호가 일치하지 않습니다.'); return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/signup', {
        email: form.email,
        password: form.password,
        name: form.name,
        company_name: form.company_name,
        contact_info: form.contact_info,
        role_title: form.role_title || null,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>B</div>
            <span style={styles.logoText}>BHAVEN ERP</span>
          </div>
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>회원가입 완료</h2>
            <p style={styles.successMsg}>회원가입이 완료되었습니다. 관리자 승인 후 예약이 가능합니다.</p>
            <p style={styles.successSub}>잠시 후 로그인 페이지로 이동합니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 로고 */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>B</div>
          <span style={styles.logoText}>BHAVEN ERP</span>
        </div>

        <h2 style={styles.title}>고객사 회원가입</h2>
        <p style={styles.subtitle}>처음 대면 주문 고객사 - 새로운 거래 파트너 계정이 생성됩니다.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <Field label="이메일 주소" placeholder="이메일 주소를 입력하세요"
            type="email" value={form.email} onChange={set('email')} required />
          <Field label="비밀번호" placeholder="비밀번호를 입력하세요"
            type="password" value={form.password} onChange={set('password')} required />
          <Field label="비밀번호 확인" placeholder="동일하게 두 번 / 한번 더 입력하세요"
            type="password" value={form.password_confirm} onChange={set('password_confirm')} required />

          <div style={styles.row}>
            <Field label="업체명" placeholder="업체명 입력" value={form.company_name} onChange={set('company_name')} required half />
            <Field label="연락처" placeholder="010-0000-0000" value={form.contact_info} onChange={set('contact_info')} half />
          </div>

          <div style={styles.row}>
            <Field label="담당자" placeholder="담당자 이름" value={form.name} onChange={set('name')} required half />
            <div style={{ ...styles.fieldWrap, flex: 1 }}>
              <label style={styles.label}>직급</label>
              <select style={styles.input} value={form.role_title} onChange={set('role_title')}>
                <option value="">직급 - 선택</option>
                <option>대표</option>
                <option>이사</option>
                <option>팀장</option>
                <option>담당자</option>
                <option>기타</option>
              </select>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p style={styles.loginLink}>
          이미 계정이 있으신가요?{' '}
          <span style={styles.link} onClick={() => router.push('/login')}>로그인하기</span>
        </p>
      </div>
    </div>
  );
}

function Field({ label, placeholder, type = 'text', value, onChange, required, half }: {
  label: string; placeholder?: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; half?: boolean;
}) {
  return (
    <div style={{ ...styles.fieldWrap, ...(half ? { flex: 1 } : {}) }}>
      <label style={styles.label}>{label}</label>
      <input style={styles.input} type={type} placeholder={placeholder}
        value={value} onChange={onChange} required={required} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Noto Sans KR', sans-serif" },
  card: { background: '#fff', borderRadius: 16, padding: '36px 40px', width: '100%', maxWidth: 560 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  logoIcon: { width: 28, height: 28, background: '#B11F39', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 13, fontWeight: 700, color: '#B11F39', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' },
  subtitle: { fontSize: 12, color: '#999', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 12 },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, color: '#666', fontWeight: 500 },
  input: { padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 7, fontSize: 14, color: '#333', outline: 'none', background: '#fafafa', width: '100%', boxSizing: 'border-box' },
  button: { padding: '13px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { color: '#B11F39', fontSize: 13, margin: 0 },
  loginLink: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 16 },
  link: { color: '#B11F39', fontWeight: 500, cursor: 'pointer' },
  successBox: { textAlign: 'center' as const, padding: '32px 0 16px' },
  successIcon: { width: 56, height: 56, background: '#ECFDF5', borderRadius: '50%', color: '#10B981', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  successTitle: { fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' },
  successMsg: { fontSize: 14, color: '#333', lineHeight: 1.6, margin: '0 0 8px' },
  successSub: { fontSize: 12, color: '#aaa' },
};
