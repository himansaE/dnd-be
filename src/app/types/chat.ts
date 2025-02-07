import type { GameAction } from "./actions.js";

export interface StreamResponse {
  content: string;
  isComplete: boolean;
  actions?: GameAction[];
}
