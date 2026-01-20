import { useState, useEffect, useRef } from 'react'
import './App.css'

// Available presenters (avatars)
const PRESENTERS = [
  { id: 'emma', name: 'Emma', description: 'Professional female' },
  { id: 'amy', name: 'Amy', description: 'Friendly female' },
  { id: 'anna', name: 'Anna', description: 'Casual female' },
  { id: 'alex', name: 'Alex', description: 'Professional male' },
  { id: 'jack', name: 'Jack', description: 'Casual male' },
]

function App() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('async') // 'async' or 'realtime'
  const [videoStatus, setVideoStatus] = useState(null)
  const [polling, setPolling] = useState(false)
  const [presenter, setPresenter] = useState('emma')
  const pollingRef = useRef(null)

  const apiBase = import.meta.env.VITE_API_URL || '/api'

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const pollVideoStatus = async (videoId) => {
    try {
      const response = await fetch(`${apiBase}/status/${videoId}`)
      if (!response.ok) throw new Error('Failed to get status')
      
      const data = await response.json()
      setVideoStatus(data)
      
      // Check if video is ready
      if (data.video_status === 'ready' || data.video_status === 'completed' || data.video_status === 'done') {
        setPolling(false)
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else if (data.video_status === 'failed' || data.video_status === 'error') {
        setPolling(false)
        setError('Video generation failed. Please try again.')
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }

  const startPolling = (videoId) => {
    setPolling(true)
    setVideoStatus(null)
    
    // Initial poll
    pollVideoStatus(videoId)
    
    // Poll every 5 seconds
    pollingRef.current = setInterval(() => {
      pollVideoStatus(videoId)
    }, 5000)
  }

  const handleAction = async () => {
    if (mode === 'async' && !text.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setVideoStatus(null)
    
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    try {
      const endpoint = mode === 'async' ? '/generate' : '/conversation'
      const body = mode === 'async' ? JSON.stringify({ text, presenter }) : null

      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Backend Error: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      
      // Start polling for video status if async generation
      if (mode === 'async' && data.video_id) {
        startPolling(data.video_id)
      }
    } catch (err) {
      setError(err.message || 'Backend connection failed. Make sure Docker containers are running.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return '#22c55e'
      case 'processing':
      case 'rendering':
        return '#f59e0b'
      case 'queued':
        return '#6366f1'
      case 'failed':
      case 'error':
        return '#ef4444'
      default:
        return '#6366f1'
    }
  }

  const renderVideoPlayer = () => {
    if (!videoStatus) return null
    
    const { video_status, download_url, result_url, stream_url } = videoStatus
    const videoUrl = result_url || stream_url || download_url
    
    if ((video_status === 'ready' || video_status === 'completed' || video_status === 'done') && videoUrl) {
      return (
        <div className="video-player-container">
          <video 
            controls 
            autoPlay 
            className="video-player"
            src={videoUrl}
          >
            Your browser does not support the video tag.
          </video>
          <div className="video-actions">
            {videoUrl && (
              <a href={videoUrl} download className="download-btn">
                ⬇️ Download Video
              </a>
            )}
            {videoUrl && (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="share-btn">
                🔗 Open in New Tab
              </a>
            )}
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="container">
      <div className="title-section">
        <h1>AI Video Studio</h1>
        <p className="subtitle">Lip-Sync Video Generation (Powered by D-ID)</p>
      </div>

      <div className="dashboard">
        <div className="sidebar">
          <button
            className={`nav-item ${mode === 'async' ? 'active' : ''}`}
            onClick={() => { setMode('async'); setResult(null); setVideoStatus(null); }}
          >
            <span className="icon">🎬</span> Generate Video
          </button>
          <button
            className={`nav-item ${mode === 'realtime' ? 'active' : ''}`}
            onClick={() => { setMode('realtime'); setResult(null); setVideoStatus(null); }}
            style={{ opacity: 0.5 }}
            title="Requires paid plan"
          >
            <span className="icon">⚡</span> Real-time (Paid)
          </button>

          <div style={{ marginTop: 'auto', padding: '10px', fontSize: '0.8rem', color: '#666' }}>
            Status: {loading ? 'Submitting...' : polling ? 'Processing Video...' : 'Ready'}
          </div>
        </div>

        <div className="main-content">
          <div className="input-area">
            {mode === 'async' ? (
              <>
                <div className="presenter-selector">
                  <label>Choose Avatar:</label>
                  <div className="presenter-options">
                    {PRESENTERS.map((p) => (
                      <button
                        key={p.id}
                        className={`presenter-btn ${presenter === p.id ? 'active' : ''}`}
                        onClick={() => setPresenter(p.id)}
                      >
                        <span className="presenter-name">{p.name}</span>
                        <span className="presenter-desc">{p.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write your script... The AI avatar will speak this text with lip-synced audio."
                  rows="5"
                />
              </>
            ) : (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <p>⚠️ Real-time conversations require a D-ID paid plan.</p>
                <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Use the "Generate Video" mode instead - it's free!</p>
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={loading || polling || (mode === 'async' && !text.trim())}
              className="generate-btn"
            >
              {loading ? 'Connecting to D-ID...' : polling ? 'Video Processing...' : mode === 'async' ? '🎬 Generate Video' : 'Start Live Session'}
            </button>
          </div>

          {error && <div className="error-msg">❌ {error}</div>}

          {result && (
            <div className="result-view">
              <div className="player-box">
                {mode === 'async' ? (
                  <>
                    {renderVideoPlayer()}
                    <div className="player-overlay" style={{ display: (videoStatus?.video_status === 'ready' || videoStatus?.video_status === 'done') ? 'none' : 'flex' }}>
                      <div 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(videoStatus?.video_status || result.video_status) }}
                      >
                        {(videoStatus?.video_status || result.status || 'QUEUED').toUpperCase()}
                        {polling && <span className="pulse-dot"></span>}
                      </div>
                      <p>Video ID: {result.video_id}</p>
                      {polling && <small>Checking status every 5 seconds...</small>}
                    </div>
                  </>
                ) : (
                  <div className="player-overlay">
                    <div className="status-badge" style={{ backgroundColor: '#f59e0b' }}>LIVE SESSION READY</div>
                    <p>Conversation ID: {result.conversation_id}</p>
                    {result.conversation_url && (
                      <a 
                        href={result.conversation_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="join-btn"
                        style={{
                          background: '#22c55e', color: 'white', border: 'none',
                          padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', 
                          cursor: 'pointer', textDecoration: 'none', display: 'inline-block'
                        }}
                      >
                        Join Interaction
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="json-output">
                <pre>{JSON.stringify(videoStatus || result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
