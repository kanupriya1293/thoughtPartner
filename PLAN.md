# Threaded Chat Thought Partner

## Overview
A custom chatbot UI that enables learning through branching conversations - maintain a primary chat thread while exploring tangential topics in separate child threads, with easy navigation back to the main discussion.

## Tech Stack
- **Backend**: Python with FastAPI (async, API docs, clean separation)
- **Frontend**: React with TypeScript (barebones MVP, evolvable UI)
- **Database**: SQLite (single-user, simple, transactional, easy backup)
- **LLM Integration**: Multi-provider support (OpenAI, Anthropic, others)

## Data Structure

### Thread Table
```
- id: UUID (primary key)
- parent_thread_id: UUID (nullable, references Thread.id)
- root_id: UUID (references Thread.id, identifies origin thread)
- depth: integer (0 for root, increments with nesting)
- created_at: timestamp
- title: string (nullable, auto-generated or user-provided)
- branch_from_message_id: UUID (nullable, which message spawned this branch)
- branch_context_text: string (nullable, selected text that triggered branch)
```

### Message Table
```
- id: UUID (primary key)
- thread_id: UUID (references Thread.id)
- role: enum ("user", "assistant", "system")
- content: text (the message)
- sequence: integer (order within thread: 1, 2, 3...)
- timestamp: timestamp
- model: string (nullable, e.g., "gpt-4", "claude-3-opus")
- provider: string (nullable, "openai", "anthropic")
- tokens_used: integer (nullable, for cost tracking)
- metadata: JSON (nullable, for extensibility)
```

### ThreadContext Table
```
- thread_id: UUID (primary key, references Thread.id)
- parent_summary: text (nullable, summarized parent context)
- sibling_summary: text (nullable, summarized sibling contexts)
- updated_at: timestamp (when summaries were last computed)
```

## Context Passing Strategy

**Summary-based approach** (MVP):
1. **Parent Summary**: When branching, summarize parent thread up to branch point
2. **Sibling Summary**: Not in MVP - table structure supports future addition
3. Summaries generated using same LLM provider (can optimize later with cheaper models)

**When to generate summaries**:
- Parent summary: at branch creation time
- Sibling summary: deferred to future version

**Future: How sibling context will work:**
```python
def construct_llm_messages(thread, include_sibling_context=False):
    messages = []
    
    # 1. System prompt
    messages.append({"role": "system", "content": "You are a helpful thought partner..."})
    
    # 2. Parent context (if exists)
    if thread_context.parent_summary:
        messages.append({"role": "system", "content": f"Previous discussion: {parent_summary}"})
    
    # 3. Sibling context (future feature)
    if include_sibling_context and thread_context.sibling_summary:
        messages.append({"role": "system", "content": f"Parallel explorations: {sibling_summary}"})
    
    # 4. Current thread messages
    messages.extend(thread.messages)
    
    return messages
```

## Core Features

### Branching Capabilities
- Create multiple child threads from any message in parent thread
- Branch with selected text (highlight-to-branch) or general fork
- Unlimited nesting depth (child threads can have their own children)
- Each thread maintains independent conversation flow

### Navigation
- Display branch indicators on messages that have child threads
- Query-based child discovery: `SELECT * FROM Thread WHERE parent_thread_id = ?`
- Click/hover to see and access branches from any message
- Breadcrumb or tree view to show current location in thread hierarchy
- Root thread identifier for "return to origin" functionality

### UI Display
- Primary thread view with chat messages
- Branch indicators (icons/badges) on messages with children
- Basic thread navigation (parent/children/siblings)
- Thread switcher to move between conversations
- Simple, clean interface - focus on functionality over polish

## API Architecture

Clear separation of concerns with focused endpoints:

### Thread Management
- `POST /threads` - Create new thread (root or branch)
  - Body: `{ parent_thread_id?, branch_from_message_id?, branch_context_text? }`
  - Returns: Thread metadata with ID
- `GET /threads/{thread_id}` - Get thread metadata only
  - Returns: Thread info (id, parent, root, depth, title, branch info)
- `GET /threads/{thread_id}/children` - List child threads
  - Returns: Array of child thread metadata

### Message Operations  
- `GET /threads/{thread_id}/messages` - Get all messages in a thread
  - Returns: Array of messages with branch indicators
- `POST /threads/{thread_id}/messages` - Send user message and get LLM response
  - Body: `{ content: string, provider?: string, model?: string }`
  - Handles: message storage, context assembly, LLM call, response storage
  - Returns: Assistant's response message

### Context Management
- `GET /threads/{thread_id}/context` - Get computed context summaries
  - Returns: Parent and sibling summaries if they exist
- `POST /threads/{thread_id}/context/regenerate` - Regenerate summaries
  - Body: `{ regenerate_parent?: bool, regenerate_siblings?: bool }`

**Design Principles:**
- Thread endpoints handle thread structure and navigation only
- Message endpoints handle conversation flow and LLM interaction
- Context endpoints handle summary generation (separate concern)
- No redundant endpoints - each has single clear responsibility
- No mixing of concerns (e.g., thread creation doesn't send messages)

### LLM Provider Abstraction
- Provider interface with methods: `send_message()`, `summarize()`
- Concrete implementations: OpenAI, Anthropic, others
- Configuration-based provider selection
- Unified response format across providers

## Implementation Decisions

1. **Thread Titles**: Auto-generate from first user message
2. **Sibling Context**: Not in MVP - table structure supports future addition via query parameter
3. **Editing/Deleting**: Not in MVP - extensible for future versions
4. **API Keys**: Environment variables only (`.env` file)
5. **Max Depth**: No hard limit (optional soft UI warning at deep levels for UX awareness)

## Implementation Status

### ✅ Phase 1: Backend Core - COMPLETED
1. ✅ Set up FastAPI project structure
2. ✅ SQLAlchemy models for Thread, Message, ThreadContext
3. ✅ SQLite database initialization
4. ✅ Basic CRUD operations for threads and messages

### ✅ Phase 2: LLM Integration - COMPLETED
1. ✅ Provider abstraction layer
2. ✅ OpenAI integration
3. ✅ Anthropic integration
4. ✅ Configuration system for API keys (environment variables)
5. ✅ Token usage tracking

### ✅ Phase 3: Threading Logic - COMPLETED
1. ✅ Thread creation with parent/root relationships
2. ✅ Branch context capture (message_id, selected text)
3. ✅ Summary generation logic
4. ✅ Context assembly for LLM calls (parent summary + thread messages)
5. ✅ Child thread discovery queries

### ✅ Phase 4: Frontend MVP - COMPLETED
1. ✅ React app setup with TypeScript
2. ✅ Simple chat interface (input box, message display)
3. ✅ Branch creation UI (button/context menu on messages)
4. ✅ Thread navigation (show current thread, list children, go to parent)
5. ✅ Basic thread switcher
6. ✅ Display branch indicators

### ✅ Phase 5: Polish & Testing - COMPLETED
1. ✅ Error handling
2. ✅ Loading states
3. ✅ Basic styling
4. ✅ End-to-end testing documentation
5. ✅ Token usage display

## Implemented Features

### Core Functionality
- ✅ Create root threads automatically
- ✅ Send messages and receive LLM responses
- ✅ Create branches from any message
- ✅ Navigate between parent/child threads
- ✅ View all children of a thread
- ✅ "Go to origin" navigation
- ✅ Branch indicators on messages with counts
- ✅ Auto-generated thread titles
- ✅ Parent context summarization
- ✅ Multi-provider LLM support (OpenAI, Anthropic)
- ✅ Token usage tracking and display
- ✅ Persistent storage with SQLite
- ✅ API documentation (FastAPI Swagger)

### Not Yet Implemented (Future Enhancements)
- ⏳ Sibling context in conversations
- ⏳ Text selection for branch context
- ⏳ Edit/delete messages and threads
- ⏳ Search across conversations
- ⏳ Thread visualization (tree/graph view)
- ⏳ Export conversations
- ⏳ Multiple root threads UI
- ⏳ Keyboard shortcuts

## Files to Create

**Backend:**
- `backend/main.py` - FastAPI app entry point
- `backend/models.py` - SQLAlchemy models (Thread, Message, ThreadContext)
- `backend/database.py` - Database connection and session management
- `backend/schemas.py` - Pydantic models for API requests/responses
- `backend/api/threads.py` - Thread management endpoints
- `backend/api/messages.py` - Message handling endpoints
- `backend/api/context.py` - Context/summary endpoints
- `backend/services/llm_provider.py` - LLM provider abstraction interface
- `backend/services/openai_provider.py` - OpenAI implementation
- `backend/services/anthropic_provider.py` - Anthropic implementation
- `backend/services/summarizer.py` - Context summarization logic
- `backend/services/thread_service.py` - Thread business logic
- `backend/config.py` - Configuration management
- `requirements.txt` - Python dependencies

**Frontend:**
- `frontend/src/App.tsx` - Main React app
- `frontend/src/components/ChatView.tsx` - Chat interface component
- `frontend/src/components/MessageList.tsx` - Display messages
- `frontend/src/components/Message.tsx` - Individual message component
- `frontend/src/components/ThreadNavigator.tsx` - Thread navigation UI
- `frontend/src/components/BranchIndicator.tsx` - Branch markers on messages
- `frontend/src/services/api.ts` - Backend API client
- `frontend/src/types/thread.ts` - TypeScript type definitions
- `frontend/src/types/message.ts` - Message type definitions
- `frontend/package.json` - NPM dependencies

**Configuration:**
- `.env.example` - Example environment variables template
- `README.md` - Setup and usage instructions
- `.gitignore` - Git ignore patterns

## Service Layer Responsibilities

**thread_service.py** - Business logic for threads:
- Create thread with proper parent/root/depth relationships
- Validate branch creation (message exists, thread exists)
- Generate thread title from first message
- Query child threads for navigation

**summarizer.py** - Context summarization:
- Generate parent summary at branch creation
- Future: Generate sibling summaries
- Handle different summarization strategies
- Manage summary storage in ThreadContext table

**LLM Providers** - External API integration:
- Send messages with proper context
- Handle provider-specific formats
- Track token usage
- Unified error handling

