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
  const [nsx,       setNsx]      = useState(todayStr)
  const [duration,  setDuration] = useState('')
  const [type,      setType]     = useState('days')
  const [result,    setResult]   = useState(null)
  const [errNsx,    setErrNsx]   = useState(false)
  const [errDur,    setErrDur]   = useState(false)
  const [ocrStatus, setOcrStatus]= useState(null)
  const [showScan,  setShowScan] = useState(false)
  const [history,   setHistory]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('hsd_history') || '[]') } catch { return [] }
  })

  const nsxRef    = useRef()
  const durRef    = useRef()
  const resultRef = useRef()
  const videoRef  = useRef()
  const streamRef = useRef(null)

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
    if (!nsx)              { setErrNsx(true); shake(nsxRef.current); ok = false }
    if (!durVal || durVal < 1){ setErrDur(true); shake(durRef.current); ok = false }
    if (!ok) return

    const nsxDate = new Date(nsx + 'T00:00:00')
    const hsdDate = addTime(nsxDate, durVal, type)
    const today   = new Date(); today.setHours(0,0,0,0)
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

  // ── Camera ──
  async function startCamera() {
    setShowScan(true)
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
      if (videoRef.current) videoRef.current.srcObject = streamRef.current
    } catch {
      alert('Không thể mở camera. Vui lòng cấp quyền.')
      stopCamera()
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setShowScan(false)
  }
  async function captureAndScan() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    setOcrStatus({ text:'⏳ AI đang phân tích...', type:'loading' })
    try {
      const res = await window.Tesseract.recognize(canvas.toDataURL('image/png'), 'eng')
      const dateStr = extractDate(res.data.text)
      if (dateStr) {
        setNsx(dateStr)
        setOcrStatus({ text:`✅ Quét: ${dateStr}`, type:'ok' })
        setTimeout(() => setOcrStatus(null), 4000)
      } else {
        setOcrStatus({ text:'❌ Không nhận ra ngày. Thử lại.', type:'err' })
      }
    } catch {
      setOcrStatus({ text:'❌ Lỗi xử lý ảnh.', type:'err' })
    }
  }
  function extractDate(text) {
    const patterns = [
      /\b(\d{4})[\/\-. ]+(\d{1,2})[\/\-. ]+(\d{1,2})\b/g,
      /\b(\d{1,2})[\/\-. ]+(\d{1,2})[\/\-. ]+(\d{2,4})\b/g,
    ]
    for (const re of patterns) {
      let m; while ((m = re.exec(text)) !== null) {
        const [, a, b, c] = m
        let y=+a,mo=+b,d=+c
        if (a.length <= 2) { y = c.length===2 ? 2000+(+c) : +c; mo=+b; d=+a }
        if (mo>=1&&mo<=12&&d>=1&&d<=31&&y>=1900&&y<=2100)
          return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      }
    }
    return null
  }

  return (
    <div className="scroll-body">

      {/* Camera Scanner */}
      {showScan && (
        <div className="scanner-modal">
          <div className="scanner-header">
            <span style={{color:'#fff',fontSize:14,fontWeight:600}}>📷 Quét NSX / HSD</span>
            <button className="close-scanner" onClick={stopCamera}>✕ Đóng</button>
          </div>
          <div className="video-container">
            <video ref={videoRef} id="camera-stream" autoPlay playsInline muted />
            <div className="scan-box" />
          </div>
          <div className="scanner-footer">
            <button className="capture-btn" onClick={captureAndScan}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" fill="white"/>
                <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z" fill="white" opacity=".6"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* NSX */}
      <div className="card">
        <div className="section-label">Ngày sản xuất (NSX)</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input ref={nsxRef} type="date" value={nsx}
            onChange={e => { setNsx(e.target.value); setErrNsx(false) }}
            style={{ flex:1 }} />
          <button onClick={startCamera} style={{
            width:50, height:50, border:'1.5px solid var(--border)',
            borderRadius:'var(--radius-sm)', background:'var(--bg)',
            color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', flexShrink:0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
        {ocrStatus && (
          <div style={{ marginTop:8, fontSize:13, fontWeight:500,
            color: ocrStatus.type==='ok' ? 'var(--green-dark)' : ocrStatus.type==='err' ? 'var(--red)' : 'var(--text-muted)' }}>
            {ocrStatus.text}
          </div>
        )}
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
