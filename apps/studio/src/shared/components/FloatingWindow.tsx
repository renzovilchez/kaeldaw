import {
  useRef,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from "react";
import { useWindowManager, type WindowId } from "./useWindowManager";

type Props = {
  id: WindowId;
  children: ReactNode;
  sidebarWidth?: number;
  onFocus?: (id: WindowId) => void;
};

export function FloatingWindow({
  id,
  children,
  sidebarWidth = 0,
  onFocus,
}: Props) {
  const {
    state,
    close,
    toggleMaximize,
    toggleMinimize,
    bringToFront,
    move,
    resize,
  } = useWindowManager();
  const w = state.windows[id];
  const [isResizing, setIsResizing] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    winX: number;
    winY: number;
    winW: number;
    winH: number;
  } | null>(null);

  const sidebarWidthRef = useRef(sidebarWidth);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const prevSidebarRef = useRef(sidebarWidth);

  useEffect(() => {
    if (!w || w.isMaximized) return;
    const prev = prevSidebarRef.current;
    prevSidebarRef.current = sidebarWidth;
    if (prev === sidebarWidth) return;
    const sidebarRight = sidebarWidth + 1;
    if (sidebarWidth > prev && w.position.x < sidebarRight) {
      move(id, sidebarRight, w.position.y);
    }
  }, [sidebarWidth, w, id, move]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!w) return;
      bringToFront(id);
      if (w.isMaximized) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        winX: w.position.x,
        winY: w.position.y,
        winW: w.size.width,
        winH: w.size.height,
      };

      const onMove = (ev: globalThis.MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        const newX = Math.max(
          sidebarWidthRef.current + 1,
          Math.min(
            window.innerWidth - dragRef.current.winW,
            dragRef.current.winX + dx,
          ),
        );
        const newY = Math.max(
          41,
          Math.min(
            window.innerHeight - dragRef.current.winH,
            dragRef.current.winY + dy,
          ),
        );
        move(id, newX, newY);
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [id, w, bringToFront, move],
  );

  const handleDoubleClick = useCallback(() => {
    toggleMaximize(id);
  }, [id, toggleMaximize]);

  const startResize = useCallback(
    (e: MouseEvent) => {
      if (!w) return;
      e.stopPropagation();
      if (w.isMaximized) return;
      setIsResizing(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = w.size.width;
      const startH = w.size.height;

      const onMove = (ev: globalThis.MouseEvent) => {
        const dw = ev.clientX - startX;
        const dh = ev.clientY - startY;
        const maxW = window.innerWidth - w.position.x;
        const maxH = window.innerHeight - 41;
        resize(
          id,
          Math.min(maxW, Math.max(200, startW + dw)),
          Math.min(maxH, Math.max(100, startH + dh)),
        );
      };
      const onUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [id, w, resize],
  );

  if (!w || !w.isOpen || w.isMinimized) return null;

  const style: React.CSSProperties = w.isMaximized
    ? {
        position: "fixed",
        inset: `41px 0 0 ${sidebarWidth + 1}px`,
        zIndex: w.zIndex,
        display: "flex",
        flexDirection: "column",
      }
    : {
        position: "fixed",
        left: w.position.x,
        top: w.position.y,
        width: w.size.width,
        height: w.size.height,
        zIndex: w.zIndex,
        display: "flex",
        flexDirection: "column",
      };

  return (
    <div
      style={style}
      className="bg-[#3a3a3a] rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden"
      onMouseDown={() => {
        bringToFront(id);
        onFocus?.(id);
      }}
    >
      <div
        ref={titleRef}
        className="h-7 bg-linear-to-r from-[#4a4a4a] to-[#555] flex items-center justify-between px-2 cursor-grab active:cursor-grabbing shrink-0 select-none"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <span className="text-[11px] text-[#ccc] font-medium tracking-wide">
          {w.title}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#666] text-[#999] hover:text-[#eee] text-[10px] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize(id);
            }}
            title="Minimize"
          >
            ─
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#666] text-[#999] hover:text-[#eee] text-[9px] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize(id);
            }}
            title="Maximize"
          >
            □
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-600 text-[#999] hover:text-white text-[10px] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              close(id);
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{children}</div>

      {!w.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={startResize}
          style={isResizing ? { cursor: "se-resize" } : undefined}
        >
          <svg
            viewBox="0 0 8 8"
            className="w-3 h-3 absolute bottom-0.5 right-0.5"
            fill="#666"
          >
            <path d="M0,8 L8,0 L8,8 Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
