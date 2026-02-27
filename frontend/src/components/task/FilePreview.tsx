import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface FilePreviewProps {
  url: string;
  filename: string;
  mimeType: string;
  onClose: () => void;
}

export function FilePreview({ url, filename, mimeType, onClose }: FilePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {isImage && (
          <>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
              className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
            >
              <ZoomOut size={18} />
            </button>
          </>
        )}
        <a
          href={url}
          download={filename}
          className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filename */}
      <div className="absolute top-4 left-4 text-sm text-white/80 bg-black/50 px-3 py-1.5 rounded-lg z-10">
        {filename}
      </div>

      {/* Content */}
      <div className="relative z-[1] max-w-[90vw] max-h-[90vh] overflow-auto">
        {isImage && (
          <img
            src={url}
            alt={filename}
            className="transition-transform"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          />
        )}
        {isPdf && (
          <iframe
            src={url}
            className="w-[80vw] h-[85vh] bg-white rounded-lg"
            title={filename}
          />
        )}
        {isVideo && (
          <video src={url} controls className="max-w-[80vw] max-h-[80vh] rounded-lg">
            Your browser does not support video playback.
          </video>
        )}
        {isAudio && (
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl">
            <p className="text-white text-sm mb-4">{filename}</p>
            <audio src={url} controls className="w-full" />
          </div>
        )}
        {!isImage && !isPdf && !isVideo && !isAudio && (
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl text-center">
            <p className="text-white mb-4">{filename}</p>
            <p className="text-white/60 text-sm mb-4">Preview not available for this file type</p>
            <a
              href={url}
              download={filename}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90"
            >
              <Download size={16} />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
