import React, { useEffect, useRef } from "react";

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 30 - 20);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-[#252536] border border-[#414155] rounded shadow-xl py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) =>
        item.type === "separator" ? (
          <div key={i} className="border-t border-[#414155] my-1" />
        ) : (
          <button
            key={i}
            className="w-full text-left flex items-center justify-between px-4 py-1.5 text-[12px] text-[#ccc] hover:bg-[#007acc] hover:text-white transition-colors"
            onClick={() => { item.action?.(); onClose(); }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-[10px] text-[#888] ml-4">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}