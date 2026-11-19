import React from 'react';
import {
  Play, CalendarClock, Webhook, Terminal, SquareTerminal, FileText,
  Globe, CheckSquare, Clock, Bell, GitBranch, Code, Code2,
  Filter, Repeat, ListTree, RotateCcw, Sparkles, Braces, Bot, X,
  Variable, Mail, Database
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActionType } from '../../models/Node';
import type { MessageKey } from '../translations';
import { useTranslation } from '../i18n';

interface LibraryEntry {
  label: MessageKey;
  icon: LucideIcon;
  type?: ActionType;
}

const groups: { label: MessageKey; entries: LibraryEntry[] }[] = [
  {
    label: 'Triggers',
    entries: [
      { label: 'Manual Trigger', icon: Play, type: 'start' },
      { label: 'Cron Trigger', icon: CalendarClock },
      { label: 'Webhook Trigger', icon: Webhook }
    ]
  },
  {
    label: 'Actions',
    entries: [
      { label: 'Command', icon: Terminal, type: 'command' },
      { label: 'Terminal', icon: SquareTerminal, type: 'terminal' },
      { label: 'File', icon: FileText, type: 'file' },
      { label: 'URL', icon: Globe, type: 'url' },
      { label: 'Task', icon: CheckSquare, type: 'task' },
      { label: 'VS Code Command', icon: Code2, type: 'vscodeCommand' },
      { label: 'Delay', icon: Clock, type: 'delay' },
      { label: 'Condition', icon: GitBranch, type: 'condition' },
      { label: 'Notification', icon: Bell, type: 'notification' },
      { label: 'Script', icon: Code, type: 'script' },
      { label: 'Set Variable', icon: Variable },
      { label: 'Send Email', icon: Mail },
      { label: 'Database Query', icon: Database }
    ]
  },
  {
    label: 'Iteration & conditionals',
    entries: [
      { label: 'Filter', icon: Filter },
      { label: 'ForEach', icon: Repeat },
      { label: 'If Condition', icon: GitBranch, type: 'condition' },
      { label: 'Switch', icon: ListTree },
      { label: 'Until', icon: RotateCcw }
    ]
  },
  {
    label: 'Artificial Intelligence',
    entries: [
      { label: 'AI Prompt', icon: Sparkles },
      { label: 'AI Structured Output', icon: Braces },
      { label: 'AI Agent', icon: Bot }
    ]
  }
];

interface NodeLibraryProps {
  onAddNode: (type: ActionType) => void;
  onClose: () => void;
}

export const NodeLibrary: React.FC<NodeLibraryProps> = ({ onAddNode, onClose }) => {
  const t = useTranslation();

  return (
    <aside id="node-library" className="node-library" aria-label={t('Node library')}>
      <div className="node-library-header">
        <strong>{t('Node library')}</strong>
        <button className="btn-icon" onClick={onClose} aria-label={t('Close node library')}>
          <X size={14} />
        </button>
      </div>
      <div className="node-library-groups">
        {groups.map((group) => (
          <details key={group.label} className="node-library-group" open>
            <summary>{t(group.label)}</summary>
            <div className="node-library-entries">
              {group.entries.map(({ label, icon: Icon, type }) => (
                <button
                  key={label}
                  className="node-library-entry"
                  disabled={!type}
                  title={type ? t('Add {node} node', { node: t(label) }) : t('Coming soon')}
                  onClick={() => { if (type) onAddNode(type); }}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span className="node-library-label">{t(label)}</span>
                  {!type && <span className="node-library-status">{t('Coming soon')}</span>}
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </aside>
  );
};
