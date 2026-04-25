import { useState, useCallback, useRef } from 'react';

export function useDrag() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    start.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: ev.clientX - start.current.x, y: ev.clientY - start.current.y });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  const reset = useCallback(() => setPos({ x: 0, y: 0 }), []);

  const modalStyle = { transform: `translate(${pos.x}px, ${pos.y}px)` };
  const handleStyle = { cursor: 'grab' } as const;

  return { onMouseDown, modalStyle, handleStyle, reset };
}
