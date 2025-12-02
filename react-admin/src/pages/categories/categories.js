import React from "react";
import { connect } from 'react-redux'
import DataTable from "../../components/datatable";
import LoadingIndicator from "../../components/loadingindicator"
import categoriesActions from "../../state/categories/categories.actions"
import categoriesService from "../../state/categories/categories.service"
import categoryService from "../../state/category/category.service";

class Categories extends React.Component  {
	
	state = {
		error: ""
	}

	componentDidMount() {
		this.setState({error:""});

		// Lazy load categories
		if (!this.props.categories) {
			
			categoriesService.getAllCategories()
			.then(this.props.fetchAllSuccess)
			.catch((error)=>{
				this.setState({error:error});
			});
		}
	}

	selectCategory(categoryId) {
		this.props.history.push("/category/" + categoryId);
	}

	deleteCategory(categoryId) {
		if (window.confirm("Är du säker?")) {
			categoryService.deleteCategory(categoryId)
			.then(()=>{
				this.props.removeSuccess(categoryId);
			})
			.catch((error)=>{
				alert(error);
			})
		}
	}

	addCategory() {
		this.props.history.push("/category/new");
	}

	render() {
		// If the categories havent loaded
		if ((!this.props.categories) && (!this.state.error))
			return <LoadingIndicator />

		const columns = [
			{"title":"Sortering","value":"sort_order","type":"number"},
			{"title":"Titel","value":"title","type":"text"},
			{"title":"Ikon","value":"icon","type":"text","style":"badge"}
		];

		return (
			<DataTable
				title="Kategorier"
				addTitle="Ny kategori"
				actionsColumn="Åtgärder"
				selectColumn="Redigera"
				deleteColumn="Radera"
				error={this.state.error}
				columns={columns}
				items={this.props.categories}
				onSelect={this.selectCategory.bind(this)}
				onDelete={this.deleteCategory.bind(this)}
				onAdd={this.addCategory.bind(this)}
				/>
		);
	}
};

const mapStateToProps = state => ({
	categories: state.categories.categories
});

const mapDispatchToProps = (dispatch) => {
  return {
	dispatch,
	
	fetchAllSuccess: (categories) => {
		dispatch(categoriesActions.fetchAllSuccess(categories));
	},

    removeSuccess: (categoryId) => {
      dispatch(categoriesActions.removeSuccess(categoryId));
    },
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Categories);
