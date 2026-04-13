'use client';
import Sidebar from './Sidebar';
import useIsMobile from '@/hooks/useIsMobile';

interface LayoutProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function Layout({ title, action, children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={{ ...styles.main, paddingTop: isMobile ? 56 : 0 }}>
        <header style={styles.header}>
          {title && <h1 style={styles.title}>{title}</h1>}
          {action && <div style={title ? undefined : { width: '100%' }}>{action}</div>}
        </header>
        <div style={{ ...styles.content, padding: isMobile ? 16 : 28 }}>{children}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh', background: '#F5F5F5', fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif" },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    background: '#fff', padding: '0 28px', height: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid #EEEEEE',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, letterSpacing: -0.3 },
  content: { flex: 1, padding: 28, overflow: 'auto' },
};
