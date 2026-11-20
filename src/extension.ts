import * as vscode from 'vscode';
import { WorkflowStorage } from './storage/WorkflowStorage';
import { HistoryStorage } from './storage/HistoryStorage';
import { SettingsStorage } from './storage/SettingsStorage';
import { WorkflowEngine } from './engine/WorkflowEngine';
import { RunlyWebviewPanel } from './commands/openRunly';
import { newWorkflowCommand } from './commands/newWorkflow';
import { runWorkflowCommand } from './commands/runWorkflow';
import { stopWorkflowCommand } from './commands/stopWorkflow';
import { importWorkflowCommand } from './commands/importWorkflow';
import { exportWorkflowCommand } from './commands/exportWorkflow';
import { manageWorkflowsCommand } from './commands/manageWorkflows';
import { RunlySidebarProvider, RunlyTreeItem } from './views/RunlySidebarProvider';
import { Workflow } from './models/Workflow';
import { RUNLY_VIEWS } from './models/Navigation';
import { Language, translate } from './webview/translations';

export function activate(context: vscode.ExtensionContext) {
  console.log('Runly extension activated.');

  const workflowStorage = new WorkflowStorage(context);
  const historyStorage = new HistoryStorage(context);
  const settingsStorage = new SettingsStorage();
  const workflowEngine = new WorkflowEngine(historyStorage);

  // Initialize Activity Bar Sidebar TreeView Provider
  const sidebarProvider = new RunlySidebarProvider(workflowStorage, historyStorage);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('runly.sidebarView', sidebarProvider)
  );
  const openView = (view: typeof RUNLY_VIEWS[number]['id']) => {
    RunlyWebviewPanel.createOrShow(
      context.extensionUri, workflowStorage, historyStorage, settingsStorage, workflowEngine, view
    );
  };
  for (const view of RUNLY_VIEWS) {
    context.subscriptions.push(vscode.commands.registerCommand(view.command, () => openView(view.id)));
  }
  context.subscriptions.push(
    RunlyWebviewPanel.onDidChangeData(() => sidebarProvider.refresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('runly')) {
        sidebarProvider.refresh();
        RunlyWebviewPanel.currentPanel?.postMessage('settingsLoaded', settingsStorage.getSettings());
      }
    })
  );
  const watcher = vscode.workspace.createFileSystemWatcher('**/.runly/workflows/*.runly.json');
  const refreshWorkflows = async () => {
    sidebarProvider.refresh();
    RunlyWebviewPanel.currentPanel?.postMessage('workflowsLoaded', await workflowStorage.loadAllWorkflows());
  };
  context.subscriptions.push(
    watcher,
    watcher.onDidCreate(refreshWorkflows),
    watcher.onDidChange(refreshWorkflows),
    watcher.onDidDelete(refreshWorkflows)
  );

  // Status Bar Item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'runly.open';
  statusBarItem.text = '$(play-circle) Runly';
  statusBarItem.tooltip = 'Open Runly Visual Workflow Builder';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('runly.refreshSidebar', () => {
      return refreshWorkflows();
    }),

    vscode.commands.registerCommand('runly.openWorkflowItem', async (selection?: string | RunlyTreeItem) => {
      const id = typeof selection === 'string' ? selection : selection?.workflow?.id;
      const workflow = id ? await workflowStorage.getWorkflow(id) : undefined;
      if (!workflow) {
        const language = vscode.workspace.getConfiguration('runly').get<Language>('language', 'en');
        vscode.window.showErrorMessage(translate(language, 'Runly: No workflow was selected or it no longer exists.'));
        return;
      }
      RunlyWebviewPanel.openWorkflow(
        context.extensionUri,
        workflowStorage,
        historyStorage,
        settingsStorage,
        workflowEngine,
        workflow
      );
    }),

    vscode.commands.registerCommand('runly.runWorkflowItem', async (item: RunlyTreeItem) => {
      if (item && item.workflow) {
        vscode.window.showInformationMessage(`Running "${item.workflow.name}"...`);
        const record = await workflowEngine.runWorkflow(item.workflow, {}, (execution) => {
          RunlyWebviewPanel.currentPanel?.postMessage('executionProgress', execution.toRecord());
        });
        RunlyWebviewPanel.currentPanel?.postMessage('executionFinished', record);
        RunlyWebviewPanel.currentPanel?.postMessage('historyLoaded', await historyStorage.getHistory());
        sidebarProvider.refresh();
        if (record.status === 'SUCCESS') {
          vscode.window.showInformationMessage(`Workflow "${item.workflow.name}" completed successfully.`);
        } else {
          vscode.window.showErrorMessage(`Workflow "${item.workflow.name}" failed.`);
        }
      }
    }),

    vscode.commands.registerCommand('runly.deleteWorkflowItem', async (item: RunlyTreeItem) => {
      if (item && item.workflow) {
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete "${item.workflow.name}"?`,
          { modal: true },
          'Delete'
        );
        if (confirm === 'Delete') {
          await workflowStorage.deleteWorkflow(item.workflow.id);
          await refreshWorkflows();
          vscode.window.showInformationMessage(`Deleted "${item.workflow.name}".`);
        }
      }
    }),

    vscode.commands.registerCommand('runly.deleteHistoryItem', async (item: RunlyTreeItem) => {
      const language = vscode.workspace.getConfiguration('runly').get<Language>('language', 'en');
      if (!item?.executionId) {
        vscode.window.showErrorMessage(translate(language, 'Runly: No execution record was selected.'));
        return;
      }
      const deleteLabel = translate(language, 'Delete Run');
      const confirm = await vscode.window.showWarningMessage(
        translate(language, 'Delete this run from history? The workflow will not be deleted.'),
        { modal: true },
        deleteLabel
      );
      if (confirm !== deleteLabel) return;

      const deleted = await historyStorage.deleteExecutionRecord(item.executionId);
      sidebarProvider.refresh();
      RunlyWebviewPanel.currentPanel?.postMessage('historyLoaded', await historyStorage.getHistory());
      if (deleted) {
        vscode.window.showInformationMessage(translate(language, 'Run deleted from history.'));
      } else {
        vscode.window.showWarningMessage(translate(language, 'Runly: This execution record no longer exists.'));
      }
    }),

    vscode.commands.registerCommand('runly.duplicateWorkflowItem', async (item: RunlyTreeItem) => {
      if (item && item.workflow) {
        await workflowStorage.duplicateWorkflow(item.workflow.id);
        await refreshWorkflows();
        vscode.window.showInformationMessage(`Duplicated "${item.workflow.name}".`);
      }
    }),

    vscode.commands.registerCommand('runly.exportWorkflowItem', async (item: RunlyTreeItem) => {
      if (item && item.workflow) {
        const jsonStr = await workflowStorage.exportWorkflow(item.workflow.id);
        const targetUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${item.workflow.id}.runly.json`),
          filters: { 'Runly Workflows': ['runly.json', 'json'] }
        });
        if (targetUri) {
          const fs = require('fs');
          fs.writeFileSync(targetUri.fsPath, jsonStr, 'utf-8');
          vscode.window.showInformationMessage(`Exported workflow to ${targetUri.fsPath}`);
        }
      }
    }),

    vscode.commands.registerCommand('runly.useTemplateFromTree', async (item: RunlyTreeItem | undefined) => {
      const template = item?.itemType === 'template' ? item.workflow : undefined;
      if (!template || typeof template.name !== 'string') {
        vscode.window.showErrorMessage('Runly: The selected template is invalid or unavailable.');
        return;
      }

      const now = new Date().toISOString();
      const newWf: Workflow = {
        ...JSON.parse(JSON.stringify(template)),
        id: `workflow-${Date.now()}`,
        name: template.name.replace(/^[^\w\s]+/, '').trim(),
        createdAt: now,
        updatedAt: now
      };
      await workflowStorage.saveWorkflow(newWf);
      await refreshWorkflows();
      RunlyWebviewPanel.openWorkflow(
        context.extensionUri,
        workflowStorage,
        historyStorage,
        settingsStorage,
        workflowEngine,
        newWf
      );
    }),

    vscode.commands.registerCommand('runly.newWorkflow', async () => {
      await newWorkflowCommand(context, workflowStorage);
      await refreshWorkflows();
    }),

    vscode.commands.registerCommand('runly.runWorkflow', () => {
      runWorkflowCommand(workflowStorage, workflowEngine);
    }),

    vscode.commands.registerCommand('runly.stopWorkflow', () => {
      stopWorkflowCommand(workflowEngine);
    }),

    vscode.commands.registerCommand('runly.importWorkflow', async () => {
      await importWorkflowCommand(workflowStorage);
      await refreshWorkflows();
    }),

    vscode.commands.registerCommand('runly.exportWorkflow', () => {
      exportWorkflowCommand(workflowStorage);
    }),

    vscode.commands.registerCommand('runly.manageWorkflows', async () => {
      await manageWorkflowsCommand(workflowStorage);
      await refreshWorkflows();
    })
  );
}

export function deactivate() {}
