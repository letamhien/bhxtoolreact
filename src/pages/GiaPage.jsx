import { useState, useCallback } from 'react'

const PRESETS = [10, 20, 30, 50]

function fmtVND(n) {
  if (isNaN(n) || n < 0) return '–'
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'
}

export default function GiaPage() {
  const [priceK,   setPriceK]   = useState('')
  const [discount, setDiscount] = useState('')
  const [activePreset, setActivePreset] = useState(null)

  const priceNum    = parseFloat(priceK)   * 1000 || 0
  const discountPct = parseFloat(discount) || 0
  const hasBoth     = priceK && discount && priceNum > 0 && discountPct > 0 && discountPct < 100

  const saved      = hasBoth ? priceNum * discountPct / 100 : 0
  const finalPrice = hasBoth ? priceNum - saved            : 0

  const setPreset = useCallback((pct) => {
    setDiscount(String(pct))
    setActivePreset(pct)
  }, [])

  const handleDiscountChange = (val) => {
    setDiscount(val)
    setActivePreset(null)
  }

  return (
    <div className="price-page">
      {/* Kết quả cố định trên cùng */}
      {hasBoth ? (
        <div className="price-result-top">
          <div className="pr-top-row">
            <span className="pr-top-label">Giá gốc</span>
            <span className="pr-top-val">{fmtVND(priceNum)}</span>
          </div>
          <div className="pr-top-row">
            <span className="pr-top-label">Giảm {discountPct}%</span>
            <span className="pr-top-val">−{fmtVND(saved)}</span>
          </div>
          <div className="pr-top-divider" />
          <div className="pr-top-final-row">
            <span className="pr-top-final-label">Giá sau giảm</span>
            <span className="pr-top-final-val">{fmtVND(finalPrice)}</span>
          </div>
          <div className="pr-top-saved">
            <span className="pr-top-saved-label">💰 Tiết kiệm được</span>
            <span className="pr-top-saved-val">{fmtVND(saved)}</span>
          </div>
        </div>
      ) : (
        <div className="price-empty" style={{ padding:'12px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
          <div className="price-empty-icon">🏷️</div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>Nhập giá và % giảm để xem kết quả</div>
        </div>
      )}

      <div className="price-scroll">
        {/* Nhập giá & % */}
        <div className="price-row">
          <div className="price-field card" style={{ margin:0 }}>
            <div className="pf-label">Giá gốc (nghìn đồng)</div>
            <div className="pf-input-row">
              <input type="number" inputMode="decimal" placeholder="0"
                value={priceK} onChange={e => setPriceK(e.target.value)} />
              <span className="pf-suffix">K</span>
            </div>
          </div>
          <div className="discount-field card" style={{ margin:0 }}>
            <div className="pf-label">Giảm giá</div>
            <div className="pf-input-row">
              <input type="number" inputMode="decimal" placeholder="0" min="0" max="99"
                value={discount} onChange={e => handleDiscountChange(e.target.value)} />
              <span className="pf-suffix">%</span>
            </div>
          </div>
        </div>

        {/* Quick % */}
        <div className="card">
          <div className="section-label">Chọn nhanh % giảm</div>
          <div className="pct-grid">
            {PRESETS.map(p => (
              <button key={p}
                className={`pct-btn${activePreset===p ? ' active-pct' : ''}`}
                onClick={() => setPreset(p)}>
                {p}%
              </button>
            ))}
          </div>
          <div className="pct-grid" style={{ marginTop:7 }}>
            {[5, 15, 25, 40].map(p => (
              <button key={p}
                className={`pct-btn${activePreset===p ? ' active-pct' : ''}`}
                onClick={() => setPreset(p)}>
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Bảng quy đổi giá */}
        {priceK && priceNum > 0 && !isNaN(priceNum) && (
          <div className="card">
            <div className="section-label">Bảng quy đổi nhanh</div>
            {[10,20,30,40,50].map(pct => {
              const s = priceNum * pct / 100
              const f = priceNum - s
              return (
                <div key={pct} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'9px 0', borderBottom:'1px solid var(--border)',
                }}>
                  <span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:500 }}>Giảm {pct}%</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--green-dark)' }}>{fmtVND(f)}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>−{fmtVND(s)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="footer">Bách Hoá Xanh · Tính Giá</div>
      </div>
    </div>
  )
}
