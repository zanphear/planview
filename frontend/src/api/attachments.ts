import { api } from './client';
import type { User } from './users';

export interface Attachment {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  task_id: string;
  uploaded_by: string;
  uploader: User | null;
  created_at: string;
}

export const attachmentsApi = {
  list: (workspaceId: string, taskId: string) =>
    api.get<Attachment[]>(`/workspaces/${workspaceId}/tasks/${taskId}/attachments`),

  upload: (workspaceId: string, taskId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Attachment>(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  downloadUrl: (workspaceId: string, taskId: string, attachmentId: string) =>
    `${api.defaults.baseURL}/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}/download`,

  delete: (workspaceId: string, taskId: string, attachmentId: string) =>
    api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`),
};
