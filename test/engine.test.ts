import assert from 'node:assert';
import { test, describe } from 'node:test';
import * as path from 'node:path';
import type * as vscode from 'vscode';

class TestEventEmitter<T> {
  private listeners = new Set<(value: T) => void>();
  event = (listener: (value: T) => void) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };
  fire(value: T) {
    this.listeners.forEach(listener => listener(value));
  }
}

let interfaceLanguage = 'en';
let panelCount = 0;
let confirmation: string | undefined;
let registeredSidebar: RunlySidebarProvider | undefined;
const registeredCommands = new Map<string, (...args: any[]) => any>();
const shownErrors: string[] = [];
let receiveMessage: ((message: { command: string; payload?: unknown }) => Promise<void>) | undefined;
const postedMessages: { command: string; payload?: unknown }[] = [];
const testPanel = {
  reveal: () => {},
  dispose: () => {},
  onDidDispose: () => ({ dispose: () => {} }),
  webview: {
    html: '',
    asWebviewUri: (uri: vscode.Uri) => uri,
    postMessage: (message: { command: string; payload?: unknown }) => {
      postedMessages.push(message);
      return Promise.resolve(true);
    },
    onDidReceiveMessage: (listener: typeof receiveMessage) => {
      receiveMessage = listener;
      return { dispose: () => { receiveMessage = undefined; } };
    }
  }
};

// Lightweight vscode mock for standalone Node.js test runner
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request: string) {
  if (request === 'vscode') {
    return {
      EventEmitter: TestEventEmitter,
      TreeItem: class {
        constructor(public label: string, public collapsibleState: number) {}
      },
      TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
      ThemeIcon: class { constructor(public id: string) {} },
      ThemeColor: class { constructor(public id: string) {} },
      ViewColumn: { One: 1 },
      StatusBarAlignment: { Left: 1 },
      workspace: {
        workspaceFolders: [],
        getConfiguration: () => ({
          get: (key: string, defaultValue: unknown) => key === 'language' ? interfaceLanguage : defaultValue
        }),
        openTextDocument: async () => ({ save: async () => {} }),
        saveAll: async () => {},
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
        createFileSystemWatcher: () => ({
          dispose: () => {},
          onDidCreate: () => ({ dispose: () => {} }),
          onDidChange: () => ({ dispose: () => {} }),
          onDidDelete: () => ({ dispose: () => {} })
        })
      },
      window: {
        registerTreeDataProvider: (_id: string, provider: RunlySidebarProvider) => {
          registeredSidebar = provider;
          return { dispose: () => {} };
        },
        createStatusBarItem: () => ({ show: () => {}, dispose: () => {} }),
        createWebviewPanel: () => {
          panelCount++;
          return testPanel;
        },
        showInformationMessage: () => {},
        showWarningMessage: async () => confirmation,
        showErrorMessage: (message: string) => { shownErrors.push(message); },
        createTerminal: () => ({ show: () => {}, sendText: () => {} }),
        terminals: []
      },
      commands: {
        executeCommand: async () => {},
        registerCommand: (id: string, handler: (...args: any[]) => any) => {
          registeredCommands.set(id, handler);
          return { dispose: () => registeredCommands.delete(id) };
        }
      },
      tasks: { fetchTasks: async () => [], executeTask: async () => {} },
      env: { openExternal: async () => {} },
      Uri: {
        joinPath: (base: vscode.Uri, ...segments: string[]) => ({ fsPath: path.join(base.fsPath, ...segments) }),
        file: (p: string) => ({ fsPath: p }),
        parse: (u: string) => u
      }
    };
  }
  return originalRequire.apply(this, arguments as any);
};

import { VariableResolver } from '../src/engine/VariableResolver';
import { ConditionEngine } from '../src/engine/ConditionEngine';
import { WorkflowRunner } from '../src/engine/WorkflowRunner';
import { ExecutionContext } from '../src/engine/ExecutionContext';
import { Workflow } from '../src/models/Workflow';
import { translate } from '../src/webview/translations';
import { RunlyWebviewPanel } from '../src/commands/openRunly';
import { RunlySidebarProvider } from '../src/views/RunlySidebarProvider';
import { WorkflowStorage } from '../src/storage/WorkflowStorage';
import { HistoryStorage } from '../src/storage/HistoryStorage';
import { SettingsStorage } from '../src/storage/SettingsStorage';
import { WorkflowEngine } from '../src/engine/WorkflowEngine';
import { ExecutionRecord } from '../src/models/Execution';
import { activate } from '../src/extension';
import { BUILTIN_TEMPLATES } from '../src/templates/templates';

describe('Native sidebar navigation', () => {
  function createServices() {
    const values = new Map<string, unknown>();
    const globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void } = {
      keys: () => [...values.keys()],
      get: <T>(key: string, fallback?: T) => values.has(key) ? values.get(key) as T : fallback,
      update: async (key: string, value: unknown) => { values.set(key, value); },
      setKeysForSync: () => {}
    };
    const context = { globalState } as vscode.ExtensionContext;
    Object.assign(context, { subscriptions: [], extensionUri: { fsPath: process.cwd() } });
    const workflowStorage = new WorkflowStorage(context);
    const historyStorage = new HistoryStorage(context);
    return {
      workflowStorage,
      historyStorage,
      settingsStorage: new SettingsStorage(),
      engine: new WorkflowEngine(historyStorage),
      context
    };
  }

  test('queues the latest initial route until ready and reuses the panel afterward', async () => {
    const { workflowStorage, historyStorage, settingsStorage, engine } = createServices();
    postedMessages.length = 0;
    const before = panelCount;
    const uri = { fsPath: process.cwd() } as vscode.Uri;
    try {
      RunlyWebviewPanel.createOrShow(uri, workflowStorage, historyStorage, settingsStorage, engine, 'history');
      RunlyWebviewPanel.createOrShow(uri, workflowStorage, historyStorage, settingsStorage, engine, 'settings');
      assert.strictEqual(panelCount, before + 1);
      assert.deepStrictEqual(postedMessages, []);
      assert.ok(receiveMessage);
      await receiveMessage({ command: 'ready' });
      assert.deepStrictEqual(postedMessages, [
        { command: 'navigate', payload: { view: 'settings', workflow: undefined } }
      ]);
      RunlyWebviewPanel.createOrShow(uri, workflowStorage, historyStorage, settingsStorage, engine, 'monitor');
      assert.strictEqual(panelCount, before + 1);
      assert.deepStrictEqual(postedMessages.at(-1), {
        command: 'navigate', payload: { view: 'monitor', workflow: undefined }
      });
    } finally {
      RunlyWebviewPanel.currentPanel?.dispose();
    }
  });

  for (const view of ['canvas', 'settings'] as const) {
    test(`retains an explicitly opened workflow when the initial route is ${view}`, async () => {
      const { workflowStorage, historyStorage, settingsStorage, engine } = createServices();
      const workflow: Workflow = { version: 1, id: 'draft', name: 'Draft', nodes: [], edges: [] };
      postedMessages.length = 0;
      try {
        RunlyWebviewPanel.openWorkflow(
          { fsPath: process.cwd() } as vscode.Uri,
          workflowStorage, historyStorage, settingsStorage, engine, workflow
        );
        if (view === 'settings') {
          RunlyWebviewPanel.createOrShow(
            { fsPath: process.cwd() } as vscode.Uri,
            workflowStorage, historyStorage, settingsStorage, engine, view
          );
        }
        assert.deepStrictEqual(postedMessages, []);
        assert.ok(receiveMessage);
        await receiveMessage({ command: 'ready' });
        assert.deepStrictEqual(postedMessages, [{ command: 'navigate', payload: { view, workflow } }]);
      } finally {
        RunlyWebviewPanel.currentPanel?.dispose();
      }
    });
  }

  test('exposes five localized native routes and refreshes when the language changes', async () => {
    const { workflowStorage, historyStorage } = createServices();
    const sidebar = new RunlySidebarProvider(workflowStorage, historyStorage);
    let refreshed = false;
    const subscription = sidebar.onDidChangeTreeData(() => { refreshed = true; });
    try {
      const english = await sidebar.getChildren();
      assert.deepStrictEqual(english.slice(0, 5).map(item => item.command?.command), [
        'runly.open', 'runly.builder', 'runly.monitor', 'runly.history', 'runly.settings'
      ]);
      assert.strictEqual(english[0].label, 'Dashboard');
      interfaceLanguage = 'zh-CN';
      sidebar.refresh();
      const chinese = await sidebar.getChildren();
      assert.strictEqual(refreshed, true);
      assert.deepStrictEqual(chinese.slice(0, 5).map(item => item.label), [
        '工作流概览', '流程编辑器', '执行监控', '历史记录', '设置'
      ]);
      assert.deepStrictEqual(await sidebar.getChildren(chinese[0]), []);
    } finally {
      interfaceLanguage = 'en';
      subscription.dispose();
    }
  });

  test('keeps Recent Runs visible when there is no history', async () => {
    const { workflowStorage, historyStorage } = createServices();
    const sidebar = new RunlySidebarProvider(workflowStorage, historyStorage);
    try {
      const roots = await sidebar.getChildren();
      const recent = roots.find((item) => item.categoryKey === 'recent');
      const workflows = roots.find((item) => item.categoryKey === 'workflows');
      assert.ok(recent);
      assert.ok(workflows);
      assert.strictEqual(recent.label, 'Recent Runs (0)');
      assert.strictEqual(recent.id, 'runly.category.recent');
      assert.strictEqual(workflows.id, 'runly.category.workflows');
      assert.strictEqual(recent.collapsibleState, 1);
      assert.strictEqual(workflows.collapsibleState, 1);
      assert.deepStrictEqual(await sidebar.getChildren(recent), []);

      await historyStorage.addExecutionRecord({
        id: 'run', workflowId: 'workflow', workflowName: 'Workflow', status: 'SUCCESS',
        startTime: '2026-01-01T00:00:00.000Z', durationMs: 1, logs: [], nodeStates: {}
      });
      await workflowStorage.saveWorkflow({
        version: 1, id: 'workflow', name: 'Workflow', nodes: [], edges: []
      });
      const refreshedRoots = await sidebar.getChildren();
      const refreshedRecent = refreshedRoots.find((item) => item.categoryKey === 'recent');
      const refreshedWorkflows = refreshedRoots.find((item) => item.categoryKey === 'workflows');
      assert.ok(refreshedRecent);
      assert.ok(refreshedWorkflows);
      assert.strictEqual(refreshedRecent.id, recent.id);
      assert.strictEqual(refreshedWorkflows.id, workflows.id);
      assert.strictEqual(refreshedRecent.collapsibleState, 1);
      assert.strictEqual(refreshedWorkflows.collapsibleState, 1);
      assert.strictEqual(refreshedRecent.label, 'Recent Runs (1)');
      assert.strictEqual(refreshedWorkflows.label, 'All Workflows (1)');

      interfaceLanguage = 'zh-CN';
      const chineseRoots = await sidebar.getChildren();
      const chinese = chineseRoots.find((item) => item.categoryKey === 'recent');
      const chineseWorkflows = chineseRoots.find((item) => item.categoryKey === 'workflows');
      assert.ok(chinese);
      assert.ok(chineseWorkflows);
      assert.strictEqual(chinese.label, '最近运行（1）');
      assert.strictEqual(chinese.id, recent.id);
      assert.strictEqual(chineseWorkflows.id, workflows.id);
    } finally {
      interfaceLanguage = 'en';
    }
  });

  test('only creates a workflow from the template action and opens the saved copy', async () => {
    const { workflowStorage, historyStorage, settingsStorage, engine, context } = createServices();
    const template = BUILTIN_TEMPLATES[0];
    const sidebar = new RunlySidebarProvider(workflowStorage, historyStorage);
    const category = (await sidebar.getChildren()).find((item) => item.categoryKey === 'templates');
    assert.ok(category);
    const [templateItem] = await sidebar.getChildren(category);
    assert.ok(templateItem);
    assert.strictEqual(templateItem.command, undefined);
    assert.deepStrictEqual(await workflowStorage.loadAllWorkflows(), []);

    RunlyWebviewPanel.currentPanel = undefined;
    postedMessages.length = 0;
    shownErrors.length = 0;
    registeredCommands.clear();
    activate(context);
    const useTemplate = registeredCommands.get('runly.useTemplateFromTree');
    assert.ok(useTemplate);
    const panelsBefore = panelCount;

    try {
      await useTemplate(undefined);
      assert.deepStrictEqual(await workflowStorage.loadAllWorkflows(), []);
      assert.deepStrictEqual(shownErrors, ['Runly: The selected template is invalid or unavailable.']);

      await useTemplate(templateItem);
      const workflows = await workflowStorage.loadAllWorkflows();
      assert.strictEqual(workflows.length, 1);
      assert.notStrictEqual(workflows[0].id, template.id);
      assert.strictEqual(workflows[0].name, template.name.replace(/^[^\w\s]+/, '').trim());
      assert.deepStrictEqual(workflows[0].nodes, template.nodes);
      assert.notStrictEqual(workflows[0].nodes, template.nodes);
      assert.strictEqual(panelCount, panelsBefore + 1);

      assert.ok(receiveMessage);
      await receiveMessage({ command: 'ready' });
      assert.deepStrictEqual(postedMessages.at(-1), {
        command: 'navigate',
        payload: { view: 'canvas', workflow: workflows[0] }
      });
    } finally {
      RunlyWebviewPanel.currentPanel = undefined;
      receiveMessage = undefined;
      registeredCommands.clear();
      context.subscriptions.forEach((disposable) => disposable.dispose());
    }
  });

  test('opens the saved workflow from both sidebar sections and reports a deleted workflow', async () => {
    const { workflowStorage, historyStorage, context } = createServices();
    const workflow: Workflow = { version: 1, id: 'open-wf', name: 'Workflow', nodes: [], edges: [] };
    await workflowStorage.saveWorkflow(workflow);
    await historyStorage.addExecutionRecord({
      id: 'run', workflowId: workflow.id, workflowName: workflow.name, status: 'SUCCESS',
      startTime: '2026-01-01T00:00:00.000Z', durationMs: 1, logs: [], nodeStates: {}
    });
    postedMessages.length = 0;
    shownErrors.length = 0;
    activate(context);
    assert.ok(registeredSidebar);
    const sidebar = registeredSidebar;
    const open = registeredCommands.get('runly.openWorkflowItem');
    assert.ok(open);

    try {
      const roots = await sidebar.getChildren();
      for (const section of ['workflows', 'recent']) {
        const category = roots.find((item) => item.categoryKey === section);
        assert.ok(category);
        const [item] = await sidebar.getChildren(category);
        assert.ok(item?.command);
        for (const args of [[item], item.command.arguments ?? []]) {
          postedMessages.length = 0;
          await open(...args);
          assert.ok(receiveMessage);
          await receiveMessage({ command: 'ready' });
          assert.deepStrictEqual(postedMessages.at(-1), {
            command: 'navigate', payload: { view: 'canvas', workflow }
          });
        }
      }

      await workflowStorage.deleteWorkflow(workflow.id);
      const recent = roots.find((item) => item.categoryKey === 'recent');
      assert.ok(recent);
      const [orphan] = await sidebar.getChildren(recent);
      assert.ok(orphan?.command);
      postedMessages.length = 0;
      await open(orphan);
      assert.deepStrictEqual(postedMessages, []);
      assert.deepStrictEqual(shownErrors, ['Runly: No workflow was selected or it no longer exists.']);
      assert.strictEqual((await historyStorage.getHistory()).length, 1);
    } finally {
      RunlyWebviewPanel.currentPanel?.dispose();
      context.subscriptions.forEach((disposable) => disposable.dispose());
      registeredSidebar = undefined;
    }
  });

  test('deletes only the selected recent run after confirmation and refreshes both views', async () => {
    const { workflowStorage, historyStorage, settingsStorage, engine, context } = createServices();
    const workflow: Workflow = { version: 1, id: 'wf', name: 'Workflow', nodes: [], edges: [] };
    const record = (id: string, workflowId = workflow.id): ExecutionRecord => ({
      id, workflowId, workflowName: 'Workflow', status: 'SUCCESS',
      startTime: '2026-01-01T00:00:00.000Z', durationMs: 1, logs: [], nodeStates: {}
    });
    await workflowStorage.saveWorkflow(workflow);
    await historyStorage.addExecutionRecord(record('first'));
    await historyStorage.addExecutionRecord(record('second'));
    await historyStorage.addExecutionRecord(record('orphan', 'removed-workflow'));
    registeredCommands.clear();
    activate(context);
    assert.ok(registeredSidebar);
    const sidebar = registeredSidebar;
    let refreshes = 0;
    const subscription = sidebar.onDidChangeTreeData(() => { refreshes++; });
    const deleteRun = registeredCommands.get('runly.deleteHistoryItem');
    assert.ok(deleteRun);
    const recent = (await sidebar.getChildren()).find((item) => item.categoryKey === 'recent');
    assert.ok(recent);
    const recentId = recent.id;
    const items = await sidebar.getChildren(recent);
    assert.deepStrictEqual(items.map((item) => item.contextValue), ['history', 'history', 'history']);
    assert.deepStrictEqual(items.map((item) => item.executionId), ['orphan', 'second', 'first']);
    postedMessages.length = 0;
    RunlyWebviewPanel.createOrShow(
      context.extensionUri, workflowStorage, historyStorage, settingsStorage, engine
    );
    try {
      confirmation = undefined;
      await deleteRun(items[1]);
      assert.deepStrictEqual((await historyStorage.getHistory()).map((r) => r.id), ['orphan', 'second', 'first']);
      assert.strictEqual(refreshes, 0);

      confirmation = 'Delete Run';
      await deleteRun(items[1]);
      assert.deepStrictEqual((await historyStorage.getHistory()).map((r) => r.id), ['orphan', 'first']);
      assert.deepStrictEqual((await workflowStorage.loadAllWorkflows()).map((w) => w.id), ['wf']);
      assert.strictEqual(refreshes, 1);
      assert.deepStrictEqual(
        (postedMessages.find((message) => message.command === 'historyLoaded')?.payload as ExecutionRecord[]).map((r) => r.id),
        ['orphan', 'first']
      );
      interfaceLanguage = 'zh-CN';
      confirmation = '删除运行记录';
      await deleteRun(items[0]);
      assert.deepStrictEqual((await historyStorage.getHistory()).map((r) => r.id), ['first']);
      assert.deepStrictEqual((await workflowStorage.loadAllWorkflows()).map((w) => w.id), ['wf']);
      await deleteRun(items[2]);
      const emptyRecent = (await sidebar.getChildren()).find((item) => item.categoryKey === 'recent');
      assert.ok(emptyRecent);
      assert.strictEqual(emptyRecent.label, '最近运行（0）');
      assert.strictEqual(emptyRecent.id, recentId);
      assert.deepStrictEqual(await sidebar.getChildren(emptyRecent), []);
      assert.deepStrictEqual((await workflowStorage.loadAllWorkflows()).map((w) => w.id), ['wf']);
    } finally {
      confirmation = undefined;
      interfaceLanguage = 'en';
      subscription.dispose();
      RunlyWebviewPanel.currentPanel?.dispose();
      context.subscriptions.forEach((disposable) => disposable.dispose());
      registeredSidebar = undefined;
    }
  });
});

describe('Runly interface translations', () => {
  test('switches interface labels between English and Simplified Chinese', () => {
    assert.strictEqual(translate('en', 'Settings'), 'Settings');
    assert.strictEqual(translate('zh-CN', 'Settings'), '设置');
    assert.strictEqual(translate('zh-CN', 'Node Properties'), '节点属性');
    assert.strictEqual(translate('zh-CN', 'Cancel'), '取消');
  });

  test('interpolates counts and preserves user text without recursive substitution', () => {
    assert.strictEqual(translate('zh-CN', '{count} Steps', { count: 0 }), '0 个步骤');
    assert.strictEqual(translate('en', 'Run {name}', { name: '部署 ${PORT} {count}' }), 'Run 部署 ${PORT} {count}');
    assert.strictEqual(translate('zh-CN', 'Run {name}', { name: 'My workflow' }), '运行 My workflow');
  });
});

describe('Runly Engine Unit Tests', () => {
  test('VariableResolver resolves built-in and env variables correctly', () => {
    const raw = 'Hello ${user}, OS is ${os}, Port is ${env.PORT}';
    process.env.PORT = '8080';

    const resolved = VariableResolver.resolve(
      raw,
      { user: 'Jeswin' },
      {}
    );

    assert.strictEqual(resolved.includes('Hello Jeswin'), true);
    assert.strictEqual(resolved.includes('Port is 8080'), true);
    assert.strictEqual(resolved.includes('${user}'), false);
  });

  test('ConditionEngine evaluates previousSuccess and exitCode conditions', () => {
    const successState = { nodeId: 'n1', status: 'SUCCESS' as const, exitCode: 0 };
    const failState = { nodeId: 'n1', status: 'FAILED' as const, exitCode: 1 };

    assert.strictEqual(
      ConditionEngine.evaluate('previousSuccess', undefined, successState),
      true
    );

    assert.strictEqual(
      ConditionEngine.evaluate('previousSuccess', undefined, failState),
      false
    );

    assert.strictEqual(
      ConditionEngine.evaluate('previousFailed', undefined, failState),
      true
    );

    assert.strictEqual(
      ConditionEngine.evaluate('exitCode', '0', successState),
      true
    );

    assert.strictEqual(
      ConditionEngine.evaluate('exitCode', '0', failState),
      false
    );
  });

  test('WorkflowRunner executes simple delay workflow', async () => {
    const mockWorkflow: Workflow = {
      version: 1,
      id: 'test-wf',
      name: 'Test Delay Workflow',
      nodes: [
        {
          id: 'start',
          type: 'start',
          label: 'START',
          position: { x: 0, y: 0 },
          config: {}
        },
        {
          id: 'delay1',
          type: 'delay',
          label: 'Delay Node',
          position: { x: 0, y: 100 },
          config: { durationMs: 10 }
        }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'delay1' }
      ]
    };

    const ctx = new ExecutionContext(mockWorkflow);
    const runner = new WorkflowRunner(ctx, () => {});
    const resultContext = await runner.run();

    assert.strictEqual(resultContext.status, 'SUCCESS');
    assert.strictEqual(resultContext.nodeStates['delay1'].status, 'SUCCESS');
  });

  test('ExecutionContext records step history correctly', () => {
    const mockWorkflow: Workflow = {
      version: 1,
      id: 'history-test',
      name: 'History Test',
      nodes: [{ id: 'start', type: 'start', label: 'START', position: { x: 0, y: 0 }, config: {} }],
      edges: []
    };

    const ctx = new ExecutionContext(mockWorkflow, { param1: 'val1' });
    ctx.addLog('Started step 1');
    ctx.setNodeStatus('start', 'SUCCESS', { durationMs: 50 });

    const rec = ctx.toRecord();
    assert.strictEqual(rec.workflowName, 'History Test');
    assert.strictEqual(rec.logs.length, 1);
    assert.strictEqual(rec.nodeStates['start'].status, 'SUCCESS');
    assert.strictEqual(rec.parametersUsed?.param1, 'val1');
  });
});
