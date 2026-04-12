'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const goSignup = () => router.push('/signup');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.data.token, data.data.user);
      if (data.data.user.role === 'admin') router.push('/admin');
      else if (data.data.user.role === 'worker') router.push('/worker');
      else router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 좌측 브랜드 영역 */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logoRow}>
            <Image src="/logo.png" alt="BHAVEN" width={36} height={36} style={{ borderRadius: 8 }} />
            <span style={styles.logoText}>BHAVEN ERP</span>
          </div>
          <h1 style={styles.headline}>생산 예약 및 공정 관리<br />통합 관리 시스템</h1>
          <p style={styles.desc}>콜드브루 제조 생산설비 예약관리 플랫폼으로,<br />모든 생산 기기 관리 시스템에 오신것을 환영합니다</p>
          <ul style={styles.features}>
            <li>✓ 실시간 기기 스케쥴관리</li>
            <li>✓ 자동 기기 배치 시스템</li>
            <li>✓ 카카오톡 알림 발송</li>
          </ul>
        </div>
      </div>

      {/* 우측 로그인 폼 */}
      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.formTitle}>로그인</h2>
          <p style={styles.formSub}>계정에 로그인하여 생산 관리를 시작하세요</p>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>이메일</label>
              <input style={styles.input} type="email" placeholder="이메일 주소 입력"
                value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>비밀번호</label>
              <input style={styles.input} type="password" placeholder="비밀번호 입력"
                value={form.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <p style={styles.signup}>아직 계정이 없으신가요? <span style={styles.link} onClick={goSignup}>회원가입</span></p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" },
  left: { flex: 1, background: '#B11F39', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  leftContent: { color: '#fff', maxWidth: 400 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoIcon: { width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 },
  logoText: { fontSize: 15, fontWeight: 700, letterSpacing: 1 },
  headline: { fontSize: 30, fontWeight: 700, lineHeight: 1.4, marginBottom: 16 },
  desc: { fontSize: 13, lineHeight: 1.8, opacity: 0.8, marginBottom: 24 },
  features: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, opacity: 0.9 },
  right: { flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  formBox: { width: '100%', maxWidth: 380 },
  formTitle: { fontSize: 26, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' },
  formSub: { fontSize: 13, color: '#888', marginBottom: 32 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#444' },
  input: { padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#1a1a1a' },
  button: { padding: '13px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { color: '#B11F39', fontSize: 13, margin: 0 },
  signup: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 },
  link: { color: '#B11F39', textDecoration: 'none', fontWeight: 500, cursor: 'pointer' },
};
