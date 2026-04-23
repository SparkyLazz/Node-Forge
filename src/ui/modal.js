import { state, saveToStorage } from '../core/state.js'
import { makePort, PORT_TYPES } from '../nodes/port.js'
import { renderNode } from '../nodes/node.js'
import { renderConnections } from '../connections/connection.js'
import { snapshot } from '../core/history.js'

let pendingNodeId  = null
let pendingDir     = 'in'

export function initModal() {
    const modal = document.getElementById('port-modal')

    modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">Add Port</div>
      <div class="modal-field">
        <label class="modal-label">Port Name</label>
        <input class="modal-input" id="pm-name" placeholder="e.g. inputValue" />
      </div>
      <div class="modal-field">
        <label class="modal-label">Type</label>
        <select class="modal-select" id="pm-type">
          ${PORT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="modal-field">
        <label class="modal-label">Direction</label>
        <select class="modal-select" id="pm-dir">
          <option value="in">Input</option>
          <option value="out">Output</option>
        </select>
      </div>
      <div class="modal-btns">
        <button class="modal-btn cancel" id="pm-cancel">Cancel</button>
        <button class="modal-btn primary" id="pm-confirm">Add Port</button>
      </div>
    </div>
  `

    document.getElementById('pm-cancel').onclick = closePortModal
    document.getElementById('pm-confirm').onclick = confirmAddPort

    // Close on backdrop click
    modal.addEventListener('mousedown', e => {
        if (e.target === modal) closePortModal()
    })

    // Enter to confirm
    document.getElementById('pm-name').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmAddPort()
        if (e.key === 'Escape') closePortModal()
    })
}

export function openPortModal(nodeId, defaultDir) {
    pendingNodeId = nodeId
    pendingDir    = defaultDir
    document.getElementById('pm-name').value  = ''
    document.getElementById('pm-type').value  = 'any'
    document.getElementById('pm-dir').value   = defaultDir
    document.getElementById('port-modal').classList.add('visible')
    setTimeout(() => document.getElementById('pm-name').focus(), 50)
}

export function closePortModal() {
    document.getElementById('port-modal').classList.remove('visible')
    pendingNodeId = null
}

function confirmAddPort() {
    const name = document.getElementById('pm-name').value.trim() || 'port'
    const type = document.getElementById('pm-type').value
    const dir  = document.getElementById('pm-dir').value

    if (!pendingNodeId) return

    const nd = state.nodes.find(n => n.id === pendingNodeId)
    if (!nd) return

    nd.ports.push(makePort(name, type, dir))
    renderNode(nd)
    renderConnections()
    saveToStorage()
    snapshot()
    closePortModal()
}