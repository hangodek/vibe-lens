import type { NodeType } from '../types/ast';

export const LINEAR_THEME = {
  canvas: '#010102',
  surface1: '#08090a',
  surface2: '#121316',
  surface3: '#1c1d22',
  surface4: '#262830',
  hairline: '#23252a',
  hairlineStrong: '#343842',
  hairlineTertiary: '#1a1b1f',
  primary: '#5e6ad2',
  primaryHover: '#828fff',
  primaryFocus: '#5e69d1',
  ink: '#f7f8f8',
  inkMuted: '#d0d6e0',
  inkSubtle: '#8a8f98',
  inkTertiary: '#62666d',
  success: '#27a644',
  warning: '#f59e0b',
  error: '#ef4444',
};

export const NODE_TYPE_STYLES: Record<
  NodeType,
  {
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    iconColor: string;
    title: string;
  }
> = {
  page: {
    bg: '#121316',
    border: '#5e6ad2',
    badgeBg: 'rgba(94, 106, 210, 0.15)',
    badgeText: '#828fff',
    iconColor: '#828fff',
    title: 'Page / Route',
  },
  layout: {
    bg: '#0e1014',
    border: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeText: '#60a5fa',
    iconColor: '#60a5fa',
    title: 'Layout Shell',
  },
  component: {
    bg: '#0d0e11',
    border: '#2a2e39',
    badgeBg: 'rgba(255, 255, 255, 0.05)',
    badgeText: '#d0d6e0',
    iconColor: '#94a3b8',
    title: 'UI Component',
  },
  hook: {
    bg: '#0f1412',
    border: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeText: '#34d399',
    iconColor: '#34d399',
    title: 'Custom Hook',
  },
  context: {
    bg: '#161118',
    border: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeText: '#c084fc',
    iconColor: '#c084fc',
    title: 'State Context',
  },
  store: {
    bg: '#17140e',
    border: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#fbbf24',
    iconColor: '#fbbf24',
    title: 'Global Store',
  },
  api: {
    bg: '#190e11',
    border: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeText: '#fb7185',
    iconColor: '#fb7185',
    title: 'API Route / Endpoint',
  },
};

export const EDGE_TYPE_STYLES = {
  render: {
    stroke: '#3b4252',
    activeStroke: '#5e6ad2',
    strokeDasharray: 'none',
  },
  data: {
    stroke: '#10b981',
    activeStroke: '#34d399',
    strokeDasharray: '4 4',
  },
  api: {
    stroke: '#f43f5e',
    activeStroke: '#fb7185',
    strokeDasharray: '6 3',
  },
  event: {
    stroke: '#f59e0b',
    activeStroke: '#fbbf24',
    strokeDasharray: '2 2',
  },
};
