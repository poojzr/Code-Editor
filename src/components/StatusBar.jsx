import React from "react";
import { GitBranch, AlertCircle, AlertTriangle, Bug } from "lucide-react";

export default function StatusBar({ activeFile, workspace, problems, isDebugging }) {
  const errors = problems.filter(p => p.severity === "error").length;
  const warnings = problems.filter(p => p.severity === "warning").length;

  return (
    <div className="h-[22px] bg-[#007acc] flex items-center justify-between px-2 text-white text-[11px] flex-shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <GitBranch size={12} />
          main
        </span>
        {isDebugging && (
          <span className="flex items-center gap-1">
            <Bug size={12} />
            Debugging
          </span>
        )}
        {(errors > 0 || warnings > 0) && (
          <span className="flex items-center gap-2">
            {errors > 0 && (
              <span className="flex items-center gap-0.5">
                <AlertCircle size={12} /> {errors}
              </span>
            )}
            {warnings > 0 && (
              <span className="flex items-center gap-0.5">
                <AlertTriangle size={12} /> {warnings}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {activeFile && (
          <>
            <span>{activeFile.language || "Plain Text"}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </>
        )}
        <span>Spaces: 2</span>
      </div>
    </div>
  );
}