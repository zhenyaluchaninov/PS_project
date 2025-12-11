import constants from "./lists.constants";
import listConstants from "../list/list.constants";

const initialState = {
	lists: {
		items: null
	}
};

function updateObject(oldObject, newValues) {
  return Object.assign({}, oldObject, newValues)
}

function listsReducer(listsState = initialState.lists, action) {
    switch (action.type) {
        case constants.LISTS_FETCH_SUCCESS:
            return updateObject(listsState, action.payload.lists);

        case listConstants.LIST_UPDATE_SUCCESS: {
			const payloadList = action.payload.list;
			const index = listsState.items.findIndex(list => list.id === payloadList.id);
			const endState = {
                    items: [
                        ...listsState.items.slice(0,index),
                        payloadList,
                        ...listsState.items.slice(index+1)    
                    ]
            };
			return endState;
        }

        case listConstants.LIST_DELETE_SUCCESS: {
            const payloadListID = action.payload.id
            const index = listsState.items.findIndex(list => list.id === payloadListID);
			const endState = {
                items: [
                    ...listsState.items.slice(0,index),
                    ...listsState.items.slice(index+1)    
                ]
        };
        return endState;
    }

        case listConstants.LIST_CREATE_SUCCESS: {
			const payloadList = action.payload.list;
			const endState = {
                    items: [
                        ...listsState.items,
                        payloadList
                    ]
            };
			return endState;
        }

        default:
            return listsState;
    }
}

const lists = (state = initialState, action) => {
    return {
        lists: listsReducer(state.lists, action)
    }
};

export default lists;
