import { createContext } from "react";
import type { WindowId, State } from "./WindowManager";

export const Ctx = createContext<{
  state: State;
  open: (id: WindowId) => void;
  close: (id: WindowId) => void;
  toggle: (id: WindowId) => void;
  toggleMaximize: (id: WindowId) => void;
  toggleMinimize: (id: WindowId) => void;
  bringToFront: (id: WindowId) => void;
  move: (id: WindowId, x: number, y: number) => void;
  resize: (id: WindowId, w: number, h: number) => void;
} | null>(null);
