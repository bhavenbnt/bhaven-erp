export const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', CONFIRMED: '예약 확정', IN_PROGRESS: '생산 중', COMPLETED: '완료', CANCELLED: '취소',
};

export const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:     { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  IN_PROGRESS: { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  CONFIRMED:   { color: '#555555', bg: '#F5F5F5', border: '#EBEBEB' },
  COMPLETED:   { color: '#888888', bg: '#F8F8F8', border: '#EEEEEE' },
  CANCELLED:   { color: '#AAAAAA', bg: '#FAFAFA', border: '#F0F0F0' },
};

export const TYPE_LABEL: Record<string, string> = { small: '소형', medium: '중형', large: '대형' };

export const EQUIP_STATUS_LABEL: Record<string, string> = { NORMAL: '정상', MAINTENANCE: '점검중', BROKEN: '고장' };
export const EQUIP_STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  NORMAL:      { color: '#0A0A0A', bg: '#F0F0F0', border: '#E0E0E0' },
  MAINTENANCE: { color: '#B11F39', bg: '#FDF2F4', border: '#F5D0D6' },
  BROKEN:      { color: '#AAA', bg: '#FAFAFA', border: '#F0F0F0' },
};
