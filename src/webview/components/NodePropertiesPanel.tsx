import React from 'react';
import { WorkflowNode } from '../../models/Node';
import { Trash2, X } from 'lucide-react';
import { useTranslation } from '../i18n';

interface NodePropertiesPanelProps {
  node: WorkflowNode | null;
  onUpdateNode: (updatedNode: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  node,
  onUpdateNode,
  onDeleteNode,
  onClose
}) => {
  const t = useTranslation();
  if (!node) return null;

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode({
      ...node,
      config: {
        ...node.config,
        [key]: value
      }
    });
  };

  const handleLabelChange = (label: string) => {
    onUpdateNode({
      ...node,
      label
    });
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'start':
        return <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t('Workflow entry point node.')}</p>;

      case 'command':
        return (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Shell Command')}
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={node.config.command || ''}
                onChange={(e) => handleConfigChange('command', e.target.value)}
                placeholder="npm run dev"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Working Directory')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.workingDirectory || ''}
                onChange={(e) => handleConfigChange('workingDirectory', e.target.value)}
                placeholder="${workspaceFolder}"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('On Error Strategy')}
              </label>
              <select
                className="input-field"
                value={node.config.onError || 'stop'}
                onChange={(e) => handleConfigChange('onError', e.target.value)}
              >
                <option value="stop">{t('Stop Workflow')}</option>
                <option value="continue">{t('Continue Execution')}</option>
              </select>
            </div>
          </>
        );

      case 'terminal':
        return (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Terminal Name')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.name || ''}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                placeholder={t('React Dev Server')}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Command to Send')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.command || ''}
                onChange={(e) => handleConfigChange('command', e.target.value)}
                placeholder="npm start"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Working Directory')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.workingDirectory || ''}
                onChange={(e) => handleConfigChange('workingDirectory', e.target.value)}
                placeholder="${workspaceFolder}"
              />
            </div>
          </>
        );

      case 'file':
        return (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Action')}
              </label>
              <select
                className="input-field"
                value={node.config.action || 'open'}
                onChange={(e) => handleConfigChange('action', e.target.value)}
              >
                <option value="open">{t('Open File')}</option>
                <option value="reveal">{t('Reveal in Explorer')}</option>
                <option value="create">{t('Create File')}</option>
                <option value="save">{t('Save File / Workspace')}</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('File Path')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.path || ''}
                onChange={(e) => handleConfigChange('path', e.target.value)}
                placeholder="src/App.tsx"
              />
            </div>
            {node.config.action === 'create' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                  {t('File Content')}
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={node.config.content || ''}
                  onChange={(e) => handleConfigChange('content', e.target.value)}
                />
              </div>
            )}
          </>
        );

      case 'url':
        return (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
              {t('Browser URL')}
            </label>
            <input
              type="text"
              className="input-field"
              value={node.config.url || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              placeholder="http://localhost:5173"
            />
          </div>
        );

      case 'delay':
        return (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
              {t('Duration (milliseconds)')}
            </label>
            <input
              type="number"
              className="input-field"
              value={node.config.durationMs || 1000}
              onChange={(e) => handleConfigChange('durationMs', parseInt(e.target.value, 10) || 1000)}
            />
          </div>
        );

      case 'notification':
        return (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Notification Type')}
              </label>
              <select
                className="input-field"
                value={node.config.type || 'info'}
                onChange={(e) => handleConfigChange('type', e.target.value)}
              >
                <option value="info">{t('Info')}</option>
                <option value="success">{t('Success')}</option>
                <option value="warning">{t('Warning')}</option>
                <option value="error">{t('Error')}</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Message')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.message || ''}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                placeholder={t('Development server ready')}
              />
            </div>
          </>
        );

      case 'condition':
        return (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Condition Type')}
              </label>
              <select
                className="input-field"
                value={node.config.conditionType || 'previousSuccess'}
                onChange={(e) => handleConfigChange('conditionType', e.target.value)}
              >
                <option value="previousSuccess">{t('Previous Action Succeeded')}</option>
                <option value="previousFailed">{t('Previous Action Failed')}</option>
                <option value="exitCode">{t('Exit Code Equals')}</option>
                <option value="fileExists">{t('File Exists')}</option>
                <option value="folderExists">{t('Folder Exists')}</option>
                <option value="envExists">{t('Environment Variable Exists')}</option>
                <option value="os">{t('OS / Platform Equals')}</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                {t('Target Value / Path / Code')}
              </label>
              <input
                type="text"
                className="input-field"
                value={node.config.targetValue || ''}
                onChange={(e) => handleConfigChange('targetValue', e.target.value)}
                placeholder={t('Target value or path')}
              />
            </div>
          </>
        );

      case 'task':
        return (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
              {t('Task Name')}
            </label>
            <input
              type="text"
              className="input-field"
              value={node.config.taskName || ''}
              onChange={(e) => handleConfigChange('taskName', e.target.value)}
              placeholder="npm: test"
            />
          </div>
        );

      case 'vscodeCommand':
        return (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
              {t('VS Code Command ID')}
            </label>
            <input
              type="text"
              className="input-field"
              value={node.config.commandId || ''}
              onChange={(e) => handleConfigChange('commandId', e.target.value)}
              placeholder="workbench.action.files.saveAll"
            />
          </div>
        );

      case 'script':
        return (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
              {t('JavaScript Code')}
            </label>
            <textarea
              className="input-field"
              rows={6}
              value={node.config.code || ''}
              onChange={(e) => handleConfigChange('code', e.target.value)}
              placeholder="onLog('Custom script running');"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 320,
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>{t('Node Properties')}</span>
        <button className="btn-icon" onClick={onClose} aria-label={t('Close')}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
            {t('Node Label')}
          </label>
          <input
            type="text"
            className="input-field"
            value={node.label || ''}
            onChange={(e) => handleLabelChange(e.target.value)}
          />
        </div>

        {renderConfigFields()}
      </div>

      {node.type !== 'start' && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-danger"
            style={{ width: '100%' }}
            onClick={() => onDeleteNode(node.id)}
          >
            <Trash2 size={14} /> {t('Delete Node')}
          </button>
        </div>
      )}
    </div>
  );
};
