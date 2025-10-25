#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from env.example and add your API keys."
    exit 1
fi

# Run backend
echo "🚀 Starting backend server..."
cd backend
uvicorn main:app --reload --port 8000

