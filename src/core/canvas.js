import { state } from './state.js'

export let pan = { x: 60, y: 60 }
export let zoom = 1
let isPanning = false
let panStart = { x: 0, y: 0 }
let spaceHeld = false

export function initCanvas() {
    const wrap = document.getElementById('canvas-wrap')
    const gridCanvas = document.getElementById('grid-canvas')
    const graphRoot = document.getElementById('graph-root')

    // Setup topbar
    document.getElementById('topbar').innerHTML = `
    <div class="logo">⬡ <span>Node</span>Forge</div>
    <div class="tb-sep"></div>
    <button class="tb-btn" id="btn-clear">🗑 Clear</button>
    <button class="tb-btn" id="btn-layout">⊞ Auto Layout</button>
    <button class="tb-btn" id="btn-export">↓ Export JSON</button>
    <button class="tb-btn" id="btn-save">💾 Save</button>
    <div class="spacer"></div>
    <div class="hint-text">
      <span><kbd>RClick</kbd> add node</span>
      <span><kbd>Space+Drag</kbd> pan</span>
      <span><kbd>Scroll</kbd> zoom</span>
      <span><kbd>Del</kbd> delete</span>
      <span><kbd>Ctrl+Z</kbd> undo</span>
    </div>
  `

    // Setup statusbar
    document.getElementById('statusbar').innerHTML = `
    <span><div class="dot"></div> Ready</span>
    <span id="stat-nodes">Nodes: 0</span>
    <span id="stat-conns">Connections: 0</span>
    <span id="stat-zoom">Zoom: 100%</span>
  `

    applyTransform()
    drawGrid()

    // Events
    wrap.addEventListener('mousedown', onMouseDown)
    wrap.addEventListener('mousemove', onMouseMove)
    wrap.addEventListener('mouseup', onMouseUp)
    wrap.addEventListener('wheel', onWheel, { passive: false })

    window.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            spaceHeld = true
            wrap.style.cursor = 'grab'
        }
        if (e.code === 'Delete' || e.code === 'Backspace') {
            import('../nodes/node.js').then(m => m.deleteSelected())
        }
        if (e.ctrlKey && e.key === 'z') {
            import('./history.js').then(m => m.undo())
        }
        if (e.ctrlKey && e.key === 'y') {
            import('./history.js').then(m => m.redo())
        }
        if (e.key === 'Escape') {
            import('../connections/connection.js').then(m => m.cancelConnection())
            document.getElementById('ctx-menu').classList.remove('visible')
            document.getElementById('port-modal').classList.remove('visible')
        }
    })

    window.addEventListener('keyup', e => {
        if (e.code === 'Space') {
            spaceHeld = false
            wrap.style.cursor = ''
        }
    })

    window.addEventListener('resize', () => {
        drawGrid()
    })

    // Topbar buttons
    document.getElementById('btn-clear').onclick = () => {
        import('../nodes/node.js').then(m => m.clearAll())
    }
    document.getElementById('btn-layout').onclick = () => {
        import('../nodes/node.js').then(m => m.autoLayout())
    }
    document.getElementById('btn-export').onclick = () => {
        import('../nodes/node.js').then(m => m.exportJSON())
    }
    document.getElementById('btn-save').onclick = () => {
        import('./state.js').then(m => {
            m.saveToStorage()
            showSaved()
        })
    }
}

function onMouseDown(e) {
    document.getElementById('ctx-menu').classList.remove('visible')
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
        isPanning = true
        panStart = { x: e.clientX - pan.x, y: e.clientY - pan.y }
        document.getElementById('canvas-wrap').classList.add('panning')
        e.preventDefault()
    }
}

function onMouseMove(e) {
    if (isPanning) {
        pan.x = e.clientX - panStart.x
        pan.y = e.clientY - panStart.y
        applyTransform()
    }
}

function onMouseUp() {
    if (isPanning) {
        isPanning = false
        document.getElementById('canvas-wrap').classList.remove('panning')
    }
}

function onWheel(e) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.08 : 0.93
    const wrap = document.getElementById('canvas-wrap')
    const r = wrap.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    pan.x = mx - (mx - pan.x) * factor
    pan.y = my - (my - pan.y) * factor
    zoom = Math.min(3, Math.max(0.2, zoom * factor))
    applyTransform()
}

export function applyTransform() {
    const graphRoot = document.getElementById('graph-root')
    if (graphRoot) {
        graphRoot.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`
    }
    drawGrid()
    const zoomEl = document.getElementById('stat-zoom')
    if (zoomEl) zoomEl.textContent = `Zoom: ${Math.round(zoom * 100)}%`
}

export function drawGrid() {
    const canvas = document.getElementById('grid-canvas')
    const wrap = document.getElementById('canvas-wrap')
    if (!canvas || !wrap) return
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    const step = 24 * zoom
    const ox = pan.x % step
    const oy = pan.y % step
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = ox; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = oy; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    for (let x = ox; x < w; x += step)
        for (let y = oy; y < h; y += step) {
            ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill()
        }
}

export function updateStats() {
    const ns = document.getElementById('stat-nodes')
    const cs = document.getElementById('stat-conns')
    if (ns) ns.textContent = `Nodes: ${state.nodes.length}`
    if (cs) cs.textContent = `Connections: ${state.connections.length}`
}

export function canvasToWorld(clientX, clientY) {
    const wrap = document.getElementById('canvas-wrap')
    const r = wrap.getBoundingClientRect()
    return {
        x: (clientX - r.left - pan.x) / zoom,
        y: (clientY - r.top  - pan.y) / zoom,
    }
}

function showSaved() {
    const btn = document.getElementById('btn-save')
    if (!btn) return
    btn.textContent = '✓ Saved!'
    setTimeout(() => btn.textContent = '💾 Save', 1500)
}