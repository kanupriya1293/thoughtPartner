#!/usr/bin/env python3
"""
Database migration to add is_fork column to threads table.
This should be run after the new code is deployed.
"""

import sqlite3
import os

DB_PATH = 'thought_partner.db'

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found. Creating new database with migration.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(threads)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_fork' in columns:
            print("Column 'is_fork' already exists in threads table.")
            return
        
        # Add the is_fork column with default value False
        print("Adding 'is_fork' column to threads table...")
        cursor.execute("""
            ALTER TABLE threads 
            ADD COLUMN is_fork BOOLEAN DEFAULT 0 NOT NULL
        """)
        
        conn.commit()
        print("Successfully added 'is_fork' column to threads table.")
        
    except Exception as e:
        print(f"Error adding column: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    main()

