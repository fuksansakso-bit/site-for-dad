import type { ReactNode } from 'react';

export function AdminPageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function AdminSectionHeader({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="admin-section-header">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function AdminMetric({
  label,
  note,
  tone = 'neutral',
  value,
}: {
  label: string;
  note?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  value: ReactNode;
}) {
  return (
    <article className={`admin-metric admin-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

export function AdminEmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="admin-empty-state">
      <span aria-hidden="true">—</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
