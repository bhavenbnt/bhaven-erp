'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import useIsMobile from '@/hooks/useIsMobile';

const CUSTOMER_NAV = [
  { path: '/dashboard', label: '대시보드', icon: '▦' },
  { path: '/calendar', label: '예약 캘린더', icon: '📅' },
  { path: '/reservations', label: '내 예약 현황', icon: '📋' },
  { path: '/equipment', label: '기기/설비', icon: '⚙' },
  { path: '/inquiries', label: '관리자 문의', icon: '💬' },
  { path: '/profile', label: '프로필 설정', icon: '👤' },
];

const ADMIN_NAV = [
  { path: '/admin', label: '대시보드', icon: '▦' },
  { path: '/admin/reservations', label: '예약 관리', icon: '📋' },
  { path: '/admin/inquiries', label: '문의 관리', icon: '💬' },
  { path: '/admin/equipment', label: '기기 관리', icon: '⚙' },
  { path: '/admin/production', label: '오늘 생산', icon: '🏭' },
  { path: '/admin/calendar', label: '전체 캘린더', icon: '📅' },
  { path: '/admin/statistics', label: '통계', icon: '📊' },
  { path: '/admin/holidays', label: '휴무일 관리', icon: '🗓' },
  { path: '/admin/employees', label: '직원 관리', icon: '👥' },
  { path: '/admin/customers', label: '고객사 관리', icon: '🏢' },
];

const WORKER_NAV = [
  { path: '/worker', label: '대시보드', icon: '▦' },
  { path: '/worker/production', label: '생산 이력', icon: '🏭' },
];

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

  // 알림 폴링 (30초마다)
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

  // 외부 클릭 시 알림 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setShowNoti(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 드로어 오버레이 클릭 시 닫기
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.id === 'mobile-overlay') setDrawerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  // 라우트 변경 시 드로어 닫기
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const openNoti = async () => {
    setShowNoti(v => !v);
    if (unread > 0) {
      await api.put('/notifications/read', {}).catch(() => {});
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const NOTI_TYPE_COLOR: Record<string, string> = {
    reservation: '#3B82F6',
    approval: '#10B981',
    cancellation: '#EF4444',
    schedule: '#F59E0B',
    info: '#6B7280',
  };

  // ── 모바일: 상단 헤더 + 슬라이드 드로어 ──
  if (isMobile) {
    return (
      <>
        {/* 상단 Header bar */}
        <header style={m.header}>
          {/* 로고 */}
          <div style={m.logoArea}>
            <div style={m.logoIcon}>B</div>
            <span style={m.logoText}>BHAVEN</span>
          </div>

          {/* 우측: 알림 + 햄버거 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div ref={notiRef} style={{ position: 'relative' }}>
              <button style={m.iconBtn} onClick={openNoti} title="알림">
                🔔
                {unread > 0 && (
                  <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>
              {showNoti && (
                <div style={{ ...styles.notiDropdown, right: 0 }}>
                  <div style={styles.notiHeader}>알림 {notifications.length > 0 ? `(${notifications.length})` : ''}</div>
                  {notifications.length === 0 ? (
                    <div style={styles.notiEmpty}>새 알림이 없습니다.</div>
                  ) : (
                    notifications.slice(0, 10).map((n: any) => (
                      <div key={n.notification_id} style={{
                        ...styles.notiItem,
                        background: n.is_read ? 'transparent' : 'rgba(177,31,57,0.06)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: NOTI_TYPE_COLOR[n.noti_type] || '#6B7280', flexShrink: 0 }} />
                          <span style={styles.notiTitle}>{n.title}</span>
                        </div>
                        <p style={styles.notiMsg}>{n.message}</p>
                        <span style={styles.notiTime}>{new Date(n.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button style={m.iconBtn} onClick={() => setDrawerOpen(true)} title="메뉴" aria-label="메뉴 열기">
              ☰
            </button>
          </div>
        </header>

        {/* 오버레이 + 드로어 */}
        {drawerOpen && (
          <div id="mobile-overlay" style={m.overlay}>
            <aside style={m.drawer}>
              {/* 드로어 헤더 */}
              <div style={styles.logo}>
                <div style={styles.logoIcon}>B</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.logoTitle}>BHAVEN</div>
                  <div style={styles.logoSub}>{subLabel}</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}
                  onClick={() => setDrawerOpen(false)} aria-label="메뉴 닫기">
                  ✕
                </button>
              </div>

              {/* 내비 */}
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
                      <span style={styles.navIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* 유저 영역 */}
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
            </aside>
          </div>
        )}
      </>
    );
  }

  // ── PC: 기존 사이드바 ──
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>B</div>
        <div style={{ flex: 1 }}>
          <div style={styles.logoTitle}>BHAVEN</div>
          <div style={styles.logoSub}>{subLabel}</div>
        </div>
        {/* 알림 벨 */}
        <div ref={notiRef} style={{ position: 'relative' }}>
          <button style={styles.bellBtn} onClick={openNoti} title="알림">
            🔔
            {unread > 0 && (
              <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
          {showNoti && (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: NOTI_TYPE_COLOR[n.noti_type] || '#6B7280', flexShrink: 0 }} />
                      <span style={styles.notiTitle}>{n.title}</span>
                    </div>
                    <p style={styles.notiMsg}>{n.message}</p>
                    <span style={styles.notiTime}>{new Date(n.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

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
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
    </aside>
  );
}

// PC 스타일 (기존 그대로)
const styles: Record<string, React.CSSProperties> = {
  sidebar: { width: 220, minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '24px 16px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logoIcon: { width: 36, height: 36, background: '#B11F39', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoTitle: { color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  logoSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 },
  bellBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, position: 'relative', padding: '2px 4px', lineHeight: 1 },
  badge: { position: 'absolute', top: -4, right: -4, background: '#B11F39', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 4px', minWidth: 14, textAlign: 'center' },
  notiDropdown: { position: 'absolute', top: '100%', right: 0, width: 280, background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1000, maxHeight: 360, overflowY: 'auto' },
  notiHeader: { padding: '12px 14px 8px', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  notiEmpty: { padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' },
  notiItem: { padding: '10px 14px', borderBottom: '1px solid #F9FAFB', cursor: 'default' },
  notiTitle: { fontSize: 12, fontWeight: 600, color: '#111' },
  notiMsg: { fontSize: 11, color: '#6B7280', margin: '0 0 2px', lineHeight: 1.5 },
  notiTime: { fontSize: 10, color: '#9CA3AF' },
  nav: { flex: 1, padding: '12px 0' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' },
  navActive: { background: '#B11F39', color: '#fff' },
  navIcon: { fontSize: 14, width: 18 },
  userArea: { padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  userAvatar: { width: 32, height: 32, background: '#B11F39', borderRadius: '50%', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  userDetail: { flex: 1, overflow: 'hidden' },
  userName: { color: '#fff', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  logoutBtn: { width: '100%', padding: 7, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};

// 모바일 전용 스타일
const m: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    background: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 900,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, background: '#B11F39', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#fff', padding: '4px 8px', position: 'relative', lineHeight: 1 },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'stretch',
  },
  drawer: {
    width: 260,
    background: '#0A0A0A',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    overflowY: 'auto',
    animation: 'slideInLeft 0.22s ease',
  },
};
