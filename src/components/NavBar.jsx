import { NavLink } from 'react-router-dom'

export default function NavBar() {
  const cls = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

  return (
    <nav className="nav-bar">
      <NavLink to="/hsd" className={cls}>
        <svg viewBox="0 0 22 22" fill="none">
          <rect x="2" y="3" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M7 2v2M15 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M2 8h18" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 12h2M11 12h2M7 15.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Tính HSD
      </NavLink>

      <NavLink to="/gia" className={cls}>
        <svg viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M11 6v1.5M11 14.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M8.5 9.2C8.5 8.3 9.2 7.5 11 7.5c1.4 0 2.5.8 2.5 2 0 2.5-4 2-4 4.5 0 1.2 1.1 2 2.5 2 1.8 0 2.5-.9 2.5-1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Tính Giá
      </NavLink>

      <NavLink to="/mas" className={cls}>
        <svg viewBox="0 0 22 22" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
          <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
          <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M12 14.5h7M15.5 12v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        Code
      </NavLink>
    </nav>
  )
}
