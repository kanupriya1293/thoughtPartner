#!/usr/bin/env python3
"""
Quick test script to create a fork and inspect the results
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_fork():
    # First, get existing threads
    print("Getting threads...")
    response = requests.get(f"{BASE_URL}/threads")
    threads = response.json()
    print(f"Found {len(threads)} threads")
    
    if not threads:
        print("No threads found. Create a thread first.")
        return
    
    # Use the first thread
    parent_thread = threads[0]
    print(f"Using parent thread: {parent_thread['id']} - {parent_thread['title']}")
    
    # Get messages from parent thread
    print(f"Getting messages from thread {parent_thread['id']}...")
    response = requests.get(f"{BASE_URL}/threads/{parent_thread['id']}/messages")
    data = response.json()
    messages = data['messages']
    
    if not messages:
        print("No messages in parent thread.")
        return
    
    # Find an assistant message to fork from
    assistant_messages = [m for m in messages if m['role'] == 'assistant']
    if not assistant_messages:
        print("No assistant messages found.")
        return
    
    fork_from_message = assistant_messages[-1]
    print(f"Forking from message {fork_from_message['id']} (sequence {fork_from_message['sequence']})")
    
    # Create fork
    print("Creating fork...")
    response = requests.post(
        f"{BASE_URL}/threads",
        json={
            "parent_thread_id": parent_thread['id'],
            "branch_from_message_id": fork_from_message['id'],
            "is_fork": True
        }
    )
    
    if response.status_code != 201:
        print(f"Error creating fork: {response.status_code}")
        print(response.text)
        return
    
    fork_thread = response.json()
    print(f"Created fork thread: {fork_thread['id']} - {fork_thread['title']}")
    print(f"  Is fork: {fork_thread['is_fork']}")
    print(f"  Parent: {fork_thread['parent_thread_id']}")
    
    # Get messages from fork
    print(f"Getting messages from fork thread...")
    response = requests.get(f"{BASE_URL}/threads/{fork_thread['id']}/messages")
    data = response.json()
    messages = data['messages']
    
    print(f"Fork has {len(messages)} messages")
    for msg in messages:
        print(f"  - Seq {msg['sequence']}: {msg['role']} - {msg['content'][:50]}...")

if __name__ == '__main__':
    test_fork()

