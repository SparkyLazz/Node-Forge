export const state = {
    nodes: [],
    connections: [],
    selectedNode: null,
    nodeCounter: 0,
    connCounter: 0,
}

export function initState() {
    loadFromStorage()
}

export function saveToStorage() {
    const data = {
        nodes: state.nodes.map(n => ({
            id: n.id, type: n.type, name: n.name,
            x: n.x, y: n.y, ports: n.ports, note: n.note || ''
        })),
        connections: state.connections
    }
    localStorage.setItem('nodeforge_graph', JSON.stringify(data))
}

export function loadFromStorage() {
    const raw = localStorage.getItem('nodeforge_graph')
    if (!raw) return
    try {
        const data = JSON.parse(raw)
        state.nodes = data.nodes || []
        state.connections = data.connections || []
        state.nodeCounter = state.nodes.length
        state.connCounter = state.connections.length
    } catch(e) {
        console.warn('Failed to load saved graph', e)
    }
}

export function clearStorage() {
    localStorage.removeItem('nodeforge_graph')
}