import { NODE_COLORS, NODE_BADGES, TYPE_COLORS, PORT_TYPES } from '../nodes/port.js'
import { addNodeAt } from '../nodes/node.js'

export function initSidebar() {
    const sidebar = document.getElementById('sidebar')

    sidebar.innerHTML = `
    <div class="sidebar-title">Node Types</div>
    <div class="node-palette" id="node-palette"></div>
    <div class="sidebar-sep"></div>
    <div class="sidebar-title">Port Types</div>
    <div class="type-legend" id="type-legend"></div>
  `

    // Node palette
    const palette = document.getElementById('node-palette')
    Object.entries(NODE_COLORS).forEach(([type, color]) => {
        const item = document.createElement('div')
        item.className = 'palette-item'
        item.draggable = true
        item.innerHTML = `
      <div class="palette-dot" style="background:${color}"></div>
      ${capitalize(type)}
      <span class="badge">${NODE_BADGES[type]}</span>
    `

        // Click to add at default position
        item.onclick = () => {
            const wrap = document.getElementById('canvas-wrap')
            const r = wrap.getBoundingClientRect()
            addNodeAt(
                (r.width  / 2 - 100) / 1,
                (r.height / 2 - 60)  / 1,
                type
            )
        }

        // Drag to canvas
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('nodeType', type)
        })

        palette.appendChild(item)
    })

    // Canvas drop
    const wrap = document.getElementById('canvas-wrap')
    wrap.addEventListener('dragover', e => e.preventDefault())
    wrap.addEventListener('drop', e => {
        e.preventDefault()
        const type = e.dataTransfer.getData('nodeType')
        if (!type) return
        import('../core/canvas.js').then(({ canvasToWorld }) => {
            const pos = canvasToWorld(e.clientX, e.clientY)
            addNodeAt(pos.x, pos.y, type)
        })
    })

    // Type legend
    const legend = document.getElementById('type-legend')
    Object.entries(TYPE_COLORS).forEach(([type, color]) => {
        const row = document.createElement('div')
        row.className = 'type-row'
        row.innerHTML = `
      <div class="type-dot" style="background:${color}"></div>
      ${type}
    `
        legend.appendChild(row)
    })
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}