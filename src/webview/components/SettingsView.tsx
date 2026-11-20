import React from 'react';
import { RunlySettings } from '../../storage/SettingsStorage';
import { Settings } from 'lucide-react';
import { useTranslation } from '../i18n';

interface SettingsViewProps {
  settings: RunlySettings;
  onUpdateSetting: (key: keyof RunlySettings, value: any) => void;
  showNavigationPosition?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSetting,
  showNavigationPosition = true
}) => {
  const t = useTranslation();
  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={20} /> {t('Runly Settings')}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
          {t('Manage extension preferences, execution defaults, and security configurations.')}
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        <div>
          <label htmlFor="runly-language" style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: 13 }}>
            {t('Language')}
          </label>
          <select
            id="runly-language"
            className="input-field"
            value={settings.language}
            onChange={(e) => {
              const language = e.target.value;
              if (language === 'en' || language === 'zh-CN') {
                onUpdateSetting('language', language);
              }
            }}
          >
            <option value="en">English</option>
            <option value="zh-CN">中文（简体）</option>
          </select>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
            {t('Choose the display language for the Runly interface.')}
          </p>
        </div>
        {showNavigationPosition && <div>
          <label htmlFor="navigation-position" style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: 13 }}>
            {t('Navigation Position')}
          </label>
          <select
            id="navigation-position"
            className="input-field"
            value={settings.navigationPosition}
            onChange={(e) => {
              const position = e.target.value;
              if (position === 'top' || position === 'left') {
                onUpdateSetting('navigationPosition', position);
              }
            }}
          >
            <option value="top">{t('Top')}</option>
            <option value="left">{t('Left')}</option>
          </select>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
            {t('Place the navigation above the content or in a left sidebar.')}
          </p>
        </div>}

        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: 13 }}>
            {t('Default Shell')}
          </label>
          <input
            type="text"
            className="input-field"
            value={settings.defaultShell || ''}
            onChange={(e) => onUpdateSetting('defaultShell', e.target.value)}
            placeholder={t('e.g. powershell.exe, bash, zsh (leave blank for system default)')}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{t('Confirm Imported Workflows')}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {t('Show security review modal before running imported workflows with executable shell commands.')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.confirmImportedWorkflows}
            onChange={(e) => onUpdateSetting('confirmImportedWorkflows', e.target.checked)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{t('Desktop Notifications')}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {t('Display VS Code notification messages when a workflow completes or fails.')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.showNotifications}
            onChange={(e) => onUpdateSetting('showNotifications', e.target.checked)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{t('Store Workflows in Workspace')}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {t('Save workflows as `.runly/workflows/*.runly.json` inside the project folder for Git versioning.')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.useWorkspaceWorkflows}
            onChange={(e) => onUpdateSetting('useWorkspaceWorkflows', e.target.checked)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{t('Smart Framework Suggestions')}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {t('Auto-detect project dependencies and show recommended workflow templates on dashboard.')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.showTemplateSuggestions}
            onChange={(e) => onUpdateSetting('showTemplateSuggestions', e.target.checked)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: 13 }}>
            {t('Execution History Retain Limit')}
          </label>
          <input
            type="number"
            className="input-field"
            value={settings.executionHistoryLimit}
            onChange={(e) => onUpdateSetting('executionHistoryLimit', parseInt(e.target.value, 10) || 50)}
          />
        </div>
      </div>
    </div>
  );
};
