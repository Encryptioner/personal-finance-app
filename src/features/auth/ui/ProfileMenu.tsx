import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../model/auth-store'

/**
 * Avatar button shown when authenticated.
 * Dropdown shows user email + "Sign out" option.
 */
export function ProfileMenu() {
  const profile = useAuthStore((s) => s.profile)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close on Escape and outside click
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (!profile) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <img
          src={profile.picture}
          alt={profile.name}
          className="h-8 w-8 rounded-full"
          referrerPolicy="no-referrer"
        />
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
          {profile.name}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card shadow-lg z-50"
          role="menu"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium truncate">{profile.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Synced to your Google Drive</p>
          </div>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void useAuthStore.getState().signOut()
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
