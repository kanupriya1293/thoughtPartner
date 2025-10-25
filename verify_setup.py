#!/usr/bin/env python3
"""
Verification script to check if the Threaded Chat Thought Partner is set up correctly.
Run this after setup to verify all components are working.
"""

import sys
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.8 or higher"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Need 3.8+")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    required = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        'openai',
        'anthropic'
    ]
    
    missing = []
    for package in required:
        try:
            __import__(package)
            print(f"✅ {package} - installed")
        except ImportError:
            print(f"❌ {package} - missing")
            missing.append(package)
    
    return len(missing) == 0

def check_env_file():
    """Check if .env file exists and has API keys"""
    env_path = Path('.env')
    
    if not env_path.exists():
        print("❌ .env file not found")
        print("   Run: cp env.example .env")
        return False
    
    print("✅ .env file exists")
    
    # Check if it has API keys (not validating them, just checking if set)
    with open(env_path) as f:
        content = f.read()
        
    has_openai = 'OPENAI_API_KEY=' in content and 'your_' not in content.split('OPENAI_API_KEY=')[1].split('\n')[0]
    has_anthropic = 'ANTHROPIC_API_KEY=' in content and 'your_' not in content.split('ANTHROPIC_API_KEY=')[1].split('\n')[0]
    
    if has_openai:
        print("✅ OpenAI API key configured")
    else:
        print("⚠️  OpenAI API key not set")
    
    if has_anthropic:
        print("✅ Anthropic API key configured")
    else:
        print("⚠️  Anthropic API key not set")
    
    if not (has_openai or has_anthropic):
        print("❌ No API keys configured - at least one is required")
        return False
    
    return True

def check_file_structure():
    """Check if all required files and directories exist"""
    required_paths = [
        'backend/main.py',
        'backend/models.py',
        'backend/database.py',
        'backend/config.py',
        'backend/api/threads.py',
        'backend/api/messages.py',
        'backend/services/llm_provider.py',
        'frontend/package.json',
        'frontend/src/App.tsx',
        'requirements.txt',
    ]
    
    all_exist = True
    for path in required_paths:
        if Path(path).exists():
            print(f"✅ {path}")
        else:
            print(f"❌ {path} - missing")
            all_exist = False
    
    return all_exist

def check_database():
    """Check if database can be initialized"""
    try:
        # Add backend to path
        sys.path.insert(0, str(Path(__file__).parent))
        
        from backend.database import init_db
        from backend.models import Thread, Message, ThreadContext
        
        # Try to initialize database
        init_db()
        
        print("✅ Database initialization successful")
        
        # Check if database file was created
        if Path('thought_partner.db').exists():
            print("✅ Database file created")
        
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def main():
    """Run all verification checks"""
    print("🔍 Verifying Threaded Chat Thought Partner Setup\n")
    
    print("=" * 60)
    print("Python Version")
    print("=" * 60)
    python_ok = check_python_version()
    
    print("\n" + "=" * 60)
    print("Python Dependencies")
    print("=" * 60)
    deps_ok = check_dependencies()
    
    print("\n" + "=" * 60)
    print("Environment Configuration")
    print("=" * 60)
    env_ok = check_env_file()
    
    print("\n" + "=" * 60)
    print("File Structure")
    print("=" * 60)
    files_ok = check_file_structure()
    
    print("\n" + "=" * 60)
    print("Database")
    print("=" * 60)
    db_ok = check_database()
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    all_checks = [python_ok, deps_ok, env_ok, files_ok, db_ok]
    
    if all(all_checks):
        print("✅ All checks passed! You're ready to run the application.")
        print("\nNext steps:")
        print("1. Start backend: ./run_backend.sh")
        print("2. Start frontend: ./run_frontend.sh (in new terminal)")
        print("3. Open: http://localhost:3000")
        return 0
    else:
        print("❌ Some checks failed. Please review the errors above.")
        if not deps_ok:
            print("\nTo install dependencies:")
            print("  source venv/bin/activate")
            print("  pip install -r requirements.txt")
        if not env_ok:
            print("\nTo configure environment:")
            print("  cp env.example .env")
            print("  # Edit .env and add your API keys")
        return 1

if __name__ == '__main__':
    sys.exit(main())

