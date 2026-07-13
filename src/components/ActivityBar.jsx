import React from "react";
import { Files } from "lucide-react";

export default function ActivityBar({ sidebarVisible, onToggleSidebar }) {
  return (
    <div className="w-12 bg-[#11111b] flex flex-col items-center py-1 flex-shrink-0 border-r border-[#313244]">
      <button
        title="Explorer"
        onClick={onToggleSidebar}
        className={`w-12 h-12 flex items-center justify-center transition-colors relative ${
          sidebarVisible ? "text-white" : "text-[#6c7086] hover:text-[#ccc]"
        }`}
      >
        {sidebarVisible && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-white rounded-r" />
        )}
        <Files size={22} strokeWidth={1.5} />
      </button>
    </div>
  );
}