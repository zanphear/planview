import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Search, Building2, MapPin, Phone, Mail, Calendar, FileText,
  Upload, Download, Trash2, ChevronRight, ChevronDown, Plus, X, EyeOff,
  Briefcase, Shield, UserCheck, Network, Grid3X3, User as UserIcon,
  Heart, Baby, UtensilsCrossed, AlertTriangle, Edit3, Save, Camera,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { usePeopleStore } from '../stores/peopleStore';
import { peopleApi } from '../api/people';
import type { PersonProfile, PersonInsights, PersonDocument, OrgChartNode } from '../api/people';
import { membersApi } from '../api/users';
import type { User } from '../api/users';
import { Toast } from '../components/shared/Toast';
import { LookupSelect } from '../components/shared/LookupSelect';
import { StatCard } from '../components/shared/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { COLOURS } from '../utils/colours';

type ViewMode = 'directory' | 'orgchart';
type ProfileTab = 'overview' | 'insights' | 'documents';

const CONTRACT_TYPES: Record<string, { label: string; colour: string }> = {
  permanent: { label: 'Permanent', colour: '#10b981' },
  fixed_term: { label: 'Fixed Term', colour: '#f59e0b' },
  contractor: { label: 'Contractor', colour: '#6366f1' },
  agency: { label: 'Agency', colour: '#ec4899' },
};

const DOC_TYPES: Record<string, { label: string; icon: string }> = {
  cv: { label: 'CV / Resume', icon: '📄' },
  contract: { label: 'Contract', icon: '📝' },
  certification: { label: 'Certification', icon: '🏆' },
  visa: { label: 'Visa / Right to Work', icon: '🛂' },
  other: { label: 'Other', icon: '📎' },
};

function Avatar({ name, initials, colour, avatarUrl, size = 40 }: {
  name: string; initials: string | null; colour: string | null; avatarUrl: string | null; size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: colour || '#4186E0', fontSize: size * 0.4 }}
    >
      {initials || name.charAt(0).toUpperCase()}
    </div>
  );
}

// --- Org Chart ---

function OrgChartNodeView({ node, onSelect }: { node: OrgChartNode; onSelect: (userId: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="ml-6">
      <div className="flex items-center gap-2 py-1.5">
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-[var(--color-grey-1)] rounded">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          onClick={() => onSelect(node.user_id)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--color-grey-2)] transition-colors"
        >
          <Avatar name={node.name} initials={node.initials} colour={node.colour} avatarUrl={node.avatar_url} size={32} />
          <div className="text-left">
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{node.name}</div>
            {node.job_title && <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{node.job_title}</div>}
          </div>
        </button>
      </div>
      {expanded && hasChildren && (
        <div className="border-l ml-2.5" style={{ borderColor: 'var(--color-border)' }}>
          {node.children.map((child) => (
            <OrgChartNodeView key={child.user_id} node={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Profile Detail ---

function ProfileDetail({ profile: initialProfile, workspaceId, currentUserId, currentUserRole, onBack, allMembers }: {
  profile: PersonProfile;
  workspaceId: string;
  currentUserId: string;
  currentUserRole: string;
  onBack: () => void;
  allMembers: User[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PersonProfile>>({});
  const [insights, setInsights] = useState<PersonInsights | null>(null);
  const [insightsEditing, setInsightsEditing] = useState(false);
  const [insightsData, setInsightsData] = useState<Partial<PersonInsights>>({});
  const [documents, setDocuments] = useState<PersonDocument[]>(profile.documents || []);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('other');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const updateProfileStore = usePeopleStore((s) => s.updateProfile);

  const isManagerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin' || profile.manager_id === currentUserId;

  const loadInsights = useCallback(async () => {
    if (!isManagerOrAdmin) return;
    try {
      const { data } = await peopleApi.getInsights(workspaceId, profile.user_id);
      setInsights(data);
    } catch {
      // not authorised or not found
    }
  }, [workspaceId, profile.user_id, isManagerOrAdmin]);

  useEffect(() => {
    if (activeTab === 'insights' && !insights) {
      loadInsights();
    }
  }, [activeTab, insights, loadInsights]);

  const handleSaveProfile = async () => {
    try {
      const { data } = await peopleApi.update(workspaceId, profile.user_id, editData);
      setProfile(data);
      updateProfileStore(data);
      setEditing(false);
      setEditData({});
      Toast.show('Profile updated');
    } catch {
      Toast.show('Failed to update profile');
    }
  };

  const handleSaveInsights = async () => {
    try {
      const { data } = await peopleApi.updateInsights(workspaceId, profile.user_id, insightsData);
      setInsights(data);
      setInsightsEditing(false);
      setInsightsData({});
      Toast.show('Insights updated');
    } catch {
      Toast.show('Failed to update insights');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await peopleApi.uploadAvatar(workspaceId, profile.user_id, file);
      setProfile(data);
      updateProfileStore(data);
      Toast.show('Avatar uploaded');
    } catch {
      Toast.show('Failed to upload avatar');
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await peopleApi.uploadDocument(
        workspaceId, profile.user_id, file, uploadType,
        uploadExpiry || undefined, uploadNotes || undefined
      );
      setDocuments((prev) => [data, ...prev]);
      setUploadExpiry('');
      setUploadNotes('');
      Toast.show('Document uploaded');
    } catch {
      Toast.show('Failed to upload document');
    }
    setUploading(false);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await peopleApi.deleteDocument(workspaceId, profile.user_id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      Toast.show('Document deleted');
    } catch {
      Toast.show('Failed to delete document');
    }
  };

  const handleDownloadDoc = async (doc: PersonDocument) => {
    try {
      const { data } = await peopleApi.downloadDocument(workspaceId, profile.user_id, doc.id);
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Toast.show('Failed to download document');
    }
  };

  const contractInfo = profile.contract_type ? CONTRACT_TYPES[profile.contract_type] : null;

  const tabs: { id: ProfileTab; label: string; icon: typeof UserIcon; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: UserIcon, show: true },
    { id: 'insights', label: 'Personal Insights', icon: Heart, show: isManagerOrAdmin },
    { id: 'documents', label: 'Documents', icon: FileText, show: true },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
          &larr; Back to directory
        </button>
      </div>

      <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {/* Profile header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar
                name={profile.user_name || ''}
                initials={profile.user_initials}
                colour={profile.user_colour}
                avatarUrl={profile.user_avatar_url}
                size={80}
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera size={20} className="text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.user_name}</h1>
              {profile.job_title && <p className="text-blue-100 text-lg">{profile.job_title}</p>}
              <div className="flex items-center gap-3 mt-1.5">
                {profile.department && (
                  <span className="flex items-center gap-1 text-sm text-blue-100">
                    <Building2 size={14} /> {profile.department}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1 text-sm text-blue-100">
                    <MapPin size={14} /> {profile.location}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              {contractInfo && (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: contractInfo.colour }}
                >
                  {contractInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-8" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-6">
            {tabs.filter((t) => t.show).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500'
                    : 'border-transparent hover:opacity-80'
                }`}
                style={{
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-8">
          {activeTab === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Profile Details</h2>
                {!editing ? (
                  <button
                    onClick={() => { setEditing(true); setEditData({}); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(false); setEditData({}); }} className="px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--color-grey-1)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                    <button onClick={handleSaveProfile} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Save size={14} /> Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <Briefcase size={16} /> Job Title
                  </label>
                  {editing ? (
                    <LookupSelect
                      category="job_title"
                      value={editData.job_title ?? profile.job_title ?? ''}
                      onChange={(v) => setEditData({ ...editData, job_title: v })}
                      placeholder="Select job title..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{profile.job_title || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <Building2 size={16} /> Department
                  </label>
                  {editing ? (
                    <LookupSelect
                      category="department"
                      value={editData.department ?? profile.department ?? ''}
                      onChange={(v) => setEditData({ ...editData, department: v })}
                      placeholder="Select department..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{profile.department || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <MapPin size={16} /> Location
                  </label>
                  {editing ? (
                    <LookupSelect
                      category="location"
                      value={editData.location ?? profile.location ?? ''}
                      onChange={(v) => setEditData({ ...editData, location: v })}
                      placeholder="Select location..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{profile.location || 'Not specified'}</p>
                  )}
                </div>
                <Field
                  label="Phone" icon={<Phone size={16} />}
                  value={editing ? (editData.phone ?? profile.phone ?? '') : profile.phone}
                  editing={editing}
                  onChange={(v) => setEditData({ ...editData, phone: v })}
                />
                <Field
                  label="Email" icon={<Mail size={16} />}
                  value={profile.user_email}
                  editing={false}
                />
                <Field
                  label="Employee ID" icon={<Shield size={16} />}
                  value={editing ? (editData.employee_id ?? profile.employee_id ?? '') : profile.employee_id}
                  editing={editing}
                  onChange={(v) => setEditData({ ...editData, employee_id: v })}
                />
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <UserCheck size={16} /> Manager
                  </label>
                  {editing ? (
                    <select
                      value={editData.manager_id ?? profile.manager_id ?? ''}
                      onChange={(e) => setEditData({ ...editData, manager_id: e.target.value || null })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="">No manager</option>
                      {allMembers.filter((m) => m.id !== profile.user_id).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{profile.manager_name || 'Not assigned'}</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <Briefcase size={16} /> Contract Type
                  </label>
                  {editing ? (
                    <select
                      value={editData.contract_type ?? profile.contract_type ?? ''}
                      onChange={(e) => setEditData({ ...editData, contract_type: e.target.value || null })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <option value="">Not specified</option>
                      {Object.entries(CONTRACT_TYPES).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{contractInfo?.label || 'Not specified'}</p>
                  )}
                </div>
                <Field
                  label="Contract Start" icon={<Calendar size={16} />}
                  value={editing ? (editData.contract_start ?? profile.contract_start ?? '') : profile.contract_start}
                  editing={editing}
                  type="date"
                  onChange={(v) => setEditData({ ...editData, contract_start: v || null })}
                />
                <Field
                  label="Contract End" icon={<Calendar size={16} />}
                  value={editing ? (editData.contract_end ?? profile.contract_end ?? '') : profile.contract_end}
                  editing={editing}
                  type="date"
                  onChange={(v) => setEditData({ ...editData, contract_end: v || null })}
                />
                <Field
                  label="Probation End" icon={<Calendar size={16} />}
                  value={editing ? (editData.probation_end ?? profile.probation_end ?? '') : profile.probation_end}
                  editing={editing}
                  type="date"
                  onChange={(v) => setEditData({ ...editData, probation_end: v || null })}
                />
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
                {editing ? (
                  <textarea
                    value={editData.notes ?? profile.notes ?? ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>{profile.notes || 'No notes'}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'insights' && isManagerOrAdmin && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Personal Insights</h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                    <EyeOff size={12} /> Manager only
                  </span>
                </div>
                {!insightsEditing ? (
                  <button
                    onClick={() => { setInsightsEditing(true); setInsightsData(insights || {}); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setInsightsEditing(false); setInsightsData({}); }} className="px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--color-grey-1)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                    <button onClick={handleSaveInsights} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Save size={14} /> Save
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  This information is confidential and only visible to the person's line manager and workspace admins.
                </p>
              </div>

              {insights ? (
                <div className="grid grid-cols-2 gap-6">
                  <Field
                    label="Date of Birth" icon={<Calendar size={16} />}
                    value={insightsEditing ? (insightsData.date_of_birth ?? insights.date_of_birth ?? '') : insights.date_of_birth}
                    editing={insightsEditing} type="date"
                    onChange={(v) => setInsightsData({ ...insightsData, date_of_birth: v || null })}
                  />
                  <Field
                    label="Partner's Name" icon={<Heart size={16} />}
                    value={insightsEditing ? (insightsData.partner_name ?? insights.partner_name ?? '') : insights.partner_name}
                    editing={insightsEditing}
                    onChange={(v) => setInsightsData({ ...insightsData, partner_name: v })}
                  />
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <Baby size={16} /> Number of Children
                    </label>
                    {insightsEditing ? (
                      <input
                        type="number" min={0}
                        value={insightsData.number_of_kids ?? insights.number_of_kids ?? ''}
                        onChange={(e) => setInsightsData({ ...insightsData, number_of_kids: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>{insights.number_of_kids ?? 'Not recorded'}</p>
                    )}
                  </div>
                  <Field
                    label="Children's Details" icon={<Baby size={16} />}
                    value={insightsEditing ? (insightsData.kids_details ?? insights.kids_details ?? '') : insights.kids_details}
                    editing={insightsEditing}
                    onChange={(v) => setInsightsData({ ...insightsData, kids_details: v })}
                  />
                  <Field
                    label="Interests & Hobbies" icon={<Heart size={16} />}
                    value={insightsEditing ? (insightsData.interests ?? insights.interests ?? '') : insights.interests}
                    editing={insightsEditing}
                    onChange={(v) => setInsightsData({ ...insightsData, interests: v })}
                  />
                  <Field
                    label="Dietary Requirements" icon={<UtensilsCrossed size={16} />}
                    value={insightsEditing ? (insightsData.dietary_requirements ?? insights.dietary_requirements ?? '') : insights.dietary_requirements}
                    editing={insightsEditing}
                    onChange={(v) => setInsightsData({ ...insightsData, dietary_requirements: v })}
                  />
                  <Field
                    label="Emergency Contact" icon={<Phone size={16} />}
                    value={insightsEditing ? (insightsData.emergency_contact ?? insights.emergency_contact ?? '') : insights.emergency_contact}
                    editing={insightsEditing}
                    onChange={(v) => setInsightsData({ ...insightsData, emergency_contact: v })}
                  />
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Personal Notes</label>
                    {insightsEditing ? (
                      <textarea
                        value={insightsData.personal_notes ?? insights.personal_notes ?? ''}
                        onChange={(e) => setInsightsData({ ...insightsData, personal_notes: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        placeholder="Anything useful to remember about this person..."
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>{insights.personal_notes || 'No notes'}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading insights...</p>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Documents</h2>
              </div>

              {/* Upload area */}
              <div className="rounded-lg border-2 border-dashed p-6 mb-6" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Document Type</label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        {Object.entries(DOC_TYPES).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Expiry Date (optional)</label>
                      <input
                        type="date" value={uploadExpiry}
                        onChange={(e) => setUploadExpiry(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Notes (optional)</label>
                      <input
                        type="text" value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        placeholder="Brief description..."
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium shrink-0">
                    <Upload size={16} />
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input type="file" onChange={handleDocUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Document list */}
              {documents.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                  <FileText size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => {
                    const docType = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
                    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                    const isExpiringSoon = doc.expiry_date && !isExpired &&
                      new Date(doc.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

                    return (
                      <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors hover:border-[var(--color-primary)]" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                        <span className="text-xl">{docType.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{doc.filename}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-grey-1)', color: 'var(--color-text-secondary)' }}>{docType.label}</span>
                            {isExpired && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">Expired</span>
                            )}
                            {isExpiringSoon && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Expiring soon</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                            {doc.expiry_date && <span>Expires: {doc.expiry_date}</span>}
                            {doc.notes && <span>{doc.notes}</span>}
                            <span>Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadDoc(doc)}
                            className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            style={{ color: 'var(--color-text-secondary)' }}
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            style={{ color: 'var(--color-text-secondary)' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Field Component ---

function Field({ label, icon, value, editing, type = 'text', onChange }: {
  label: string;
  icon?: React.ReactNode;
  value: string | null | undefined;
  editing: boolean;
  type?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {icon} {label}
      </label>
      {editing && onChange ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>{value || 'Not specified'}</p>
      )}
    </div>
  );
}

// --- Create Profile Modal ---

function CreateProfileModal({ member, workspaceId, onCreated, onClose }: {
  member: User; workspaceId: string; onCreated: (p: PersonProfile) => void; onClose: () => void;
}) {
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [contractType, setContractType] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const data: Record<string, string | null> = {};
      if (jobTitle) data.job_title = jobTitle;
      if (department) data.department = department;
      if (contractType) data.contract_type = contractType;
      if (location) data.location = location;
      const { data: profile } = await peopleApi.create(workspaceId, member.id, data);
      onCreated(profile);
      Toast.show('Profile created');
    } catch {
      Toast.show('Failed to create profile');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="rounded-xl shadow-xl w-full max-w-md p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Create Profile for {member.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-grey-1)] rounded"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Job Title</label>
            <LookupSelect category="job_title" value={jobTitle} onChange={setJobTitle}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="Select job title..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Department</label>
            <LookupSelect category="department" value={department} onChange={setDepartment}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="Select department..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Contract Type</label>
            <select value={contractType} onChange={(e) => setContractType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              <option value="">Not specified</option>
              {Object.entries(CONTRACT_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>Location</label>
            <LookupSelect category="location" value={location} onChange={setLocation}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="Select location..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--color-grey-1)]" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export function PeoplePage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profiles, orgChart, isLoading, fetchProfiles, fetchOrgChart, addProfile } = usePeopleStore();
  const [viewMode, setViewMode] = useState<ViewMode>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [creatingFor, setCreatingFor] = useState<User | null>(null);

  useEffect(() => {
    if (workspace) {
      fetchProfiles(workspace.id);
      fetchOrgChart(workspace.id);
      membersApi.list(workspace.id).then(({ data }) => setAllMembers(data));
      // Get current user from auth
      import('../api/users').then(({ authApi }) => {
        authApi.me().then(({ data }) => setCurrentUser(data));
      });
    }
  }, [workspace, fetchProfiles, fetchOrgChart]);

  const departments = useMemo(() => {
    const depts = new Set(profiles.map((p) => p.department).filter(Boolean) as string[]);
    return Array.from(depts).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    let result = profiles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        (p.user_name || '').toLowerCase().includes(q) ||
        (p.job_title || '').toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q) ||
        (p.user_email || '').toLowerCase().includes(q)
      );
    }
    if (filterDept) {
      result = result.filter((p) => p.department === filterDept);
    }
    return result;
  }, [profiles, searchQuery, filterDept]);

  // Members without profiles
  const membersWithoutProfiles = useMemo(() => {
    const profileUserIds = new Set(profiles.map((p) => p.user_id));
    return allMembers.filter((m) => !profileUserIds.has(m.id));
  }, [allMembers, profiles]);

  // Stats computed from profiles
  const totalPeople = profiles.length;
  const uniqueDepartments = departments.length;
  const contractors = useMemo(() => profiles.filter((p) => p.contract_type === 'contractor').length, [profiles]);
  const onProbation = useMemo(() => {
    const now = new Date();
    return profiles.filter((p) => p.probation_end && new Date(p.probation_end) > now).length;
  }, [profiles]);

  // Chart data
  const contractTypeSegments = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const ct = p.contract_type || 'unspecified';
      counts[ct] = (counts[ct] || 0) + 1;
    }
    const colourMap: Record<string, string> = {
      permanent: COLOURS.green,
      fixed_term: COLOURS.amber,
      contractor: COLOURS.indigo,
      agency: COLOURS.pink,
      unspecified: COLOURS.slate,
    };
    return Object.entries(counts).map(([key, value]) => ({
      label: CONTRACT_TYPES[key]?.label || 'Unspecified',
      value,
      colour: colourMap[key] || COLOURS.slate,
    }));
  }, [profiles]);

  const departmentBars = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const dept = p.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    }
    const colourList = [COLOURS.blue, COLOURS.purple, COLOURS.teal, COLOURS.amber, COLOURS.pink, COLOURS.indigo, COLOURS.cyan, COLOURS.green, COLOURS.red, COLOURS.slate];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        colour: colourList[i % colourList.length],
      }));
  }, [profiles]);

  // If we have a userId param, show the profile detail
  const selectedProfile = userId ? profiles.find((p) => p.user_id === userId) : null;

  if (selectedProfile && workspace && currentUser) {
    return (
      <div className="p-6">
        <ProfileDetail
          profile={selectedProfile}
          workspaceId={workspace.id}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          onBack={() => navigate('/people')}
          allMembers={allMembers}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users size={24} style={{ color: 'var(--color-primary)' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>People</h1>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{profiles.length} profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'directory' ? '' : 'hover:bg-[var(--color-grey-1)]'
              }`}
              style={viewMode === 'directory'
                ? { backgroundColor: 'rgba(var(--color-primary-rgb, 65, 134, 224), 0.15)', color: 'var(--color-primary)' }
                : { color: 'var(--color-text-secondary)' }
              }
            >
              <Grid3X3 size={16} /> Directory
            </button>
            <button
              onClick={() => setViewMode('orgchart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'orgchart' ? '' : 'hover:bg-[var(--color-grey-1)]'
              }`}
              style={viewMode === 'orgchart'
                ? { backgroundColor: 'rgba(var(--color-primary-rgb, 65, 134, 224), 0.15)', color: 'var(--color-primary)' }
                : { color: 'var(--color-text-secondary)' }
              }
            >
              <Network size={16} /> Org Chart
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total People" value={totalPeople} icon={<Users size={20} />} colour={COLOURS.blue} />
          <StatCard label="Departments" value={uniqueDepartments} icon={<Building2 size={20} />} colour={COLOURS.purple} />
          <StatCard label="Contractors" value={contractors} icon={<Briefcase size={20} />} colour={COLOURS.amber} />
          <StatCard label="On Probation" value={onProbation} icon={<MapPin size={20} />} colour={COLOURS.teal} />
        </div>

        {/* Charts */}
        {profiles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Contract Types</h3>
              <DonutChart segments={contractTypeSegments} size={120} centerValue={profiles.length} centerLabel="total" />
            </div>
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>By Department</h3>
              <BarChart bars={departmentBars} height={150} />
            </div>
          </div>
        )}

        {viewMode === 'directory' && (
          <>
            {/* Search and filters */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Directory grid */}
            {isLoading ? (
              <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProfiles.map((profile) => {
                  const contractInfo = profile.contract_type ? CONTRACT_TYPES[profile.contract_type] : null;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => navigate(`/people/${profile.user_id}`)}
                      className="rounded-xl border p-5 text-left hover:shadow-md hover:border-blue-200 transition-colors group"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar
                          name={profile.user_name || ''}
                          initials={profile.user_initials}
                          colour={profile.user_colour}
                          avatarUrl={profile.user_avatar_url}
                          size={48}
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate group-hover:text-blue-600" style={{ color: 'var(--color-text)' }}>{profile.user_name}</h3>
                          {profile.job_title && <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{profile.job_title}</p>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {profile.department && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <Building2 size={12} /> {profile.department}
                          </div>
                        )}
                        {profile.location && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <MapPin size={12} /> {profile.location}
                          </div>
                        )}
                        {profile.manager_name && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <UserCheck size={12} /> {profile.manager_name}
                          </div>
                        )}
                      </div>
                      {contractInfo && (
                        <div className="mt-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: contractInfo.colour }}
                          >
                            {contractInfo.label}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Members without profiles - add profile cards */}
                {membersWithoutProfiles.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setCreatingFor(member)}
                    className="rounded-xl border-2 border-dashed p-5 text-left hover:border-blue-300 transition-colors group"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        name={member.name}
                        initials={member.initials}
                        colour={member.colour}
                        avatarUrl={member.avatar_url}
                        size={48}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-secondary)' }}>{member.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No profile yet</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-500 group-hover:text-blue-600">
                      <Plus size={12} /> Create profile
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === 'orgchart' && (
          <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {orgChart.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                <Network size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No org chart data yet. Set managers on people profiles to build the hierarchy.</p>
              </div>
            ) : (
              <div>
                {orgChart.map((node) => (
                  <OrgChartNodeView
                    key={node.user_id}
                    node={node}
                    onSelect={(uid) => navigate(`/people/${uid}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create profile modal */}
      {creatingFor && workspace && (
        <CreateProfileModal
          member={creatingFor}
          workspaceId={workspace.id}
          onCreated={(p) => { addProfile(p); setCreatingFor(null); }}
          onClose={() => setCreatingFor(null)}
        />
      )}
    </div>
  );
}
