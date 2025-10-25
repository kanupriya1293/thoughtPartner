# Testing Guide

This guide covers how to test the Threaded Chat Thought Partner application.

## Manual Testing

### 1. Basic Conversation Flow

**Test Case: Send a message and get response**
1. Start the application
2. Type a message in the input box
3. Press Enter or click Send
4. Verify: User message appears
5. Verify: Assistant response appears below
6. Verify: Token count is displayed
7. Verify: Thread title auto-generated from first message

**Expected Result:**
- Messages display in correct order
- Role labels show "You" and "Assistant"
- Timestamp and token usage visible

### 2. Thread Branching

**Test Case: Create a branch from a message**
1. Have a conversation with at least 3 messages
2. Find the second assistant response
3. Click "Branch from here" button
4. Verify: New thread created
5. Verify: Sidebar shows you're in a child thread
6. Verify: Parent thread link visible
7. Send a message in the new branch
8. Verify: Response includes context from parent

**Expected Result:**
- Branch created successfully
- Parent context included in child thread
- Can navigate back to parent

### 3. Navigation Between Threads

**Test Case: Navigate parent-child-sibling**
1. Create a root thread with some messages
2. Create Branch A from message 2
3. Go back to parent thread
4. Create Branch B from message 4
5. Navigate to Branch A
6. Verify: Sidebar shows parent and sibling (Branch B)
7. Navigate to parent
8. Verify: Both children (A and B) listed
9. Click "Go to Origin Thread"
10. Verify: Returns to root thread

**Expected Result:**
- All navigation works correctly
- Sidebar updates with thread relationships
- No lost data when switching

### 4. Multiple Branches from Same Message

**Test Case: Multiple branches from one message**
1. Create a thread with a message
2. Click "Branch from here" on assistant response
3. Navigate back to parent
4. Click "Branch from here" on the SAME message again
5. Verify: Second branch created
6. Navigate to parent
7. Verify: Message shows "🌿 2 branches"
8. Click the branch indicator
9. Verify: Both branches listed in dropdown

**Expected Result:**
- Multiple branches allowed from same message
- Branch count accurate
- All branches accessible

### 5. Nested Branching (3+ levels)

**Test Case: Deep nesting**
1. Create root thread (depth 0)
2. Branch from it → Child A (depth 1)
3. From Child A, branch again → Grandchild (depth 2)
4. From Grandchild, branch → Great-grandchild (depth 3)
5. Navigate through all levels
6. From Great-grandchild, click "Go to Origin"
7. Verify: Returns to root thread

**Expected Result:**
- Deep nesting works
- Depth displayed correctly
- Origin navigation works from any depth

### 6. Multi-Provider Support

**Test Case: Switch between providers**
1. Configure both OpenAI and Anthropic keys
2. Send a message (uses default provider)
3. Via API, send message with different provider:
```bash
curl -X POST http://localhost:8000/threads/{thread_id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello", "provider": "anthropic"}'
```
4. Verify: Model name shown in message (e.g., claude-3-5-sonnet)
5. Continue conversation
6. Verify: Provider persists or defaults correctly

**Expected Result:**
- Both providers work
- Model name displayed correctly
- No errors switching providers

### 7. Context Summarization

**Test Case: Parent context passed to child**
1. Create a thread about "quantum computing"
2. Have 4-5 message exchanges about quantum computing
3. Branch from last message
4. In the new branch, ask "What were we discussing?"
5. Verify: Assistant knows the parent context
6. Ask specific questions about parent discussion
7. Verify: Context is relevant and accurate

**Expected Result:**
- Parent context successfully summarized
- Child thread aware of parent discussion
- No hallucination of context

### 8. Thread Titles

**Test Case: Auto-generated titles**
1. Create new root thread
2. Send first message: "Explain neural networks"
3. Verify: Thread title becomes "Explain neural networks"
4. Create another thread
5. Send very long first message (100+ chars)
6. Verify: Title is truncated with "..."

**Expected Result:**
- Titles auto-generated from first message
- Long titles truncated appropriately
- Sidebar shows titles correctly

### 9. Error Handling

**Test Case: Invalid API key**
1. Set invalid API key in .env
2. Try to send message
3. Verify: Error message displayed
4. Verify: Application doesn't crash
5. Fix API key
6. Retry message
7. Verify: Works correctly

**Test Case: Network error**
1. Stop backend server
2. Try to send message
3. Verify: Error message shown
4. Start backend server
5. Retry
6. Verify: Recovers gracefully

**Expected Result:**
- Errors displayed to user
- Application remains functional
- Can retry after fixing issue

### 10. Persistence

**Test Case: Data persists across restarts**
1. Create threads and messages
2. Stop backend
3. Restart backend
4. Refresh frontend
5. Verify: All threads and messages still present
6. Continue conversation
7. Verify: Everything works normally

**Expected Result:**
- All data persists in SQLite
- No data loss on restart
- Can continue where left off

## API Testing

### Using the API Documentation

1. Navigate to http://localhost:8000/docs
2. Try each endpoint:
   - POST /threads
   - GET /threads/{thread_id}
   - POST /threads/{thread_id}/messages
   - GET /threads/{thread_id}/messages
   - GET /threads/{thread_id}/children
   - GET /threads/{thread_id}/context

### Using curl

**Create a root thread:**
```bash
curl -X POST http://localhost:8000/threads \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Send a message:**
```bash
curl -X POST http://localhost:8000/threads/{thread_id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, explain machine learning"}'
```

**Create a branch:**
```bash
curl -X POST http://localhost:8000/threads \
  -H "Content-Type: application/json" \
  -d '{
    "parent_thread_id": "{parent_id}",
    "branch_from_message_id": "{message_id}"
  }'
```

**Get thread messages:**
```bash
curl http://localhost:8000/threads/{thread_id}/messages
```

## Database Inspection

### View Database Contents

```bash
sqlite3 thought_partner.db

-- List all threads
SELECT id, title, depth, parent_thread_id FROM threads;

-- List all messages in a thread
SELECT sequence, role, content FROM messages 
WHERE thread_id = 'your-thread-id' 
ORDER BY sequence;

-- View thread hierarchy
SELECT 
  t1.id as thread_id,
  t1.title,
  t1.depth,
  t2.title as parent_title
FROM threads t1
LEFT JOIN threads t2 ON t1.parent_thread_id = t2.id
ORDER BY t1.depth, t1.created_at;
```

## Performance Testing

### Load Testing

**Test Case: Many messages in a thread**
1. Create a thread
2. Send 20+ messages back and forth
3. Verify: UI remains responsive
4. Verify: Messages load quickly
5. Verify: Scrolling is smooth

**Test Case: Many branches**
1. Create a thread
2. Create 10+ branches from various messages
3. Navigate between branches
4. Verify: Navigation remains fast
5. Verify: No memory leaks

**Test Case: Deep nesting**
1. Create nested threads 10 levels deep
2. Navigate up and down
3. Verify: Performance acceptable
4. Verify: Context summaries accurate

## Known Limitations (MVP)

1. **No editing/deleting**: Messages and threads cannot be edited or deleted
2. **No sibling context**: Sibling summaries not yet implemented
3. **No text selection**: Can't select specific text for branching context
4. **No search**: No search functionality across threads
5. **Single user**: No authentication or multi-user support
6. **No export**: Can't export conversations yet

## Troubleshooting Tests

### Backend Issues

**Check backend is running:**
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

**Check database exists:**
```bash
ls -la thought_partner.db
# Should show database file
```

**Check logs:**
- Backend logs show in terminal
- Look for errors in stack traces

### Frontend Issues

**Check frontend is running:**
- Open http://localhost:3000
- Should see app interface

**Check browser console:**
- F12 → Console tab
- Look for JavaScript errors or failed API calls

**Check network requests:**
- F12 → Network tab
- Verify API calls to localhost:8000
- Check for 404, 500, or CORS errors

## Regression Testing Checklist

When making changes, verify:
- [ ] Basic message send/receive works
- [ ] Branch creation works
- [ ] Navigation between threads works
- [ ] Parent context included in branches
- [ ] Thread titles auto-generated
- [ ] Both LLM providers work (if configured)
- [ ] Data persists after restart
- [ ] API documentation still accessible
- [ ] No console errors in browser
- [ ] No backend errors in logs

## Future Testing Needs

When implementing new features:
- **Sibling context**: Test context from multiple siblings
- **Text selection**: Test branching with selected text
- **Edit/Delete**: Test cascading effects of deletions
- **Search**: Test search accuracy and performance
- **Export**: Test various export formats
- **Multi-user**: Test concurrent access and conflicts

