import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Radix UI requires ResizeObserver in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Radix UI Popper requires window.DOMRect
if (!global.DOMRect) {
  global.DOMRect = class implements DOMRect {
    bottom = 0; height = 0; left = 0; right = 0; top = 0; width = 0; x = 0; y = 0
    static fromRect(_rect?: DOMRectInit): DOMRect { return new global.DOMRect() }
    toJSON(): unknown { return {} }
  }
}

// Radix UI Select / Popover require window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
