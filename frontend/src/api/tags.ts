import { api } from './client';

export interface Tag {
  id: string;
  name: string;
  colour: string;
  project_id: string;
  created_at: string;
}

export const tagsApi = {
  list: (workspaceId: string, projectId: string) =>
    api.get<Tag[]>(`/workspaces/${workspaceId}/projects/${projectId}/tags`),

  create: (workspaceId: string, projectId: string, data: { name: string; colour?: string }) =>
    api.post<Tag>(`/workspaces/${workspaceId}/projects/${projectId}/tags`, data),

  update: (workspaceId: string, projectId: string, tagId: string, data: { name?: string; colour?: string }) =>
    api.put<Tag>(`/workspaces/${workspaceId}/projects/${projectId}/tags/${tagId}`, data),

  delete: (workspaceId: string, projectId: string, tagId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/tags/${tagId}`),
};
