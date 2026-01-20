# AI Video Studio

A web application for generating AI-powered lip-sync videos using the D-ID API. Built with React (Vite) frontend and Python (FastAPI) backend, fully containerized with Docker.

## Features

- Text-to-video generation with AI lip-sync
- Multiple presenter/avatar options
- Round-robin API key rotation for load balancing
- Real-time video status polling
- Built-in video player with download option
- Responsive design for desktop and mobile

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19, Vite 7 |
| Backend | Python 3.11, FastAPI |
| Containerization | Docker, Docker Compose |
| API | D-ID (Video Generation) |

## Prerequisites

- Docker and Docker Compose installed
- D-ID API key (free tier available at https://studio.d-id.com)

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/mili609/tavusdemo.git
cd tavusdemo
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Add your D-ID API key to `.env`:

```
DID_API_KEYS=your_api_key_here
```

4. Start the application:

```bash
docker compose up --build -d
```

5. Open http://localhost:3000 in your browser.

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| DID_API_KEYS | Comma-separated list of D-ID API keys for round-robin rotation |

### Multiple API Keys

For higher throughput and rate limit management, you can configure multiple API keys:

```
DID_API_KEYS=key1,key2,key3
```

The backend will rotate through these keys for each request.

## Project Structure

```
tavusdemo/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   └── App.css          # Styles
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Health check and API info |
| GET | /presenters | List available presenters |
| POST | /generate | Generate a new video |
| GET | /status/{video_id} | Check video generation status |

## Usage

1. Select a presenter from the available options
2. Enter your script text
3. Click "Generate Video"
4. Wait for processing (typically 30-60 seconds)
5. Watch or download the generated video

## Development

### Running without Docker

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Docker Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Restart after configuration changes
docker compose restart backend

# Stop services
docker compose down

# Rebuild after code changes
docker compose up --build -d
```

## Free Tier Limits

D-ID free tier includes:
- 5 minutes of video generation per month
- Access to stock presenters
- API access

## License

MIT License

## Author

Megh Vyas
