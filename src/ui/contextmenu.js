import { NODE_COLORS } from '../nodes/port.js'
import { addNode } from '../nodes/node.js'
import { deselectAll } from '../nodes/node.js'

export function initContextMenu() {
    const menu = document.getElementById('ctx-menu')

    // Build menu
    menu.innerHTML = `
    <div class="ctx-title">Add Node</div>
    ${Object.entries(NODE_COLORS).map(([type, color]) => `
      <div class="ctx-item" data-type="${type}">
        <div class="ctx-dot" style="background:${color}"></div>
        ${capitalize(type)}
      </div>
    `).join('')}
  `

    // Click items
    menu.querySelectorAll('.ctx-item').forEach(item => {
        item.onclick = () => {
            const type = item.dataset.type
            const rect = menu.getBoundingClientRect()
            addNode(
                parseInt(menu.style.left),
                parseInt(menu.style.top),
                type
            )
            menu.classList.remove('visible')
        }
    })

    // Right click on canvas
    const wrap = document.getElementById('canvas-wrap')
    wrap.addEventListener('contextmenu', e => {
        e.preventDefault()
        menu.style.left = e.clientX + 'px'
        menu.style.top  = e.clientY + 'px'
        menu.classList.add('visible')

        // Store click position for node placement
        menu.dataset.cx = e.clientX
        menu.dataset.cy = e.clientY

        // Update click handlers with correct position
        menu.querySelectorAll('.ctx-item').forEach(item => {
            item.onclick = () => {
                addNode(
                    parseInt(menu.dataset.cx),
                    parseInt(menu.dataset.cy),
                    item.dataset.type
                )
                menu.classList.remove('visible')
            }
        })
    })

    // Click outside to close
    window.addEventListener('mousedown', e => {
        if (!menu.contains(e.target)) {
            menu.classList.remove('visible')
        }
    })
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}