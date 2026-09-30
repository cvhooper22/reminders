import { tagOrder } from '../theme/tokens';
import type { TagColor } from '../types';

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** Stable little rotation, -2.2° … +2.2°, so labels look hand-stuck. */
export const tiltFor = (id: string): number => ((hash(id) % 45) - 22) / 10;

export const colorFor = (id: string): TagColor => tagOrder[hash(id) % tagOrder.length];

/** Replace letters with same-length filler for locked labels. */
export const maskText = (text: string): string => text.replace(/[A-Za-z0-9]/g, 'x');
