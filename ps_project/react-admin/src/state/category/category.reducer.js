import constants from "./category.constants";

const initialState = {
	category: null,
	error: ""
};

const category = (state = initialState, action) => {
	switch (action.type) {
		case constants.CATEGORY_FETCH_SUCCESS: {
			return {
                error: "",
				category: action.payload
			};
        }
        case constants.CATEGORY_FETCH_FAILED: {
            return {
                ...state,
                error: action.payload
            }
        }
        case constants.CATEGORY_CLEAR: {
            return {
                error: "",
                category: null
            }
        }
        default:
            return {
                ...state
            };
	}
};

export default category;