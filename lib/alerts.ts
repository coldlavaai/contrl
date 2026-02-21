// Alerts & Notifications — Contrl SPC

export type AlertType = 'ooc' | 'signal' | 'capability' | 'system';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  chartId: string;
  chartName: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged: boolean;
}

export interface EmailAlertSettings {
  enabled: boolean;
  email: string;
  frequency: 'realtime' | 'daily' | 'weekly';
}

const ALERTS_KEY = 'contrl_alerts';
const EMAIL_SETTINGS_KEY = 'contrl_email_alert_settings';

// ─── Alert CRUD ──────────────────────────────────────────────────────────────

export function getAlerts(): Alert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: Alert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Alert {
  const alerts = getAlerts();
  const newAlert: Alert = {
    ...alert,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };
  // Newest first, max 200 alerts
  alerts.unshift(newAlert);
  if (alerts.length > 200) alerts.length = 200;
  saveAlerts(alerts);
  return newAlert;
}

export function acknowledgeAlert(id: string): void {
  const alerts = getAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    alerts[idx].acknowledged = true;
    saveAlerts(alerts);
  }
}

export function acknowledgeAllAlerts(): void {
  const alerts = getAlerts().map((a) => ({ ...a, acknowledged: true }));
  saveAlerts(alerts);
}

export function clearAllAlerts(): void {
  saveAlerts([]);
}

export function deleteAlert(id: string): void {
  const alerts = getAlerts().filter((a) => a.id !== id);
  saveAlerts(alerts);
}

export function getUnacknowledgedCount(): number {
  return getAlerts().filter((a) => !a.acknowledged).length;
}

// ─── Email Alert Settings ────────────────────────────────────────────────────

export function getEmailAlertSettings(): EmailAlertSettings {
  if (typeof window === 'undefined') return { enabled: false, email: '', frequency: 'daily' };
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, email: '', frequency: 'daily' };
  } catch {
    return { enabled: false, email: '', frequency: 'daily' };
  }
}

export function saveEmailAlertSettings(settings: EmailAlertSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Alert Type Helpers ──────────────────────────────────────────────────────

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  ooc: 'Out of Control',
  signal: 'Signal Detected',
  capability: 'Capability Warning',
  system: 'System',
};

export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  ooc: '🔴',
  signal: '⚠️',
  capability: '📉',
  system: 'ℹ️',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

// ─── Generate alerts from chart data ─────────────────────────────────────────

export function generateChartAlerts(
  chartId: string,
  chartName: string,
  signals: { type: string; message: string }[]
): Alert[] {
  const created: Alert[] = [];
  for (const signal of signals) {
    const severity: AlertSeverity = signal.type === 'ooc' ? 'critical' : 'warning';
    const alert = createAlert({
      chartId,
      chartName,
      type: signal.type as AlertType,
      message: signal.message,
      severity,
    });
    created.push(alert);
  }
  return created;
}
