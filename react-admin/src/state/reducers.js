import {combineReducers} from "redux";
import currentUser from "./user/user.reducer";
import adventures from "./adventures/adventures.reducer";
import adventure from "./adventure/adventure.reducer";
import categories from "./categories/categories.reducer";
import category from "./category/category.reducer";
import lists from "./lists/lists.reducer";
import list from "./list/list.reducer";

const reducers = combineReducers({
	currentUser,
	adventures,
	adventure,
	categories,
	category,
	lists,
	list
});

export default reducers;
