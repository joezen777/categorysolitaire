import { createContext, useContext, useLayoutEffect, useState, type RefObject } from 'react';

export interface BoardMetrics {
  cardW: number;
  cardH: number;
  gap: number;
  /** Vertical offset between stacked face-down cards. */
  downOffset: number;
  /** Vertical offset between stacked face-up cards (leaves the label strip visible). */
  upOffset: number;
  labelFont: number;
  faceFont: number;
}

const COLUMNS = 5;

export function computeMetrics(width: number): BoardMetrics {
  const gap = width < 520 ? 6 : 12;
  const cardW = Math.max(54, Math.min(120, Math.floor((width - gap * (COLUMNS - 1)) / COLUMNS)));
  const cardH = Math.round(cardW * 1.4);
  const labelFont = cardW < 72 ? 10.5 : cardW < 96 ? 11.5 : 13;
  return {
    cardW,
    cardH,
    gap,
    downOffset: Math.max(8, Math.round(cardH * 0.1)),
    upOffset: Math.round(labelFont * 1.25 + 10),
    labelFont,
    faceFont: Math.max(12, Math.min(18, Math.round(cardW * 0.17))),
  };
}

export const MetricsContext = createContext<BoardMetrics>(computeMetrics(360));

export const useMetrics = () => useContext(MetricsContext);

/** Tracks the inner width of the board element and derives card metrics from it. */
export function useBoardMetrics(ref: RefObject<HTMLElement | null>): BoardMetrics {
  const [metrics, setMetrics] = useState(() => computeMetrics(360));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = computeMetrics(el.clientWidth);
      setMetrics((prev) => (prev.cardW === next.cardW && prev.gap === next.gap ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return metrics;
}

export function stackOffsets(faceUp: readonly boolean[], m: BoardMetrics): number[] {
  const tops: number[] = [];
  let top = 0;
  faceUp.forEach((up, i) => {
    tops.push(top);
    if (i < faceUp.length - 1) top += up ? m.upOffset : m.downOffset;
  });
  return tops;
}
