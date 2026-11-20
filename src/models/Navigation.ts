export const RUNLY_VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', command: 'runly.open' },
  { id: 'canvas', label: 'Builder Canvas', icon: 'type-hierarchy', command: 'runly.builder' },
  { id: 'monitor', label: 'Execution Monitor', icon: 'terminal', command: 'runly.monitor' },
  { id: 'history', label: 'History', icon: 'history', command: 'runly.history' },
  { id: 'settings', label: 'Settings', icon: 'settings-gear', command: 'runly.settings' }
] as const;

export type RunlyView = typeof RUNLY_VIEWS[number]['id'];

export function isRunlyView(value: unknown): value is RunlyView {
  return RUNLY_VIEWS.some((view) => view.id === value);
}
