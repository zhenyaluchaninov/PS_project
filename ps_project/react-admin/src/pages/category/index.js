import React, { Component } from "react";
import { Redirect } from "react-router-dom";
import CategoryForm from "./categoryform";
import { connect } from 'react-redux'
import categoryActions from "../../state/category/category.actions"
import categoriesActions from "../../state/categories/categories.actions"
import categoryService from "../../state/category/category.service"

class Category extends Component {
  state = {
    itemId: null,
    isEdit: false,
    isNew: false
  }

  constructor(props) {
    super(props);

    // Get :id parameter
    const { id } = this.props.match.params;

    // Parse parameter and determine if usage is 'edit' or 'new'
    const parameterId = parseInt(id);
    const itemId = Number.isInteger(parameterId) ? parameterId : null;
    const isEdit = Number.isInteger(parameterId);
    const isNew = (id === "new");

    this.state = {
      itemId: itemId,
      isEdit: isEdit,
      isNew: isNew
    };
  }

  componentDidMount() {
    const { isEdit, itemId } = this.state;

    if (isEdit) {
      categoryService.getCategory(itemId)
      .then(this.props.fetchSuccess)
      .catch((error)=>{
        alert(error);
        this.props.history.push("/categories");
      })
    }
      
  }

  render() {
    const { isEdit, isNew } = this.state;
    const { currentCategory } = this.props;
    const category = {sort_order:0, title:"", icon:""};

    if (isEdit || isNew) {
      return <CategoryForm 
              isEdit={isEdit}
              category={isEdit ? currentCategory : category} 
              onSave={isEdit ? this.updateCategory.bind(this) : this.createCategory.bind(this)} 
              onCancel={this.cancelUpdate.bind(this)}
              onRemove={this.removeCategory.bind(this)}
              />;
    }

    return <Redirect to="/categories" />;
  }

  removeCategory(categoryId) {
		if (window.confirm("Är du säker?")) {
      //this.props.remove(categoryId);
      categoryService.deleteCategory(categoryId)
      .then(()=>{
        this.props.deleteSuccess(categoryId);
      })
      .catch((error)=>{
        alert(error);
      })
      .finally(()=>{
        this.props.history.push("/categories");
      });
      
		}
	}

	updateCategory(category){
    categoryService.updateCategory(category)
    .then((data)=>{
      this.props.updateSuccess(data);
      this.props.history.push("/categories");
    })
    .catch((error)=>{
      alert(error);
    });
	}

  createCategory(category){
    categoryService.createCategory(category)
    .then((data)=>{
      this.props.createSuccess(data);
      this.props.history.push("/categories");
    })
    .catch((error)=>{
      alert(error);
    });
	}

  cancelUpdate(){
    this.props.history.push("/categories");
  }
};

const mapStateToProps = state => ({
  currentCategory: state.category.category,
  error: state.category.error
});

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,

    fetchSuccess: (category) => {
      dispatch(categoryActions.fetchSuccess(category));
    },

    updateSuccess: (category) => {
      dispatch(categoriesActions.updateSuccess(category));
    },

    createSuccess: (category) => {
      dispatch(categoriesActions.createSuccess(category));
    },

    deleteSuccess: (categoryId) => {
      dispatch(categoriesActions.removeSuccess(categoryId));
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Category);