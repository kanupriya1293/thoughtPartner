# Quick Start Guide

Get up and running with the Threaded Chat Thought Partner in 5 minutes!

## Prerequisites

- Python 3.8+ installed
- Node.js 18+ installed  
- OpenAI API key (get one at https://platform.openai.com)
- Or Anthropic API key (get one at https://console.anthropic.com)

## Installation

### Option 1: Automated Setup (Recommended)

```bash
./setup.sh
```

This will:
- Create Python virtual environment
- Install backend dependencies
- Install frontend dependencies
- Create .env file from template

### Option 2: Manual Setup

**Backend:**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp env.example .env
```

**Frontend:**
```bash
cd frontend
npm install
```

## Configuration

Edit `.env` file and add your API keys:

```bash
# Required: At least one API key
OPENAI_API_KEY=sk-...your-key-here
ANTHROPIC_API_KEY=sk-ant-...your-key-here

# Optional: Choose default provider
DEFAULT_PROVIDER=openai  # or 'anthropic'
```

## Running the Application

### Option 1: Using Helper Scripts

**Terminal 1 (Backend):**
```bash
./run_backend.sh
```

**Terminal 2 (Frontend):**
```bash
./run_frontend.sh
```

### Option 2: Manual Start

**Terminal 1 (Backend):**
```bash
source venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/health

## Basic Usage

### Starting Your First Conversation

1. The app automatically creates a root thread
2. Type your question or topic in the chat input
3. Press Enter or click Send
4. The LLM will respond

### Creating a Branch

1. Find a message you want to branch from
2. Click the "Branch from here" button
3. A new child thread is created
4. The parent conversation context is automatically included
5. Start chatting in the new branch

### Navigating Threads

**Sidebar Navigation:**
- **Parent Thread**: Click to go back to the parent
- **Child Threads**: List of all branches from current thread
- **Origin Thread**: Jump back to where you started

**Branch Indicators:**
- Messages with branches show a 🌿 icon
- Click to see and access all branches from that message

### Creating Multiple Branches

You can create multiple branches from:
- Different messages in the same thread
- The same message (multiple explorations)
- Child threads (nested branches)

## Example Workflow

```
Root Thread: "Explain quantum computing"
├── Response about quantum computing basics
│   ├── Branch 1: "Deep dive into qubits"  ← Explore qubits
│   │   └── Continue chatting about qubits
│   └── Continue main conversation
├── Response about applications
│   └── Branch 2: "Quantum cryptography details"  ← Explore cryptography
└── Continue main thread about quantum computing
```

## Switching LLM Providers

The UI uses the default provider from `.env`, but you can switch providers via the API:

```bash
curl -X POST http://localhost:8000/threads/{thread_id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your question",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }'
```

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (need 3.8+)
- Verify virtual environment is activated
- Check .env file exists and has valid API keys
- View logs for specific errors

### Frontend won't start
- Check Node version: `node --version` (need 18+)
- Delete `node_modules` and run `npm install` again
- Check if port 3000 is already in use

### API key errors
- Verify keys in `.env` are correct
- No quotes around keys in .env file
- Keys should start with `sk-` (OpenAI) or `sk-ant-` (Anthropic)

### Database errors
- Delete `thought_partner.db` to start fresh
- Backend will recreate database on next start

## What's Next?

- Explore deep nested conversations
- Try both OpenAI and Anthropic models
- Create multiple root threads for different topics
- Check the API docs at `/docs` for advanced features

## Need Help?

- Check the full README.md for detailed documentation
- Review the PLAN.md for architecture details
- Open an issue on GitHub (if applicable)

Enjoy exploring ideas with your Thought Partner! 🧠✨

