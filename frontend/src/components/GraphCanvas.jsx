import { useMemo, useEffect, useState, useCallback } from 'react'
import {
  ReactFlow, Background, Controls,
  useReactFlow, ReactFlowProvider,
  useNodesState, useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CustomNode from './CustomNode'

const nodeTypes = { customNode: CustomNode }

const NODE_W = 230
const NODE_H = 95
const H_GAP  = 50
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
    if (isUnver)       { color = '#C53030'; dash = '4 4'; width = 1.5 }
    else if (isDepth2) { color = '#7C3AED'; dash = '6 3'; width = 2   }
    else if (isPdf)    { color = '#0D9488'; dash = '8 4'; width = 2   }
    else if (hasPct)   { color = '#4338CA'; dash = '0';   width = 2.5 }
    else               { color = '#6366F1'; dash = '0';   width = 1.5 }

    return {
      id: e.id, source: e.source, target: e.target,
      type: 'smoothstep',
      label: edgeLabel,
      labelStyle:     { fill: '#1a1729', fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif' },
      labelBgStyle:   { fill: '#fff', fillOpacity: 0.96, stroke: '#ddd', strokeWidth: 1, rx: 6, ry: 6 },
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

  // Draggable state — reinitialise when source data changes
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setFlowNodes(buildFlowNodes(apiNodes, apiEdges, activeFilters))
  }, [apiNodes, apiEdges])

  useEffect(() => {
    setFlowEdges(buildFlowEdges(apiEdges))
  }, [apiEdges])

  // Re-apply opacity filter without resetting positions
  useEffect(() => {
    setFlowNodes(prev => prev.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: activeFilters.length === 0 ? 1
          : activeFilters.some(f => (n.data.tags || []).includes(f)) ? 1 : 0.12,
      },
    })))
  }, [activeFilters])

  useEffect(() => {
    if (focusNodeId) {
      const node = flowNodes.find(n => n.id === focusNodeId)
      if (node) setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, { duration: 600, zoom: 1.6 })
    }
  }, [focusNodeId, flowNodes, setCenter])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--cream)', position: 'relative' }}>
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
        <Background color="var(--border-light)" gap={30} size={1} />
        <Controls />
      </ReactFlow>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 10,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid #E2DDD5', borderRadius: 14, padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 5,
        pointerEvents: 'none', minWidth: 168,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#8C8070',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          Legend
        </div>
        {[
          { bg: '#EEF0FB', border: '#7C68D8', circle: false, label: 'Target Company' },
          { bg: '#F7F8FC', border: '#C7D2FE', circle: true,  label: 'Individual' },
          { bg: '#fffbeb', border: '#F6AD55', circle: true,  label: '👑 UBO Identified' },
          { bg: '#F8F7FB', border: '#C4B5FD', circle: false, label: 'Corporate Owner' },
          { bg: '#EBF8FF', border: '#63B3ED', circle: false, label: 'Offshore Entity' },
          { bg: '#fff5f5', border: '#FC8181', circle: false, label: 'OFAC / High Risk' },
          { bg: '#F0FFF4', border: '#68D391', circle: false, label: 'PDF Verified' },
        ].map(({ bg, border, circle, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12, height: 12, borderRadius: circle ? 6 : 3,
              background: bg, border: `1.5px solid ${border}`, flexShrink: 0,
            }} />
            <span style={{ fontSize: 10.5, color: '#5C5248' }}>{label}</span>
          </div>
        ))}

        <div style={{ height: 1, background: '#E2DDD5', margin: '4px 0' }} />

        {[
          { color: '#4338CA', dash: 'none', width: 2.5, label: 'Ownership (API)' },
          { color: '#6366F1', dash: 'none', width: 1.5, label: 'Director / Role' },
          { color: '#7C3AED', dash: '6 3',  width: 2,   label: 'Depth-2 Chain' },
          { color: '#0D9488', dash: '8 4',  width: 2,   label: 'PDF Verified' },
          { color: '#C53030', dash: '4 4',  width: 1.5, label: 'Unverified / AI' },
        ].map(({ color, dash, width, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LineSample color={color} dash={dash} width={width} />
            <span style={{ fontSize: 10.5, color: '#5C5248' }}>{label}</span>
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

