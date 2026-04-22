import { useState, useRef, useEffect, useCallback } from 'react'

const BARS = [0, 1, 2, 3, 4, 5, 6]

export default function MicPopup({ show, onClose, onResult }) {
  const [state, setState]       = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [isFinal, setIsFinal]   = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [speakerMode, setSpeakerMode] = useState(() => {
    try { return localStorage.getItem('mic_speaker_mode') === '1' } catch { return false }
  })

  const recogRef       = useRef(null)
  const closeTimerRef  = useRef(null)
  const finalTextRef   = useRef('')
  const activeRef      = useRef(false)
  const abortingRef    = useRef(false) // ← NEW: phân biệt abort chủ động vs tự dừng
  const streamRef      = useRef(null)  // ← NEW: giữ getUserMedia stream

  // ── Dừng tất cả ──
  const stopAll = useCallback((skipRecog = false) => {
    activeRef.current  = false
    abortingRef.current = true
    clearTimeout(closeTimerRef.current)

    if (!skipRecog && recogRef.current) {
      try { recogRef.current.abort() } catch (_) {}
      recogRef.current = null
    }

    // Giải phóng mic stream (quan trọng cho Bluetooth)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ── Reset khi đóng ──
  useEffect(() => {
    if (!show) {
      stopAll()
      setState('idle')
      setTranscript('')
      setIsFinal(false)
      setErrorMsg('')
      finalTextRef.current  = ''
      abortingRef.current   = false
    }
  }, [show, stopAll])

  // ── Khi mở ──
  useEffect(() => {
    if (!show) return
    activeRef.current   = true
    abortingRef.current = false
    startMic()
    return () => stopAll()
  }, [show]) // eslint-disable-line

  function toggleSpeakerMode() {
    setSpeakerMode(prev => {
      const next = !prev
      try { localStorage.setItem('mic_speaker_mode', next ? '1' : '0') } catch (_) {}
      return next
    })
  }

  // ── Xin quyền mic trước (bắt buộc cho Bluetooth HFP) ──
  async function requestMicPermission() {
    try {
      // Chỉ định audio constraints giúp browser chọn đúng source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          // Không chỉ định deviceId → để browser/OS tự chọn mic phù hợp
        }
      })
      streamRef.current = stream
      return true
    } catch (err) {
      const msgs = {
        'NotAllowedError':  '❌ Cần cấp quyền micro cho trình duyệt',
        'NotFoundError':    '❌ Không tìm thấy micro',
        'NotReadableError': '❌ Micro đang được ứng dụng khác sử dụng',
      }
      setState('error')
      setErrorMsg(msgs[err.name] || '❌ Không thể truy cập micro: ' + err.message)
      setTimeout(onClose, 2500)
      return false
    }
  }

  async function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setState('error')
      setErrorMsg('❌ Trình duyệt không hỗ trợ. Dùng Chrome hoặc Edge.')
      setTimeout(onClose, 2500)
      return
    }

    setState('connecting')

    // BƯỚC 1: Xin quyền mic + kích hoạt HFP profile trên Bluetooth
    const granted = await requestMicPermission()
    if (!granted || !activeRef.current) return

    setState('listening')

    const recog = new SR()
    recog.lang            = 'vi-VN'
    recog.interimResults  = true
    recog.continuous      = false  // ← false hoạt động tốt hơn trên mobile Chrome
    recog.maxAlternatives = 3
    recogRef.current = recog

    recog.onspeechstart = () => { if (activeRef.current) setState('speech') }
    recog.onspeechend   = () => { if (activeRef.current) setState('processing') }
    recog.onsoundstart  = () => { if (activeRef.current) setState('speech') }

    recog.onresult = (e) => {
      if (!activeRef.current) return

      let interim = ''
      let bestFinal = ''

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          let picked = r[0].transcript
          for (let j = 0; j < r.length; j++) {
            if (/\d/.test(r[j].transcript)) { picked = r[j].transcript; break }
          }
          bestFinal += picked
        } else {
          interim += r[0].transcript
        }
      }

      if (bestFinal) {
        finalTextRef.current = bestFinal
        setTranscript(bestFinal)
        setIsFinal(true)
        setState('done')
        stopAll(true)
        closeTimerRef.current = setTimeout(() => {
          onResult(bestFinal)
          onClose()
        }, 1000)
      } else if (interim) {
        setTranscript(interim)
        setIsFinal(false)
        setState('speech')
      }
    }

    recog.onerror = (e) => {
      if (!activeRef.current) return
      if (e.error === 'aborted') return

      if (e.error === 'no-speech') {
        // Thử lại – nhưng tạo instance MỚI (tránh bug Chrome mobile)
        if (activeRef.current) {
          try { recogRef.current?.abort() } catch (_) {}
          recogRef.current = null
          setTimeout(() => {
            if (activeRef.current) {
              setState('listening')
              startRecogOnly() // Chỉ restart recog, không getUserMedia lại
            }
          }, 300)
        }
        return
      }

      const msgs = {
        'not-allowed':         '❌ Cần cấp quyền micro cho trình duyệt',
        'network':             '❌ Lỗi mạng – cần kết nối internet',
        'audio-capture':       '❌ Không bắt được âm thanh từ micro',
        'service-not-allowed': '❌ Dịch vụ nhận diện bị chặn',
      }
      setState('error')
      setErrorMsg(msgs[e.error] || '❌ Lỗi: ' + e.error)
      stopAll(true)
      setTimeout(onClose, 2500)
    }

    recog.onend = () => {
      // Chỉ restart nếu KHÔNG phải do ta abort chủ động
      if (activeRef.current && !finalTextRef.current && !abortingRef.current) {
        setState('listening')
        setTimeout(() => {
          if (activeRef.current && recogRef.current) {
            try { recogRef.current.start() } catch (_) {}
          }
        }, 200)
      }
    }

    try {
      recog.start()
    } catch (e) {
      setState('error')
      setErrorMsg('❌ Không thể khởi động micro: ' + e.message)
      setTimeout(onClose, 2500)
    }
  }

  // Restart chỉ phần SpeechRecognition (dùng lại stream cũ)
  function startRecogOnly() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || !activeRef.current) return

    const recog = new SR()
    recog.lang            = 'vi-VN'
    recog.interimResults  = true
    recog.continuous      = false
    recog.maxAlternatives = 3
    recogRef.current = recog

    // Gán lại handlers (copy từ startMic)
    recog.onspeechstart = () => { if (activeRef.current) setState('speech') }
    recog.onspeechend   = () => { if (activeRef.current) setState('processing') }
    recog.onresult = (e) => {
      if (!activeRef.current) return
      let bestFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          let picked = r[0].transcript
          for (let j = 0; j < r.length; j++) {
            if (/\d/.test(r[j].transcript)) { picked = r[j].transcript; break }
          }
          bestFinal += picked
        }
      }
      if (bestFinal) {
        finalTextRef.current = bestFinal
        setTranscript(bestFinal)
        setIsFinal(true)
        setState('done')
        stopAll(true)
        closeTimerRef.current = setTimeout(() => {
          onResult(bestFinal)
          onClose()
        }, 1000)
      }
    }
    recog.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return
      setState('error')
      setErrorMsg('❌ Lỗi: ' + e.error)
      stopAll(true)
      setTimeout(onClose, 2500)
    }
    recog.onend = () => {
      if (activeRef.current && !finalTextRef.current && !abortingRef.current) {
        setTimeout(() => {
          if (activeRef.current && recogRef.current) {
            try { recogRef.current.start() } catch (_) {}
          }
        }, 200)
      }
    }

    try { recog.start() } catch (_) {}
  }

  const showBars = ['listening', 'speech', 'processing'].includes(state)
  const animClass = showBars ? 'listening' : state === 'done' ? 'done' : ''

  const titleMap = {
    idle:       '',
    connecting: '⏳ Đang kết nối micro...',
    listening:  speakerMode ? '🔊 Nghe qua loa ngoài...' : '🎤 Đang nghe...',
    speech:     '🎙️ Đang nhận giọng nói...',
    processing: '⚙️ Đang xử lý...',
    done:       '✅ Nhận được!',
    error:      errorMsg,
  }
  const hintMap = {
    connecting: 'Đang kích hoạt micro...',
    listening:  speakerMode ? 'Giữ điện thoại gần loa ngoài' : 'Nói tên sản phẩm bạn cần tìm',
    speech:     'Đang lắng nghe...',
    processing: 'Đang xử lý giọng nói...',
    done:       transcript,
  }

  return (
    <div className={`mic-overlay${show ? ' show' : ''}`}>
      <div className="mic-popup">
        <div className="mic-speaker-toggle" onClick={toggleSpeakerMode}>
          <div className={`mic-speaker-icon${speakerMode ? ' active' : ''}`}>
            {speakerMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            )}
          </div>
          <span className={`mic-speaker-label${speakerMode ? ' active' : ''}`}>
            {speakerMode ? 'Loa ngoài ON' : 'Loa ngoài'}
          </span>
        </div>

        <div className={`mic-anim-wrap ${animClass}`}>
          <svg className="mic-icon-svg" width="38" height="38" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        </div>

        <div className={`mic-bars${showBars ? ' active' : ''}`}>
          {BARS.map(i => (
            <div key={i} className="mic-bar mic-bar-css" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>

        <div className="mic-popup-title">{titleMap[state] || ''}</div>
        <div className="mic-popup-hint">{hintMap[state] || ''}</div>

        {speakerMode && (state === 'listening' || state === 'speech') && (
          <div className="mic-speaker-tip">
            💡 Micro sẽ thu âm từ loa.<br/>
            Đặt điện thoại gần nguồn âm thanh.
          </div>
        )}

        <div className={`mic-transcript${isFinal ? ' has-text' : ''}`}>
          {transcript
            ? isFinal
              ? transcript
              : <span className="interim">{transcript}</span>
            : <span className="placeholder">Nói vào micro...</span>
          }
        </div>

        <button className="mic-cancel-btn" onClick={onClose}>Huỷ</button>
      </div>
    </div>
  )
}
