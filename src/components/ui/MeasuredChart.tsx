import React, { useEffect, useRef, useState } from 'react';

interface ChartSize {
  width: number;
  height: number;
}

interface MeasuredChartProps {
  className: string;
  children: (size: ChartSize) => React.ReactNode;
}

// Keep the caller's layout box even while hidden; mount charts only with real
// content-box dimensions, not ResponsiveContainer's initial -1 sentinel.
export function MeasuredChart({ className, children }: MeasuredChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    const observer = new ResizeObserver(entries => {
      if (!active) return;
      const entry = entries.find(item => item.target === container);
      if (!entry) return;

      const { width, height } = entry.contentRect;
      const positive = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
      setSize(previous => {
        if (!positive) return null;
        return previous?.width === width && previous.height === height ? previous : { width, height };
      });
    });
    observer.observe(container);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {size ? children(size) : null}
    </div>
  );
}
