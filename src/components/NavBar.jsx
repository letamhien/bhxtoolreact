import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const PAGES = [
  {
    to: '/gia',
    label: 'Tính Giá',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M11 6v1.5M11 14.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8.5 9.2C8.5 8.3 9.2 7.5 11 7.5c1.4 0 2.5.8 2.5 2 0 2.5-4 2-4 4.5 0 1.2 1.1 2 2.5 2 1.8 0 2.5-.9 2.5-1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/hsd',
    label: 'Tính HSD',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <rect x="2" y="3" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M7 2v2M15 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M2 8h18" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 12h2M11 12h2M7 15.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/mas',
    label: 'Tra Cứu Code',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 14.5h7M15.5 12v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/expiry',
    label: 'Cận Date',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M11 7v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname }    = useLocation()
  const menuRef         = useRef()

  // Đóng menu khi click ngoài
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Đóng menu khi chuyển trang
  useEffect(() => { setOpen(false) }, [pathname])

  const currentPage = PAGES.find(p => p.to === pathname) || PAGES[0]

  return (
    <div className="nav-menu-wrap" ref={menuRef}>
      <button
        className={`nav-menu-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <span className="nav-menu-current-icon">{currentPage.icon}</span>
        <span className="nav-menu-current-label">{currentPage.label}</span>
        <svg className="nav-menu-chevron" viewBox="0 0 20 20" fill="none" width="16" height="16">
          <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="nav-dropdown">
          {PAGES.map(page => {
            const isActive = pathname === page.to
            return (
              <NavLink
                key={page.to}
                to={page.to}
                className={`nav-dropdown-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-dd-icon">{page.icon}</span>
                <span className="nav-dd-label">{page.label}</span>
                {isActive && (
                  <svg className="nav-dd-check" viewBox="0 0 20 20" fill="none" width="16" height="16">
                    <path d="M4 10l5 5 7-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
