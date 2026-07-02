import { useState } from "react";

export function useSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("kaeldaw-sidebar-width");
    return saved ? Number(saved) : 200;
  });
  const handleSidebarResize = (w: number) => {
    setSidebarWidth(w);
    localStorage.setItem("kaeldaw-sidebar-width", String(w));
  };
  return { sidebarWidth, handleSidebarResize };
}
