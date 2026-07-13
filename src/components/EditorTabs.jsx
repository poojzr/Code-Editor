import React, { useState } from "react";
import { X, FileCode } from "lucide-react";

export default function EditorTabs({ files, activeFileId, onSelect, onClose, onCloseOthers, onCloseAll }) {
  const [contextTab, setContextTab] = useState(null);

  return (
    <div className="bg-[#181825] flex items-center overflow-x-auto flex-shrink-0 border-b border-[#313244] gap-px"
      style={{ scrollbarWidth: "none" }}>
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-[#313244] min-w-0 group relative ${
            activeFileId === file.id
              ? "bg-[#1e1e2e] text-white"
              : "bg-[#181825] text-[#888] hover:bg-[#252536]"
          }`}
          onClick={() => onSelect(file.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextTab({ id: file.id, x: e.clientX, y: e.clientY });
          }}
        >
          {activeFileId === file.id && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
          )}
          <FileCode size={14} className="flex-shrink-0 text-[#888]" />
          <span className="text-[12px] truncate max-w-[120px]">
            {file.dirty && <span className="text-[#007acc] mr-0.5">●</span>}
            {file.name}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(file.id); }}
            className="ml-1 p-0.5 rounded hover:bg-[#414155] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {contextTab && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextTab(null)} />
          <div
            className="fixed z-50 bg-[#252536] border border-[#414155] rounded shadow-xl py-1 min-w-[160px]"
            style={{ left: contextTab.x, top: contextTab.y }}
          >
            <button
              className="w-full text-left px-4 py-1 text-[12px] text-[#ccc] hover:bg-[#007acc] hover:text-white"
              onClick={() => { onClose(contextTab.id); setContextTab(null); }}
            >Close</button>
            <button
              className="w-full text-left px-4 py-1 text-[12px] text-[#ccc] hover:bg-[#007acc] hover:text-white"
              onClick={() => { onCloseOthers(contextTab.id); setContextTab(null); }}
            >Close Others</button>
            <button
              className="w-full text-left px-4 py-1 text-[12px] text-[#ccc] hover:bg-[#007acc] hover:text-white"
              onClick={() => { onCloseAll(); setContextTab(null); }}
            >Close All</button>
          </div>
        </>
      )}
    </div>
  );
}