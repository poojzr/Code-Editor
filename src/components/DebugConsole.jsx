import React, { useRef, useEffect } from "react";
import { AlertCircle, AlertTriangle, Info, MessageSquare } from "lucide-react";

const typeConfig = {
  error: { icon: AlertCircle, color: "text-[#f38ba8]", bg: "bg-[#f38ba8]/5" },
  warning: { icon: AlertTriangle, color: "text-[#fab387]", bg: "bg-[#fab387]/5" },
  info: { icon: Info, color: "text-[#89b4fa]", bg: "" },
  log: { icon: MessageSquare, color: "text-[#ccc]", bg: "" },
};

export default function DebugConsole({ logs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-[12px] select-text">
        Debug console is empty
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="overflow-y-auto h-full p-2 font-mono text-[12px] space-y-0.5 select-text">
      {logs.map((entry, i) => {
        const config = typeConfig[entry.type] || typeConfig.log;
        const Icon = config.icon;
        return (
          <div key={i} className={`flex items-start gap-2 px-2 py-1 rounded ${config.bg}`}>
            <Icon size={13} className={`${config.color} flex-shrink-0 mt-0.5`} />
            <span className="text-[#666] flex-shrink-0 text-[10px]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className={`whitespace-pre-wrap break-all ${config.color}`}>
              {entry.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}