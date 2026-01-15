import { useState } from 'react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('async') // 'async' or 'realtime'

  const handleAction = async () => {
    if (mode === 'async' && !text.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const endpoint = mode === 'async' ? '/generate' : '/conversation'
      const body = mode === 'async' ? JSON.stringify({ text }) : null

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })

      if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`)

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('Backend connection failed. Please run: uvicorn main:app --reload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="title-section">
        <h1>Tavus AI Studio</h1>
        <p className="subtitle">Real-time Lip Sync & Video Generation</p>
      </div>

      <div className="dashboard">
        <div className="sidebar">
          <button
            className={`nav-item ${mode === 'async' ? 'active' : ''}`}
            onClick={() => { setMode('async'); setResult(null); }}
          >
            <span className="icon">🎬</span> Async Generation
          </button>
          <button
            className={`nav-item ${mode === 'realtime' ? 'active' : ''}`}
            onClick={() => { setMode('realtime'); setResult(null); }}
          >
            <span className="icon">⚡</span> Real-time Call
          </button>

          <div style={{ marginTop: 'auto', padding: '10px', fontSize: '0.8rem', color: '#666' }}>
            Status: {loading ? 'Processing...' : 'Ready'}
          </div>
        </div>

        <div className="main-content">
          <div className="input-area">
            {mode === 'async' ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your script for the AI replica..."
                rows="6"
              />
            ) : (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <p>Ready to start a sub-second latency video conversation with your AI twin.</p>
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={loading || (mode === 'async' && !text.trim())}
              className="generate-btn"
            >
              {loading ? 'Connecting to Tavus...' : mode === 'async' ? 'Finalize & Generate' : 'Start Live Session'}
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {result && (
            <div className="result-view">
              <div className="player-box">
                {mode === 'async' ? (
                  <>
                    <img src={result.thumbnail_url} alt="Video Thumbnail" />
                    <div className="player-overlay">
                      <div className="status-badge">GENERATING</div>
                      <p>Video ID: {result.video_id}</p>
                      <small>Mock URL: {result.hosted_url}</small>
                    </div>
                  </>
                ) : (
                  <div className="player-overlay">
                    <div className="status-badge" style={{ backgroundColor: '#f59e0b' }}>LIVE SESSION READY</div>
                    <p>Conversation ID: {result.conversation_id}</p>
                    <button className="join-btn" style={{
                      background: '#22c55e', color: 'white', border: 'none',
                      padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer'
                    }}>
                      Join Interaction
                    </button>
                  </div>
                )}
              </div>
              <div className="json-output">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
