import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from '../nodes/CustomNode';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { Workflow } from '../../models/Workflow';
import { ActionType, WorkflowNode } from '../../models/Node';
import { NodeLibrary } from './NodeLibrary';
import { useTranslation } from '../i18n';
import {
  Play,
  Save,
  Square,
  PanelLeft,
  LayoutGrid
} from 'lucide-react';

interface WorkflowCanvasProps {
  workflow: Workflow;
  onSave: (workflow: Workflow) => void;
  onRun: (workflow: Workflow) => void;
  onStop: () => void;
  isExecuting?: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onSave,
  onRun,
  onStop,
  isExecuting
}) => {
  const t = useTranslation();
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const initialNodes: Node[] = useMemo(() => {
    return workflow.nodes.map((n) => ({
      id: n.id,
      type: 'custom',
      position: n.position,
      data: {
        type: n.type,
        label: n.label,
        config: n.config
      }
    }));
  }, [workflow]);

  const initialEdges: Edge[] = useMemo(() => {
    return workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      animated: e.animated
    }));
  }, [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [libraryOpen, setLibraryOpen] = useState(true);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const selectedWorkflowNode: WorkflowNode | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const n = nodes.find((node) => node.id === selectedNodeId);
    if (!n) return null;
    return {
      id: n.id,
      type: n.data.type as ActionType,
      label: n.data.label as string,
      position: n.position,
      config: (n.data.config as Record<string, any>) || {}
    };
  }, [nodes, selectedNodeId]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const handleAddNode = (type: ActionType) => {
    const newId = `${type}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'custom',
      position: {
        x: 150 + Math.random() * 80,
        y: 150 + Math.random() * 80
      },
      data: {
        type,
        label: `${type.toUpperCase()} Action`,
        config: type === 'delay' ? { durationMs: 1000 } : {}
      }
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
  };

  const handleUpdateNode = (updatedNode: WorkflowNode) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === updatedNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: updatedNode.label,
              config: updatedNode.config
            }
          };
        }
        return n;
      })
    );
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  };

  const getCurrentWorkflow = (): Workflow => {
    const updatedWorkflow: Workflow = {
      ...workflow,
      name: workflowName,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.type as ActionType,
        label: (n.data.label as string) || n.id,
        position: n.position,
        config: (n.data.config as Record<string, any>) || {}
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined
      }))
    };
    return updatedWorkflow;
  };
  const handleSave = () => onSave(getCurrentWorkflow());

  const handleAutoLayout = () => {
    setNodes((nds) => {
      return nds.map((node, idx) => ({
        ...node,
        position: {
          x: 200,
          y: 100 + idx * 130
        }
      }));
    });
  };

  return (
    <div className="workflow-builder">
      {/* Canvas Action Bar Header */}
      <div className="workflow-builder-header">
        <div className="workflow-builder-title">
          <button
            className="btn btn-secondary"
            aria-label={t('Node library')}
            title={t('Node library')}
            aria-expanded={libraryOpen}
            aria-controls="node-library"
            onClick={() => setLibraryOpen((open) => !open)}
          >
            <PanelLeft size={14} />
          </button>
          <input
            type="text"
            className="input-field"
            value={workflowName}
            aria-label={t('Workflow name')}
            onChange={(e) => setWorkflowName(e.target.value)}
            style={{ fontWeight: 600, fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleAutoLayout} title={t('Auto Layout')}>
            <LayoutGrid size={14} /> {t('Auto Layout')}
          </button>
          <button className="btn btn-secondary" onClick={handleSave}>
            <Save size={14} /> {t('Save')}
          </button>
          {isExecuting ? (
            <button className="btn btn-danger" onClick={onStop}>
              <Square size={14} /> {t('Stop')}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onRun(getCurrentWorkflow())}>
              <Play size={14} /> {t('Run Workflow')}
            </button>
          )}
        </div>
      </div>

      <div className="workflow-builder-workspace">
        {libraryOpen && <NodeLibrary onAddNode={handleAddNode} onClose={() => setLibraryOpen(false)} />}
        <div className="workflow-builder-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          ariaLabelConfig={{
            'controls.ariaLabel': t('Control Panel'),
            'controls.zoomIn.ariaLabel': t('Zoom In'),
            'controls.zoomOut.ariaLabel': t('Zoom Out'),
            'controls.fitView.ariaLabel': t('Fit View'),
            'controls.interactive.ariaLabel': t('Toggle Interactivity')
          }}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#404040" />
          <Controls />
        </ReactFlow>

        <NodePropertiesPanel
          node={selectedWorkflowNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
        />
        </div>
      </div>
    </div>
  );
};
