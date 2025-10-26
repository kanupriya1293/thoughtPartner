export interface Thread {
  id: string;
  parent_thread_id: string | null;
  root_id: string;
  depth: number;
  created_at: string;
  title: string | null;
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
}

