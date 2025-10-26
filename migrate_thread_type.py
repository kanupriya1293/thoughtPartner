#!/usr/bin/env python3
"""
Database migration to:
1. Add thread_type column
2. Convert is_fork to thread_type
3. Remove root_id column
4. Remove is_fork column
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
        # Check if columns exist
        cursor.execute("PRAGMA table_info(threads)")
        columns = {column[1]: column for column in cursor.fetchall()}
        
        # Add thread_type column if it doesn't exist
        if 'thread_type' not in columns:
            print("Adding 'thread_type' column...")
            cursor.execute("""
                ALTER TABLE threads 
                ADD COLUMN thread_type TEXT DEFAULT 'root' NOT NULL
            """)
            conn.commit()
        
        # Convert is_fork to thread_type if migration hasn't been done
        if 'is_fork' in columns:
            print("Converting is_fork to thread_type...")
            cursor.execute("""
                UPDATE threads 
                SET thread_type = 'fork' 
                WHERE is_fork = 1
            """)
            cursor.execute("""
                UPDATE threads 
                SET thread_type = 'branch' 
                WHERE parent_thread_id IS NOT NULL 
                AND thread_type = 'root'
            """)
            cursor.execute("""
                UPDATE threads 
                SET thread_type = 'root' 
                WHERE parent_thread_id IS NULL
            """)
            conn.commit()
            print("Converted data successfully.")
        else:
            print("is_fork column already removed.")
        
        # Remove root_id column if it exists
        if 'root_id' in columns:
            print("Removing root_id column...")
            # SQLite doesn't support DROP COLUMN, so we need to recreate the table
            cursor.execute("""
                CREATE TABLE threads_new (
                    id TEXT PRIMARY KEY,
                    parent_thread_id TEXT,
                    depth INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    title TEXT,
                    thread_type TEXT NOT NULL DEFAULT 'root',
                    branch_from_message_id TEXT,
                    branch_context_text TEXT,
                    branch_text_start_offset INTEGER,
                    branch_text_end_offset INTEGER,
                    FOREIGN KEY (parent_thread_id) REFERENCES threads(id),
                    FOREIGN KEY (branch_from_message_id) REFERENCES messages(id)
                )
            """)
            cursor.execute("""
                INSERT INTO threads_new 
                (id, parent_thread_id, depth, created_at, title, thread_type, 
                 branch_from_message_id, branch_context_text, 
                 branch_text_start_offset, branch_text_end_offset)
                SELECT id, parent_thread_id, depth, created_at, title, thread_type,
                       branch_from_message_id, branch_context_text,
                       branch_text_start_offset, branch_text_end_offset
                FROM threads
            """)
            cursor.execute("DROP TABLE threads")
            cursor.execute("ALTER TABLE threads_new RENAME TO threads")
            conn.commit()
            print("Removed root_id column successfully.")
        else:
            print("root_id column already removed.")
        
        # Remove is_fork column if it exists
        if 'is_fork' in columns:
            print("Removing is_fork column...")
            # SQLite doesn't support DROP COLUMN, so we need to recreate the table
            cursor.execute("""
                CREATE TABLE threads_new (
                    id TEXT PRIMARY KEY,
                    parent_thread_id TEXT,
                    depth INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    title TEXT,
                    thread_type TEXT NOT NULL DEFAULT 'root',
                    branch_from_message_id TEXT,
                    branch_context_text TEXT,
                    branch_text_start_offset INTEGER,
                    branch_text_end_offset INTEGER,
                    FOREIGN KEY (parent_thread_id) REFERENCES threads(id),
                    FOREIGN KEY (branch_from_message_id) REFERENCES messages(id)
                )
            """)
            cursor.execute("""
                INSERT INTO threads_new 
                (id, parent_thread_id, depth, created_at, title, thread_type, 
                 branch_from_message_id, branch_context_text, 
                 branch_text_start_offset, branch_text_end_offset)
                SELECT id, parent_thread_id, depth, created_at, title, thread_type,
                       branch_from_message_id, branch_context_text,
                       branch_text_start_offset, branch_text_end_offset
                FROM threads
            """)
            cursor.execute("DROP TABLE threads")
            cursor.execute("ALTER TABLE threads_new RENAME TO threads")
            conn.commit()
            print("Removed is_fork column successfully.")
        else:
            print("is_fork column already removed.")
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    main()

