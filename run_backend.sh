#!/bin/bash

# Activate virtual environment (.venv for uv, venv for pip)
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ No virtual environment found. Run ./setup.sh first."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from env.example and add your API keys."
    exit 1
fi

# Run backend using Python module syntax (works with relative imports)
echo "🚀 Starting backend server..."
python -m uvicorn backend.main:app --reload --port 8000

