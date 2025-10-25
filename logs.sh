#!/bin/bash

# View logs for Threaded Chat Thought Partner

case "$1" in
  backend)
    echo "📋 Backend logs (Ctrl+C to stop):"
    echo "---"
    tail -f logs/backend.log
    ;;
  frontend)
    echo "📋 Frontend logs (Ctrl+C to stop):"
    echo "---"
    tail -f logs/frontend.log
    ;;
  both|all|"")
    echo "📋 All logs (Ctrl+C to stop):"
    echo "---"
    tail -f logs/backend.log logs/frontend.log
    ;;
  status)
    echo "📊 Server Status:"
    echo ""
    if [ -f ".backend.pid" ]; then
      BACKEND_PID=$(cat .backend.pid)
      if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "✅ Backend running (PID: $BACKEND_PID)"
      else
        echo "❌ Backend not running"
      fi
    else
      echo "❌ Backend not running"
    fi
    
    if [ -f ".frontend.pid" ]; then
      FRONTEND_PID=$(cat .frontend.pid)
      if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "✅ Frontend running (PID: $FRONTEND_PID)"
      else
        echo "❌ Frontend not running"
      fi
    else
      echo "❌ Frontend not running"
    fi
    
    echo ""
    echo "📁 Log files:"
    if [ -f "logs/backend.log" ]; then
      echo "   Backend: $(wc -l < logs/backend.log) lines"
    fi
    if [ -f "logs/frontend.log" ]; then
      echo "   Frontend: $(wc -l < logs/frontend.log) lines"
    fi
    ;;
  *)
    echo "Usage: ./logs.sh [backend|frontend|both|status]"
    echo ""
    echo "Examples:"
    echo "  ./logs.sh backend    # View backend logs only"
    echo "  ./logs.sh frontend   # View frontend logs only"
    echo "  ./logs.sh both       # View all logs (default)"
    echo "  ./logs.sh status     # Check server status and log info"
    exit 1
    ;;
esac

