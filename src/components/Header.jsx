import { useLocation } from 'react-router-dom'

const PAGE_INFO = {
  '/gia': {
    title: 'Tính Giá Giảm',
    subtitle: 'Tính nhanh giá sau khi giảm',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="white" strokeWidth="1.8"/>
        <path d="M11 6v1.5M11 14.5V16" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8.5 9.2C8.5 8.3 9.2 7.5 11 7.5c1.4 0 2.5.8 2.5 2 0 2.5-4 2-4 4.5 0 1.2 1.1 2 2.5 2 1.8 0 2.5-.9 2.5-1.7" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  '/hsd': {
    title: 'Tính Ngày HSD',
    subtitle: 'Kiểm tra hạn sử dụng sản phẩm',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <rect x="2" y="3" width="18" height="17" rx="3" stroke="white" strokeWidth="1.8"/>
        <path d="M7 2v2M15 2v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M2 8h18" stroke="white" strokeWidth="1.5"/>
        <path d="M7 12h2M11 12h2M7 15.5h2M11 15.5h2M15 12h1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  '/mas': {
    title: 'Tra Cứu Mã Số',
    subtitle: 'Tìm mã sản phẩm nhanh chóng',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8"/>
        <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8"/>
        <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="white" strokeWidth="1.8"/>
        <path d="M12 14.5h7M15.5 12v7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  '/expiry': {
    title: 'Sản Phẩm Cận Date',
    subtitle: 'Theo dõi hàng sắp hết hạn',
    icon: (
      <svg viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="white" strokeWidth="1.8"/>
        <path d="M11 7v4l2.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
}

export default function Header({ darkMode, onToggleDark }) {
  const { pathname } = useLocation()
  const info = PAGE_INFO[pathname] || PAGE_INFO['/gia']

  return (
    <header className="header">
      <div className="header-icon">{info.icon}</div>
      <div className="header-text">
        <h1>{info.title}</h1>
        <p>{info.subtitle}</p>
      </div>
      <button
        className="dark-toggle"
        onClick={onToggleDark}
        aria-label={darkMode ? 'Chuyển sáng' : 'Chuyển tối'}
        title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
