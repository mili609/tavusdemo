from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
# from dotenv import load_dotenv

# load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "Tavus Demo API is running"}

@app.post("/generate")
def generate_video(request: VideoRequest):
    """
    Simulation of Tavus Video Generation API (Async)
    Endpoint: POST https://api.tavus.io/v2/videos
    """
    print(f"Generating video for: {request.text}")
    
    # In a real app, you'd use your Tavus API Key here
    # api_key = os.getenv("TAVUS_API_KEY")
    
    return {
        "status": "success",
        "video_id": "vid_abc123789",
        "hosted_url": "https://tavus.io/video/vid_abc123789", # Mock URL
        "thumbnail_url": "https://via.placeholder.com/640x360.png?text=Tavus+Video+Generating...",
        "status": "processing"
    }

@app.post("/conversation")
def start_conversation():
    """
    Simulation of Tavus Conversational Video (Real-time)
    Endpoint: POST https://api.tavus.io/v2/conversations
    """
    print("Starting real-time conversation...")
    
    return {
        "status": "success",
        "conversation_id": "conv_xyz456",
        "conversation_url": "https://tavus.io/call/conv_xyz456", # This would be embedded in an iframe
        "token": "mock_token_123"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
