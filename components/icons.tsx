// Lucide 스타일 SVG 아이콘 (의존성 없이 인라인)
const I = ({ d, size = 18, color = 'currentColor' }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// 아이콘 맵에서 여러 path가 필요한 경우
const MI = ({ paths, size = 18, color = 'currentColor' }: { paths: string[]; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>
);

export const Icons = {
  dashboard: (p?: { size?: number; color?: string }) => <MI paths={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z']} {...p} />,
  calendar: (p?: { size?: number; color?: string }) => <MI paths={['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']} {...p} />,
  clipboard: (p?: { size?: number; color?: string }) => <MI paths={['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z']} {...p} />,
  settings: (p?: { size?: number; color?: string }) => <MI paths={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']} {...p} />,
  message: (p?: { size?: number; color?: string }) => <I d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...p} />,
  user: (p?: { size?: number; color?: string }) => <MI paths={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']} {...p} />,
  users: (p?: { size?: number; color?: string }) => <MI paths={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} {...p} />,
  building: (p?: { size?: number; color?: string }) => <MI paths={['M3 21h18', 'M5 21V7l8-4v18', 'M19 21V11l-6-4', 'M9 9v.01', 'M9 12v.01', 'M9 15v.01', 'M9 18v.01']} {...p} />,
  factory: (p?: { size?: number; color?: string }) => <MI paths={['M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z', 'M17 18h1', 'M12 18h1', 'M7 18h1']} {...p} />,
  chart: (p?: { size?: number; color?: string }) => <MI paths={['M18 20V10', 'M12 20V4', 'M6 20v-6']} {...p} />,
  calendarOff: (p?: { size?: number; color?: string }) => <MI paths={['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M11 14h2', 'M11 18h2']} {...p} />,
  bell: (p?: { size?: number; color?: string }) => <MI paths={['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']} {...p} />,
};

// 네비 아이콘 키 매핑
export const NAV_ICONS: Record<string, keyof typeof Icons> = {
  '대시보드': 'dashboard',
  '예약 캘린더': 'calendar',
  '내 예약 현황': 'clipboard',
  '기기/설비': 'settings',
  '관리자 문의': 'message',
  '프로필 설정': 'user',
  '예약 관리': 'clipboard',
  '문의 관리': 'message',
  '기기 관리': 'settings',
  '오늘 생산': 'factory',
  '전체 캘린더': 'calendar',
  '통계': 'chart',
  '휴무일 관리': 'calendarOff',
  '직원 관리': 'users',
  '고객사 관리': 'building',
  '생산 이력': 'factory',
};
