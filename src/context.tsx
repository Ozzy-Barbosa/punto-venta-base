import { createContext, useContext } from "react";
import type { State } from "./model";
export type Workspace = {
  state: State;
  mutate: (action: (s: State) => void, message?: string) => boolean;
  notify: (text: string, error?: boolean) => void;
  navigate: (page: string) => void;
};
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  return useContext(WorkspaceContext)!;
}
