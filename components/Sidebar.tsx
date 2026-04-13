'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import useIsMobile from '@/hooks/useIsMobile';
import { Icons, NAV_ICONS } from './icons';

const CUSTOMER_NAV = [
  { path: '/dashboard', label: '대시보드' },
  { path: '/calendar', label: '예약 캘린더' },
  { path: '/reservations', label: '내 예약 현황' },
  { path: '/equipment', label: '기기/설비' },
  { path: '/inquiries', label: '관리자 문의' },
  { path: '/profile', label: '프로필 설정' },
];

const ADMIN_NAV = [
  { path: '/admin', label: '대시보드' },
  { path: '/admin/reservations', label: '예약 관리' },
  { path: '/admin/inquiries', label: '문의 관리' },
  { path: '/admin/equipment', label: '기기 관리' },
  { path: '/admin/production', label: '오늘 생산' },
  { path: '/admin/calendar', label: '전체 캘린더' },
  { path: '/admin/statistics', label: '통계' },
  { path: '/admin/holidays', label: '휴무일 관리' },
  { path: '/admin/employees', label: '직원 관리' },
  { path: '/admin/customers', label: '고객사 관리' },
];

const WORKER_NAV = [
  { path: '/worker', label: '대시보드' },
  { path: '/worker/production', label: '생산 이력' },
];

function NavIcon({ label, active }: { label: string; active: boolean }) {
  const key = NAV_ICONS[label] || 'dashboard';
  const iconFn = Icons[key];
  return iconFn({ size: 18, color: active ? '#fff' : 'rgba(255,255,255,0.45)' });
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNoti, setShowNoti] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); router.push('/login'); };

  const navItems = user?.role === 'admin' ? ADMIN_NAV
    : user?.role === 'worker' ? WORKER_NAV
    : CUSTOMER_NAV;

  const roleLabel: Record<string, string> = { admin: '관리자', worker: '작업자', customer: '고객사' };
  const subLabel = user?.role === 'admin' ? '생산 관리 시스템' : '생산 예약 시스템';

  useEffect(() => {
    if (!user) return;
    const fetchNotis = async () => {
      try {
        const { data } = await api.get('/notifications') as any;
        setUnread(data.unread ?? 0);
        setNotifications(data.data ?? []);
      } catch {}
    };
    fetchNotis();
    const interval = setInterval(fetchNotis, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setShowNoti(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).id === 'mobile-overlay') setDrawerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const openNoti = async () => {
    setShowNoti(v => !v);
    if (unread > 0) {
      await api.put('/notifications/read', {}).catch(() => {});
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const renderNav = () => (
    <nav style={styles.nav}>
      {navItems.map(item => {
        const isExact = item.path === '/admin' || item.path === '/worker' || item.path === '/dashboard';
        const isActive = isExact ? pathname === item.path : pathname?.startsWith(item.path);
        return (
          <Link
            key={item.path}
            href={item.path}
            style={{ ...styles.navItem, ...(isActive ? styles.navActive : {}) }}
          >
            <NavIcon label={item.label} active={!!isActive} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const renderNotiDropdown = () => (
    showNoti && (
      <div style={styles.notiDropdown}>
        <div style={styles.notiHeader}>알림 {notifications.length > 0 ? `(${notifications.length})` : ''}</div>
        {notifications.length === 0 ? (
          <div style={styles.notiEmpty}>새 알림이 없습니다.</div>
        ) : (
          notifications.slice(0, 10).map((n: any) => (
            <div key={n.notification_id} style={{
              ...styles.notiItem,
              background: n.is_read ? 'transparent' : 'rgba(177,31,57,0.06)',
            }}>
              <span style={styles.notiTitle}>{n.title || n.type}</span>
              <p style={styles.notiMsg}>{n.message}</p>
              <span style={styles.notiTime}>{new Date(n.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))
        )}
      </div>
    )
  );

  const renderUserArea = () => (
    <div style={styles.userArea}>
      <div style={styles.userInfo}>
        <div style={styles.userAvatar}>{(user as any)?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</div>
        <div style={styles.userDetail}>
          <div style={styles.userName}>{(user as any)?.name || user?.email}</div>
          <div style={styles.userRole}>{(user?.role ? roleLabel[user.role] : '') || user?.role}</div>
        </div>
      </div>
      <button style={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
    </div>
  );

  // ── 모바일 ──
  if (isMobile) {
    return (
      <>
        <header style={m.header}>
          <div style={m.logoArea}>
            <Image src="/logo.png" alt="BHAVEN" width={28} height={28} style={{ borderRadius: 6 }} />
            <span style={m.logoText}>BHAVEN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div ref={notiRef} style={{ position: 'relative' }}>
              <button style={m.iconBtn} onClick={openNoti} title="알림">
                {Icons.bell({ size: 20, color: 'rgba(255,255,255,0.7)' })}
                {unread > 0 && <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
              </button>
              {renderNotiDropdown()}
            </div>
            <button style={m.iconBtn} onClick={() => setDrawerOpen(true)} title="메뉴" aria-label="메뉴 열기">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.8}><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
          </div>
        </header>

        {drawerOpen && (
          <div id="mobile-overlay" style={m.overlay}>
            <aside style={m.drawer}>
              <div style={styles.logo}>
                <Image src="/logo.png" alt="BHAVEN" width={32} height={32} style={{ borderRadius: 7 }} />
                <div style={{ flex: 1 }}>
                  <div style={styles.logoTitle}>BHAVEN</div>
                  <div style={styles.logoSub}>{subLabel}</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
                  onClick={() => setDrawerOpen(false)} aria-label="메뉴 닫기">✕</button>
              </div>
              {renderNav()}
              {renderUserArea()}
            </aside>
          </div>
        )}
      </>
    );
  }

  // ── PC ──
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <Image src="/logo.png" alt="BHAVEN" width={32} height={32} style={{ borderRadius: 7 }} />
        <div style={{ flex: 1 }}>
          <div style={styles.logoTitle}>BHAVEN</div>
          <div style={styles.logoSub}>{subLabel}</div>
        </div>
        <div ref={notiRef} style={{ position: 'relative' }}>
          <button style={styles.bellBtn} onClick={openNoti} title="알림">
            {Icons.bell({ size: 18, color: 'rgba(255,255,255,0.5)' })}
            {unread > 0 && <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
          </button>
          {renderNotiDropdown()}
        </div>
      </div>

      {renderNav()}
      {renderUserArea()}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: { width: 240, minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  logoTitle: { color: '#f7f8f8', fontSize: 14, fontWeight: 700, letterSpacing: 1.5 },
  logoSub: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },
  bellBtn: { background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '4px', lineHeight: 0, borderRadius: 4 },
  badge: { position: 'absolute', top: -4, right: -6, background: '#B11F39', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 4px', minWidth: 14, textAlign: 'center' },
  notiDropdown: { position: 'absolute', top: '100%', right: 0, width: 280, background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1000, maxHeight: 360, overflowY: 'auto' },
  notiHeader: { padding: '12px 14px 8px', fontSize: 12, fontWeight: 600, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  notiEmpty: { padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' },
  notiItem: { padding: '10px 14px', borderBottom: '1px solid #F9FAFB', cursor: 'default' },
  notiTitle: { fontSize: 12, fontWeight: 600, color: '#111' },
  notiMsg: { fontSize: 11, color: '#6B7280', margin: '4px 0 2px', lineHeight: 1.5 },
  notiTime: { fontSize: 10, color: '#9CA3AF' },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
    color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500,
    textDecoration: 'none', borderRadius: 6,
    transition: 'background 0.15s, color 0.15s',
  },
  navActive: { background: '#B11F39', color: '#fff', fontWeight: 600 },
  userArea: { padding: '16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  userAvatar: { width: 32, height: 32, background: 'rgba(177,31,57,0.8)', borderRadius: '50%', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 },
  userDetail: { flex: 1, overflow: 'hidden' },
  userName: { color: '#f7f8f8', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 },
  logoutBtn: { width: '100%', padding: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};

const m: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed', top: 0, left: 0, right: 0, height: 56,
    background: '#0A0A0A', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 16px', zIndex: 900,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 8 },
  logoText: { color: '#f7f8f8', fontSize: 14, fontWeight: 700, letterSpacing: 1.5 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', position: 'relative', lineHeight: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'stretch' },
  drawer: { width: 260, background: '#0A0A0A', display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto' },
};
