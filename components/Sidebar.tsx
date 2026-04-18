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
  // 홈
  { path: '/dashboard', label: '대시보드' },
  // 예약
  { path: '/calendar', label: '예약 캘린더' },
  { path: '/reservations', label: '내 예약 현황' },
  // 소통
  { path: '/inquiries', label: '관리자 문의' },
  // 설정
  { path: '/profile', label: '프로필 설정' },
];

const ADMIN_NAV = [
  { path: '/admin', label: '대시보드' },
  { path: '/admin/reservations', label: '예약 관리' },
  { path: '/admin/calendar', label: '생산 캘린더' },
  { path: '/admin/equipment', label: '기기 관리' },
  { path: '/admin/inquiries', label: '문의 관리' },
];

const SUPER_ADMIN_NAV = [
  { path: '/admin', label: '대시보드' },
  { path: '/admin/reservations', label: '예약 관리' },
  { path: '/admin/calendar', label: '생산 캘린더' },
  { path: '/admin/equipment', label: '기기 관리' },
  { path: '/admin/customers', label: '고객사 관리' },
  { path: '/admin/employees', label: '직원 관리' },
  { path: '/admin/inquiries', label: '문의 관리' },
];

const WORKER_NAV = [
  { path: '/worker', label: '대시보드' },
  { path: '/worker/production', label: '생산 이력' },
  { path: '/worker/shipment', label: '출고 관리' },
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

  const navItems = user?.role === 'admin'
    ? (user?.is_super ? SUPER_ADMIN_NAV : ADMIN_NAV)
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

  const openNoti = () => setShowNoti(v => !v);

  const markAllRead = async () => {
    if (unread === 0) return;
    await api.put('/notifications/read', {}).catch(() => {});
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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

  const NOTI_TYPE_ICON: Record<string, { icon: keyof typeof Icons; label: string }> = {
    approval: { icon: 'clipboard', label: '승인' },
    reservation: { icon: 'calendar', label: '예약' },
    cancellation: { icon: 'clipboard', label: '반려' },
    schedule: { icon: 'calendar', label: '일정' },
    info: { icon: 'bell', label: '안내' },
  };

  const renderNotiDropdown = () => (
    showNoti && (
      <div style={styles.notiDropdown}>
        <div style={styles.notiHeader}>
          <div style={styles.notiHeaderLeft}>
            <span style={styles.notiHeaderTitle}>알림</span>
            {unread > 0 && <span style={styles.notiUnreadBadge}>{unread}</span>}
          </div>
          {unread > 0 && (
            <button style={styles.notiMarkRead} onClick={markAllRead}>모두 읽음</button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div style={styles.notiEmpty}>
            {Icons.bell({ size: 20, color: '#DDD' })}
            <span>새 알림이 없습니다</span>
          </div>
        ) : (
          <div style={styles.notiList}>
            {notifications.slice(0, 20).map((n: any) => {
              const typeInfo = NOTI_TYPE_ICON[n.noti_type] || NOTI_TYPE_ICON.info;
              return (
                <div key={n.notification_id} style={{
                  ...styles.notiItem,
                  background: n.is_read ? '#fff' : '#FDF8F9',
                }}>
                  <div style={styles.notiItemTop}>
                    <div style={styles.notiIconWrap}>
                      {Icons[typeInfo.icon]({ size: 13, color: n.is_read ? '#CCC' : '#B11F39' })}
                    </div>
                    <div style={styles.notiItemContent}>
                      <div style={styles.notiItemTitleRow}>
                        <span style={{ ...styles.notiTitle, color: n.is_read ? '#999' : '#0A0A0A' }}>{n.title}</span>
                        {!n.is_read && <span style={styles.notiDot} />}
                      </div>
                      <p style={{ ...styles.notiMsg, color: n.is_read ? '#BBB' : '#666' }}>{n.message}</p>
                      <span style={styles.notiTime}>
                        {new Date(n.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
  badge: {
    position: 'absolute', top: -2, right: -4,
    background: '#B11F39', color: '#fff',
    fontSize: 8, fontWeight: 700, borderRadius: 8,
    width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #0A0A0A',
  },
  notiDropdown: {
    position: 'absolute', top: '100%', left: 0, width: 340,
    background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 1000,
    maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  notiHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #F0F0F0',
  },
  notiHeaderLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  notiHeaderTitle: { fontSize: 13, fontWeight: 700, color: '#0A0A0A' },
  notiUnreadBadge: {
    fontSize: 10, fontWeight: 700, color: '#B11F39', background: '#FDF2F4',
    borderRadius: 10, padding: '2px 7px',
    border: '1px solid #F5D0D6',
  },
  notiMarkRead: {
    fontSize: 11, fontWeight: 500, color: '#999', background: 'none',
    border: 'none', cursor: 'pointer', padding: '2px 0',
  },
  notiList: { overflowY: 'auto', maxHeight: 360 },
  notiEmpty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: '32px 18px', textAlign: 'center', fontSize: 12, color: '#CCC',
  },
  notiItem: { padding: '14px 18px', borderBottom: '1px solid #F5F5F5', cursor: 'default' },
  notiItemTop: { display: 'flex', gap: 10 },
  notiIconWrap: {
    width: 28, height: 28, borderRadius: 8, background: '#FAFAFA',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  notiItemContent: { flex: 1, minWidth: 0 },
  notiItemTitleRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 },
  notiTitle: { fontSize: 12, fontWeight: 600 },
  notiDot: { width: 6, height: 6, borderRadius: '50%', background: '#B11F39', flexShrink: 0 },
  notiMsg: { fontSize: 11, margin: '0 0 4px', lineHeight: 1.5 },
  notiTime: { fontSize: 10, color: '#CCC' },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500,
    textDecoration: 'none', borderRadius: 6, height: 44,
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
