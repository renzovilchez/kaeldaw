import {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Ctx } from "./WindowManagerContext";

export type WindowId =
  | "timeline"
  | "piano-roll"
  | "mixer"
  | "tracks"
  | "waveform"
  | "synth-editor";

export type WindowState = {
  id: WindowId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
};

export type State = {
  nextZ: number;
  windows: Record<WindowId, WindowState>;
};

type Action =
  | { type: "OPEN"; id: WindowId }
  | { type: "CLOSE"; id: WindowId }
  | { type: "TOGGLE"; id: WindowId }
  | { type: "BRING_TO_FRONT"; id: WindowId }
  | { type: "TOGGLE_MAXIMIZE"; id: WindowId }
  | { type: "TOGGLE_MINIMIZE"; id: WindowId }
  | { type: "MOVE"; id: WindowId; x: number; y: number }
  | { type: "RESIZE"; id: WindowId; width: number; height: number }
  | { type: "LOAD"; windows: Record<WindowId, WindowState> };

const STORAGE_KEY = "kaeldaw-windows";

const defaults: Record<WindowId, Omit<WindowState, "id" | "zIndex">> = {
  timeline: {
    title: "Timeline",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    position: { x: 220, y: 50 },
    size: { width: 700, height: 400 },
  },
  "piano-roll": {
    title: "Piano Roll",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 240, y: 80 },
    size: { width: 700, height: 350 },
  },
  mixer: {
    title: "Mixer",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 220, y: 60 },
    size: { width: 800, height: 350 },
  },
  tracks: {
    title: "Tracks",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    position: { x: 930, y: 50 },
    size: { width: 260, height: 400 },
  },
  waveform: {
    title: "Waveform",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 260, y: 100 },
    size: { width: 600, height: 200 },
  },
  "synth-editor": {
    title: "Synth Editor",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 300, y: 60 },
    size: { width: 540, height: 520 },
  },
};

function buildDefault(): Record<WindowId, WindowState> {
  const entries = Object.entries(defaults) as [
    WindowId,
    (typeof defaults)[WindowId],
  ][];
  const r: Record<string, WindowState> = {};
  for (const [id, val] of entries) {
    r[id] = {
      id,
      ...val,
      zIndex: id === "timeline" ? 2 : id === "tracks" ? 1 : 0,
    };
  }
  return r as Record<WindowId, WindowState>;
}

function buildInitialState(): State {
  const saved =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved) {
    try {
      const windows = { ...buildDefault(), ...JSON.parse(saved) } as Record<
        WindowId,
        WindowState
      >;
      const maxZ = Math.max(0, ...Object.values(windows).map((w) => w.zIndex));
      return { nextZ: maxZ + 1, windows };
    } catch {
      /* ignore */
    }
  }
  return { nextZ: 10, windows: buildDefault() };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
    case "BRING_TO_FRONT": {
      const w = state.windows[action.id];
      if (!w) return state;
      return {
        ...state,
        nextZ: state.nextZ + 1,
        windows: {
          ...state.windows,
          [action.id]: {
            ...w,
            isOpen: true,
            isMinimized: false,
            zIndex: state.nextZ,
          },
        },
      };
    }
    case "CLOSE": {
      const w = state.windows[action.id];
      if (!w) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, isOpen: false, isMinimized: false },
        },
      };
    }
    case "TOGGLE": {
      const w = state.windows[action.id];
      if (!w) return state;
      if (!w.isOpen) return reducer(state, { type: "OPEN", id: action.id });
      if (w.isMinimized) return reducer(state, { type: "OPEN", id: action.id });
      return reducer(state, { type: "CLOSE", id: action.id });
    }
    case "TOGGLE_MAXIMIZE": {
      const w = state.windows[action.id];
      if (!w) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, isMaximized: !w.isMaximized },
        },
      };
    }
    case "TOGGLE_MINIMIZE": {
      const w = state.windows[action.id];
      if (!w) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, isMinimized: !w.isMinimized },
        },
      };
    }
    case "MOVE": {
      const w = state.windows[action.id];
      if (!w || w.isMaximized) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, position: { x: action.x, y: action.y } },
        },
      };
    }
    case "RESIZE": {
      const w = state.windows[action.id];
      if (!w || w.isMaximized) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...w,
            size: { width: action.width, height: action.height },
          },
        },
      };
    }
    case "LOAD": {
      const incoming = { ...buildDefault(), ...action.windows };
      const maxZ = Math.max(0, ...Object.values(incoming).map((w) => w.zIndex));
      return {
        ...state,
        nextZ: Math.max(state.nextZ, maxZ + 1),
        windows: incoming,
      };
    }
    default:
      return state;
  }
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced localStorage save (500ms after last change)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.windows));
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.windows]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const windows = JSON.parse(e.newValue) as Record<
            WindowId,
            WindowState
          >;
          dispatch({ type: "LOAD", windows });
        } catch {
          // ignore invalid JSON
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const open = useCallback(
    (id: WindowId) => dispatch({ type: "OPEN", id }),
    [],
  );
  const close = useCallback(
    (id: WindowId) => dispatch({ type: "CLOSE", id }),
    [],
  );
  const toggle = useCallback(
    (id: WindowId) => dispatch({ type: "TOGGLE", id }),
    [],
  );
  const toggleMaximize = useCallback(
    (id: WindowId) => dispatch({ type: "TOGGLE_MAXIMIZE", id }),
    [],
  );
  const toggleMinimize = useCallback(
    (id: WindowId) => dispatch({ type: "TOGGLE_MINIMIZE", id }),
    [],
  );
  const bringToFront = useCallback(
    (id: WindowId) => dispatch({ type: "BRING_TO_FRONT", id }),
    [],
  );
  const move = useCallback(
    (id: WindowId, x: number, y: number) =>
      dispatch({ type: "MOVE", id, x, y }),
    [],
  );
  const resize = useCallback(
    (id: WindowId, width: number, height: number) =>
      dispatch({ type: "RESIZE", id, width, height }),
    [],
  );

  const value = useMemo(
    () => ({
      state,
      open,
      close,
      toggle,
      toggleMaximize,
      toggleMinimize,
      bringToFront,
      move,
      resize,
    }),
    [
      state,
      open,
      close,
      toggle,
      toggleMaximize,
      toggleMinimize,
      bringToFront,
      move,
      resize,
    ],
  );

  return <Ctx value={value}>{children}</Ctx>;
}
