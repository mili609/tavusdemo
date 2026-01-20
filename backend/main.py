from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import threading
from typing import Optional
import base64

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Round-robin API key management
class APIKeyManager:
    def __init__(self):
        self.keys = []
        self.current_index = 0
        self.lock = threading.Lock()
        self._load_keys()
    
    def _load_keys(self):
        """Load API keys from environment variables"""
        keys_str = os.getenv("DID_API_KEYS", "")
        if keys_str:
            self.keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        
        # Fallback to single key
        if not self.keys:
            single_key = os.getenv("DID_API_KEY", "")
            if single_key:
                self.keys = [single_key]
        
        print(f"Loaded {len(self.keys)} D-ID API keys for round-robin rotation")
    
    def get_next_key(self) -> Optional[str]:
        """Get next API key using round-robin"""
        if not self.keys:
            return None
        
        with self.lock:
            key = self.keys[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.keys)
            return key
    
    def get_key_count(self) -> int:
        return len(self.keys)

# Initialize key manager
key_manager = APIKeyManager()

# D-ID API base URL
DID_API_BASE = "https://api.d-id.com"

# Free presenter images (using publicly available stock photos)
# These are royalty-free images that work with D-ID
PRESENTERS = {
    "emma": "https://images.pexels.com/photos/3779760/pexels-photo-3779760.jpeg?auto=compress&cs=tinysrgb&w=600",
    "amy": "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=600",
    "anna": "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600",
    "alex": "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=600",
    "jack": "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=600",
}

class VideoRequest(BaseModel):
    text: str
    presenter: Optional[str] = "emma"  # Default presenter

class VideoStatusRequest(BaseModel):
    video_id: str

@app.get("/")
def read_root():
    return {
        "message": "AI Video Studio API is running (D-ID)",
        "api_keys_loaded": key_manager.get_key_count(),
        "available_presenters": list(PRESENTERS.keys())
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "api_keys_available": key_manager.get_key_count()
    }

@app.get("/presenters")
def get_presenters():
    """Get list of available free presenters/avatars"""
    return {
        "presenters": PRESENTERS,
        "default": "emma"
    }

@app.post("/generate")
def generate_video(request: VideoRequest):
    """
    Generate a video using D-ID API with round-robin key rotation
    Endpoint: POST https://api.d-id.com/talks
    """
    api_key = key_manager.get_next_key()
    
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="No API keys configured. Set DID_API_KEYS environment variable."
        )
    
    # Get presenter image URL
    presenter_url = PRESENTERS.get(request.presenter, PRESENTERS["emma"])
    
    print(f"Generating video with presenter: {request.presenter}")
    print(f"Presenter URL: {presenter_url}")
    print(f"Script: {request.text[:100]}...")
    
    # D-ID uses Basic auth - key is already in email:password format
    # Just base64 encode it directly
    auth_string = base64.b64encode(api_key.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {auth_string}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "script": {
            "type": "text",
            "input": request.text,
            "provider": {
                "type": "microsoft",
                "voice_id": "en-US-JennyNeural"
            }
        },
        "source_url": presenter_url
    }
    
    try:
        response = requests.post(
            f"{DID_API_BASE}/talks",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"D-ID Response Status: {response.status_code}")
        print(f"D-ID Response: {response.text[:500]}")
        
        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Rate limit reached. Please try again later or use a different API key."
            )
        
        if response.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid API key. Please check your D-ID API key."
            )
        
        response.raise_for_status()
        data = response.json()
        
        return {
            "status": "success",
            "video_id": data.get("id"),
            "video_status": data.get("status", "created"),
            "message": "Video generation started. Poll /status endpoint for updates."
        }
        
    except requests.exceptions.RequestException as e:
        print(f"D-ID API error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            error_detail = e.response.text
        else:
            error_detail = str(e)
        raise HTTPException(
            status_code=500,
            detail=f"D-ID API error: {error_detail}"
        )

@app.get("/status/{video_id}")
def get_video_status(video_id: str):
    """
    Check video generation status
    Endpoint: GET https://api.d-id.com/talks/{id}
    """
    api_key = key_manager.get_next_key()
    
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="No API keys configured."
        )
    
    auth_string = base64.b64encode(api_key.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {auth_string}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{DID_API_BASE}/talks/{video_id}",
            headers=headers,
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        # Map D-ID status to our status
        did_status = data.get("status", "unknown")
        video_url = data.get("result_url", None)
        
        # D-ID statuses: created, started, done, error
        status_map = {
            "created": "queued",
            "started": "processing",
            "done": "ready",
            "error": "failed"
        }
        
        return {
            "status": "success",
            "video_id": video_id,
            "video_status": status_map.get(did_status, did_status),
            "result_url": video_url,
            "download_url": video_url,
            "stream_url": video_url,
            "thumbnail_url": data.get("thumbnail_url"),
            "data": data
        }
        
    except requests.exceptions.RequestException as e:
        print(f"D-ID API error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get video status: {str(e)}"
        )

@app.post("/conversation")
def start_conversation():
    """
    Note: D-ID real-time conversations require paid plan
    This returns info about the limitation
    """
    return {
        "status": "info",
        "message": "Real-time conversations require D-ID paid plan. Use async video generation instead.",
        "suggestion": "Use the 'Async Generation' mode to create videos for free."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
