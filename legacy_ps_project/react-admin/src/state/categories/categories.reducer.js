import constants from "./categories.constants";

const initialState = {
	categories: null,
	error: ""
};

const categories = (state = initialState, action) => {
	switch (action.type) {

		case constants.CATEGORY_FETCH_ALL_SUCCESS: {
			return {
				categories: action.payload
			}
		}

		case constants.CATEGORY_FETCH_ALL_FAILED: {
			return {
				categories: state.categories,
				error: action.payload
			};
		}

		case constants.CATEGORY_UPDATE_SUCCESS: {
			const payload = action.payload;
			const index = state.categories.findIndex(category => category.id === payload.id);
			const endState = {
				categories: [
					...state.categories.slice(0,index),
					payload,
					...state.categories.slice(index+1)
				]
			};
			return endState;
		}

		case constants.CATEGORY_DELETE_SUCCESS: {
			const categoryId = action.payload;
			const index = state.categories.findIndex(category => category.id === categoryId);
			const endState = {
				categories:[
					...state.categories.slice(0,index),
					...state.categories.slice(index+1)
				]
			};
			return endState;
		}

		case constants.CATEGORY_DELETE_FAILED: {
			return {
				categories: [
					...state.categories
				],
				error: action.payload
			}
		}

		case constants.CATEGORY_CREATE_SUCCESS: {
			console.log("Reducing new category", action);
			const category = action.payload;
			const endState = {
				categories: [
					...state.categories,
					category
				]
			};
			return endState;
		}

		default: {
			return state;
		}

	}
};

export default categories;
