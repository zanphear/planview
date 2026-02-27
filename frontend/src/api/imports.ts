import { api } from './client';

export const importsApi = {
  importTasks: (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ imported: number; message: string }>(
      `/workspaces/${workspaceId}/import/tasks`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
