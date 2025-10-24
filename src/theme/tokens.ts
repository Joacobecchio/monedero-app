// src/theme/tokens.ts
export type Palette = {
  // Base
  background: string;   // 👈 la que te falta
  text: string;
  card: string;
  border: string;

  // Acciones
  primary: string;
  onPrimary: string;    // texto sobre primary
  muted: string;

  // Estados
  danger: string;
  success: string;
  onDanger?: string;   // opcional, no siempre se usa
};

export const LIGHT: Palette = {
  background: '#FFFFFF',
  text: '#111111',
  card: '#F5F5F7',
  border: '#E5E7EB',

  primary: '#8B86FF',
  onPrimary: '#111111',
  muted: '#9CA3AF',

  danger: '#EF4444',
  success: '#10B981',
};

export const DARK: Palette = {
  background: '#0B0B0D',
  text: '#EAEAEA',
  card: '#17171A',
  border: '#2A2A2E',

  primary: '#8B86FF',
  onPrimary: '#0B0B0D',
  muted: '#9CA3AF',

  danger: '#F87171',
  success: '#34D399',
};
