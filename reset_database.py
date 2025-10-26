#!/usr/bin/env python3
"""
Script to reset the database - drops all tables and recreates them.
Use this after schema changes during development.
"""
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import engine, Base
from backend.models import Thread, Message, ThreadContext

def reset_database():
    """Drop all tables and recreate them"""
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped successfully!")
    
    print("\nCreating tables with new schema...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
    
    print("\nDatabase reset complete. All tables are empty and ready to use.")

if __name__ == "__main__":
    response = input("This will DELETE ALL DATA in the database. Are you sure? (yes/no): ")
    if response.lower() == "yes":
        reset_database()
    else:
        print("Database reset cancelled.")

