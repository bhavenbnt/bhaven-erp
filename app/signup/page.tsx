'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

export default function Signup() {
  const [form, setForm] = useState({
    email: '', password: '', password_confirm: '',
    company_name: '', contact_info: '', name: '', role_title: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const router = useRouter();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms || !agreePrivacy) {
      setError('서비스 이용약관과 개인정보 처리방침에 동의해주세요.'); return;
    }
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
            <Image src="/logo.png" alt="BHAVEN" width={28} height={28} style={{ borderRadius: 6 }} />
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
          <Image src="/logo.png" alt="BHAVEN" width={28} height={28} style={{ borderRadius: 6 }} />
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

          {/* 약관 동의 */}
          <div style={styles.agreeSection}>
            <label style={styles.agreeRow}>
              <input type="checkbox" checked={agreeTerms && agreePrivacy}
                onChange={(e) => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); }}
                style={styles.checkbox} />
              <span style={styles.agreeAll}>전체 동의</span>
            </label>
            <div style={styles.agreeDivider} />
            <label style={styles.agreeRow}>
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={styles.checkbox} />
              <span style={styles.agreeText}>[필수] 서비스 이용약관 동의</span>
              <button type="button" style={styles.agreeViewBtn} onClick={() => setShowTerms(true)}>보기</button>
            </label>
            <label style={styles.agreeRow}>
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} style={styles.checkbox} />
              <span style={styles.agreeText}>[필수] 개인정보 처리방침 동의</span>
              <button type="button" style={styles.agreeViewBtn} onClick={() => setShowPrivacy(true)}>보기</button>
            </label>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          <button style={{ ...styles.button, opacity: agreeTerms && agreePrivacy ? 1 : 0.5 }} type="submit" disabled={loading || !agreeTerms || !agreePrivacy}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        {/* 이용약관 모달 */}
        {showTerms && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>서비스 이용약관</span>
                <button style={styles.modalClose} onClick={() => setShowTerms(false)}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <h4>제1조 (목적)</h4>
                <p>이 약관은 비해이븐(이하 "회사")이 제공하는 생산 예약 및 공정 관리 ERP 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                <h4>제2조 (서비스의 내용)</h4>
                <p>회사는 콜드브루 커피 생산 예약, 공정 관리, 출고 관리 등의 서비스를 제공합니다. 서비스의 세부 내용은 회사의 정책에 따라 변경될 수 있습니다.</p>
                <h4>제3조 (이용자의 의무)</h4>
                <p>이용자는 서비스 이용 시 관계 법령, 이 약관의 규정, 이용 안내 및 서비스 상에 공지한 주의사항을 준수하여야 합니다. 타인의 정보를 도용하거나 허위 정보를 등록하여서는 안 됩니다.</p>
                <h4>제4조 (계정 관리)</h4>
                <p>이용자는 자신의 계정 정보를 안전하게 관리할 책임이 있으며, 계정의 부정 사용에 대한 책임은 이용자에게 있습니다.</p>
                <h4>제5조 (서비스 중단)</h4>
                <p>회사는 시스템 점검, 설비 교체 등 부득이한 사유가 있는 경우 서비스 제공을 일시적으로 중단할 수 있습니다.</p>
              </div>
              <button style={styles.modalAgreeBtn} onClick={() => { setAgreeTerms(true); setShowTerms(false); }}>동의합니다</button>
            </div>
          </div>
        )}

        {/* 개인정보 처리방침 모달 */}
        {showPrivacy && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>개인정보 처리방침</span>
                <button style={styles.modalClose} onClick={() => setShowPrivacy(false)}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <h4>1. 수집하는 개인정보 항목</h4>
                <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다: 이메일 주소, 이름, 업체명, 연락처, 직급</p>
                <h4>2. 개인정보의 수집 및 이용 목적</h4>
                <p>수집된 개인정보는 서비스 제공, 고객 식별, 예약 관리, 알림 발송(카카오 알림톡 등)의 목적으로 사용됩니다.</p>
                <h4>3. 개인정보의 보유 및 이용 기간</h4>
                <p>개인정보는 서비스 이용 기간 동안 보유되며, 회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 의한 정보 보존이 필요한 경우 해당 기간 동안 보존합니다.</p>
                <h4>4. 개인정보의 제3자 제공</h4>
                <p>회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 카카오 알림톡 발송을 위해 연락처 정보가 발송 대행사에 전달될 수 있습니다.</p>
                <h4>5. 개인정보 보호책임자</h4>
                <p>개인정보 관련 문의사항은 관리자에게 연락해주세요.</p>
              </div>
              <button style={styles.modalAgreeBtn} onClick={() => { setAgreePrivacy(true); setShowPrivacy(false); }}>동의합니다</button>
            </div>
          </div>
        )}

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
  // 약관 동의
  agreeSection: { background: '#FAFAFA', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid #EEEEEE' },
  agreeRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  checkbox: { width: 16, height: 16, accentColor: '#B11F39', cursor: 'pointer' },
  agreeAll: { fontSize: 13, fontWeight: 600, color: '#0A0A0A' },
  agreeDivider: { height: 1, background: '#EEEEEE' },
  agreeText: { fontSize: 12, color: '#666', flex: 1 },
  agreeViewBtn: { fontSize: 11, color: '#999', background: 'none', border: '1px solid #E8E8E8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' },
  // 모달
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #F0F0F0' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  modalClose: { background: 'none', border: 'none', fontSize: 16, color: '#999', cursor: 'pointer' },
  modalBody: { padding: '20px 24px', overflowY: 'auto', fontSize: 13, color: '#555', lineHeight: 1.8, flex: 1 },
  modalAgreeBtn: { margin: '16px 24px', padding: '12px', background: '#B11F39', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  successBox: { textAlign: 'center' as const, padding: '32px 0 16px' },
  successIcon: { width: 56, height: 56, background: '#ECFDF5', borderRadius: '50%', color: '#10B981', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  successTitle: { fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' },
  successMsg: { fontSize: 14, color: '#333', lineHeight: 1.6, margin: '0 0 8px' },
  successSub: { fontSize: 12, color: '#aaa' },
};
