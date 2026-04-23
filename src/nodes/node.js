import { state, saveToStorage } from '../core/state.js'
import { updateStats, canvasToWorld } from '../core/canvas.js'
import { snapshot } from '../core/history.js'
import { renderConnections } from '../connections/connection.js'
import {
    TYPE_COLORS, NODE_COLORS, NODE_DEFAULTS,
    NODE_BADGES, makePort, makePortElement
} from './port.js'

// ── NODE NAMES ──
const NODE_NAMES = {
    function:  'myFunction',
    class:     'MyClass',
    variable:  'myVar',
    event:     'onTrigger',
    interface: 'IMyInterface',
    comment:   '// Comment',
}

// ── ADD NODE ──
export function addNode(clientX, clientY, type) {
    const pos = canvasToWorld(clientX, clientY)
    addNodeAt(pos.x, pos.y, type)
}

export function addNodeAt(x, y, type) {
    const id = 'n' + (++state.nodeCounter)
    const defaults = NODE_DEFAULTS[type]
    const ports = defaults.ports.map(p => makePort(p.label, p.type, p.dir))

    const node = {
        id,
        type,
        name: NODE_NAMES[type],
        x,
        y,
        ports,
        note: '',
        el: null,
    }

    state.nodes.push(node)
    renderNode(node)
    updateStats()
    snapshot()
    saveToStorage()
    return node
}

// ── RENDER NODE ──
export function renderNode(node) {
    if (node.el) node.el.remove()

    const col = NODE_COLORS[node.type]
    const el = document.createElement('div')
    el.className = 'gnode'
    el.id = node.id
    el.style.left = node.x + 'px'
    el.style.top  = node.y + 'px'

    // ── HEADER ──
    const hdr = document.createElement('div')
    hdr.className = 'node-header'
    hdr.style.background = `linear-gradient(135deg, ${col}22, ${col}11)`
    hdr.style.borderBottom = `1px solid ${col}33`

    const bar = document.createElement('div')
    bar.className = 'node-accent-bar'
    bar.style.background = col

    const badge = document.createElement('div')
    badge.className = 'node-type-badge'
    badge.style.color = col
    badge.textContent = NODE_BADGES[node.type]

    const nameEl = document.createElement('div')
    nameEl.className = 'node-name'
    nameEl.textContent = node.name
    nameEl.style.color = col
    nameEl.contentEditable = true
    nameEl.spellcheck = false
    nameEl.onmousedown = e => e.stopPropagation()
    nameEl.oninput = () => {
        node.name = nameEl.textContent.trim()
        saveToStorage()
    }

    const closeBtn = document.createElement('button')
    closeBtn.className = 'node-close'
    closeBtn.innerHTML = '×'
    closeBtn.onclick = e => {
        e.stopPropagation()
        removeNode(node.id)
    }

    hdr.append(bar, badge, nameEl, closeBtn)

    // Drag on header
    hdr.onmousedown = e => {
        if (e.target === nameEl || e.target === closeBtn) return
        e.stopPropagation()
        selectNode(node.id)
        startNodeDrag(e, node)
    }

    el.appendChild(hdr)

    // ── NOTE FIELD ──
    const noteEl = document.createElement('textarea')
    noteEl.className = 'node-note'
    noteEl.placeholder = 'Add a note...'
    noteEl.value = node.note || ''
    noteEl.rows = 1
    noteEl.onmousedown = e => e.stopPropagation()
    noteEl.oninput = () => {
        node.note = noteEl.value
        saveToStorage()
    }
    el.appendChild(noteEl)

    // ── PORTS BODY ──
    const body = document.createElement('div')
    body.className = 'node-body'

    const inPorts  = node.ports.filter(p => p.dir === 'in')
    const outPorts = node.ports.filter(p => p.dir === 'out')

    if (inPorts.length) {
        const lbl = makePortSectionLabel('Inputs', false)
        body.appendChild(lbl)
        inPorts.forEach(p => {
            const { row, dot } = makePortElement(node.id, p)
            dot.onmousedown = e => {
                e.stopPropagation()
                import('../connections/connection.js')
                    .then(m => m.startConnection(e, node.id, p.id, p.dir, p.type))
            }
            body.appendChild(row)
        })
    }

    if (inPorts.length && outPorts.length) {
        const div = document.createElement('div')
        div.className = 'node-divider'
        body.appendChild(div)
    }

    if (outPorts.length) {
        const lbl = makePortSectionLabel('Outputs', true)
        body.appendChild(lbl)
        outPorts.forEach(p => {
            const { row, dot } = makePortElement(node.id, p)
            dot.onmousedown = e => {
                e.stopPropagation()
                import('../connections/connection.js')
                    .then(m => m.startConnection(e, node.id, p.id, p.dir, p.type))
            }
            body.appendChild(row)
        })
    }

    // ── ADD PORT BUTTONS ──
    const addDiv = document.createElement('div')
    addDiv.className = 'node-add-ports'

    const addIn = document.createElement('button')
    addIn.className = 'add-port-btn'
    addIn.textContent = '+ Input'
    addIn.onclick = e => {
        e.stopPropagation()
        import('../ui/modal.js').then(m => m.openPortModal(node.id, 'in'))
    }

    const addOut = document.createElement('button')
    addOut.className = 'add-port-btn right'
    addOut.textContent = '+ Output'
    addOut.onclick = e => {
        e.stopPropagation()
        import('../ui/modal.js').then(m => m.openPortModal(node.id, 'out'))
    }

    addDiv.append(addIn, addOut)
    body.appendChild(addDiv)
    el.appendChild(body)

    // Click to select
    el.onclick = e => {
        e.stopPropagation()
        selectNode(node.id)
    }

    document.getElementById('graph-root').appendChild(el)
    node.el = el

    // Warn if too many connections
    checkMessDetector(node)
}

// ── RENDER ALL (used by history restore) ──
export function renderAllNodes() {
    state.nodes.forEach(n => renderNode(n))
}

// ── PORT SECTION LABEL ──
function makePortSectionLabel(text, right) {
    const lbl = document.createElement('div')
    lbl.className = 'port-section-label'
    lbl.textContent = text
    if (right) lbl.style.textAlign = 'right'
    return lbl
}

// ── NODE DRAG ──
function startNodeDrag(e, node) {
    const { canvasToWorld } = require('../core/canvas.js')
    import('../core/canvas.js').then(({ canvasToWorld, pan, zoom }) => {
        const wrap = document.getElementById('canvas-wrap')
        const r = wrap.getBoundingClientRect()
        const offsetX = (e.clientX - r.left - pan.x) / zoom - node.x
        const offsetY = (e.clientY - r.top  - pan.y) / zoom - node.y

        function onMove(e) {
            const pos = canvasToWorld(e.clientX, e.clientY)
            node.x = pos.x - offsetX
            node.y = pos.y - offsetY
            node.el.style.left = node.x + 'px'
            node.el.style.top  = node.y + 'px'
            renderConnections()
        }

        function onUp() {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            saveToStorage()
            snapshot()
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    })
}

// ── SELECT ──
export function selectNode(id) {
    deselectAll()
    state.selectedNode = id
    const nd = state.nodes.find(n => n.id === id)
    if (nd && nd.el) nd.el.classList.add('selected')
}

export function deselectAll() {
    state.selectedNode = null
    state.nodes.forEach(n => {
        if (n.el) n.el.classList.remove('selected')
    })
}

// ── DELETE ──
export function removeNode(id) {
    state.connections = state.connections.filter(
        c => c.fromNode !== id && c.toNode !== id
    )
    const nd = state.nodes.find(n => n.id === id)
    if (nd && nd.el) nd.el.remove()
    state.nodes = state.nodes.filter(n => n.id !== id)
    renderConnections()
    updateStats()
    snapshot()
    saveToStorage()
}

export function deleteSelected() {
    if (state.selectedNode) removeNode(state.selectedNode)
}

export function clearAll() {
    if (!confirm('Clear all nodes and connections?')) return
    state.nodes.forEach(n => { if (n.el) n.el.remove() })
    state.nodes = []
    state.connections = []
    document.querySelectorAll('.connection-path').forEach(p => p.remove())
    updateStats()
    snapshot()
    saveToStorage()
}

// ── AUTO LAYOUT ──
export function autoLayout() {
    const cols = Math.ceil(Math.sqrt(state.nodes.length))
    const gapX = 280
    const gapY = 200
    state.nodes.forEach((nd, i) => {
        nd.x = 60 + (i % cols) * gapX
        nd.y = 60 + Math.floor(i / cols) * gapY
        if (nd.el) {
            nd.el.style.left = nd.x + 'px'
            nd.el.style.top  = nd.y + 'px'
        }
    })
    renderConnections()
    saveToStorage()
    snapshot()
}

// ── EXPORT JSON ──
export function exportJSON() {
    const data = {
        nodes: state.nodes.map(n => ({
            id: n.id, type: n.type, name: n.name,
            x: n.x, y: n.y, ports: n.ports, note: n.note
        })),
        connections: state.connections
    }
    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nodeforge-graph.json'
    a.click()
}

// ── MESS DETECTOR ──
export function checkMessDetector(node) {
    const count = state.connections.filter(
        c => c.fromNode === node.id || c.toNode === node.id
    ).length

    if (!node.el) return

    if (count >= 6) {
        node.el.classList.add('messy')
        node.el.title = `⚠️ Too many connections (${count}) — consider splitting this node`
    } else {
        node.el.classList.remove('messy')
        node.el.title = ''
    }
}

export function refreshMessDetector() {
    state.nodes.forEach(n => checkMessDetector(n))
}