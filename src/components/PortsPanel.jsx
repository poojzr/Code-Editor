import React from "react";
import { Globe, ExternalLink } from "lucide-react";

export default function PortsPanel({ ports }) {
  if (!ports.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-[12px]">
        No forwarded ports
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full select-text">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-[#888] border-b border-[#313244]">
            <th className="text-left px-3 py-2 font-medium">Port</th>
            <th className="text-left px-3 py-2 font-medium">Process</th>
            <th className="text-left px-3 py-2 font-medium">URL</th>
            <th className="text-left px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {ports.map((port, i) => (
            <tr key={i} className="border-b border-[#313244]/50 hover:bg-[#313244]/30">
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <Globe size={12} className="text-[#a6e3a1]" />
                  {port.port}
                </span>
              </td>
              <td className="px-3 py-2 text-[#ccc]">{port.process}</td>
              <td className="px-3 py-2 text-[#89b4fa]">{port.url}</td>
              <td className="px-3 py-2">
                <a
                  href={port.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#89b4fa] hover:text-white flex items-center gap-1"
                >
                  Open <ExternalLink size={11} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}