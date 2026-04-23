import { useState, useCallback, useRef, useEffect } from 'react'
import MicPopup from '../components/MicPopup'

const VI_MAP = [
  [/[àáâãäåăắặẵẳấầẩẫą]/gi, 'a'],
  [/[èéêëěẻẹẽếềểễệ]/gi, 'e'],
  [/[ìíîïỉịĩ]/gi, 'i'],
  [/[òóôõöøợớờởỡọốồổỗő]/gi, 'o'],
  [/[ùúûüủụũưứừửữự]/gi, 'u'],
  [/[ýỳỷỹỵ]/gi, 'y'],
  [/[đ]/gi, 'd'],
]

function removeAccents(str) {
  let s = str.toLowerCase()
  VI_MAP.forEach(([re, rep]) => { s = s.replace(re, rep) })
  return s
}

function getInitials(str) {
  return removeAccents(str)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join('');
}

function highlight(text, query) {
  if (!query) return text
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  try {
    return text.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>')
  } catch { return text }
}

export default function MasPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showMic, setShowMic] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const toastTimer = useRef(null)
  const inputRef = useRef()

  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSaWH8C82WPlKgbO7SRnXxC9DB80tasOqoueJ1hQFFIb-i-FxuF3mGmn5OliJS-NqZ2_EtDBp6kAbk/pub?output=csv";

  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then(res => res.text())
      .then(csvText => {
        const rows = csvText.split('\n').slice(1);
        const parsedData = rows.map(row => {
          const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          return {
            name: columns[0]?.replace(/"/g, '').trim() || '',
            code: columns[1]?.replace(/"/g, '').trim() || '',
            note: columns[2]?.replace(/"/g, '').trim() || ''
          };
        }).filter(item => item.name && item.code);
        
        setData(parsedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải dữ liệu:", err);
        setLoading(false);
      });
  }, []);

  const results = useCallback(() => {
    const q = query.trim()
    if (!q) return data
    const qNorm = removeAccents(q)
    const qLower = q.toLowerCase()
    
    return data.filter(item => {
      const nameNorm = removeAccents(item.name)
      const codeLow = item.code.toLowerCase()
      const initials = getInitials(item.name)

      return nameNorm.includes(qNorm) || 
             item.name.toLowerCase().includes(qLower) || 
             codeLow.includes(qLower) ||
             initials.includes(qNorm)
    })
  }, [query, data])();

  function copyCode(code) {
    const speak = () => {
      if (!window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance('Mã số: ' + code)
      utt.lang = 'vi-VN'; utt.rate = 0.95
      window.speechSynthesis.speak(utt)
    }
    const doToast = () => {
      clearTimeout(toastTimer.current)
      setShowToast(true)
      toastTimer.current = setTimeout(() => setShowToast(false), 2000)
      speak()
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(doToast).catch(() => legacyCopy(code, doToast))
    } else {
      legacyCopy(code, doToast)
    }
  }

  function legacyCopy(text, cb) {
    const ta = document.createElement('textarea')
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy'); cb() } catch (_) {}
    document.body.removeChild(ta)
  }

  // BỔ SUNG LẠI 2 HÀM BỊ THIẾU Ở ĐÂY 👇
  function clearQuery() {
    setQuery('')
    inputRef.current?.focus()
  }

  function handleMicResult(text) {
    setQuery(text.trim())
  }
  // 👆

  return (
    <div className="mas-page">
      <div className="mas-search-bar">
        <div className="mas-input-row">
          <div className="mas-input-wrap">
            <span className="mas-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input ref={inputRef} className="mas-input" type="text"
              placeholder="Tìm tên hoặc viết tắt (vdu: dch)..." autoComplete="off"
              autoCorrect="off" spellCheck={false} value={query}
              onChange={e => setQuery(e.target.value)} 
              disabled={loading}
            />
            {query && (
              <button className="mas-clear-btn" onClick={clearQuery}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
          <button className={`mas-mic-btn${showMic ? ' listening' : ''}`}
            onClick={() => setShowMic(true)} disabled={loading}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8"  y1="22" x2="16" y2="22"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="mas-list">
        {loading ? (
          <div className="mas-loading-container">
            <div className="mas-spinner"></div>
            <div className="mas-loading-text">Đang tải dữ liệu từ Google Sheets...</div>
          </div>
        ) : results.length === 0 ? (
          <div className="mas-empty">
            <div className="mas-empty-icon">🔍</div>
            <div className="mas-empty-title">Không tìm thấy</div>
            <div className="mas-empty-sub">Thử tìm bằng tên khác hoặc không dấu</div>
          </div>
        ) : (
          <>
            {query && (
              <div className="mas-count">Tìm thấy {results.length} kết quả</div>
            )}
            {results.map((item, i) => (
              <div key={i} className="mas-item" onClick={() => copyCode(item.code)}>
                <div className="mas-item-left">
                  <div className="mas-item-name"
                    dangerouslySetInnerHTML={{ __html: query ? highlight(item.name, query) : item.name }} />
                  {item.note && <div className="mas-item-sub">{item.note}</div>}
                </div>
                <div className="mas-item-code">{item.code}</div>
              </div>
            ))}
          </>
        )}
        <div className="footer">Bách Hoá Xanh · Tra Cứu Code</div>
      </div>
      <div className={`copy-toast${showToast ? ' show' : ''}`}>✅ Đã sao chép mã số!</div>
      <MicPopup show={showMic} onClose={() => setShowMic(false)} onResult={handleMicResult} />
    </div>
  )
}
