import { useSyncExternalStore } from "react";
import { Project, type CoreState } from "@kaeldaw/project/core";

export const project = new Project();

export function useCore<T>(selector: (state: CoreState) => T): T {
  return useSyncExternalStore(
    (cb) => project.subscribe(() => cb()),
    () => selector(project.state),
  );
}
