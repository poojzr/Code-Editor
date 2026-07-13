import React, { useState } from "react";
import { X, Folder, ChevronRight, FolderOpen, File } from "lucide-react";

export default function FolderPicker({ onSelect, onClose }) {
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderContents, setFolderContents] = useState([]);

  const openFolderPicker = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support folder access. Please use Chrome or Edge.');
      return;
    }

    setLoading(true);
    try {
      const dirHandle = await window.showDirectoryPicker();
      
      const entries = [];
      for await (const [name, handle] of dirHandle.entries()) {
        entries.push({
          name,
          path: name,
          type: handle.kind === 'directory' ? 'directory' : 'file',
          handle: handle
        });
      }

      entries.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      setSelectedFolder({
        name: dirHandle.name,
        entries: entries
      });
      setFolderContents(entries);
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CancelError') {
        console.error('Error opening folder:', err);
        alert('Could not open folder. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleSelect = () => {
    if (selectedFolder) {
      onSelect(selectedFolder.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#252536] border border-[#414155] rounded-lg w-[640px] max-w-[90vw] flex flex-col shadow-2xl"
        style={{ maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
          <h2 className="text-sm text-white font-medium">Open Folder</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#313244]">
          <button
            onClick={openFolderPicker}
            disabled={loading}
            className="px-4 py-1.5 text-xs bg-[#007acc] text-white rounded hover:bg-[#0098ff] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <FolderOpen size={14} />
            {loading ? 'Loading...' : 'Choose Folder'}
          </button>
          <div className="flex-1 text-xs text-[#ccc] truncate bg-[#1e1e2e] px-3 py-1.5 rounded font-mono flex items-center gap-2">
            {selectedFolder && <Folder size={14} className="text-[#007acc]" />}
            {selectedFolder ? selectedFolder.name : 'Click "Choose Folder" to select'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#666] text-sm">
              Loading folder contents...
            </div>
          ) : folderContents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#666] text-sm">
              {selectedFolder ? 'No items in this folder' : 'Select a folder to see its contents'}
            </div>
          ) : (
            folderContents.map(entry => (
              <div
                key={entry.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded cursor-default text-sm text-[#ccc] hover:bg-[#313244] transition-colors"
              >
                {entry.type === 'directory' ? (
                  <Folder size={16} className="text-[#007acc] flex-shrink-0" />
                ) : (
                  <File size={16} className="text-[#888] flex-shrink-0" />
                )}
                <span className="truncate">{entry.name}</span>
                {entry.type === 'directory' && (
                  <ChevronRight size={14} className="text-[#666] ml-auto flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#313244]">
          <div className="text-xs text-[#888] truncate flex-1 mr-4 font-mono flex items-center gap-2">
            {selectedFolder && <Folder size={12} className="text-[#007acc]" />}
            {selectedFolder ? selectedFolder.name : 'No folder selected'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-[#ccc] hover:bg-[#313244] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedFolder}
              className="px-4 py-1.5 text-xs bg-[#007acc] text-white rounded hover:bg-[#0098ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}