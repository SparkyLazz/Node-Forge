export const TYPE_COLORS = {
    int:    '#4fc3f7',
    float:  '#81c784',
    string: '#ffb74d',
    bool:   '#f06292',
    object: '#ce93d8',
    array:  '#80cbc4',
    void:   '#90a4ae',
    any:    '#e0e0e0',
}

export const PORT_TYPES = Object.keys(TYPE_COLORS)

export const NODE_COLORS = {
    function:  '#5b7cfa',
    class:     '#7c5bfa',
    variable:  '#fa7c5b',
    event:     '#5bfa9a',
    interface: '#fa5b9a',
    comment:   '#fad65b',
}

export const NODE_TYPES = Object.keys(NODE_COLORS)

export const NODE_DEFAULTS = {
    function: {
        ports: [
            { label: 'params', type: 'any',    dir: 'in'  },
            { label: 'return', type: 'void',   dir: 'out' },
        ]
    },
    class: {
        ports: [
            { label: 'extends',  type: 'object', dir: 'in'  },
            { label: 'instance', type: 'object', dir: 'out' },
        ]
    },
    variable: {
        ports: [
            { label: 'value', type: 'any', dir: 'out' },
        ]
    },
    event: {
        ports: [
            { label: 'trigger', type: 'void', dir: 'out' },
        ]
    },
    interface: {
        ports: [
            { label: 'impl', type: 'object', dir: 'out' },
        ]
    },
    comment: {
        ports: []
    },
}

export const NODE_BADGES = {
    function:  'fn',
    class:     'cls',
    variable:  'var',
    event:     'evt',
    interface: 'ifc',
    comment:   '//',
}

export function makePort(label, type, dir) {
    return {
        id:    'p' + Date.now() + Math.random().toString(36).slice(2, 6),
        label,
        type,
        dir,
    }
}

export function canConnect(typeA, typeB) {
    // 'any' connects to everything
    if (typeA === 'any' || typeB === 'any') return true
    return typeA === typeB
}

export function makePortElement(nodeId, port) {
    const row = document.createElement('div')
    row.className = 'port-row ' + port.dir
    row.id = nodeId + '_' + port.id

    const dot = document.createElement('div')
    dot.className = 'port-dot ' + port.dir
    dot.style.color = TYPE_COLORS[port.type] || '#e0e0e0'
    dot.id = nodeId + '_' + port.id + '_dot'
    dot.title = port.type

    const label = document.createElement('div')
    label.className = 'port-label'
    label.textContent = port.label

    const tag = document.createElement('div')
    tag.className = 'port-type-tag'
    tag.textContent = port.type
    tag.style.color = TYPE_COLORS[port.type] || '#e0e0e0'

    if (port.dir === 'in') {
        row.append(dot, label, tag)
    } else {
        row.append(tag, label, dot)
    }

    return { row, dot }
}