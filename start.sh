#!/bin/bash

# Threaded Chat Thought Partner - Single Start Script
# This script starts both backend and frontend servers

set -e  # Exit on error

echo "🧠 Starting Threaded Chat Thought Partner..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env from env.example and add your API keys:"
    echo "  cp env.example .env"
    echo "  # Edit .env and add OPENAI_API_KEY or ANTHROPIC_API_KEY"
    exit 1
fi

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    echo -e "${RED}❌ No virtual environment found${NC}"
    echo "Please run: ./setup.sh"
    exit 1
fi

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "uvicorn.*backend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Create log directory
mkdir -p logs

# Clear old logs
> logs/backend.log
> logs/frontend.log

# Start backend with explicit logging
echo -e "${BLUE}🚀 Starting backend server...${NC}"
# Use unbuffered Python output to ensure logs are written immediately
PYTHONUNBUFFERED=1 python -m uvicorn backend.main:app --reload --port 8000 >> logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to initialize..."
for i in {1..15}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Backend ready!${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}   ❌ Backend failed to start. Check logs/backend.log${NC}"
        tail -20 logs/backend.log
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Start frontend
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
cd frontend
# Vite needs FORCE_COLOR=0 to avoid ANSI codes in logs
FORCE_COLOR=0 npm run dev >> ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "   Waiting for frontend to initialize..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Frontend ready!${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}   ❌ Frontend failed to start. Check logs/frontend.log${NC}"
        tail -20 logs/frontend.log
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ All servers started successfully!${NC}"
echo ""
echo "📡 Access your application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop all servers:"
echo "   ./stop.sh"
echo "   OR manually: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop monitoring (servers will continue running in background)"
echo ""

# Save PIDs to file for stop script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# Monitor logs (can be interrupted with Ctrl+C without stopping servers)
trap "echo ''; echo 'Servers still running. Use ./stop.sh to stop them.'; exit 0" INT

echo "📊 Monitoring logs (Ctrl+C to stop monitoring)..."
echo "---"
tail -f logs/backend.log logs/frontend.log

