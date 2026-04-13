'use client';
import { useState, useRef, useEffect } from 'react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate: string;
  maxDate: string;
  align?: 'left' | 'right';
}

export default function DatePicker({ value, onChange, minDate, maxDate, align = 'left' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const toStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const min = new Date(minDate + 'T00:00:00');
  const max = new Date(maxDate + 'T00:00:00');

  const isDisabled = (d: number) => {
    const dt = new Date(year, month, d);
    return dt < min || dt > max;
  };

  const isSelected = (d: number) => toStr(d) === value;
  const isToday = (d: number) => {
    const t = new Date();
    return d === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  };

  const canPrev = new Date(year, month - 1, 1) >= new Date(min.getFullYear(), min.getMonth(), 1);
  const canNext = new Date(year, month + 1, 1) <= new Date(max.getFullYear(), max.getMonth(), 1);

  const displayLabel = value
    ? (() => {
        const d = new Date(value + 'T00:00:00');
        return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
      })()
    : '날짜 선택';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={s.trigger} onClick={() => setOpen(v => !v)} type="button">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={value ? '#0A0A0A' : '#BBB'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        </svg>
        <span style={{ color: value ? '#0A0A0A' : '#BBB' }}>{displayLabel}</span>
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth={2.5} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{ ...s.dropdown, ...(align === 'right' ? { left: 'auto', right: 0 } : {}) }}>
          {/* 헤더 */}
          <div style={s.header}>
            <button style={{ ...s.navBtn, opacity: canPrev ? 1 : 0.2 }} disabled={!canPrev}
              onClick={() => canPrev && setViewDate(new Date(year, month - 1, 1))} type="button">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span style={s.monthLabel}>{year}년 {month + 1}월</span>
            <button style={{ ...s.navBtn, opacity: canNext ? 1 : 0.2 }} disabled={!canNext}
              onClick={() => canNext && setViewDate(new Date(year, month + 1, 1))} type="button">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {/* 요일 */}
          <div style={s.dayRow}>
            {DAYS.map((d, i) => (
              <span key={d} style={{ ...s.dayName, color: i === 0 ? '#B11F39' : i === 6 ? '#888' : '#BBB' }}>{d}</span>
            ))}
          </div>

          {/* 날짜 */}
          {weeks.map((week, wi) => (
            <div key={wi} style={s.weekRow}>
              {Array(7).fill(null).map((_, di) => {
                const day = week[di] ?? null;
                if (day === null) return <span key={di} style={s.emptyCell} />;
                const disabled = isDisabled(day);
                const selected = isSelected(day);
                const today = isToday(day);
                return (
                  <button
                    key={di}
                    type="button"
                    style={{
                      ...s.dateCell,
                      ...(selected ? s.dateCellSelected : {}),
                      ...(today && !selected ? s.dateCellToday : {}),
                      ...(disabled ? s.dateCellDisabled : {}),
                      color: selected ? '#fff' : disabled ? '#DDD' : di === 0 ? '#B11F39' : '#333',
                    }}
                    disabled={disabled}
                    onClick={() => { onChange(toStr(day)); setOpen(false); }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  trigger: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '0 12px', height: 38, border: '1px solid #EEEEEE', borderRadius: 8,
    background: '#FAFAFA', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    textAlign: 'left',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
    width: 280, background: '#fff', borderRadius: 10,
    border: '1px solid #EEEEEE', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    zIndex: 100, padding: '12px 14px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthLabel: { fontSize: 13, fontWeight: 700, color: '#0A0A0A' },
  navBtn: {
    width: 26, height: 26, border: '1px solid #EEEEEE', background: '#fff',
    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#666',
  },
  dayRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 },
  dayName: { textAlign: 'center', fontSize: 10, fontWeight: 600, padding: '4px 0' },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  emptyCell: { width: 36, height: 32 },
  dateCell: {
    width: '100%', height: 32, border: 'none', background: 'transparent',
    borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dateCellSelected: { background: '#0A0A0A', color: '#fff', fontWeight: 700 },
  dateCellToday: { border: '1px solid #B11F39' },
  dateCellDisabled: { cursor: 'default', opacity: 0.3 },
};
