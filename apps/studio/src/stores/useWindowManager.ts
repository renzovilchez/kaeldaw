import { useContext } from "react";
import { Ctx } from "./WindowManagerContext";
import type { WindowId, State, WindowState } from "./WindowManager";

export function useWindowManager() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWindowManager needs WindowManagerProvider");
  return ctx;
}

export type { WindowId, State, WindowState };
