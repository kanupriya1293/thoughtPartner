# How to Test - Step by Step Guide

This guide walks you through testing all implemented features of the Threaded Chat Thought Partner.

## Prerequisites

Before testing, ensure:
1. You've run `./setup.sh` or manually installed dependencies
2. You've added your API key(s) to `.env` file
3. Both backend and frontend servers are running

## Quick Start Testing

### Step 1: Start the Servers

**Terminal 1 - Backend:**
```bash
./run_backend.sh
# OR manually:
# source venv/bin/activate
# cd backend
# uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
./run_frontend.sh
# OR manually:
# cd frontend
# npm run dev
```

### Step 2: Verify Everything is Running

Open these URLs:
- **Frontend**: http://localhost:3000 (main app)
- **Backend API Docs**: http://localhost:8000/docs (interactive API)
- **Backend Health**: http://localhost:8000/health (should show `{"status": "healthy"}`)

---

## Test Flow 1: Basic Conversation (5 minutes)

### What You're Testing:
- Message sending and receiving
- LLM integration
- Auto-generated thread titles
- Token tracking

### Steps:

1. **Open the app** at http://localhost:3000
   - ✅ You should see a clean interface with a chat input box
   - ✅ Header shows "🧠 Thought Partner"
   - ✅ A root thread is automatically created

2. **Send your first message:**
   - Type: "Explain quantum computing in simple terms"
   - Press Enter or click Send
   - ✅ Your message appears on the right (blue background)
   - ✅ "Sending..." indicator shows while waiting

3. **Wait for response:**
   - ✅ Assistant response appears on the left (gray background)
   - ✅ Response includes explanation of quantum computing
   - ✅ Thread title updates to "Explain quantum computing in simple terms"
   - ✅ Token count displayed (e.g., "150 tokens")
   - ✅ Timestamp shown

4. **Continue the conversation:**
   - Ask: "What are qubits?"
   - ✅ Response continues the conversation naturally
   - ✅ Messages appear in correct order
   - ✅ Can scroll through conversation

**Expected Result:** ✅ Basic chat works, LLM responds, UI updates correctly

---

## Test Flow 2: Creating Branches (10 minutes)

### What You're Testing:
- Branch creation from messages
- Parent context passing
- Thread navigation

### Steps:

1. **Create a conversation base:**
   - Start a new topic: "Tell me about machine learning"
   - Wait for response
   - Ask: "What are neural networks?"
   - Wait for response
   - You now have 4 messages (2 user, 2 assistant)

2. **Create your first branch:**
   - Find the second assistant response (about neural networks)
   - Click the "Branch from here" button
   - ✅ UI switches to a new thread
   - ✅ Sidebar shows you're in a child thread (Depth: 1)
   - ✅ "Parent Thread" link appears in sidebar

3. **Test parent context:**
   - In the new branch, ask: "What were we discussing before?"
   - ✅ Assistant mentions quantum computing or machine learning context
   - ✅ Response shows awareness of parent conversation

4. **Navigate back to parent:**
   - Click the "Parent Thread" link in sidebar
   - ✅ You return to the original conversation
   - ✅ All original messages still there
   - ✅ Sidebar now shows "Child Threads (1)"

5. **View the branch indicator:**
   - Look at the second assistant message
   - ✅ Shows "🌿 1 branch" button
   - Click the branch button
   - ✅ Dropdown shows your branch with its title
   - Click the branch in dropdown
   - ✅ Navigates back to the child thread

**Expected Result:** ✅ Branching works, context is passed, navigation is smooth

---

## Test Flow 3: Multiple Branches (15 minutes)

### What You're Testing:
- Multiple branches from same parent
- Multiple branches from same message
- Branch counting
- Sibling navigation

### Steps:

1. **Start fresh or continue:**
   - Go back to your root thread (parent)
   - Continue chatting: "What about deep learning?"
   - Wait for response

2. **Create second branch from same parent:**
   - Scroll to the FIRST assistant message
   - Click "Branch from here"
   - ✅ New branch created
   - Ask: "Tell me more about supervised learning"
   - ✅ Different conversation topic starts

3. **Navigate to see siblings:**
   - Go back to parent thread
   - ✅ Sidebar shows "Child Threads (2)"
   - ✅ Both branches listed
   - Click each child thread
   - ✅ Can navigate between all threads

4. **Create multiple branches from ONE message:**
   - Go back to parent
   - Find any assistant message
   - Click "Branch from here"
   - Go back to parent
   - Click "Branch from here" on the SAME message again
   - ✅ Second branch from same message created
   - Look at that message
   - ✅ Shows "🌿 2 branches"
   - Click the indicator
   - ✅ Both branches shown in dropdown

**Expected Result:** ✅ Multiple branches work, all navigable, counts are accurate

---

## Test Flow 4: Deep Nesting (10 minutes)

### What You're Testing:
- Nested branches (3+ levels)
- Depth tracking
- "Go to origin" functionality

### Steps:

1. **Create a nested structure:**
   - Start with root thread (Depth: 0)
   - Create a branch → Child A (Depth: 1)
   - From Child A, ask a few questions
   - Create a branch from Child A → Grandchild (Depth: 2)
   - From Grandchild, ask more questions
   - Create another branch → Great-grandchild (Depth: 3)

2. **Check depth indicators:**
   - Look at sidebar in each thread
   - ✅ Root shows "Depth: 0" and "Root Thread" badge
   - ✅ Child shows "Depth: 1"
   - ✅ Grandchild shows "Depth: 2"
   - ✅ Great-grandchild shows "Depth: 3"

3. **Test navigation:**
   - From Great-grandchild, click "Parent Thread"
   - ✅ Goes to Grandchild
   - Click "Parent Thread" again
   - ✅ Goes to Child A
   - Click "Parent Thread" again
   - ✅ Goes to Root

4. **Test "Go to origin":**
   - Navigate back to Great-grandchild (depth 3)
   - Click "🏠 Go to Origin Thread" button
   - ✅ Instantly returns to root thread
   - ✅ All navigation works from any depth

**Expected Result:** ✅ Deep nesting works, origin navigation works from any level

---

## Test Flow 5: Provider Switching (5 minutes)

### What You're Testing:
- Multiple LLM providers
- Provider configuration

### Steps:

1. **Check default provider:**
   - Send a message in any thread
   - Wait for response
   - Look at the message metadata
   - ✅ Shows model name (e.g., "gpt-4" or "claude-3-5-sonnet")

2. **Test via API (if you have both keys configured):**
   ```bash
   # Get your thread ID from browser URL or database
   curl -X POST http://localhost:8000/threads/{thread_id}/messages \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Hello, which model are you?",
       "provider": "anthropic",
       "model": "claude-3-5-sonnet-20241022"
     }'
   ```
   - Reload the frontend
   - ✅ New message from different provider appears
   - ✅ Shows correct model name

3. **Change default in .env:**
   - Edit `.env` file
   - Change `DEFAULT_PROVIDER=anthropic`
   - Restart backend
   - Send new message in UI
   - ✅ Uses new default provider

**Expected Result:** ✅ Multiple providers work, can switch between them

---

## Test Flow 6: Persistence (5 minutes)

### What You're Testing:
- Data persistence across restarts
- Database storage

### Steps:

1. **Create some data:**
   - Create a thread with several messages
   - Create a few branches
   - Note the thread titles and content

2. **Stop both servers:**
   - Terminal 1: Ctrl+C (backend)
   - Terminal 2: Ctrl+C (frontend)

3. **Check database file:**
   ```bash
   ls -la thought_partner.db
   ```
   - ✅ File exists and has size > 0

4. **Restart servers:**
   - Start backend: `./run_backend.sh`
   - Start frontend: `./run_frontend.sh`

5. **Verify data persists:**
   - Open http://localhost:3000
   - ✅ Previous thread loads automatically
   - ✅ All messages still there
   - ✅ All branches still accessible
   - ✅ Can continue conversations

**Expected Result:** ✅ No data loss, everything persists across restarts

---

## Test Flow 7: Error Handling (5 minutes)

### What You're Testing:
- Error messages
- Recovery from errors

### Steps:

1. **Test with no API key:**
   - Edit `.env` and temporarily break the API key
   - Restart backend
   - Try to send a message
   - ✅ Error message shown in UI
   - ✅ App doesn't crash
   - Fix API key, restart
   - ✅ Works again

2. **Test backend down:**
   - Stop backend (Ctrl+C)
   - Try to send message in frontend
   - ✅ Error message displayed
   - ✅ Can't send messages
   - Restart backend
   - ✅ App reconnects and works

3. **Test network tab:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Send a message
   - ✅ See API calls to localhost:8000
   - ✅ Status codes are 200 (success) or appropriate errors

**Expected Result:** ✅ Errors are handled gracefully, app recovers

---

## Quick Verification Checklist

Run through this checklist to verify everything works:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors  
- [ ] Can send messages and get responses
- [ ] Thread title auto-generates
- [ ] Token counts display
- [ ] Can create branches
- [ ] Branch indicators show on messages
- [ ] Can navigate parent → child → parent
- [ ] Multiple branches from same message work
- [ ] "Go to origin" works from deep nesting
- [ ] Data persists after restart
- [ ] API documentation accessible at /docs
- [ ] No console errors in browser (F12)
- [ ] No backend errors in terminal

---

## Database Inspection (Optional)

To manually inspect the database:

```bash
sqlite3 thought_partner.db

-- See all threads
SELECT id, title, depth, parent_thread_id FROM threads;

-- See all messages in a thread
SELECT sequence, role, substr(content, 1, 50) as content 
FROM messages 
WHERE thread_id = 'your-thread-id' 
ORDER BY sequence;

-- See thread hierarchy
SELECT 
  id,
  title,
  depth,
  parent_thread_id
FROM threads
ORDER BY depth, created_at;

-- Exit
.quit
```

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python3 --version  # Need 3.8+

# Activate venv
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend won't start
```bash
# Check Node version
node --version  # Need 18+

# Reinstall dependencies
cd frontend
rm -rf node_modules
npm install
```

### API key errors
- Check `.env` file exists
- Verify key format (no quotes, no spaces)
- OpenAI keys start with `sk-`
- Anthropic keys start with `sk-ant-`

### Database issues
```bash
# Delete and recreate database
rm thought_partner.db
# Restart backend - it will recreate automatically
```

---

## What to Test Next

After basic testing, try these advanced scenarios:

1. **Stress test:** Create 20+ messages in a thread
2. **Deep nesting:** Go 10 levels deep
3. **Wide branching:** Create 10+ branches from one thread
4. **Long messages:** Send very long prompts
5. **Rapid fire:** Send messages quickly in succession
6. **Context quality:** Test if parent context is useful in branches

---

## Need Help?

- Check TESTING.md for detailed test scenarios
- Check ARCHITECTURE.md for system design
- Check logs in terminal for errors
- Open browser console (F12) for frontend errors

Happy testing! 🧠✨

