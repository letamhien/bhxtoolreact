import { useState, useRef, useCallback } from 'react'

const TYPES  = ['days', 'months', 'years']
const LABELS = { days:'Ngày', months:'Tháng', years:'Năm' }
const UNITS  = { days:'ngày', months:'tháng', years:'năm' }
const QUICK  = {
  days:   [3, 5, 7, 14],
  months: [1, 3, 6, 12],
  years:  [1, 2, 3, 5],
}
const DAYS_VN = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy']

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
}
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function fmtDateLong(d) {
  return `${DAYS_VN[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth()+1} năm ${d.getFullYear()}`
}
function addTime(date, n, type) {
  const d = new Date(date.getTime())
  if (type === 'days')   d.setDate(d.getDate() + n)
  if (type === 'months') d.setMonth(d.getMonth() + n)
  if (type === 'years')  d.setFullYear(d.getFullYear() + n)
  return d
}
function daysDiff(a, b) { return Math.round((b - a) / 86400000) }

export default function HsdPage() {
  const [nsx,      setNsx]      = useState(todayStr)
  const [duration, setDuration] = useState('')
  const [type,     setType]     = useState('days')
  const [result,   setResult]   = useState(null)
  const [errNsx,   setErrNsx]   = useState(false)
  const [errDur,   setErrDur]   = useState(false)
  const [history,  setHistory]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('hsd_history') || '[]') } catch { return [] }
  })

  const nsxRef    = useRef()
  const durRef    = useRef()
  const resultRef = useRef()

  const shake = (el) => {
    if (!el) return
    el.classList.remove('shake')
    void el.offsetWidth
    el.classList.add('shake')
    setTimeout(() => el.classList.remove('shake'), 400)
  }

  const calculate = useCallback((overrideDur) => {
    const durVal = parseInt(overrideDur !== undefined ? overrideDur : duration)
    setErrNsx(false); setErrDur(false)
    let ok = true
    if (!nsx)               { setErrNsx(true); shake(nsxRef.current); ok = false }
    if (!durVal || durVal < 1) { setErrDur(true); shake(durRef.current); ok = false }
    if (!ok) return

    const nsxDate   = new Date(nsx + 'T00:00:00')
    const hsdDate   = addTime(nsxDate, durVal, type)
    const today     = new Date(); today.setHours(0,0,0,0)
    const remaining = daysDiff(today, hsdDate)

    let status, badge, remainLbl, remain
    if (remaining < 0) {
      status='expired'; badge='ĐÃ HẾT HẠN'; remainLbl='Hết hạn cách đây'; remain=`${Math.abs(remaining)} ngày`
    } else if (remaining === 0) {
      status='expired'; badge='HẾT HẠN HÔM NAY'; remainLbl='Còn lại'; remain='Hôm nay – không bán'
    } else if (remaining <= 3) {
      status='warn'; badge='SẮP HẾT HẠN'; remainLbl='Còn lại'; remain=`${remaining} ngày – cần xử lý gấp`
    } else {
      status='ok'; badge='CÒN HẠN'; remainLbl='Còn lại'; remain=`${remaining} ngày`
    }

    const newResult = { status, badge, remainLbl, remain, nsxDate, hsdDate, dur:`${durVal} ${UNITS[type]}` }
    setResult(newResult)

    const entry = {
      nsx: fmtDate(nsxDate), hsd: fmtDate(hsdDate), dur: newResult.dur,
      status: remaining < 0 ? 'expired' : remaining <= 3 ? 'warn' : 'ok',
      time: Date.now(),
    }
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 10)
      localStorage.setItem('hsd_history', JSON.stringify(next))
      return next
    })
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 50)
  }, [nsx, duration, type])

  return (
    <div className="scroll-body">

      {/* NSX */}
      <div className="card">
        <div className="section-label">Ngày sản xuất (NSX)</div>
        <input ref={nsxRef} type="date" value={nsx}
          onChange={e => { setNsx(e.target.value); setErrNsx(false) }} />
        {errNsx && <div className="err-msg">⚠ Vui lòng chọn ngày sản xuất</div>}
      </div>

      {/* Loại & Số lượng */}
      <div className="card">
        <div className="section-label">Hạn sử dụng</div>
        <div className="type-grid">
          {TYPES.map(t => (
            <button key={t} className={`type-btn${type===t?' active':''}`}
              onClick={() => { setType(t); setDuration(''); setResult(null) }}>
              {LABELS[t]}
            </button>
          ))}
        </div>

        <div className="number-row" ref={durRef}>
          <button className="num-btn" onClick={() => setDuration(v => String(Math.max(1,(parseInt(v)||0)-1)))}>−</button>
          <input type="number" min="1" max="999" value={duration}
            onChange={e => { setDuration(e.target.value); setErrDur(false) }}
            placeholder="0" />
          <button className="num-btn" onClick={() => setDuration(v => String((parseInt(v)||0)+1))}>+</button>
          <span className="unit-label">{UNITS[type]}</span>
        </div>
        {errDur && <div className="err-msg">⚠ Nhập số {UNITS[type]}</div>}

        <div className="divider" />
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, fontWeight:500 }}>Chọn nhanh</div>
        <div className="quick-grid">
          {QUICK[type].map(q => (
            <button key={q} className="quick-btn"
              onClick={() => { setDuration(String(q)); calculate(q) }}>
              {q} {UNITS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Nút tính */}
      <button className="calc-btn" onClick={() => calculate()}>
        Tính HSD →
      </button>

      {/* Kết quả */}
      {result && (
        <div ref={resultRef} className={`result-card ${result.status} pop`}>
          <div className="res-badge">{result.badge}</div>
          <div className="res-day">Hạn sử dụng đến</div>
          <div className="res-date">{fmtDate(result.hsdDate)}</div>
          <div style={{ fontSize:13, marginBottom:10, opacity:0.75 }}>{fmtDateLong(result.hsdDate)}</div>
          <div className="res-divider" />
          <div className="res-row">
            <span className="res-row-label">Ngày sản xuất</span>
            <span className="res-row-val">{fmtDate(result.nsxDate)}</span>
          </div>
          <div className="res-row">
            <span className="res-row-label">Hạn lưu</span>
            <span className="res-row-val">{result.dur}</span>
          </div>
          <div className="res-row">
            <span className="res-row-label">{result.remainLbl}</span>
            <span className="res-row-val">{result.remain}</span>
          </div>
        </div>
      )}

      {/* Lịch sử */}
      {history.length > 0 && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="section-label" style={{ margin:0 }}>Lịch sử tính gần đây</div>
            <button onClick={() => { setHistory([]); localStorage.removeItem('hsd_history') }}
              style={{ border:'none', background:'none', fontSize:12, color:'var(--text-muted)', cursor:'pointer' }}>
              Xoá
            </button>
          </div>
          {history.map((item, i) => (
            <div key={i} className="history-item">
              <div className="hist-left">
                <div className="hist-name">NSX: {item.nsx} · {item.dur}</div>
                <div className="hist-date">HSD: {item.hsd}</div>
              </div>
              <span className={`hist-badge ${item.status==='ok'?'hist-ok':item.status==='warn'?'hist-warn':'hist-exp'}`}>
                {item.status==='ok'?'CÒN HẠN':item.status==='warn'?'SẮP HẾT':'HẾT HẠN'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="footer">Bách Hoá Xanh · Tính HSD</div>
    </div>
  )
}
