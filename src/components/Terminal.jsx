import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, X } from "lucide-react";

export default function Terminal({
  sessions, activeSessionId, onSetActiveSession,
  onExecute, onNewSession, onClearSession, onCloseSession, workspace,
}) {
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  const session = sessions.find(s => s.id === activeSessionId) || sessions[0] || { id: "default", history: [], cwd: "" };
  const commandHistory = session.history.filter(h => h.type === "input").map(h => h.content);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [session.history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (input.trim() === "clear" || input.trim() === "cls") {
      onClearSession?.(session.id);
      setInput("");
      setHistoryIdx(-1);
      return;
    }

    onExecute(input.trim(), session.id);
    setInput("");
    setHistoryIdx(-1);
  }, [input, onExecute, onClearSession, session.id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIdx = historyIdx < commandHistory.length - 1 ? historyIdx + 1 : historyIdx;
      setHistoryIdx(newIdx);
      setInput(commandHistory[commandHistory.length - 1 - newIdx] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx <= 0) { setHistoryIdx(-1); setInput(""); return; }
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      setInput(commandHistory[commandHistory.length - 1 - newIdx] || "");
    }
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      setInput("");
      setHistoryIdx(-1);
    }
  }, [historyIdx, commandHistory]);

  const promptPath = session.cwd
    ? session.cwd.replace(/\\/g, "/").split("/").filter(Boolean).pop() || session.cwd
    : "~";

  return (
    <div className="flex flex-col h-full bg-[#11111b] font-mono text-[12px] select-text">
      {sessions.length > 1 && (
        <div className="flex items-center gap-0.5 border-b border-[#313244] bg-[#181825] px-1 py-0.5">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-1 px-2 py-1 rounded-t text-[11px] cursor-pointer group ${
                s.id === session.id
                  ? "bg-[#11111b] text-white border-t border-l border-r border-[#313244]"
                  : "text-[#888] hover:bg-[#313244]/50"
              }`}
              onClick={() => onSetActiveSession(s.id)}
            >
              <span>{s.name}</span>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCloseSession?.(s.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-[#f38ba8] transition-opacity"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onNewSession}
            className="p-1 text-[#888] hover:text-white hover:bg-[#313244] rounded transition-colors ml-1"
            title="New Terminal"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      <div ref={outputRef} className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {session.history.length === 0 && (
          <div className="text-[#666]">
            Terminal ready — type a command to begin.
          </div>
        )}
        {session.history.map((entry, i) => (
          <div key={i} className={`whitespace-pre-wrap break-all ${
            entry.type === "input" ? "text-[#89b4fa]" :
            entry.type === "stderr" ? "text-[#f38ba8]" :
            "text-[#cdd6f4]"
          }`}>
            {entry.type === "input" && (
              <span className="text-[#a6e3a1] mr-1">❯</span>
            )}
            {entry.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center border-t border-[#313244] px-2 py-1" onClick={() => inputRef.current?.focus()}>
        <span className="text-[#a6e3a1] mr-1 flex-shrink-0">❯</span>
        <span className="text-[#89b4fa] mr-1 flex-shrink-0">{promptPath}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[#cdd6f4] outline-none"
          placeholder="Enter command..."
          autoFocus
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => onClearSession?.(session.id)}
          className="p-1 text-[#666] hover:text-white transition-colors"
          title="Clear Terminal"
        >
          <Trash2 size={12} />
        </button>
      </form>
    </div>
  );
}