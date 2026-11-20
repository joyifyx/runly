import * as vscode from 'vscode';
import { WorkflowStorage } from '../storage/WorkflowStorage';
import { HistoryStorage } from '../storage/HistoryStorage';
import { Workflow } from '../models/Workflow';
import { BUILTIN_TEMPLATES } from '../templates/templates';
import { RUNLY_VIEWS } from '../models/Navigation';
import { Language, translate } from '../webview/translations';

export type TreeItemType = 'category' | 'workflow' | 'template' | 'history' | 'navigation';

export class RunlyTreeItem extends vscode.TreeItem {
  public executionId?: string;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: TreeItemType,
    public readonly workflow?: Workflow,
    public readonly categoryKey?: string,
    language: Language = 'en'
  ) {
    super(label, collapsibleState);
    this.contextValue = itemType;

    if (itemType === 'workflow' && workflow) {
      this.description = translate(language, '{count} steps', { count: workflow.nodes?.length || 0 });
      this.tooltip = `${workflow.name}\n${workflow.description || ''}\n${workflow.framework || 'generic'}`;
      this.iconPath = workflow.isFavorite
        ? new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'))
        : new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('charts.blue'));
      this.command = {
        command: 'runly.openWorkflowItem',
        title: translate(language, 'Edit Workflow'),
        arguments: [workflow.id]
      };
    } else if (itemType === 'template' && workflow) {
      this.description = workflow.framework;
      this.tooltip = `${workflow.name}\n${workflow.description || ''}`;
      this.iconPath = new vscode.ThemeIcon('sparkle', new vscode.ThemeColor('charts.green'));
    } else if (itemType === 'category') {
      if (categoryKey === 'favorites') {
        this.iconPath = new vscode.ThemeIcon('star');
      } else if (categoryKey === 'recent') {
        this.iconPath = new vscode.ThemeIcon('history');
      } else if (categoryKey === 'templates') {
        this.iconPath = new vscode.ThemeIcon('extensions');
      } else {
        this.iconPath = new vscode.ThemeIcon('folder');
      }
    }
  }
}

export class RunlySidebarProvider implements vscode.TreeDataProvider<RunlyTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RunlyTreeItem | undefined | void> =
    new vscode.EventEmitter<RunlyTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<RunlyTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private readonly workflowStorage: WorkflowStorage,
    private readonly historyStorage: HistoryStorage
  ) {}

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: RunlyTreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: RunlyTreeItem): Promise<RunlyTreeItem[]> {
    if (element && element.itemType !== 'category') return [];
    const language = vscode.workspace.getConfiguration('runly').get<Language>('language', 'en');
    const allWorkflows = await this.workflowStorage.loadAllWorkflows();
    const history = await this.historyStorage.getHistory();

    if (!element) {
      // Root categories
      const items: RunlyTreeItem[] = RUNLY_VIEWS.map((view) => {
        const label = translate(language, view.label);
        const item = new RunlyTreeItem(label, vscode.TreeItemCollapsibleState.None, 'navigation');
        item.iconPath = new vscode.ThemeIcon(view.icon);
        item.command = { command: view.command, title: label };
        return item;
      });

      const favorites = allWorkflows.filter((w) => w.isFavorite);
      if (favorites.length > 0) {
        items.push(
          new RunlyTreeItem(
            translate(language, 'Favorites ({count})', { count: favorites.length }),
            vscode.TreeItemCollapsibleState.Expanded,
            'category',
            undefined,
            'favorites'
          )
        );
      }

      const recentRuns = new RunlyTreeItem(
        translate(language, 'Recent Runs ({count})', { count: Math.min(history.length, 5) }),
        vscode.TreeItemCollapsibleState.Collapsed,
        'category',
        undefined,
        'recent'
      );
      recentRuns.id = 'runly.category.recent';
      items.push(recentRuns);

      const workflows = new RunlyTreeItem(
        translate(language, 'All Workflows ({count})', { count: allWorkflows.length }),
        vscode.TreeItemCollapsibleState.Collapsed,
        'category',
        undefined,
        'workflows'
      );
      workflows.id = 'runly.category.workflows';
      items.push(workflows);

      items.push(
        new RunlyTreeItem(
          translate(language, 'Templates ({count})', { count: BUILTIN_TEMPLATES.length }),
          vscode.TreeItemCollapsibleState.Collapsed,
          'category',
          undefined,
          'templates'
        )
      );

      return items;
    }

    if (element.itemType === 'category') {
      if (element.categoryKey === 'favorites') {
        const favs = allWorkflows.filter((w) => w.isFavorite);
        return favs.map(
          (w) => new RunlyTreeItem(w.name, vscode.TreeItemCollapsibleState.None, 'workflow', w, undefined, language)
        );
      }

      if (element.categoryKey === 'recent') {
        const recentRuns = history.slice(0, 5);
        return recentRuns.map((r) => {
          const matchedWf = allWorkflows.find((w) => w.id === r.workflowId);
          const item = new RunlyTreeItem(
            `${r.workflowName} (${r.status})`,
            vscode.TreeItemCollapsibleState.None,
            'workflow',
            matchedWf || {
              version: 1,
              id: r.workflowId,
              name: r.workflowName,
              nodes: [],
              edges: []
            },
            undefined,
            language
          );
          item.contextValue = 'history';
          item.executionId = r.id;
          item.description = `${(r.durationMs / 1000).toFixed(1)}s`;
          item.iconPath =
            r.status === 'SUCCESS'
              ? new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'))
              : new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
          return item;
        });
      }

      if (element.categoryKey === 'workflows') {
        return allWorkflows.map(
          (w) => new RunlyTreeItem(w.name, vscode.TreeItemCollapsibleState.None, 'workflow', w, undefined, language)
        );
      }

      if (element.categoryKey === 'templates') {
        return BUILTIN_TEMPLATES.map(
          (t) => new RunlyTreeItem(t.name, vscode.TreeItemCollapsibleState.None, 'template', t, undefined, language)
        );
      }
    }

    return [];
  }
}
