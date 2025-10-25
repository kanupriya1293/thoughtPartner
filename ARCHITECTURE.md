# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   ChatView   │  │   Message    │  │   Thread     │      │
│  │  Component   │  │     List     │  │  Navigator   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │   API Client │                          │
│                    └──────┬──────┘                          │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼──────────────────────────────────┐
│                     BACKEND (FastAPI)                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    API Endpoints                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ Threads  │  │ Messages │  │ Context  │            │  │
│  │  │   API    │  │   API    │  │   API    │            │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │  │
│  └───────┼─────────────┼─────────────┼───────────────────┘  │
│          │             │             │                       │
│  ┌───────▼─────────────▼─────────────▼───────────────────┐  │
│  │              Service Layer                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │   Thread     │  │  Summarizer  │  │  Provider  │  │  │
│  │  │   Service    │  │   Service    │  │  Factory   │  │  │
│  │  └──────────────┘  └──────────────┘  └─────┬──────┘  │  │
│  └──────────────────────────────────────────────┼─────────┘  │
│                                                  │            │
│  ┌──────────────────────────────────────────────▼─────────┐  │
│  │              LLM Provider Layer                        │  │
│  │  ┌──────────────┐         ┌──────────────┐           │  │
│  │  │   OpenAI     │         │  Anthropic   │           │  │
│  │  │   Provider   │         │   Provider   │           │  │
│  │  └──────────────┘         └──────────────┘           │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼──────────────────────────────┐   │
│  │              Data Layer (SQLAlchemy)                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │  Thread  │  │ Message  │  │  ThreadContext   │   │   │
│  │  │  Model   │  │  Model   │  │      Model       │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────┬────────────────────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │   SQLite Database   │
                  │  thought_partner.db │
                  └─────────────────────┘
```

## Data Model

### Thread Hierarchy Example

```
Root Thread (ID: 1, Depth: 0)
│
├─ Message 1: "Tell me about machine learning"
├─ Message 2: [Assistant response]
│  │
│  ├─── Child Thread A (ID: 2, Depth: 1)
│  │    Branch from: Message 2
│  │    ├─ Message 1: "Explain neural networks in detail"
│  │    ├─ Message 2: [Assistant response]
│  │    │  │
│  │    │  └─── Child Thread C (ID: 4, Depth: 2)
│  │    │       └─ [Deep dive into CNNs]
│  │    └─ Message 3: [Continue neural networks discussion]
│  │
│  └─── Child Thread B (ID: 3, Depth: 1)
│       Branch from: Message 2
│       └─ "What about reinforcement learning?"
│
├─ Message 3: "What are the applications?"
└─ Message 4: [Assistant response]
```

### Database Schema

```sql
-- Threads Table
CREATE TABLE threads (
    id TEXT PRIMARY KEY,
    parent_thread_id TEXT REFERENCES threads(id),
    root_id TEXT REFERENCES threads(id),
    depth INTEGER,
    created_at TIMESTAMP,
    title TEXT,
    branch_from_message_id TEXT REFERENCES messages(id),
    branch_context_text TEXT
);

-- Messages Table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT REFERENCES threads(id),
    role TEXT,  -- 'user', 'assistant', 'system'
    content TEXT,
    sequence INTEGER,
    timestamp TIMESTAMP,
    model TEXT,
    provider TEXT,
    tokens_used INTEGER,
    metadata JSON
);

-- Thread Contexts Table
CREATE TABLE thread_contexts (
    thread_id TEXT PRIMARY KEY REFERENCES threads(id),
    parent_summary TEXT,
    sibling_summary TEXT,
    updated_at TIMESTAMP
);
```

## Request Flow

### Creating a Branch

```
1. User clicks "Branch from here" on Message X
   │
   ▼
2. Frontend: POST /threads
   {
     parent_thread_id: "thread-1",
     branch_from_message_id: "message-X"
   }
   │
   ▼
3. ThreadService.create_thread()
   - Validates parent thread exists
   - Validates branch message exists
   - Calculates depth (parent.depth + 1)
   - Sets root_id to parent.root_id
   │
   ▼
4. Summarizer.generate_parent_summary()
   - Fetches all messages in parent thread up to Message X
   - Formats as conversation
   - Calls LLM to summarize
   │
   ▼
5. Save ThreadContext
   - Stores parent_summary for new thread
   │
   ▼
6. Return new Thread object to frontend
   │
   ▼
7. Frontend switches to new thread
```

### Sending a Message

```
1. User types message and presses Send
   │
   ▼
2. Frontend: POST /threads/{id}/messages
   { content: "User's question" }
   │
   ▼
3. MessageService:
   - Save user message to database
   - Generate title if first message
   │
   ▼
4. Assemble LLM Context:
   ┌─────────────────────────────┐
   │ System prompt               │
   ├─────────────────────────────┤
   │ Parent summary (if exists)  │
   ├─────────────────────────────┤
   │ Thread message 1            │
   │ Thread message 2            │
   │ ...                         │
   │ User's new message          │
   └─────────────────────────────┘
   │
   ▼
5. Call LLM Provider
   - Send formatted messages
   - Get response
   - Track tokens used
   │
   ▼
6. Save assistant message
   - Store response
   - Store metadata (model, tokens, etc.)
   │
   ▼
7. Return assistant message to frontend
   │
   ▼
8. Frontend displays response
```

## Component Responsibilities

### Backend

**API Layer** (`backend/api/`)
- Handle HTTP requests/responses
- Input validation via Pydantic
- Route to appropriate services
- Error handling and status codes

**Service Layer** (`backend/services/`)
- **ThreadService**: Thread CRUD, validation, title generation
- **Summarizer**: Generate parent/sibling summaries
- **ProviderFactory**: Create LLM provider instances
- **LLM Providers**: Interface with external APIs

**Data Layer** (`backend/models.py`)
- SQLAlchemy ORM models
- Database relationships
- Schema definitions

### Frontend

**Components** (`frontend/src/components/`)
- **App**: Application root, thread management
- **ChatView**: Main chat interface, message handling
- **MessageList**: Display messages
- **Message**: Individual message with branching
- **BranchIndicator**: Show/access branches
- **ThreadNavigator**: Navigate thread hierarchy

**Services** (`frontend/src/services/`)
- **API Client**: Axios-based HTTP client
- Type-safe API calls
- Error handling

**Types** (`frontend/src/types/`)
- TypeScript interfaces
- Shared type definitions

## Key Design Decisions

### 1. Parent Context via Summarization
**Why**: Reduces token usage while preserving context
**How**: When branching, parent thread summarized and stored
**Alternative**: Could pass full parent messages (expensive)

### 2. Children Don't Update Parents
**Why**: Simpler data model, no circular dependencies
**How**: Query children when needed: `WHERE parent_thread_id = ?`
**Benefit**: No cascade updates, easier to reason about

### 3. Root ID Tracking
**Why**: Always know conversation origin
**How**: Set at thread creation, inherited by children
**Benefit**: "Go to origin" feature without traversing tree

### 4. Provider Abstraction
**Why**: Support multiple LLM providers
**How**: Interface + concrete implementations
**Benefit**: Easy to add new providers (Gemini, etc.)

### 5. Separate Context Table
**Why**: Summaries are computed/cached, not core data
**How**: One-to-one relationship with Thread
**Benefit**: Can regenerate without affecting thread data

## Future Extensions

### Sibling Context Support
Already structured in schema, implementation would:
1. Query sibling threads: `WHERE parent_thread_id = ? AND id != ?`
2. Summarize each sibling's conversation
3. Combine into sibling_summary
4. Include in LLM context when requested

### Text Selection for Branching
Enhance branch creation:
1. User selects text in message
2. Pass as `branch_context_text`
3. Include in branch's first system message
4. UI highlights selected text in parent

### Thread Visualization
Add graph/tree view:
1. Query all threads with `root_id = current.root_id`
2. Build tree structure
3. Render with D3.js or similar
4. Click nodes to navigate

### Export Conversations
Allow saving conversations:
1. Traverse thread tree
2. Format as Markdown/PDF
3. Include metadata
4. Download to user

