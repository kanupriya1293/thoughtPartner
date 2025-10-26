export enum ThreadType {
  ROOT = "root",
  FORK = "fork",
  BRANCH = "branch"
}

export interface Thread {
  id: string;
  parent_thread_id: string | null;
  depth: number;
  created_at: string;
  title: string | null;
  thread_type: ThreadType;
  branch_from_message_id: string | null;
  branch_context_text: string | null;
  branch_text_start_offset?: number | null;
  branch_text_end_offset?: number | null;
}

export interface ThreadCreate {
  parent_thread_id?: string;
  branch_from_message_id?: string;
  branch_context_text?: string;
  branch_text_start_offset?: number;
  branch_text_end_offset?: number;
  is_fork?: boolean;
}

