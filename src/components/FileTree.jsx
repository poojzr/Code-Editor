import React from "react";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FileCode, FileJson, FileText, FileImage,
} from "lucide-react";

const getFileIcon = (name, isDir) => {
  if (isDir) return null;
  const ext = name.split('.').pop().toLowerCase();
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'cs', 'vue', 'svelte', 'html', 'css', 'scss', 'sh', 'bash'];
  const jsonExts = ['json', 'yaml', 'yml', 'toml', 'xml'];
  const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'];
  if (codeExts.includes(ext)) return FileCode;
  if (jsonExts.includes(ext)) return FileJson;
  if (imgExts.includes(ext)) return FileImage;
  if (ext === 'md' || ext === 'txt') return FileText;
  return File;
};

const getFileColor = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  const colors = {
    js: "#f0db4f", jsx: "#61dafb", ts: "#3178c6", tsx: "#3178c6",
    py: "#3572A5", java: "#b07219", c: "#555", cpp: "#f34b7d",
    go: "#00ADD8", rs: "#dea584", rb: "#CC342D", php: "#4F5D95",
    html: "#e34c26", css: "#563d7c", scss: "#c6538c",
    json: "#a8b1c2", yaml: "#cb171e", md: "#ccc", vue: "#41b883",
    svelte: "#ff3e00", swift: "#ffac45", kt: "#A97BFF",
  };
  return colors[ext] || "#ccc";
};

function TreeNode({
  node, depth = 0, onOpenFile, onContextMenu,
  expandedPaths, onToggleExpand, onLoadChildren,
  editingPath, editValue, setEditValue,
  onEditSubmit, onEditCancel,
  loadingPaths = new Set(),
}) {
  const isDir = node.type === "directory";
  const isExpanded = expandedPaths.has(node.path);
  const isEditing = editingPath === node.path;
  const isLoading = loadingPaths.has(node.path);
  const childrenLoaded = node.children !== null && node.children !== undefined;
  const hasChildren = childrenLoaded && node.children.length > 0;

  const IconComponent = isDir
    ? (isExpanded ? FolderOpen : Folder)
    : getFileIcon(node.name, false);

  const handleClick = () => {
    if (isEditing) return;
    if (isDir) {
      if (!isExpanded && !childrenLoaded && !isLoading) {
        onLoadChildren?.(node.path);
      }
      onToggleExpand(node.path);
    } else {
      onOpenFile(node.path);
    }
  };

  return (
    <div>
      <div
        className="flex items-center hover:bg-[#313244]/60 cursor-pointer group pr-2"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, node);
        }}
      >
        {isDir ? (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span className="flex-shrink-0 mr-1.5">
          {isDir ? (
            <IconComponent size={16} className="text-[#007acc]" />
          ) : (
            <IconComponent size={16} style={{ color: getFileColor(node.name) }} />
          )}
        </span>
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSubmit();
              if (e.key === "Escape") onEditCancel();
            }}
            onBlur={onEditCancel}
            className="flex-1 bg-[#313244] text-[#ccc] text-[12px] px-1 py-0.5 border border-[#007acc] outline-none rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-[12px] truncate py-0.5 leading-[22px]">{node.name}</span>
        )}
      </div>
      {isDir && isExpanded && (
        <>
          {isLoading && (
            <div style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }} className="text-[11px] text-[#666] py-0.5">
              Loading...
            </div>
          )}
          {!isLoading && hasChildren && (
            <div>
              {node.children.map((child) => (
                <TreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  onOpenFile={onOpenFile}
                  onContextMenu={onContextMenu}
                  expandedPaths={expandedPaths}
                  onToggleExpand={onToggleExpand}
                  onLoadChildren={onLoadChildren}
                  editingPath={editingPath}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  onEditSubmit={onEditSubmit}
                  onEditCancel={onEditCancel}
                  loadingPaths={loadingPaths}
                />
              ))}
            </div>
          )}
          {!isLoading && childrenLoaded && !hasChildren && (
            <div style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }} className="text-[11px] text-[#666] py-0.5 italic">
              Empty folder
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FileTree({
  files, onOpenFile, onContextMenu,
  expandedPaths, onToggleExpand, onLoadChildren,
  editingPath, editValue, setEditValue, onEditSubmit, onEditCancel,
  loadingPaths,
}) {
  return (
    <div className="py-1">
      {files.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          onOpenFile={onOpenFile}
          onContextMenu={onContextMenu}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          onLoadChildren={onLoadChildren}
          editingPath={editingPath}
          editValue={editValue}
          setEditValue={setEditValue}
          onEditSubmit={onEditSubmit}
          onEditCancel={onEditCancel}
          loadingPaths={loadingPaths}
        />
      ))}
    </div>
  );
}