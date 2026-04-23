import { state, saveToStorage } from './state.js'
import { renderAllNodes } from '../nodes/node.js'
import { renderConnections } from '../connections/connection.js'
import { updateStats } from './canvas.js'

const MAX_HISTORY = 50
let history = []
let cursor = -1

export function initHistory() {
    // Take first snapshot after state loads
    setTimeout(() => snapshot(), 100)
}

export function snapshot() {
    // Cut off any future states if we undid and then made a change
    history = history.slice(0, cursor + 1)

    const entry = {
        nodes: state.nodes.map(n => ({
            ...n,
            ports: n.ports.map(p => ({ ...p }))
        })),
        connections: state.connections.map(c => ({ ...c }))
    }

    history.push(entry)

    // Keep history size under limit
    if (history.length > MAX_HISTORY) {
        history.shift()
    }

    cursor = history.length - 1
}

export function undo() {
    if (cursor <= 0) {
        console.log('Nothing to undo')
        return
    }

    cursor--
    restoreSnapshot(history[cursor])
}

export function redo() {
    if (cursor >= history.length - 1) {
        console.log('Nothing to redo')
        return
    }

    cursor++
    restoreSnapshot(history[cursor])
}

function restoreSnapshot(entry) {
    if (!entry) return

    // Remove all node elements from DOM
    state.nodes.forEach(n => {
        if (n.el) n.el.remove()
    })

    // Restore state
    state.nodes = entry.nodes.map(n => ({
        ...n,
        ports: n.ports.map(p => ({ ...p })),
        el: null
    }))
    state.connections = entry.connections.map(c => ({ ...c }))
    state.selectedNode = null

    // Re-render everything
    renderAllNodes()
    renderConnections()
    updateStats()
    saveToStorage()
}