#!/bin/bash

echo "🧠 Setting up Threaded Chat Thought Partner..."
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Node version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Python and Node.js found"
echo ""

# Backend setup
echo "📦 Setting up backend..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
echo "✅ Backend dependencies installed"
echo ""

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env and add your API keys before running the application"
else
    echo "✅ .env file already exists"
fi
echo ""

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend
npm install > /dev/null 2>&1
echo "✅ Frontend dependencies installed"
cd ..
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys (OPENAI_API_KEY and/or ANTHROPIC_API_KEY)"
echo "2. Start the backend: cd backend && source ../venv/bin/activate && uvicorn main:app --reload"
echo "3. In a new terminal, start the frontend: cd frontend && npm run dev"
echo ""
echo "The app will be available at http://localhost:3000"
echo "API docs will be at http://localhost:8000/docs"

