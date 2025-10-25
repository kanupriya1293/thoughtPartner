# Threaded Chat Thought Partner

A custom chatbot interface that enables learning through branching conversations. Maintain a primary chat thread while exploring tangential topics in separate child threads, with easy navigation between threads.

## Features

- 🌳 **Branching Conversations**: Create child threads from any message to explore tangential topics
- 🔄 **Easy Navigation**: Switch between parent, child, and sibling threads seamlessly
- 🏠 **Root Thread Tracking**: Always know where your conversation started
- 🤖 **Multi-Provider Support**: Works with OpenAI and Anthropic (Claude) models
- 📝 **Context Summaries**: Parent thread context automatically summarized for child threads
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

### Data Structure
- **Threads**: Hierarchical structure with parent-child relationships
- **Messages**: Linear conversation within each thread
- **ThreadContext**: Summaries for context passing between threads

## Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- API keys for OpenAI and/or Anthropic

### Backend Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp env.example .env
```

Edit `.env` and add your API keys:
```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

4. Run the backend:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

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

### LLM Providers

Default provider in `.env`:
```
DEFAULT_PROVIDER=openai
DEFAULT_OPENAI_MODEL=gpt-4
DEFAULT_ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

You can override per message via the API:
```json
{
  "content": "Your message",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

### Summarization

Configure which model summarizes threads:
```
SUMMARIZATION_PROVIDER=openai
SUMMARIZATION_MODEL=gpt-4
```

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
│   │   ├── anthropic_provider.py
│   │   ├── provider_factory.py
│   │   ├── summarizer.py
│   │   └── thread_service.py
│   ├── models.py         # Database models
│   ├── schemas.py        # Pydantic schemas
│   ├── database.py       # Database setup
│   ├── config.py         # Configuration
│   └── main.py          # FastAPI app
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   ├── types/        # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── requirements.txt
├── .gitignore
└── README.md
```

### Adding New LLM Providers

1. Create new provider class in `backend/services/`
2. Implement `LLMProvider` interface
3. Register in `provider_factory.py`
4. Add configuration to `.env`

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

