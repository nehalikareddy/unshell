import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CustomNode from './CustomNode'

const nodeTypes = { customNode: CustomNode }

// Synchronized with CustomNode (240px width, ~96px height)
const NODE_W = 240
const NODE_H = 100
const H_GAP  = 64
const V_GAP  = 135
const MAX_COLS_PER_ROW = 4

/**
 * Classifies whether a node is an operational officer (Director/Secretary)
 * vs. a core Ownership / PSC / Target entity.
 */
function isOfficerOnlyNode(node, edges) {
  if (node.is_target) return false
  if ((node.id || '').startsWith('officer_')) return true
  const tags = node.tags || []
  if (
    tags.includes('UBO') ||
    tags.includes('CORPORATE_PSC') ||
    tags.includes('OFFSHORE') ||
    tags.includes('OFAC') ||
    tags.includes('LOOP') ||
    tags.includes('PUPPET') ||
    tags.includes('NOMINEE_PUPPET')
  ) {
    return false
  }
  if (node.ownership_pct != null && node.ownership_pct > 0) return false

  // Check if all outgoing edges from this node are pure officer roles without ownership_pct
  const outEdges = edges.filter(e => e.source === node.id)
  if (
    outEdges.length > 0 &&
    outEdges.every(e => (e.ownership_pct == null || e.ownership_pct === 0) && e.label !== 'unknown_control')
  ) {
    return true
  }
  return false
}

/**
 * Balanced Subtree + Multi-Row Grid Layout Engine
 *
 * Structure (Top-Down 'TB' mode):
 *   1. Depth-2 PSCs / Owners  -> Centered directly above their respective Level-1 Corporate PSC parent
 *   2. Level-1 PSCs / Owners  -> Centered directly above the Target Company
 *   3. Target Company         -> Central focal anchor
 *   4. Operational Officers   -> Arranged in a clean wrapped grid (max 4 per row) BELOW the Target Company
 *                                so they never collide with the upward ownership chain!
 *
 * Also supports Left-to-Right ('LR') mode.
 */
function computeSmartLayout(rawNodes, rawEdges, direction = 'TB') {
  if (!rawNodes || rawNodes.length === 0) return []

  const nodes = rawNodes.map(n => ({ ...n }))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // Identify target company
  const targetNode = nodes.find(n => n.is_target) || nodes[0]

  // Build parent -> children map (where edge is source -> target, meaning source owns/serves target)
  const incomingSources = new Map()
  nodes.forEach(n => incomingSources.set(n.id, []))
  rawEdges.forEach(e => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target) && e.source !== e.target) {
      const list = incomingSources.get(e.target) || []
      if (!list.includes(e.source)) list.push(e.source)
      incomingSources.set(e.target, list)
    }
  })

  const positioned = new Map()
  const placedIds = new Set()

  // Place Target Company at origin (0, 0)
  positioned.set(targetNode.id, { x: 0, y: 0 })
  placedIds.add(targetNode.id)

  // Direct connections into Target Company
  const directSourceIds = (incomingSources.get(targetNode.id) || []).filter(id => !placedIds.has(id))

  // Split direct nodes into:
  //   (A) Ownership Spine nodes (PSCs, Corporate Owners, UBOs, Dead-End markers) -> Placed ABOVE target
  //   (B) Operational Officers (Directors / Secretaries) -> Placed in a wrapped grid BELOW target
  const directOwnerIds = []
  const directOfficerIds = []

  directSourceIds.forEach(id => {
    const n = nodeMap.get(id)
    if (!n) return
    if (isOfficerOnlyNode(n, rawEdges)) {
      directOfficerIds.push(id)
    } else {
      directOwnerIds.push(id)
    }
  })

  // Helper to compute width of a row with N items
  const rowSpan = count => count * NODE_W + Math.max(0, count - 1) * H_GAP

  // ── 1. Place Level-1 Ownership Nodes ABOVE Target Company ─────────────────
  // First calculate how wide each Level-1 owner's Depth-2 subtree is so subtrees never overlap
  const ownerSubtreeInfo = directOwnerIds.map(ownerId => {
    const d2All = (incomingSources.get(ownerId) || []).filter(
      id => !placedIds.has(id) && id !== ownerId && !directSourceIds.includes(id)
    )
    // Filter out redundant "no_psc_registered" at Depth-2 if real Depth-2 nodes exist
    const d2Filtered = d2All.filter(id => {
      const n = nodeMap.get(id)
      return !(d2All.length > 1 && n?.id === 'no_psc_registered')
    })
    const cols = Math.min(Math.max(1, d2Filtered.length), MAX_COLS_PER_ROW)
    const subtreeWidth = Math.max(NODE_W, rowSpan(cols))
    return { ownerId, d2Ids: d2Filtered, subtreeWidth }
  })

  // Arrange Level-1 owners in rows of up to MAX_COLS_PER_ROW
  const ownerChunks = []
  for (let i = 0; i < ownerSubtreeInfo.length; i += MAX_COLS_PER_ROW) {
    ownerChunks.push(ownerSubtreeInfo.slice(i, i + MAX_COLS_PER_ROW))
  }

  ownerChunks.forEach((chunk, rowIdx) => {
    const totalChunkWidth =
      chunk.reduce((acc, item) => acc + item.subtreeWidth, 0) +
      Math.max(0, chunk.length - 1) * H_GAP

    let cursorX = -totalChunkWidth / 2
    const ownerY = -(rowIdx + 1) * (NODE_H + V_GAP)

    chunk.forEach(item => {
      const centerX = cursorX + item.subtreeWidth / 2
      positioned.set(item.ownerId, { x: centerX - NODE_W / 2, y: ownerY })
      placedIds.add(item.ownerId)

      // ── 2. Place Depth-2 Nodes Directly Above Their Parent Corporate PSC ──
      if (item.d2Ids.length > 0) {
        const d2Chunks = []
        for (let j = 0; j < item.d2Ids.length; j += MAX_COLS_PER_ROW) {
          d2Chunks.push(item.d2Ids.slice(j, j + MAX_COLS_PER_ROW))
        }

        d2Chunks.forEach((d2Row, d2RowIdx) => {
          const d2RowW = rowSpan(d2Row.length)
          const d2StartX = centerX - d2RowW / 2
          const d2Y = ownerY - (d2RowIdx + 1) * (NODE_H + V_GAP * 0.9)

          d2Row.forEach((d2Id, colIdx) => {
            positioned.set(d2Id, {
              x: d2StartX + colIdx * (NODE_W + H_GAP),
              y: d2Y,
            })
            placedIds.add(d2Id)
          })
        })
      }

      cursorX += item.subtreeWidth + H_GAP
    })
  })

  // ── 3. Place Direct Officers in a Clean Wrapped Grid BELOW Target Company ─
  if (directOfficerIds.length > 0) {
    const officerChunks = []
    for (let i = 0; i < directOfficerIds.length; i += MAX_COLS_PER_ROW) {
      officerChunks.push(directOfficerIds.slice(i, i + MAX_COLS_PER_ROW))
    }

    officerChunks.forEach((rowIds, rowIdx) => {
      const rW = rowSpan(rowIds.length)
      const startX = -rW / 2
      const officerY = (rowIdx + 1) * (NODE_H + V_GAP * 0.85)

      rowIds.forEach((id, colIdx) => {
        positioned.set(id, {
          x: startX + colIdx * (NODE_W + H_GAP),
          y: officerY,
        })
        placedIds.add(id)
      })
    })
  }

  // ── 4. Place any remaining unplaced nodes neatly ──────────────────────────
  const unplaced = nodes.filter(n => !placedIds.has(n.id))
  if (unplaced.length > 0) {
    const extraChunks = []
    for (let i = 0; i < unplaced.length; i += MAX_COLS_PER_ROW) {
      extraChunks.push(unplaced.slice(i, i + MAX_COLS_PER_ROW))
    }
    const baseExtraY = -((ownerChunks.length || 1) + 2) * (NODE_H + V_GAP)
    extraChunks.forEach((rowNodes, rIdx) => {
      const rW = rowSpan(rowNodes.length)
      const startX = -rW / 2
      rowNodes.forEach((n, cIdx) => {
        positioned.set(n.id, {
          x: startX + cIdx * (NODE_W + H_GAP),
          y: baseExtraY - rIdx * (NODE_H + V_GAP * 0.85),
        })
      })
    })
  }

  // Convert coordinates if Left-to-Right ('LR') mode is selected
  return nodes.map(n => {
    const pos = positioned.get(n.id) || { x: 0, y: 0 }
    const finalPos =
      direction === 'LR'
        ? { x: pos.y * 1.35, y: pos.x * 0.65 }
        : { x: pos.x, y: pos.y }

    const isBelowTarget = pos.y > 0

    return {
      ...n,
      position: finalPos,
      _isBelowTarget: isBelowTarget,
    }
  })
}

function buildFlowNodes(nodes, edges, activeFilters, direction) {
  const laidOut = computeSmartLayout(nodes, edges, direction)
  return laidOut.map(n => ({
    id: n.id,
    type: 'customNode',
    position: n.position,
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
      layoutDir:        direction,
      isBelowTarget:    n._isBelowTarget || false,
    },
    style: {
      opacity:
        activeFilters.length === 0
          ? 1
          : activeFilters.some(f => (n.tags || []).includes(f))
          ? 1
          : 0.14,
      transition: 'opacity 0.25s ease',
    },
  }))
}

function buildFlowEdges(edges, flowNodes) {
  const nodeMap = new Map(flowNodes.map(n => [n.id, n]))

  return edges.map(e => {
    const pct    = e.ownership_pct
    const role   = (e.label || '').replace(/_/g, ' ')
    const hasPct = pct != null && pct > 0

    let pctLabel = ''
    if (hasPct) {
      if (pct >= 87.0 && pct <= 88.0) pctLabel = '>75%'
      else if (pct >= 62.0 && pct <= 63.0) pctLabel = '50–75%'
      else if (pct >= 37.0 && pct <= 38.0) pctLabel = '25–50%'
      else pctLabel = `${pct}%`
    }

    const isDepth2 = (e.id || '').startsWith('d2_')
    const isPdf    = (e.source_doc || '').toLowerCase().includes('pdf')
    const isUnver  = (e.trust_score ?? 1) < 0.6

    // Keep labels concise and avoid noisy duplicate labels on pure officer edges
    let edgeLabel = ''
    if (hasPct && role && !['owns', 'significant control', 'controls (chain)'].includes(role.toLowerCase())) {
      edgeLabel = `${role} · ${pctLabel}`
    } else if (hasPct) {
      edgeLabel = `Owns ${pctLabel}`
    } else if (isDepth2) {
      edgeLabel = '' // Role/percentage is already shown on the Depth-2 node card itself
    } else if (role && !['director', 'secretary', 'officer'].includes(role.toLowerCase())) {
      edgeLabel = role.charAt(0).toUpperCase() + role.slice(1)
    }

    let color, dash, width
    if (isUnver)       { color = '#C53030'; dash = '4 4'; width = 1.6 }
    else if (isDepth2) { color = '#7C3AED'; dash = '6 4'; width = 1.8 }
    else if (isPdf)    { color = '#0D9488'; dash = '8 4'; width = 2.0 }
    else if (hasPct)   { color = '#4338CA'; dash = '0';   width = 2.4 }
    else               { color = '#94A3B8'; dash = '3 3'; width = 1.4 }

    const srcNode = nodeMap.get(e.source)
    const isOfficerBelow = srcNode?.data?.isBelowTarget

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: isOfficerBelow ? 'top-source' : 'bottom-source',
      targetHandle: isOfficerBelow ? 'bottom-target' : 'top-target',
      // Smooth Bezier curve ('default') prevents horizontal trunk collisions
      type: 'default',
      label: edgeLabel || undefined,
      labelStyle: {
        fill: '#1E1B2E',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      labelBgStyle: {
        fill: '#FFFFFF',
        fillOpacity: 0.95,
        stroke: '#E2DDD5',
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [4, 8],
      markerEnd: { type: 'arrowclosed', width: 13, height: 13, color },
      style: {
        stroke: color,
        strokeWidth: width,
        strokeDasharray: dash === '0' ? undefined : dash,
      },
      animated: isUnver,
      data: e,
    }
  })
}

function LineSample({ color, dash, width }) {
  return (
    <svg width="28" height="10" style={{ flexShrink: 0 }}>
      <line
        x1="0" y1="5" x2="22" y2="5"
        stroke={color} strokeWidth={width}
        strokeDasharray={dash === 'none' ? undefined : dash}
      />
      <polygon points="18,2 23,5 18,8" fill={color} />
    </svg>
  )
}

function GraphInner({
  nodes: apiNodes = [],
  edges: apiEdges = [],
  activeFilters = [],
  focusNodeId,
  onEdgeClick,
  onPaneClick,
}) {
  const { setCenter, fitView } = useReactFlow()

  const [showOfficers, setShowOfficers] = useState(true)
  const [layoutDir, setLayoutDir]       = useState('TB')

  // Filter out Depth-2 "no_psc_registered" ghost nodes and optionally officer-only nodes
  const { visibleNodes, visibleEdges, officerCount } = useMemo(() => {
    const totalOfficers = apiNodes.filter(n => isOfficerOnlyNode(n, apiEdges)).length

    const filteredNodes = apiNodes.filter(n => {
      // Remove Depth-2 "No PSC Registered" ghost nodes when other Depth-2 nodes exist
      if (n.id === 'no_psc_registered' && (n.tags || []).includes('DEPTH_2')) {
        return false
      }
      if (!showOfficers && isOfficerOnlyNode(n, apiEdges)) {
        return false
      }
      return true
    })

    const validIds = new Set(filteredNodes.map(n => n.id))
    const filteredEdges = apiEdges.filter(
      e => validIds.has(e.source) && validIds.has(e.target)
    )

    return {
      visibleNodes: filteredNodes,
      visibleEdges: filteredEdges,
      officerCount: totalOfficers,
    }
  }, [apiNodes, apiEdges, showOfficers])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([])

  const recomputeLayout = useCallback(() => {
    const builtNodes = buildFlowNodes(visibleNodes, visibleEdges, activeFilters, layoutDir)
    const builtEdges = buildFlowEdges(visibleEdges, builtNodes)
    setFlowNodes(builtNodes)
    setFlowEdges(builtEdges)
    setTimeout(() => {
      fitView({ padding: 0.22, maxZoom: 1.15, duration: 400 })
    }, 60)
  }, [visibleNodes, visibleEdges, activeFilters, layoutDir, setFlowNodes, setFlowEdges, fitView])

  useEffect(() => {
    recomputeLayout()
  }, [recomputeLayout])

  // Re-apply opacity filter without resetting dragged positions
  useEffect(() => {
    setFlowNodes(prev =>
      prev.map(n => ({
        ...n,
        style: {
          ...n.style,
          opacity:
            activeFilters.length === 0
              ? 1
              : activeFilters.some(f => (n.data.tags || []).includes(f))
              ? 1
              : 0.14,
        },
      }))
    )
  }, [activeFilters, setFlowNodes])

  useEffect(() => {
    if (focusNodeId) {
      const node = flowNodes.find(n => n.id === focusNodeId)
      if (node) {
        setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, {
          duration: 550,
          zoom: 1.25,
        })
      }
    }
  }, [focusNodeId, flowNodes, setCenter])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--cream)', position: 'relative' }}>
      {/* ── Top-Left Floating Layout Toolbar ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid #E2DDD5',
          borderRadius: 999,
          padding: '5px 8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {officerCount > 0 && (
          <button
            type="button"
            onClick={() => setShowOfficers(v => !v)}
            style={{
              background: showOfficers ? '#1A1729' : '#F3F1EC',
              color: showOfficers ? '#FFFFFF' : '#4A4763',
              border: 'none',
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Toggle operational directors & secretaries"
          >
            {showOfficers ? `Showing Officers (${officerCount})` : `Show Officers (${officerCount})`}
          </button>
        )}

        <button
          type="button"
          onClick={() => setLayoutDir(d => (d === 'TB' ? 'LR' : 'TB'))}
          style={{
            background: '#F3F1EC',
            color: '#1A1729',
            border: '1px solid #E2DDD5',
            borderRadius: 999,
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Switch graph orientation"
        >
          {layoutDir === 'TB' ? '↕ Vertical Tree' : '↔ Horizontal Tree'}
        </button>

        <button
          type="button"
          onClick={recomputeLayout}
          style={{
            background: '#FFFFFF',
            color: '#4A4763',
            border: '1px solid #E2DDD5',
            borderRadius: 999,
            padding: '5px 11px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Reset positions and fit graph to screen"
        >
          ⤢ Auto-Fit
        </button>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={(_, edge) => onEdgeClick && onEdgeClick(edge.data)}
        onPaneClick={onPaneClick}
        nodesDraggable={true}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1.15 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#DCD7CD" gap={28} size={1.2} />
        <Controls position="bottom-left" />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          style={{
            width: 150,
            height: 96,
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #E2DDD5',
            borderRadius: 10,
          }}
          nodeColor={n => {
            if (n.data?.is_target) return '#7C68D8'
            if ((n.data?.tags || []).includes('UBO')) return '#F6AD55'
            if ((n.data?.tags || []).includes('OFAC') || (n.data?.tags || []).includes('LOOP')) return '#FC8181'
            if (n.data?.isBelowTarget) return '#CBD5E1'
            return '#90CDF4'
          }}
        />
      </ReactFlow>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid #E2DDD5',
          borderRadius: 14,
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          pointerEvents: 'none',
          minWidth: 168,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#8C8070',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 4,
          }}
        >
          Legend
        </div>
        {[
          { bg: '#EEF0FB', border: '#7C68D8', circle: false, label: 'Target Company' },
          { bg: '#fffbeb', border: '#F6AD55', circle: true,  label: '👑 UBO Identified' },
          { bg: '#F8F7FB', border: '#C4B5FD', circle: false, label: 'Corporate Owner' },
          { bg: '#F7F8FC', border: '#C7D2FE', circle: true,  label: 'Individual / Officer' },
          { bg: '#EBF8FF', border: '#63B3ED', circle: false, label: 'Offshore Entity' },
          { bg: '#fff5f5', border: '#FC8181', circle: false, label: 'OFAC / High Risk' },
          { bg: '#F0FFF4', border: '#68D391', circle: false, label: 'PDF Verified' },
        ].map(({ bg, border, circle, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: circle ? 6 : 3,
                background: bg,
                border: `1.5px solid ${border}`,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 10.5, color: '#5C5248' }}>{label}</span>
          </div>
        ))}

        <div style={{ height: 1, background: '#E2DDD5', margin: '4px 0' }} />

        {[
          { color: '#4338CA', dash: 'none', width: 2.4, label: 'Ownership (PSC)' },
          { color: '#7C3AED', dash: '6 4',  width: 1.8, label: 'Depth-2 Chain' },
          { color: '#94A3B8', dash: '3 3',  width: 1.4, label: 'Director / Officer' },
          { color: '#0D9488', dash: '8 4',  width: 2.0, label: 'PDF Verified' },
          { color: '#C53030', dash: '4 4',  width: 1.6, label: 'Unverified / AI' },
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
