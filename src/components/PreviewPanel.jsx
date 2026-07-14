import React, { useMemo, useEffect } from "react";
import { X, ExternalLink, RefreshCw } from "lucide-react";


export default function PreviewPanel({ preview, previewType, onClose }) {
  const blobUrl = useMemo(() => {
    if (!preview || previewType !== "html") return null;
    const blob = new Blob([preview], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [preview, previewType]);

  
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!preview || previewType !== "html") {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-sm">
        No preview available. Click Run on an HTML file to see a live preview.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-[#313244] flex-shrink-0">
        <span className="text-[11px] uppercase tracking-wider text-[#888] font-semibold">
          Live Preview
        </span>
        <div className="flex items-center gap-1">
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-[#888] hover:text-white transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-[#888] hover:text-white transition-colors"
              title="Close preview"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <iframe
        src={blobUrl}
        className="flex-1 w-full border-0 bg-white"
        title="HTML Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}