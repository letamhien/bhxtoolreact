import { useState, useRef } from 'react'

const STEPS = [
  { id: 1, label: 'Trình duyệt hỗ trợ SpeechRecognition?' },
  { id: 2, label: 'Xin quyền mic (getUserMedia)?' },
  { id: 3, label: 'SpeechRecognition.start() không lỗi?' },
  { id: 4, label: 'Nghe thấy âm thanh (onsoundstart)?' },
  { id: 5, label: 'Phát hiện giọng nói (onspeechstart)?' },
  { id: 6, label: 'Nhận được kết quả interim?' },
  { id: 7, label: 'Nhận được kết quả FINAL?' },
]

const STATUS = {
  idle:    { bg: '#2a2a2a', color: '#888',    icon: '⬜' },
  running: { bg: '#1a3a5c', color: '#60aaff', icon: '⏳' },
  ok:      { bg: '#1a3d1a', color: '#4caf50', icon: '✅' },
  fail:    { bg: '#3d1a1a', color: '#f44336', icon: '❌' },
  skip:    { bg: '#2a2a2a', color: '#666',    icon: '⏭️' },
}

export default function MicDebug() {
  const [steps, setSteps]     = useState(() => STEPS.map(s => ({ ...s, status: 'idle', detail: '' })))
  const [log, setLog]         = useState([])
  const [running, setRunning] = useState(false)
  const [rawEvents, setRawEvents] = useState([])

  const streamRef = useRef(null)
  const recogRef  = useRef(null)
  const stopRef   = useRef(false)

  function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false })
    setLog(prev => [...prev, { time, msg, type }])
  }

  function addEvent(name, detail = '') {
    setRawEvents(prev => [...prev, {
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false, fractionalSecondDigits: 1 }),
      name,
      detail
    }])
  }

  function setStep(id, status, detail = '') {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, detail } : s))
  }

  function skipFrom(id) {
    setSteps(prev => prev.map(s => s.id >= id ? { ...s, status: 'skip', detail: 'Bước trước thất bại' } : s))
  }

  async function runDebug() {
    // Reset
    stopRef.current = false
    setSteps(STEPS.map(s => ({ ...s, status: 'idle', detail: '' })))
    setLog([])
    setRawEvents([])
    setRunning(true)

    // ── BƯỚC 1: API tồn tại không ──
    setStep(1, 'running')
    addLog('Kiểm tra window.SpeechRecognition...')
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SR) {
      setStep(1, 'fail', 'Không tìm thấy API')
      addLog('❌ Trình duyệt KHÔNG hỗ trợ SpeechRecognition', 'error')
      addLog('→ Dùng Chrome/Edge trên Android, KHÔNG phải Firefox/Samsung Browser', 'warn')
      skipFrom(2)
      setRunning(false)
      return
    }
    setStep(1, 'ok', `webkitSpeechRecognition: ${!!window.webkitSpeechRecognition} | native: ${!!window.SpeechRecognition}`)
    addLog('✅ SpeechRecognition API tồn tại', 'ok')

    // ── BƯỚC 2: getUserMedia ──
    setStep(2, 'running')
    addLog('Gọi getUserMedia({ audio: true })...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const tracks = stream.getAudioTracks()
      const label = tracks[0]?.label || 'unknown'
      setStep(2, 'ok', `Mic: "${label}"`)
      addLog(`✅ Quyền mic OK — thiết bị: "${label}"`, 'ok')

      // Kiểm tra mic có thực sự nhận tín hiệu không
      try {
        const ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        const buf = new Uint8Array(analyser.frequencyBinCount)

        await new Promise(res => setTimeout(res, 500))
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        addLog(`📊 Mức âm thanh mic lúc im lặng: ${avg.toFixed(2)} (nếu luôn = 0 → mic không có tín hiệu)`, avg > 0 ? 'ok' : 'warn')
        ctx.close()
      } catch (_) {
        addLog('⚠️ Không kiểm tra được AudioContext (không ảnh hưởng)', 'warn')
      }
    } catch (err) {
      setStep(2, 'fail', err.name + ': ' + err.message)
      addLog(`❌ getUserMedia thất bại: ${err.name}`, 'error')
      if (err.name === 'NotAllowedError') addLog('→ Vào Cài đặt Chrome → Quyền → Micro → Cho phép', 'warn')
      if (err.name === 'NotFoundError')   addLog('→ Không tìm thấy mic. Bluetooth chưa kết nối?', 'warn')
      if (err.name === 'NotReadableError') addLog('→ Mic đang bị app khác giữ (thử tắt app gọi điện, Zalo)', 'warn')
      skipFrom(3)
      setRunning(false)
      return
    }

    // ── BƯỚC 3: start() không throw ──
    setStep(3, 'running')
    addLog('Khởi tạo SpeechRecognition và gọi .start()...')

    const recog = new SR()
    recog.lang            = 'vi-VN'
    recog.interimResults  = true
    recog.continuous      = false
    recog.maxAlternatives = 1
    recogRef.current = recog

    // Gắn TẤT CẢ event handlers để log
    const allEvents = [
      'audiostart','audioend','soundstart','soundend',
      'speechstart','speechend','result','error','end','start','nomatch'
    ]
    allEvents.forEach(ev => {
      recog.addEventListener(ev, (e) => {
        const detail = ev === 'result'
          ? `results: ${e.results?.length}, resultIndex: ${e.resultIndex}`
          : ev === 'error'
          ? `error: ${e.error}, message: ${e.message}`
          : ''
        addEvent(ev, detail)
      })
    })

    recog.onaudiostart  = () => { addLog('🔊 onaudiostart → Chrome đã mở audio input', 'ok') }
    recog.onaudioend    = () => { addLog('🔇 onaudioend', 'info') }
    recog.onsoundstart  = () => {
      setStep(4, 'ok', 'onsoundstart fired')
      addLog('🎵 onsoundstart → Phát hiện ÂM THANH', 'ok')
    }
    recog.onsoundend    = () => { addLog('🔕 onsoundend', 'info') }
    recog.onspeechstart = () => {
      setStep(5, 'ok', 'onspeechstart fired')
      addLog('🗣️ onspeechstart → Phát hiện GIỌNG NÓI', 'ok')
    }
    recog.onspeechend   = () => { addLog('🤫 onspeechend', 'info') }
    recog.onnomatch     = () => {
      addLog('⚠️ onnomatch → Nghe được nhưng không nhận ra từ nào', 'warn')
      setStep(6, 'fail', 'nomatch — nghe thấy nhưng không decode được')
      setStep(7, 'fail', 'nomatch')
    }

    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0].transcript
        const conf = (r[0].confidence * 100).toFixed(0)
        if (!r.isFinal) {
          setStep(6, 'ok', `interim: "${text}"`)
          addLog(`📝 Interim: "${text}"`, 'ok')
        } else {
          setStep(7, 'ok', `FINAL: "${text}" (${conf}% confidence)`)
          addLog(`🎯 FINAL: "${text}" — confidence: ${conf}%`, 'ok')
        }
      }
    }

    recog.onerror = (e) => {
      addLog(`❌ onerror: ${e.error} — ${e.message || ''}`, 'error')
      if (e.error !== 'aborted') {
        const hints = {
          'no-speech':            '→ Mic hoạt động nhưng KHÔNG nghe thấy giọng. Bluetooth A2DP? Mic quá xa?',
          'audio-capture':        '→ Mic bị chiếm bởi app khác hoặc Bluetooth profile sai',
          'network':              '→ Cần internet để dùng Google Speech API',
          'not-allowed':          '→ Quyền mic bị chặn',
          'service-not-allowed':  '→ Chrome trên thiết bị này chặn Speech API (thử Chrome Canary)',
          'aborted':              '',
        }
        if (hints[e.error]) addLog(hints[e.error], 'warn')

        if (e.error === 'no-speech') {
          setStep(4, prev => prev.status === 'ok' ? prev : { ...prev, status: 'fail', detail: 'no-speech — mic không thu âm' })
          setStep(5, s => s.status !== 'ok' ? { ...s, status: 'fail', detail: 'no-speech' } : s)
          setStep(6, s => ({ ...s, status: 'fail', detail: 'no-speech' }))
          setStep(7, s => ({ ...s, status: 'fail', detail: 'no-speech' }))
        }
      }
    }

    recog.onend = () => {
      addLog('🔚 onend — recognition kết thúc', 'info')
      // Giải phóng stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      setRunning(false)
    }

    try {
      recog.start()
      setStep(3, 'ok', 'start() thành công, đang chờ âm thanh...')
      addLog('✅ start() OK — hãy NÓI vào micro ngay bây giờ!', 'ok')
      addLog('⏱️ Timeout tự động sau 8 giây nếu không có kết quả', 'info')

      // Auto stop sau 8s
      setTimeout(() => {
        if (recogRef.current) {
          addLog('⏰ 8 giây trôi qua — tự dừng', 'info')
          try { recogRef.current.stop() } catch (_) {}
        }
      }, 8000)

    } catch (err) {
      setStep(3, 'fail', err.message)
      addLog(`❌ start() throw: ${err.message}`, 'error')
      skipFrom(4)
      setRunning(false)
    }
  }

  function stopDebug() {
    stopRef.current = true
    if (recogRef.current) {
      try { recogRef.current.abort() } catch (_) {}
      recogRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setRunning(false)
    addLog('🛑 Dừng thủ công', 'warn')
  }

  const logColors = { ok: '#4caf50', error: '#f44336', warn: '#ff9800', info: '#aaa' }

  return (
    <div style={{ background: '#111', minHeight: '100vh', color: '#eee', fontFamily: 'monospace', padding: 16 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#60aaff' }}>🎤 Debug Nhận Diện Giọng Nói</h2>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#666' }}>
        Nhấn START → nói ngay vào mic → xem từng bước
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={runDebug} disabled={running} style={{
          background: running ? '#333' : '#1565c0', color: '#fff',
          border: 'none', borderRadius: 8, padding: '10px 24px',
          fontSize: 15, cursor: running ? 'not-allowed' : 'pointer', fontWeight: 700
        }}>
          {running ? '⏳ Đang chạy...' : '▶ START DEBUG'}
        </button>
        {running && (
          <button onClick={stopDebug} style={{
            background: '#c62828', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 16px', fontSize: 15, cursor: 'pointer'
          }}>
            ■ DỪNG
          </button>
        )}
      </div>

      {/* Steps */}
      <div style={{ marginBottom: 16 }}>
        {steps.map(s => {
          const st = STATUS[s.status]
          return (
            <div key={s.id} style={{
              background: st.bg, border: `1px solid ${st.color}33`,
              borderRadius: 8, padding: '8px 12px', marginBottom: 6,
              display: 'flex', alignItems: 'flex-start', gap: 10
            }}>
              <span style={{ fontSize: 16, minWidth: 22 }}>{st.icon}</span>
              <div>
                <div style={{ color: st.color, fontSize: 13, fontWeight: 600 }}>
                  Bước {s.id}: {s.label}
                </div>
                {s.detail && (
                  <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{s.detail}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>📋 LOG CHI TIẾT</div>
          <div style={{
            background: '#1a1a1a', borderRadius: 8, padding: 10,
            maxHeight: 220, overflowY: 'auto', fontSize: 12
          }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: logColors[l.type] || '#aaa', marginBottom: 3 }}>
                <span style={{ color: '#555', marginRight: 8 }}>[{l.time}]</span>{l.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Events */}
      {rawEvents.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>⚡ RAW EVENTS (thứ tự thời gian)</div>
          <div style={{
            background: '#1a1a1a', borderRadius: 8, padding: 10,
            maxHeight: 160, overflowY: 'auto', fontSize: 11
          }}>
            {rawEvents.map((e, i) => (
              <div key={i} style={{ color: '#888', marginBottom: 2 }}>
                <span style={{ color: '#555' }}>[{e.time}]</span>
                {' '}
                <span style={{ color: '#60aaff', fontWeight: 700 }}>{e.name}</span>
                {e.detail && <span style={{ color: '#666' }}> — {e.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hướng dẫn đọc kết quả */}
      <div style={{ marginTop: 16, background: '#1a1a1a', borderRadius: 8, padding: 12, fontSize: 11, color: '#666' }}>
        <div style={{ color: '#aaa', marginBottom: 6, fontWeight: 700 }}>📖 Đọc kết quả như thế nào?</div>
        <div>• Bước 1–3 ✅, Bước 4 ❌ → <span style={{color:'#ff9800'}}>Bluetooth A2DP, mic vật lý lỗi, app khác chiếm mic</span></div>
        <div>• Bước 4 ✅, Bước 5 ❌ → <span style={{color:'#ff9800'}}>Nghe thấy âm thanh nền nhưng không nhận ra giọng người</span></div>
        <div>• Bước 5 ✅, Bước 6–7 ❌ → <span style={{color:'#ff9800'}}>Google Speech API lỗi, mạng yếu, tiếng ồn quá lớn</span></div>
        <div>• Tất cả ✅ → <span style={{color:'#4caf50'}}>Mic OK, lỗi nằm ở code MicPopup chính</span></div>
      </div>
    </div>
  )
}
