export interface Thread {
  id: string;
  parent_thread_id: string | null;
  root_id: string;
  depth: number;
  created_at: string;
  title: string | null;
  branch_from_message_id: string | null;
  branch_context_text: string | null;
}

export interface ThreadCreate {
  parent_thread_id?: string;
  branch_from_message_id?: string;
  branch_context_text?: string;
}

