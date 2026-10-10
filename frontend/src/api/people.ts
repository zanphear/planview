import { api } from './client';

export interface PersonProfile {
  id: string;
  user_id: string;
  workspace_id: string;
  job_title: string | null;
  department: string | null;
  manager_id: string | null;
  contract_type: string | null;
  contract_start: string | null;
  contract_end: string | null;
  probation_end: string | null;
  location: string | null;
  phone: string | null;
  employee_id: string | null;
  notes: string | null;
  documents: PersonDocument[];
  user_name: string | null;
  user_email: string | null;
  user_initials: string | null;
  user_colour: string | null;
  user_avatar_url: string | null;
  manager_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonInsights {
  date_of_birth: string | null;
  partner_name: string | null;
  number_of_kids: number | null;
  kids_details: string | null;
  interests: string | null;
  dietary_requirements: string | null;
  emergency_contact: string | null;
  personal_notes: string | null;
}

export interface PersonDocument {
  id: string;
  profile_id: string;
  document_type: string;
  filename: string;
  file_size: number;
  mime_type: string;
  expiry_date: string | null;
  uploaded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgChartNode {
  user_id: string;
  name: string;
  job_title: string | null;
  department: string | null;
  avatar_url: string | null;
  initials: string | null;
  colour: string;
  children: OrgChartNode[];
}

export const peopleApi = {
  list: (workspaceId: string, params?: { department?: string; manager_id?: string }) =>
    api.get<PersonProfile[]>(`/workspaces/${workspaceId}/people`, { params }),

  get: (workspaceId: string, userId: string) =>
    api.get<PersonProfile>(`/workspaces/${workspaceId}/people/${userId}`),

  create: (workspaceId: string, userId: string, data: Partial<PersonProfile>) =>
    api.post<PersonProfile>(`/workspaces/${workspaceId}/people/${userId}`, data),

  update: (workspaceId: string, userId: string, data: Partial<PersonProfile>) =>
    api.put<PersonProfile>(`/workspaces/${workspaceId}/people/${userId}`, data),

  getInsights: (workspaceId: string, userId: string) =>
    api.get<PersonInsights>(`/workspaces/${workspaceId}/people/${userId}/insights`),

  updateInsights: (workspaceId: string, userId: string, data: Partial<PersonInsights>) =>
    api.put<PersonInsights>(`/workspaces/${workspaceId}/people/${userId}/insights`, data),

  getOrgChart: (workspaceId: string) =>
    api.get<OrgChartNode[]>(`/workspaces/${workspaceId}/people/org-chart`),

  uploadAvatar: (workspaceId: string, userId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<PersonProfile>(`/workspaces/${workspaceId}/people/${userId}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listDocuments: (workspaceId: string, userId: string, documentType?: string) =>
    api.get<PersonDocument[]>(`/workspaces/${workspaceId}/people/${userId}/documents`, {
      params: documentType ? { document_type: documentType } : undefined,
    }),

  uploadDocument: (
    workspaceId: string,
    userId: string,
    file: File,
    documentType: string,
    expiryDate?: string,
    notes?: string,
  ) => {
    const form = new FormData();
    form.append('file', file);
    const params: Record<string, string> = { document_type: documentType };
    if (expiryDate) params.expiry_date = expiryDate;
    if (notes) params.notes = notes;
    return api.post<PersonDocument>(`/workspaces/${workspaceId}/people/${userId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    });
  },

  downloadDocument: (workspaceId: string, userId: string, docId: string) =>
    api.get(`/workspaces/${workspaceId}/people/${userId}/documents/${docId}/download`, {
      responseType: 'blob',
    }),

  deleteDocument: (workspaceId: string, userId: string, docId: string) =>
    api.delete(`/workspaces/${workspaceId}/people/${userId}/documents/${docId}`),
};
