export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  sequence: number;
  timestamp: string;
  model: string | null;
  provider: string | null;
  tokens_used: number | null;
  response_metadata: any;
  has_branches: boolean;
  branch_count: number;
  branches?: BranchInfo[];
}

export interface BranchInfo {
  thread_id: string;
  title: string | null;
  branch_context_text: string | null;
}

export interface MessageCreate {
  content: string;
  provider?: string;
  model?: string;
  background?: boolean;
}

