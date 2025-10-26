# Threaded Chat Thought Partner

A custom chatbot interface that enables learning through branching conversations. Maintain a primary chat thread while exploring tangential topics in separate child threads, with easy navigation between threads.

## Features

- 🌳 **Branching Conversations**: Create child threads from any message to explore tangential topics
- 🔄 **Easy Navigation**: Switch between parent, child, and sibling threads seamlessly
- 🏠 **Root Thread Tracking**: Always know where your conversation started
- 🤖 **OpenAI Responses API**: Native branching support with stateful conversations
- 🚀 **Efficient Context**: Uses `previous_response_id` for token-efficient context management
- 💾 **Persistent Storage**: SQLite database stores all threads and messages

## Architecture

### Backend (FastAPI + Python)
- **FastAPI**: REST API with async support
- **SQLAlchemy**: ORM for database operations
- **SQLite**: Simple, file-based database
- **LLM Providers**: Abstracted interface supporting multiple providers

### Frontend (React + TypeScript)
- **React**: Component-based UI
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **lucide-react**: Icon library

### Data Structure
- **Threads**: Hierarchical structure with parent-child relationships
- **Messages**: Linear conversation within each thread
- **ThreadContext**: Summaries for context passing between threads

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API key

### First Time Setup (One-Time Only)

**Step 1: Run the setup script**
```bash
./setup.sh
```

This installs all dependencies:
- ✅ Creates Python virtual environment
- ✅ Installs backend dependencies (from `requirements.txt`)
- ✅ Installs frontend dependencies (`npm install`)
- ✅ Creates `.env` file from template

**Step 2: Add your API key**

Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=your_openai_key_here
```

### Running the Application (Every Time)

**Start both servers:**
```bash
./start.sh
```

This will:
- Start the backend on `http://localhost:8000`
- Start the frontend on `http://localhost:3000`
- Run both in the background with log monitoring

**Stop all servers:**
```bash
./stop.sh
```

**View logs:**
```bash
# Real-time monitoring
./logs.sh

# Or view individual logs
tail -f logs/backend.log
tail -f logs/frontend.log
```

### Manual Setup (Alternative)

If you prefer manual setup or to run services individually:

**1. Backend setup:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**2. Frontend setup:**
```bash
cd frontend
npm install
cd ..
```

**3. Configure `.env`:**
```bash
cp env.example .env
# Edit .env and add your API key
```

**4. Run services individually:**
```bash
# Backend only
./run_backend.sh

# Frontend only (in another terminal)
./run_frontend.sh
```

## Usage

### Starting a Conversation

1. Open the app in your browser
2. A root thread is automatically created
3. Type your message and press Send (or Enter)

### Creating Branches

1. Click "Branch from here" on any message
2. This creates a new child thread starting from that point
3. The child thread includes a summary of the parent conversation
4. Chat continues in the new branch

### Navigation

- **Parent Thread**: Click the parent link in the sidebar to go back
- **Child Threads**: View and access all child threads from the sidebar
- **Origin Thread**: Click "Go to Origin Thread" to return to the root
- **Branch Indicators**: Messages with branches show a branch icon with count

### Multiple Threads

- Create multiple branches from the same parent
- Each branch is independent
- Navigate between sibling threads via their parent

## API Endpoints

### Threads
- `POST /threads` - Create new thread (root or branch)
- `GET /threads/{id}` - Get thread metadata
- `GET /threads/{id}/children` - List child threads

### Messages
- `GET /threads/{id}/messages` - Get all messages in thread
- `POST /threads/{id}/messages` - Send message and get LLM response

### Context
- `GET /threads/{id}/context` - Get context summaries
- `POST /threads/{id}/context/regenerate` - Regenerate summaries

## Configuration

### Environment Variables

Available settings in `.env`:

```bash
# Required
OPENAI_API_KEY=your_openai_key_here

# Optional (with defaults)
DEFAULT_PROVIDER=openai
DEFAULT_OPENAI_MODEL=gpt-4o

# Summarization (disabled by default for OpenAI Responses API)
ENABLE_SUMMARIZATION=false
SUMMARIZATION_PROVIDER=openai
SUMMARIZATION_MODEL=gpt-4o
```

### OpenAI Responses API

This application uses OpenAI's Responses API with native branching support via `previous_response_id`:

- **Stateful conversations**: Context maintained by OpenAI automatically
- **Native branching**: Branch from any message with full context preserved
- **Token efficient**: No need to resend full conversation history
- **Better caching**: Improved performance and lower costs

See `IMPLEMENTATION_NOTES.md` for technical details.

## Development

### Project Structure

```
thoughts/
├── backend/
│   ├── api/              # API endpoints
│   │   ├── threads.py
│   │   ├── messages.py
│   │   └── context.py
│   ├── services/         # Business logic
│   │   ├── llm_provider.py
│   │   ├── openai_provider.py
│   │   ├── provider_factory.py
│   │   ├── summarizer.py
│   │   └── thread_service.py
│   ├── models.py         # Database models
│   ├── schemas.py        # Pydantic schemas
│   ├── database.py       # Database setup
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   ├── types/        # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── start.sh              # Start all servers
├── stop.sh               # Stop all servers
├── logs.sh               # Monitor logs
├── run_backend.sh        # Start backend only
├── run_frontend.sh       # Start frontend only
├── setup.sh              # Initial setup
├── requirements.txt
└── README.md
```

### Adding New LLM Providers

The architecture supports multiple providers. To add a new one:

1. Create provider class in `backend/services/` implementing `LLMProvider`
2. Register in `provider_factory.py`
3. Add configuration to `.env`
4. Enable `ENABLE_SUMMARIZATION=true` if provider doesn't support stateful conversations

Example: See `backend/services/openai_provider.py` for reference implementation.

## Future Enhancements

- Sibling context support (already structured in data model)
- Text selection for branching context
- Edit/delete messages and threads
- Export conversations
- Search across threads
- Thread visualization (tree/graph view)
- Keyboard shortcuts
- Dark mode

## License

MIT

