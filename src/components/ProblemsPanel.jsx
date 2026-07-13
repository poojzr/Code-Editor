import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

const icons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  error: "text-[#f38ba8]",
  warning: "text-[#fab387]",
  info: "text-[#89b4fa]",
};

export default function ProblemsPanel({ problems, onOpenFile }) {
  if (!problems.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-[12px]">
        No problems detected
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full font-mono text-[12px] select-text">
      {problems.map((problem, i) => {
        const Icon = icons[problem.severity] || icons.info;
        const color = colors[problem.severity] || colors.info;
        return (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-1.5 hover:bg-[#313244]/40 cursor-pointer"
            onClick={() => problem.file && onOpenFile(problem.file)}
          >
            <Icon size={14} className={`${color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <span className="text-[#ccc]">{problem.message}</span>
              {problem.file && (
                <span className="text-[#888] ml-2">
                  {problem.file}
                  {problem.line && `:${problem.line}`}
                  {problem.column && `:${problem.column}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}