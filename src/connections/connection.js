import { state, saveToStorage } from '../core/state.js'
import { snapshot } from '../core/history.js'
import { pan, zoom } from '../core/canvas.js'
import { TYPE_COLORS, canConnect } from '../nodes/port.js'
import { checkMessDetector } from '../nodes/node.js'

let connectingFrom = null
let previewLine = null

// ── START CONNECTION ──
export function startConnection(e, nodeId, portId, dir, type) {
    e.preventDefault()

    // If already connecting — try to finish
    if (connectingFrom) {
        const same = connectingFrom.nodeId === nodeId
        const sameDir = connectingFrom.dir === dir

        if (!same && !sameDir) {
            const fromIsOut = connectingFrom.dir === 'out'
            const fromNode  = fromIsOut ? connectingFrom.nodeId : nodeId
            const fromPort  = fromIsOut ? connectingFrom.portId : portId
            const toNode    = fromIsOut ? nodeId : connectingFrom.nodeId
            const toPort    = fromIsOut ? portId : connectingFrom.portId
            const fromType  = fromIsOut ? connectingFrom.type : type
            const toType    = fromIsOut ? type : connectingFrom.type

            if (!canConnect(fromType, toType)) {
                showTypeError(nodeId, portId)
                cancelConnection()
                return
            }

            addConnection(fromNode, fromPort, toNode, toPort, fromType)
        }

        cancelConnection()
        return
    }

    // Start new connection
    connectingFrom = { nodeId, portId, dir, type }
    const dot = document.getElementById(nodeId + '_' + portId + '_dot')
    if (dot) dot.classList.add('active')

    // Preview line
    const svg = document.getElementById('svg-layer')
    previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    previewLine.classList.add('connection-preview')
    svg.appendChild(previewLine)

    // Track mouse for preview
    window.addEventListener('mousemove', onPreviewMove)
    window.addEventListener('mousedown', onPreviewCancel)
}

function onPreviewMove(e) {
    if (!connectingFrom || !previewLine) return
    const wrap = document.getElementById('canvas-wrap')
    const r = wrap.getBoundingClientRect()
    const mx = (e.clientX - r.left - pan.x) / zoom
    const my = (e.clientY - r.top  - pan.y) / zoom
    const from = getPortPos(connectingFrom.nodeId, connectingFrom.portId)
    previewLine.setAttribute('d', bezierPath(from.x, from.y, mx, my))
    previewLine.setAttribute('stroke', TYPE_COLORS[connectingFrom.type] || '#fff')
}

function onPreviewCancel(e) {
    // Only cancel if clicking on empty canvas
    if (e.target.classList.contains('port-dot')) return
    if (e.target.id === 'canvas-wrap' || e.target.id === 'grid-canvas') {
        cancelConnection()
    }
}

export function cancelConnection() {
    if (connectingFrom) {
        const dot = document.getElementById(
            connectingFrom.nodeId + '_' + connectingFrom.portId + '_dot'
        )
        if (dot) dot.classList.remove('active')
        connectingFrom = null
    }
    if (previewLine) {
        previewLine.remove()
        previewLine = null
    }
    window.removeEventListener('mousemove', onPreviewMove)
    window.removeEventListener('mousedown', onPreviewCancel)
}

// ── ADD CONNECTION ──
export function addConnection(fromNode, fromPort, toNode, toPort, type) {
    // No duplicates
    const exists = state.connections.find(
        c => c.fromNode === fromNode &&
            c.fromPort === fromPort &&
            c.toNode   === toNode   &&
            c.toPort   === toPort
    )
    if (exists) return

    const id = 'c' + (++state.connCounter)
    state.connections.push({ id, fromNode, fromPort, toNode, toPort, type })

    renderConnections()
    checkMessDetector(state.nodes.find(n => n.id === fromNode))
    checkMessDetector(state.nodes.find(n => n.id === toNode))
    saveToStorage()
    snapshot()
}

// ── REMOVE CONNECTION ──
export function removeConnection(id) {
    const c = state.connections.find(c => c.id === id)
    state.connections = state.connections.filter(c => c.id !== id)
    if (c) {
        checkMessDetector(state.nodes.find(n => n.id === c.fromNode))
        checkMessDetector(state.nodes.find(n => n.id === c.toNode))
    }
    renderConnections()
    saveToStorage()
    snapshot()
}

// ── RENDER ALL CONNECTIONS ──
export function renderConnections() {
    const svg = document.getElementById('svg-layer')
    svg.querySelectorAll('.connection-path').forEach(p => p.remove())

    state.connections.forEach(c => {
        const from = getPortPos(c.fromNode, c.fromPort)
        const to   = getPortPos(c.toNode,   c.toPort)
        const col  = TYPE_COLORS[c.type] || '#e0e0e0'

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.classList.add('connection-path')
        path.setAttribute('d', bezierPath(from.x, from.y, to.x, to.y))
        path.setAttribute('stroke', col)
        path.setAttribute('data-id', c.id)
        path.style.filter = `drop-shadow(0 0 3px ${col}55)`

        path.onmousedown = e => {
            e.stopPropagation()
            removeConnection(c.id)
        }

        svg.insertBefore(path, svg.firstChild)
    })
}

// ── HELPERS ──
export function getPortPos(nodeId, portId) {
    const nd = state.nodes.find(n => n.id === nodeId)
    if (!nd || !nd.el) return { x: 0, y: 0 }

    const dot = document.getElementById(nodeId + '_' + portId + '_dot')
    if (!dot) return { x: nd.x, y: nd.y }

    const wrap = document.getElementById('canvas-wrap')
    const wr = wrap.getBoundingClientRect()
    const dr = dot.getBoundingClientRect()

    return {
        x: (dr.left + dr.width  / 2 - wr.left - pan.x) / zoom,
        y: (dr.top  + dr.height / 2 - wr.top  - pan.y) / zoom,
    }
}

function bezierPath(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.5 + 40
    return `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`
}

function showTypeError(nodeId, portId) {
    const dot = document.getElementById(nodeId + '_' + portId + '_dot')
    if (!dot) return
    dot.style.boxShadow = '0 0 0 4px #f06292'
    setTimeout(() => dot.style.boxShadow = '', 800)
}