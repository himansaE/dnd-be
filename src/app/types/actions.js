export var ActionType;
(function (ActionType) {
    ActionType["GIVE_ITEM"] = "GIVE_ITEM";
    ActionType["TAKE_ITEM"] = "TAKE_ITEM";
    ActionType["START_QUEST"] = "START_QUEST";
    ActionType["PROGRESS_QUEST"] = "PROGRESS_QUEST";
    ActionType["COMPLETE_QUEST"] = "COMPLETE_QUEST";
    ActionType["UPDATE_REPUTATION"] = "UPDATE_REPUTATION";
    ActionType["ADD_KNOWLEDGE"] = "ADD_KNOWLEDGE";
    ActionType["UNLOCK_LOCATION"] = "UNLOCK_LOCATION";
    ActionType["MODIFY_STATE"] = "MODIFY_STATE";
})(ActionType || (ActionType = {}));
