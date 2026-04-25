import { useState, useEffect, useCallback } from 'react'

// ⚠ Thay YOUR_SHEET_ID và YOUR_SHEET_GID nếu cần
const SHEET_ID  = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
const SHEET_GID = '0'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/1WirG9TEy80vTA-X2IrxfREHNS6IhW6Kd-Olt_Q4ikBw/edit?gid=0#gid=0`

function parseSheet(raw) {
  // Google Sheets trả về dạng /*O_o*/\ngoogle.visualization.Query.setResponse({...})
  const json = JSON.parse(raw.replace(/^[^{]*/, '').replace(/[^}]*$/, ''))
  const rows  = json.table?.rows || []
  return rows.map(r => ({
    name:    r.c[0]?.v ?? '',
    code:    r.c[1]?.v ?? '',
    expiry:  r.c[2]?.v ?? '',   // dạng dd/mm/yyyy hoặc Date serial
    qty:     r.c[3]?.v ?? '',
    note:    r.c[4]?.v ?? '',
  })).filter(r => r.name)
}

function parseDate(val) {
  if (!val) return null
  // Nếu là chuỗi dd/mm/yyyy
  if (typeof val === 'string' && val.includes('/')) {
    const [d, m, y] = val.split('/').map(Number)
    return new Date(y, m - 1, d)
  }
  // Nếu là Date string
  return new Date(val)
}

function fmtDate(d) {
  if (!d || isNaN(d)) return '?'
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function getStatus(expDate) {
  if (!expDate || isNaN(expDate)) return 'unknown'
  const today = new Date(); today.setHours(0,0,0,0)
  const diff   = Math.round((expDate - today) / 86400000)
  if (diff < 0)   return 'expired'
  if (diff <= 3)  return 'critical'
  if (diff <= 7)  return 'warn'
  return 'ok'
}

function getDiff(expDate) {
  if (!expDate || isNaN(expDate)) return null
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.round((expDate - today) / 86400000)
}

export default function ExpiryPage() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')   // all | critical | warn | expired
  const [lastSync, setLastSync] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(SHEET_URL + `&_=${Date.now()}`)
      if (!res.ok) throw new Error('Không thể tải dữ liệu')
      const text = await res.text()
      const data = parseSheet(text)
      setItems(data)
      setLastSync(new Date())
    } catch (e) {
      setError(e.message || 'Lỗi kết nối Google Sheet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const enriched = items.map(item => {
    const expDate = parseDate(item.expiry)
    return { ...item, expDate, status: getStatus(expDate), diff: getDiff(expDate) }
  }).sort((a, b) => {
    if (!a.expDate) return 1
    if (!b.expDate) return -1
    return a.expDate - b.expDate
  })

  const counts = {
    all:      enriched.length,
    expired:  enriched.filter(i => i.status === 'expired').length,
    critical: enriched.filter(i => i.status === 'critical').length,
    warn:     enriched.filter(i => i.status === 'warn').length,
  }

  const filtered = filter === 'all'
    ? enriched
    : enriched.filter(i => i.status === filter)

  const STATUS_CFG = {
    expired:  { label:'HẾT HẠN',    cls:'badge-expired',  icon:'🔴' },
    critical: { label:'CẦN XỬ LÝ',  cls:'badge-critical', icon:'🟠' },
    warn:     { label:'SẮP HẾT',    cls:'badge-warn',     icon:'🟡' },
    ok:       { label:'CÒN HẠN',    cls:'badge-ok',       icon:'🟢' },
    unknown:  { label:'KHÔNG RÕ',   cls:'badge-unknown',  icon:'⚪' },
  }

  return (
    <div className="expiry-page">
      {/* Top summary + sync */}
      <div className="expiry-header-bar">
        <div className="expiry-summary-chips">
          {[
            { key:'all',      label:'Tất cả',    count: counts.all },
            { key:'expired',  label:'Hết hạn',   count: counts.expired,  warn: true },
            { key:'critical', label:'Cần xử lý', count: counts.critical, warn: true },
            { key:'warn',     label:'Sắp hết',   count: counts.warn },
          ].map(({ key, label, count, warn }) => (
            <button
              key={key}
              className={`expiry-chip${filter === key ? ' active' : ''}${warn && count > 0 ? ' has-alert' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} <span className="chip-count">{count}</span>
            </button>
          ))}
        </div>
        <button className={`expiry-sync-btn${loading ? ' spinning' : ''}`} onClick={fetchData} title="Đồng bộ lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>

      {lastSync && !loading && (
        <div className="expiry-lastsync">Đồng bộ lúc {lastSync.toLocaleTimeString('vi-VN')}</div>
      )}

      {/* Error state */}
      {error && (
        <div className="expiry-error">
          <div className="expiry-error-icon">⚠️</div>
          <div className="expiry-error-msg">{error}</div>
          <button className="expiry-retry-btn" onClick={fetchData}>Thử lại</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="expiry-list">
          {[1,2,3,4].map(i => (
            <div key={i} className="expiry-skeleton">
              <div className="skel-line skel-name" />
              <div className="skel-line skel-code" />
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <div className="expiry-list">
          {filtered.length === 0 ? (
            <div className="expiry-empty">
              <div className="expiry-empty-icon">✅</div>
              <div className="expiry-empty-title">Không có sản phẩm nào</div>
              <div className="expiry-empty-sub">trong nhóm đã chọn</div>
            </div>
          ) : filtered.map((item, i) => {
            const cfg = STATUS_CFG[item.status]
            const diffText = item.diff === null ? '?'
              : item.diff < 0  ? `Hết hạn ${Math.abs(item.diff)} ngày trước`
              : item.diff === 0 ? 'Hết hạn hôm nay'
              : `Còn ${item.diff} ngày`

            return (
              <div key={i} className={`expiry-item expiry-item-${item.status}`}>
                <div className="expiry-item-left">
                  <div className="expiry-item-name">{item.name}</div>
                  {item.code && <div className="expiry-item-code">Code: {item.code}</div>}
                  {item.qty  && <div className="expiry-item-qty">SL: {item.qty}</div>}
                  {item.note && <div className="expiry-item-note">{item.note}</div>}
                </div>
                <div className="expiry-item-right">
                  <div className={`expiry-badge ${cfg.cls}`}>{cfg.icon} {cfg.label}</div>
                  <div className="expiry-item-date">{fmtDate(item.expDate)}</div>
                  <div className="expiry-item-diff">{diffText}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="footer">Bách Hoá Xanh · Cận Date</div>
    </div>
  )
}
