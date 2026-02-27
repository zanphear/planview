import { useEffect, useState, useCallback, useRef } from 'react';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File as FileIcon } from 'lucide-react';
import { attachmentsApi, type Attachment } from '../../api/attachments';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

interface TaskAttachmentsProps {
  taskId: string;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    if (!workspace) return;
    const { data } = await attachmentsApi.list(workspace.id, taskId);
    setAttachments(data);
  }, [workspace, taskId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = async (files: FileList | null) => {
    if (!workspace || !files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await attachmentsApi.upload(workspace.id, taskId, file);
    }
    setUploading(false);
    await fetchAttachments();
  };

  const handleDelete = async (id: string) => {
    if (!workspace) return;
    await attachmentsApi.delete(workspace.id, taskId, id);
    await fetchAttachments();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText size={16} className="text-red-500" />;
    return <FileIcon size={16} className="text-gray-500" />;
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">
        <Paperclip size={12} className="inline mr-1" />
        Attachments
      </label>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors mb-3 ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleUpload(e.dataTransfer.files);
        }}
      >
        <Upload size={16} className="mx-auto text-gray-400 mb-1" />
        <p className="text-xs text-gray-400">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* File list */}
      <div className="space-y-1.5">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg group text-sm"
          >
            {getIcon(att.mime_type)}
            <span className="flex-1 truncate text-gray-700">{att.filename}</span>
            <span className="text-xs text-gray-400 shrink-0">{formatSize(att.file_size)}</span>
            <div className="hidden group-hover:flex items-center gap-1">
              {workspace && (
                <a
                  href={attachmentsApi.downloadUrl(workspace.id, taskId, att.id)}
                  target="_blank"
                  rel="noopener"
                  className="p-0.5 text-gray-400 hover:text-blue-500"
                >
                  <Download size={14} />
                </a>
              )}
              {att.uploaded_by === user?.id && (
                <button
                  onClick={() => handleDelete(att.id)}
                  className="p-0.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
