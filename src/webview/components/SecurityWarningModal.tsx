import React from 'react';
import { Workflow } from '../../models/Workflow';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../i18n';

interface SecurityWarningModalProps {
  workflow: Workflow | null;
  onCancel: () => void;
  onReview: () => void;
  onTrustAndRun: () => void;
}

export const SecurityWarningModal: React.FC<SecurityWarningModalProps> = ({
  workflow,
  onCancel,
  onReview,
  onTrustAndRun
}) => {
  const t = useTranslation();
  if (!workflow) return null;

  const commandNodes = workflow.nodes.filter(
    (n) => n.type === 'command' || n.type === 'terminal' || n.type === 'script'
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d29922' }}>
            <AlertTriangle size={18} />
            <span>{t('Security Warning: Executable Commands')}</span>
          </div>
          <button className="btn-icon" onClick={onCancel} aria-label={t('Close')}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: 12 }}>
            {t('This imported workflow contains executable shell commands. Please inspect the commands before running them on your system.')}
          </p>

          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 12,
              fontFamily: 'monospace',
              marginBottom: 14
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 6 }}>
              {t('FOUND COMMANDS ({count}):', { count: commandNodes.length })}
            </div>
            {commandNodes.map((n) => (
              <div key={n.id} style={{ marginBottom: 4 }}>
                • <strong>{n.label}</strong>: {n.config?.command || t('Terminal / Script')}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {t('Cancel')}
          </button>
          <button className="btn btn-secondary" onClick={onReview}>
            {t('Review Workflow')}
          </button>
          <button className="btn btn-primary" onClick={onTrustAndRun}>
            {t('Trust & Run')}
          </button>
        </div>
      </div>
    </div>
  );
};
