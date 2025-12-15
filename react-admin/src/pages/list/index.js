import React, { Component } from "react";
import { Redirect } from "react-router-dom";
import ListForm from "./listform";
import { connect } from 'react-redux'
import listActions from "../../state/list/list.actions"
//import listsActions from "../../state/lists/lists.actions"
import listService from "../../state/list/list.service"
import listsService from "../../state/lists/lists.service";
import listsActions from "../../state/lists/lists.actions";

class List extends Component {

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
    console.log("[list] did mount");
    const { isEdit, isNew, itemId } = this.state;
    if (isEdit) {
      // Fetch all lists and the selected
      Promise.all([listsService.getAllLists(), listService.getList(itemId)])
      .then(([lists, list])=>{
        this.props.fetchAllSuccess(lists);
        this.props.fetchSuccess(list);
      })
      .catch((error)=>{
        alert(error);
        this.props.history.push("/lists");
      });
    } 

    if (isNew) {
      listsService.getAllLists()
      .then(this.props.fetchAllSuccess)
      .catch(error=>{
        alert(error);
        this.props.history.push("/lists");
      });
    }
  }

  render() {
    const { isEdit, isNew } = this.state;
    const { currentList, allLists } = this.props;
    const newList = {parent_id:0, title:"", description:""};

    if (isEdit || isNew) {
      return (
        <ListForm
          isEdit={isEdit}
          lists={allLists}
          list={isEdit ? currentList : newList}
          onSave={isEdit ? this.updateList.bind(this) : this.createList.bind(this)}
          onCancel={this.cancelUpdate.bind(this)}
          onRemove={this.removeList.bind(this)}
        />
      );
    }

    return <Redirect to="/lists" />;
  }

  removeList(listID) {
    if (window.confirm("Är du säker?")) {
      listService.deleteList(listID)
      .then(()=>{
        this.props.deleteSuccess(listID);
        this.props.history.push("/lists");
      })
      .catch((error)=> {
        alert(error);
      });
     }
	}

  updateList(list){
    listService.updateList(list)
    .then((list)=>{
      this.props.updateSuccess(list);
      this.props.history.push("/lists");
    })
    .catch((error) => {
      alert(error);
    });
	}

  createList(list){
    console.log("[lists] New list", list);
    listService.createList(list)
    .then((list)=>{
      this.props.createSuccess(list);
    })
    .catch((error)=>{
      alert(error);
    })
    .finally(()=>{
      this.props.history.push("/lists");
    });
	}

  cancelUpdate(){
    this.props.history.push("/lists");
  }
};

const mapStateToProps = state => ({
  currentList: state.list.list,
  allLists: state.lists.lists.items
});

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,

    fetchSuccess: (list) => {
      dispatch(listActions.fetchSuccess(list));
    },

    updateSuccess: (list) => {
      dispatch(listActions.updateSuccess(list));
    },

    createSuccess: (list) => {
      dispatch(listActions.createSuccess(list));
    },

    deleteSuccess: (listID) => {
      dispatch(listActions.deleteSuccess(listID));
    },

    fetchAllSuccess: (lists) => {
      dispatch(listsActions.fetchSuccess(lists));
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(List);