import { useEffect } from 'react'
import {
  ReactFlow, Background, Controls,
  useReactFlow, ReactFlowProvider,
  useNodesState, useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CustomNode from './CustomNode'

const nodeTypes = { customNode: CustomNode }

const NODE_W = 260
const NODE_H = 100
const H_GAP  = 60
const V_GAP  = 160

/**
 * Hierarchical ownership-tree layout.
 * Target company sits at the BOTTOM.
 * Direct owners/directors sit one level UP.
 * Indirect (Depth-2) owners sit at the TOP.
 */
function hierarchicalLayout(nodes, edges) {
  if (!nodes.length) return nodes

  const inEdges = {}
  nodes.forEach(n => { inEdges[n.id] = [] })
  edges.forEach(e => {
    if (inEdges[e.target] !== undefined) inEdges[e.target].push(e.source)
  })

  const targetNode = nodes.find(n => n.is_target) || nodes[0]
  const levels = {}
  const queue = [{ id: targetNode.id, level: 0 }]
  const visited = new Set()
  while (queue.length) {
    const { id, level } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    levels[id] = level
    ;(inEdges[id] || []).forEach(pid => {
      if (!visited.has(pid)) queue.push({ id: pid, level: level + 1 })
    })
  }
  nodes.forEach(n => { if (levels[n.id] === undefined) levels[n.id] = 1 })

  const groups = {}
  nodes.forEach(n => {
    const l = levels[n.id]
    ;(groups[l] = groups[l] || []).push(n)
  })

  const maxLevel = Math.max(...Object.keys(groups).map(Number))
  const positioned = []

  Object.entries(groups).forEach(([lvlStr, group]) => {
    const lvl = Number(lvlStr)
    const rowW  = group.length * NODE_W + (group.length - 1) * H_GAP
    const startX = -rowW / 2 + NODE_W / 2
    const y = (maxLevel - lvl) * (NODE_H + V_GAP)
    group.forEach((node, i) => {
      positioned.push({ ...node, position: { x: startX + i * (NODE_W + H_GAP), y } })
    })
  })

  return positioned
}

function buildFlowNodes(nodes, edges, activeFilters) {
  return hierarchicalLayout(nodes, edges).map(n => ({
    id: n.id, type: 'customNode', position: n.position,
    draggable: true,
    data: {
      label:            n.label,
      type:             n.type,
      jurisdiction:     n.jurisdiction,
      risk_level:       n.risk_level,
      tags:             n.tags || [],
      is_target:        n.is_target || false,
      role:             n.role || null,
      ownership_pct:    n.ownership_pct ?? null,
      appointment_date: n.appointment_date || null,
      depth:            n.depth || 0,
    },
    style: {
      opacity: activeFilters.length === 0 ? 1
        : activeFilters.some(f => (n.tags || []).includes(f)) ? 1 : 0.12,
      transition: 'opacity 0.3s ease',
    },
  }))
}

function buildFlowEdges(edges) {
  return edges.map(e => {
    const pct  = e.ownership_pct
    const role = (e.label || '').replace(/_/g, ' ')
    const hasPct = pct != null && pct > 0

    let pctLabel = ''
    if (hasPct) {
      if (pct >= 87.0 && pct <= 88.0) pctLabel = '>75%'
      else if (pct >= 62.0 && pct <= 63.0) pctLabel = '50-75%'
      else if (pct >= 37.0 && pct <= 38.0) pctLabel = '25-50%'
      else pctLabel = `${pct}%`
    }

    let edgeLabel
    if (hasPct && role && role !== 'owns' && role !== 'significant control')
      edgeLabel = `${role} · ${pctLabel}`
    else if (hasPct)
      edgeLabel = `Shareholder ${pctLabel}`
    else if (role)
      edgeLabel = role.charAt(0).toUpperCase() + role.slice(1)
    else
      edgeLabel = 'Connected'

    const isDepth2  = (e.id || '').startsWith('d2_')
    const isPdf     = (e.source_doc || '').toLowerCase().includes('pdf')
    const isUnver   = (e.trust_score ?? 1) < 0.6

    let color, dash, width
    if (isUnver)       { color = '#FF5C5C'; dash = '4 4'; width = 1.5 }
    else if (isDepth2) { color = 'var(--vintage-lavender)'; dash = '6 3'; width = 2 }
    else if (isPdf)    { color = 'var(--periwinkle)'; dash = '8 4'; width = 2 }
    else if (hasPct)   { color = 'var(--periwinkle)'; dash = '0';   width = 2.5 }
    else               { color = 'var(--vintage-lavender)'; dash = '0';   width = 1.5 }

    return {
      id: e.id, source: e.source, target: e.target,
      type: 'smoothstep',
      label: edgeLabel,
      labelStyle:     { fill: 'var(--alabaster-grey)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' },
      labelBgStyle:   { fill: 'var(--twilight-indigo)', fillOpacity: 0.95, stroke: 'var(--border-hairline)', strokeWidth: 1, rx: 4, ry: 4 },
      labelBgPadding: [5, 10],
      markerEnd: { type: 'arrowclosed', width: 14, height: 14, color },
      style: { stroke: color, strokeWidth: width, strokeDasharray: dash },
      animated: isUnver,
      data: e,
    }
  })
}

function LineSample({ color, dash, width }) {
  return (
    <svg width="28" height="10" style={{ flexShrink: 0 }}>
      <line x1="0" y1="5" x2="22" y2="5"
        stroke={color} strokeWidth={width}
        strokeDasharray={dash === 'none' ? undefined : dash} />
      <polygon points="18,2 23,5 18,8" fill={color} />
    </svg>
  )
}

function GraphInner({ nodes: apiNodes, edges: apiEdges, activeFilters, focusNodeId, onEdgeClick, onPaneClick }) {
  const { setCenter } = useReactFlow()

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setFlowNodes(buildFlowNodes(apiNodes, apiEdges, activeFilters))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNodes, apiEdges])

  useEffect(() => {
    setFlowEdges(buildFlowEdges(apiEdges))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEdges])

  useEffect(() => {
    setFlowNodes(prev => prev.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: activeFilters.length === 0 ? 1
          : activeFilters.some(f => (n.data.tags || []).includes(f)) ? 1 : 0.12,
      },
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters])

  useEffect(() => {
    if (focusNodeId) {
      const node = flowNodes.find(n => n.id === focusNodeId)
      if (node) setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, { duration: 600, zoom: 1.6 })
    }
  }, [focusNodeId, flowNodes, setCenter])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-obsidian)', position: 'relative' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={(_, edge) => onEdgeClick(edge.data)}
        onPaneClick={onPaneClick}
        nodesDraggable={true}
        fitView fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.15} maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.06)" gap={32} size={1} />
        <Controls />
      </ReactFlow>

      {/* ── Legend (Haoqi & Sharplink Dark Telemetry Frame) ──────────── */}
      <div
        className="has-pin has-pin--top-left has-pin--top-right"
        style={{
          position: 'absolute', bottom: 20, right: 20, zIndex: 10,
          background: 'rgba(255, 255, 255, 0.94)',
          border: '1px solid var(--border-subtle)', padding: '12px 16px',
          boxShadow: '0 8px 30px rgba(24, 54, 66, 0.1)',
          display: 'flex', flexDirection: 'column', gap: 5,
          pointerEvents: 'none', minWidth: 175,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--twilight-indigo)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          GRAPH_ONTOLOGY // LEGEND
        </div>
        {[
          { bg: '#e7ecf5', border: 'var(--twilight-indigo)', label: 'Target Company' },
          { bg: '#ffffff', border: 'var(--border-subtle)', label: 'Individual Officer' },
          { bg: '#ede7f6', border: 'var(--vintage-lavender)', label: '👑 UBO Confirmed' },
          { bg: '#f4f3f8', border: 'var(--border-hairline)', label: 'Corporate Entity' },
          { bg: '#eaf2fa', border: '#4A6FA5', label: 'Offshore Vehicle' },
          { bg: '#fde8e8', border: '#D32F2F', label: 'OFAC Sanction Match' },
          { bg: 'rgba(203,197,234,0.3)', border: 'var(--vintage-lavender)', label: 'PDF Document Verified' },
        ].map(({ bg, border, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 10, height: 10,
              background: bg, border: `1px solid ${border}`, flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{label}</span>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border-hairline)', margin: '4px 0' }} />

        {[
          { color: 'var(--periwinkle)',       dash: 'none', width: 2.5, label: 'Direct Ownership' },
          { color: 'var(--vintage-lavender)', dash: 'none', width: 1.5, label: 'Corporate Officer' },
          { color: 'var(--vintage-lavender)', dash: '6 3',  width: 2,   label: 'Depth-2 Chain' },
          { color: 'var(--periwinkle)',       dash: '8 4',  width: 2,   label: 'PDF Verified Edge' },
          { color: '#FF5C5C',                 dash: '4 4',  width: 1.5, label: 'AI Unverified Flag' },
        ].map(({ color, dash, width, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LineSample color={color} dash={dash} width={width} />
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  )
}
