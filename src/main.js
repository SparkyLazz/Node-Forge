import { initState } from './core/state.js'
import { initCanvas } from './core/canvas.js'
import { initHistory } from './core/history.js'
import { initSidebar } from './ui/sidebar.js'
import { initContextMenu } from './ui/contextmenu.js'
import { initModal } from './ui/modal.js'

// Boot order matters
initState()
initHistory()
initCanvas()
initSidebar()
initContextMenu()
initModal()