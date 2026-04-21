import { useState, useRef, useEffect, useCallback } from 'react'

const BARS = [0, 1, 2, 3, 4, 5, 6]
const INDICES = [2, 4, 6, 8, 10, 13, 16]

export default function MicPopup({ show, onClose, onResult }) {
  const [state, setState] = useState('idle') // idle|connecting|listening|speech|processing|done|error
  const [transcript, setTranscript] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [barHeights, setBarHeights] = useState([8, 14, 20, 14, 8, 20, 10])

  const recogRef      = useRef(null)
  const streamRef     = useRef(null)
  const audioCtxRef   = useRef(null)
  const analyserRef   = useRef(null)
  const rafRef        = useRef(null)
  const closeTimerRef = useRef(null)
  const finalTextRef  = useRef('')

  // ── Cleanup total ──
  const stopAll = useCallback((skipRecog = false) => {
    clearTimeout(closeTimerRef.current)
    if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch (_) {}; audioCtxRef.current = null }
    analyserRef.current = null
    if (!skipRecog && recogRef.current) { try { recogRef.current.stop() } catch (_) {}; recogRef.current = null }
  }, [])

  // ── Khi popup đóng → dọn dẹp ──
  useEffect(() => {
    if (!show) {
      stopAll()
      setState('idle')
      setTranscript('')
      setIsFinal(false)
      finalTextRef.current = ''
    }
  }, [show, stopAll])

  // ── Khi popup mở → bắt đầu ──
  useEffect(() => {
    if (!show) return
    startMic()
    return () => stopAll()
  }, [show]) // eslint-disable-line

  async function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setState('error')
      setErrorMsg('❌ Trình duyệt không hỗ trợ. Dùng Chrome hoặc Edge.')
      setTimeout(onClose, 2500)
      return
    }

    setState('connecting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      streamRef.current = stream
      startBars(stream)
    } catch (err) {
      setState('error')
      setErrorMsg(err.name === 'NotAllowedError'
        ? '❌ Cần cấp quyền micro cho trình duyệt'
        : '❌ Không thể mở micro: ' + err.message)
      setTimeout(onClose, 2500)
      return
    }

    setState('listening')
    const recog = new SR()
    recog.lang            = 'vi-VN'
    recog.interimResults  = true
    recog.continuous      = true
    recog.maxAlternatives = 5
    recogRef.current = recog

    recog.onsoundstart = () => setState(s => s === 'listening' ? 'listening' : s)
    recog.onspeechstart = () => setState('speech')
    recog.onspeechend   = () => setState('processing')

    recog.onresult = (e) => {
      let interim = '', final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final   += e.results[i][0].transcript
        else                       interim += e.results[i][0].transcript
      }
      if (final) {
        finalTextRef.current = final
        setTranscript(final)
        setIsFinal(true)
        setState('done')
        stopAll(true)
        closeTimerRef.current = setTimeout(() => {
          onResult(final)
          onClose()
        }, 1500)
      } else if (interim) {
        setTranscript(interim)
        setIsFinal(false)
      }
    }

    recog.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return
      const msgs = {
        'not-allowed':   '❌ Cần cấp quyền micro cho trình duyệt',
        'network':       '❌ Lỗi mạng – cần internet để nhận diện',
        'audio-capture': '❌ Không bắt được âm thanh từ micro',
      }
      setState('error')
      setErrorMsg(msgs[e.error] || '❌ Lỗi: ' + e.error)
      stopAll(true)
      setTimeout(onClose, 2500)
    }

    recog.onend = () => {
      if (recogRef.current) recogRef.current = null
    }

    recog.start()
  }

  function startBars(stream) {
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtxRef.current  = ctx
      analyserRef.current  = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)

      function draw() {
        rafRef.current = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(data)
        setBarHeights(INDICES.map(i => Math.max(4, Math.round((data[i] || 0) / 255 * 26))))
      }
      draw()
    } catch (_) {}
  }

  const animClass = state === 'listening' || state === 'speech' || state === 'processing'
    ? 'listening' : state === 'done' ? 'done' : ''

  const titleMap = {
    idle: '',
    connecting: '⏳ Đang kết nối micro...',
    listening:  '🎤 Đang nghe...',
    speech:     '🎙️ Đang nhận giọng nói...',
    processing: '⚙️ Đang xử lý...',
    done:       '✅ Nhận được!',
    error:      errorMsg,
  }
  const hintMap = {
    listening:  'Nói tên sản phẩm bạn cần tìm',
    connecting: 'Vui lòng chờ một chút',
    done:       transcript,
  }

  const showBars = ['listening', 'speech', 'processing'].includes(state)

  return (
    <div className={`mic-overlay${show ? ' show' : ''}`}>
      <div className="mic-popup">
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
            <div key={i} className="mic-bar" style={{ height: barHeights[i] + 'px' }} />
          ))}
        </div>

        <div className="mic-popup-title">{titleMap[state] || ''}</div>
        <div className="mic-popup-hint">{hintMap[state] || ''}</div>

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
