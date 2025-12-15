import React from "react";
import { connect } from "react-redux";

import adventureActions from "../../state/adventure/adventure.actions";
import adventureService from "../../state/adventure/adventure.service";
import categoriesActions from "../../state/categories/categories.actions";
import categoriesService from "../../state/categories/categories.service";

import Form from "./form";
import LoadingIndicator from "../../components/loadingindicator";

class Adventure extends React.Component {
  componentDidMount() {
    const parameterId = this.props.match.params.id;
    const adventureId = parseInt(parameterId);
    if (Number.isInteger(adventureId)) {
      adventureService.getAdventureByID(adventureId).then(this.props.fetchSuccess).catch(this.props.fetchFailed);
    } else {
      this.props.history.push("/adventures");
    }

    if (!this.props.categories) {
      categoriesService.getAllCategories().then(this.props.fetchAllCategoriesSuccess).catch(this.props.fetchAllCategoriesFailed);
    }
  }

  didClickDelete() {
    console.log("[adventure] clicked delete button", this.props.adventure.current.id);
    if (window.confirm("Är du säker?")) {
      adventureService
        .deleteAdventure(this.props.adventure.current.id)
        .then(() => {
          this.props.history.push("/adventures");
        })
        .catch((error) => {
          alert(error);
        });
    }
  }

  didClickCancel() {
    console.log("[adventure] clicked cancel button");
    this.props.history.push("/adventures");
  }

  didClickUpdate(adventure) {
    console.log("[adventure] clicked update button", adventure);
    adventureService
      .updateAdventure(adventure)
      .then(() => {
        this.props.history.push("/adventures");
      })
      .catch((error) => {
        alert(error);
      });
  }

  didClickCopy(adventure) {
    console.log("[adventure] clicked copy button", adventure);
    adventureService
      .copyAdventureBySlug(adventure)
      .then(() => {
        this.props.history.push("/adventures");
      })
      .catch((error) => {
        alert(error);
      });
  }

  didClickExport(adventure) {
    const that = this;
    adventureService
      .exportAdventure(adventure.slug)
      .then((blob) => {
        const fileName = "ProjektPS_" + adventure.slug + ".zip";
        console.log(blob.size, blob.type);
        that.exportData(fileName, blob);
      })
      .catch((error) => {
        alert(error);
      });
  }

  exportData(fileName, blob) {
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  render() {
    if (!this.props.categories || this.props.adventure.loading) return <LoadingIndicator />;

    if (this.props.adventure.error) {
      return (
        <div className="alert alert-danger" role="alert">
          {this.props.adventure.error}
        </div>
      );
    }

    return (
      <Form
        adventure={this.props.adventure.current}
        categories={this.props.categories}
        onUpdate={this.didClickUpdate.bind(this)}
        onDelete={this.didClickDelete.bind(this)}
        onCancel={this.didClickCancel.bind(this)}
        onCopy={this.didClickCopy.bind(this)}
        onExport={this.didClickExport.bind(this)}
      />
    );
  }
}

const mapStateToProps = (state) => ({
  categories: state.categories.categories,
  adventure: state.adventure,
});

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,

    fetchAllCategoriesSuccess: (data) => {
      dispatch(categoriesActions.fetchAllSuccess(data));
    },

    fetchAllCategoriesFailed: (error) => {
      dispatch(categoriesActions.fetchAllFail(error));
    },

    fetchSuccess: (data) => {
      dispatch(adventureActions.fetchSuccess(data));
    },

    fetchFailed: (error) => {
      dispatch(adventureActions.fetchFailed(error));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Adventure);
