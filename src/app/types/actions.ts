export enum ActionType {
  GIVE_ITEM = "GIVE_ITEM",
  TAKE_ITEM = "TAKE_ITEM",
  START_QUEST = "START_QUEST",
  PROGRESS_QUEST = "PROGRESS_QUEST",
  COMPLETE_QUEST = "COMPLETE_QUEST",
  UPDATE_REPUTATION = "UPDATE_REPUTATION",
  ADD_KNOWLEDGE = "ADD_KNOWLEDGE",
  UNLOCK_LOCATION = "UNLOCK_LOCATION",
  MODIFY_STATE = "MODIFY_STATE",
}

export interface GameAction {
  type: ActionType;
  data: {
    targetId?: string;
    amount?: number;
    itemId?: string;
    questId?: string;
    state?: Record<string, any>;
    location?: string;
    knowledge?: string;
  };
}

export interface NPCResponse {
  message: string;
  actions: GameAction[];
}
