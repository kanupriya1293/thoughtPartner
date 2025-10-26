import axios from 'axios';
import { Thread, ThreadCreate } from '../types/thread';
import { Message, MessageCreate } from '../types/message';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const threadsApi = {
  // Create a new thread
  createThread: async (data: ThreadCreate): Promise<Thread> => {
    const response = await api.post<Thread>('/threads', data);
    return response.data;
  },

  // Get thread metadata
  getThread: async (threadId: string): Promise<Thread> => {
    const response = await api.get<Thread>(`/threads/${threadId}`);
    return response.data;
  },

  // Get all root threads (depth = 0)
  getRootThreads: async (): Promise<Thread[]> => {
    const response = await api.get<Thread[]>('/threads?depth=0');
    return response.data;
  },

  // Get child threads
  getChildren: async (threadId: string): Promise<Thread[]> => {
    const response = await api.get<Thread[]>(`/threads/${threadId}/children`);
    return response.data;
  },

  // Update a thread
  updateThread: async (threadId: string, data: Partial<Thread>): Promise<Thread> => {
    const response = await api.patch<Thread>(`/threads/${threadId}`, data);
    return response.data;
  },

  // Delete a thread
  deleteThread: async (threadId: string): Promise<void> => {
    await api.delete(`/threads/${threadId}`);
  },
};

export const messagesApi = {
  // Get all messages in a thread
  getMessages: async (threadId: string): Promise<{ thread_info: Thread; messages: Message[] }> => {
    const response = await api.get(`/threads/${threadId}/messages`);
    return response.data;
  },

  // Send a message and get response
  sendMessage: async (threadId: string, data: MessageCreate, background: boolean = false): Promise<Message> => {
    const response = await api.post<Message>(`/threads/${threadId}/messages`, { ...data, background });
    return response.data;
  },
};

export const contextApi = {
  // Get thread context
  getContext: async (threadId: string) => {
    const response = await api.get(`/threads/${threadId}/context`);
    return response.data;
  },

  // Regenerate context
  regenerateContext: async (threadId: string, regenerateParent: boolean, regenerateSiblings: boolean) => {
    const response = await api.post(`/threads/${threadId}/context/regenerate`, {
      regenerate_parent: regenerateParent,
      regenerate_siblings: regenerateSiblings,
    });
    return response.data;
  },
};

