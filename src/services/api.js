const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let message = err.detail || `Request failed: ${res.status}`;
    if (Array.isArray(message)) {
      message = message.map(e => e.msg ? `${e.loc?.join('.') || ''}: ${e.msg}` : JSON.stringify(e)).join('; ');
    }
    throw new Error(message);
  }
  return res.json();
}

export async function healthCheck() {
  return request("/health");
}

export async function openWorkspace(path) {
  return { 
    path: path, 
    name: path.split(/[/\\]/).pop() || path, 
    exists: true 
  };
}

export async function getWorkspaceInfo() {
  return request("/workspace/info");
}

export async function getFiles(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await request(`/workspace/files?path=${encodeURIComponent(path)}`, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getFile(path) {
  return request(`/workspace/file?path=${encodeURIComponent(path)}`);
}

export async function saveFile(path, content) {
  return request("/workspace/file/create", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
}

export async function createFile(path) {
  return request("/workspace/file/create", {
    method: "POST",
    body: JSON.stringify({ path, content: "" }),
  });
}

export async function createFolder(path) {
  return request("/workspace/folder/create", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

export async function deleteFile(path) {
  return request(`/workspace/file/delete?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export async function renameFile(oldPath, newName) {
  return request("/workspace/file/rename", {
    method: "POST",
    body: JSON.stringify({ old_path: oldPath, new_name: newName }),
  });
}

export async function copyFile(sourcePath, destPath) {
  return request("/workspace/file/copy", {
    method: "POST",
    body: JSON.stringify({ source_path: sourcePath, dest_path: destPath }),
  });
}

export async function moveFile(sourcePath, destPath) {
  return request("/workspace/file/move", {
    method: "POST",
    body: JSON.stringify({ source_path: sourcePath, dest_path: destPath }),
  });
}

export async function searchFiles(workspacePath, query) {
  return request("/workspace/search", {
    method: "POST",
    body: JSON.stringify({ path: workspacePath, query }),
  });
}

export async function runFile(filePath, workspacePath) {
  return request("/workspace/run", {
    method: "POST",
    body: JSON.stringify({ file_path: filePath, workspace_path: workspacePath || null }),
  });
}

export async function executeTerminal(command, cwd) {
  return request("/workspace/terminal", {
    method: "POST",
    body: JSON.stringify({ command, cwd }),
  });
}

export async function getProblems() {
  return request("/workspace/problems");
}

export async function getPorts() {
  return request("/workspace/ports");
}

export async function browseDirectories(path) {
  return { path: path || '', entries: [] };
}