# Implementation Notes - OpenAI Responses API Migration

## Overview
This application uses OpenAI's **Responses API** with native branching support via `previous_response_id` to maintain conversation context across thread branches.

## Key Implementation Details

### 1. Database Schema

#### Thread Table
- `id`: UUID - Thread identifier
- `parent_thread_id`: UUID (nullable) - Parent thread for branches
- `root_id`: UUID - Root thread of the tree
- `depth`: Integer - Nesting level (0 = root)
- `branch_from_message_id`: UUID (nullable) - Message that spawned this branch
- `branch_context_text`: Text (nullable) - Selected text context
- `created_at`: Timestamp
- `title`: String (nullable) - Auto-generated from first message

#### Message Table
- `id`: UUID - Message identifier
- `thread_id`: UUID - Parent thread
- `role`: Enum (user, assistant, system)
- `content`: Text - Message content
- `sequence`: Integer - Order within thread
- `timestamp`: Timestamp
- `model`: String (nullable) - Model used (e.g., "gpt-4")
- `provider`: String (nullable) - "openai"
- `tokens_used`: Integer (nullable) - For cost tracking
- `response_metadata`: JSON (nullable) - API response metadata
- **`openai_response_id`: String (nullable)** - Response ID for branching

#### ThreadContext Table
- `thread_id`: UUID (primary key)
- `parent_summary`: Text (nullable) - Summary of parent thread
- `sibling_summary`: Text (nullable) - Summary of sibling threads
- `updated_at`: Timestamp

### 2. OpenAI Responses API Usage

#### Root Thread Conversation
```python
# First message (no previous_response_id)
response = await client.responses.create(
    model="gpt-4",
    input="User message",
    instructions="System instructions"
)
# Store response.id as openai_response_id

# Subsequent messages
response = await client.responses.create(
    model="gpt-4",
    input="Next user message",
    instructions="System instructions",
    previous_response_id="resp_abc123"  # From last assistant message
)
```

#### Branching
```python
# When branching from message X in parent thread
# Use parent message's openai_response_id
response = await client.responses.create(
    model="gpt-4",
    input="Branch question",
    instructions="System instructions",
    previous_response_id="resp_parent_msg"  # From branch point
)
# OpenAI maintains full context up to branch point
```

### 3. Context Management

**OpenAI handles context automatically:**
- Root thread: Chain via `previous_response_id`
- Child thread first message: Uses parent's branch point `previous_response_id`
- Child thread continuation: Uses child's last `previous_response_id`

**No need to resend message history!** The API maintains state.

### 4. Summarization (Optional Feature)

**Configuration:**
```python
enable_summarization: bool = False  # Default: disabled
```

**When disabled (default for OpenAI):**
- No summary generation on branch creation
- Saves API calls and tokens
- OpenAI uses `previous_response_id` instead

**When enabled:**
- Generates parent thread summary on branch creation
- Useful for future providers that don't support stateful APIs
- Summary stored in ThreadContext table

### 5. Provider Architecture

**Current Provider:** OpenAI only

**Adding Future Providers:**
```python
# 1. Create provider class
class NewProvider(LLMProvider):
    async def send_message(self, messages, model=None, previous_response_id=None, **kwargs):
        # Implementation
        pass

# 2. Register in factory
_providers = {
    "openai": OpenAIProvider,
    "newprovider": NewProvider,
}

# 3. Enable summarization if provider doesn't support stateful conversations
enable_summarization = True
```

## API Flow

### Creating and Using a Branch

1. **User creates branch from message X:**
   ```
   POST /threads
   {
     "parent_thread_id": "thread-A",
     "branch_from_message_id": "msg-X"
   }
   ```

2. **System creates child thread:**
   - Stores parent relationship
   - If `enable_summarization=True`: Generates parent summary
   - Otherwise: No summary (OpenAI uses native branching)

3. **User sends first message in branch:**
   ```
   POST /threads/{child_thread_id}/messages
   {
     "content": "Branch question",
     "provider": "openai"
   }
   ```

4. **System looks up context:**
   - Finds parent's message X
   - Gets `openai_response_id` from message X
   - Passes as `previous_response_id` to API

5. **OpenAI response:**
   - Has full context up to message X
   - Returns new response with new `response_id`
   - Stored for future messages in child thread

### Conversation Continuation

Each subsequent message in a thread:
1. Gets last assistant message's `openai_response_id`
2. Passes as `previous_response_id`
3. OpenAI maintains context automatically

## Benefits of This Implementation

### Token Efficiency
- ❌ Old approach: Resend entire conversation history every time
- ✅ New approach: Only send current message + reference ID
- **Savings:** Significant for long conversations

### Native Branching
- ❌ Old approach: Manual context management, summaries
- ✅ New approach: OpenAI handles branching natively
- **Result:** More accurate context preservation

### Cost Optimization
- No unnecessary summary generation (when disabled)
- Reduced token usage per message
- Better cache utilization

### Flexibility
- Flag-controlled features
- Easy to add new providers
- Backward compatible database schema

## Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
DEFAULT_PROVIDER=openai
DEFAULT_OPENAI_MODEL=gpt-4
ENABLE_SUMMARIZATION=false
SUMMARIZATION_PROVIDER=openai
SUMMARIZATION_MODEL=gpt-4
```

### Default Settings
- Provider: OpenAI
- Model: gpt-4
- Summarization: Disabled
- Uses Responses API with `previous_response_id`

## Database Reset

When schema changes during development:
```bash
python3 reset_database.py
```

This drops and recreates all tables. Use with caution!

## Summary

**Core Innovation:** Native branching via OpenAI Responses API's `previous_response_id`

**Key Benefit:** OpenAI manages conversation state, no manual history management needed

**Implementation:** Store response IDs, pass as references, let OpenAI handle the rest

**Result:** Simpler code, lower costs, better context preservation

