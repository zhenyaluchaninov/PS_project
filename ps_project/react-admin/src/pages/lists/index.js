import React from "react";
import { connect } from 'react-redux'
import DataTable from "../../components/datatable";
import LoadingIndicator from "../../components/loadingindicator"

import listActions from "../../state/list/list.actions"
import listServices from "../../state/list/list.service"

import listsActions from "../../state/lists/lists.actions"
import listsServices from "../../state/lists/lists.service"

class Lists extends React.Component  {
	state = {
		error: ""
	}
	
	setError(error) {
		this.setState({error:error});
	}

	componentDidMount() {
		if (!this.props.lists) {
			listsServices.getAllLists()
			.then(this.props.fetchSuccess)
			.catch((error)=>{
				this.setState({error:error});
			});
		}
	}

	selectList(listID) {
		this.props.history.push("/list/" + listID);
	}

	deleteList(listID) {
		if (window.confirm("Är du säker?")) {
			listServices.deleteList(listID)
			.then(()=>{
				this.props.deleteSuccess(listID);
			})
			.catch((error)=>{
				alert(error);
			});
		}
	}

	addList() {
		this.props.history.push("/list/new");
	}

	render() {
		// If the lists havent loaded
		if ((!this.props.lists) && (!this.state.error))
			return <LoadingIndicator />

		const columns = [
			{"title":"Titel","value":"title","type":"text"},
			{"title":"Beskrivning","value":"description","type":"text"}
		];

		return (
      <DataTable
        title="Spellistor"
        addTitle="Ny spellista"
        actionsColumn="Åtgärder"
        selectColumn="Redigera"
        deleteColumn="Radera"
        error={this.state.error}
        columns={columns}
        items={this.props.lists}
        onSelect={this.selectList.bind(this)}
        onDelete={this.deleteList.bind(this)}
        onAdd={this.addList.bind(this)}
      />
    );
	}
};

const mapStateToProps = state => ({
	lists: state.lists.lists.items,
	error: state.lists.lists.error,
});

const mapDispatchToProps = (dispatch) => {
  return {
	dispatch,

	fetchSuccess: (data) => {
		dispatch(listsActions.fetchSuccess(data));
	},
	deleteSuccess: (listID) => {
		dispatch(listActions.deleteSuccess(listID));
	}
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Lists);
