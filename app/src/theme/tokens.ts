import type { TagColor } from '../types';

export type TagStyle = { bg: string; fg: string };

export type Palette = {
  wood: string;
  grain: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  paper: string;
  paperEdge: string;
  drawer: string;
  drawerInk: string;
  drawerSoft: string;
  tape: string;
  tapeInk: string;
  accent: string;
  accentInk: string;
  brass: [string, string, string];
  steel: [string, string, string];
  stage: string;
  frame: string;
  tags: Record<TagColor, TagStyle>;
};

export const lightPalette: Palette = {
  wood: '#E2D3B1',
  grain: 'rgba(120, 90, 50, 0.07)',
  ink: '#241C14',
  inkSoft: '#6B5D4A',
  inkFaint: '#9A8B72',
  paper: '#F6EFE2',
  paperEdge: '#E4D9C3',
  drawer: '#35493B',
  drawerInk: '#EDE6D3',
  drawerSoft: '#A9B8A6',
  tape: '#1C1C1C',
  tapeInk: '#F4EFE4',
  accent: '#C0453A',
  accentInk: '#FFF4EC',
  brass: ['#EBCB80', '#C29A4A', '#8E6A2A'],
  steel: ['#E4E7EA', '#A9AEB3', '#767C82'],
  stage: '#E0DDD6',
  frame: '#151210',
  tags: {
    blue: { bg: '#3552A8', fg: '#F4EFE4' },
    yellow: { bg: '#DCAB42', fg: '#241C14' },
    black: { bg: '#1E1E1E', fg: '#F4EFE4' },
    red: { bg: '#C0453A', fg: '#FFF4EC' },
    green: { bg: '#4A7C59', fg: '#F4EFE4' },
  },
};

export const nightPalette: Palette = {
  wood: '#2B2118',
  grain: 'rgba(255, 220, 160, 0.045)',
  ink: '#F1E7D2',
  inkSoft: '#B9A98D',
  inkFaint: '#85775F',
  paper: '#3A2E22',
  paperEdge: '#4A3B2C',
  drawer: '#16211A',
  drawerInk: '#E8E0CC',
  drawerSoft: '#7E927F',
  tape: '#0E0E0E',
  tapeInk: '#EFE7D6',
  accent: '#D0584C',
  accentInk: '#FFF4EC',
  brass: ['#D9B466', '#A98038', '#6F5220'],
  steel: ['#8C9298', '#5F6469', '#3E4246'],
  stage: '#15120F',
  frame: '#050403',
  tags: {
    blue: { bg: '#4462C0', fg: '#F4EFE4' },
    yellow: { bg: '#C9982F', fg: '#1C150C' },
    black: { bg: '#050505', fg: '#EFE7D6' },
    red: { bg: '#B23C32', fg: '#FFF4EC' },
    green: { bg: '#3F6E4D', fg: '#EFE7D6' },
  },
};

// Font family names match the keys registered by useFonts (see src/theme/fonts.ts).
export const fonts = {
  display: 'Fraunces_700Bold',
  displayMedium: 'Fraunces_500Medium',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
  meta: 'SpaceGrotesk_500Medium',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 16, lg: 24, xl: 30, pill: 999 } as const;

export const tagOrder: TagColor[] = ['blue', 'yellow', 'black', 'red', 'green'];
