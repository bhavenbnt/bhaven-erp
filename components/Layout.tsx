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
          <h1 style={styles.title}>{title}</h1>
          {action && <div>{action}</div>}
        </header>
        <div style={{ ...styles.content, padding: isMobile ? 16 : 28 }}>{children}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh', background: '#f4f5f7', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { background: '#fff', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e8e8e8' },
  title: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  content: { flex: 1, padding: 28, overflow: 'auto' },
};
