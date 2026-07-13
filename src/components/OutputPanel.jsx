import React, { useRef, useEffect } from "react";

const typeColors = {
  stdout: "text-[#cdd6f4]",
  stderr: "text-[#f38ba8]",
  info: "text-[#89b4fa]",
  error: "text-[#f38ba8]",
};

export default function OutputPanel({ outputs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  if (!outputs.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-[12px]">
        No output yet
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="overflow-y-auto h-full p-2 font-mono text-[12px] space-y-0.5 select-text">
      {outputs.map((entry, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-[#666] flex-shrink-0 text-[10px]">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span className={`whitespace-pre-wrap break-all ${typeColors[entry.type] || "text-[#ccc]"}`}>
            {entry.message}
          </span>
        </div>
      ))}
    </div>
  );
}