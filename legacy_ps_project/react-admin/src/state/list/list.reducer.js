import constants from "./list.constants";

const initialState = {
	list: null
};

function updateObject(oldObject, newValues) {
  return Object.assign({}, oldObject, newValues)
}

const list = (state = initialState, action) => {
  switch (action.type) {
    case constants.LIST_FETCH_FAILED:
    case constants.LIST_FETCH_SUCCESS: {
      return updateObject(state, action.payload);
    }
    default:
      return initialState;
  }
    
};

export default list;
