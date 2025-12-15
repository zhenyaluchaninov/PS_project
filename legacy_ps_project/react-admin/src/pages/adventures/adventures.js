import React from "react";
import { connect } from "react-redux";
import DataTable from "../../components/datatable";
import Pagination from "../../components/pagination";
import Filter from "./filter";

import categoriesActions from "../../state/categories/categories.actions";
import listsActions from "../../state/lists/lists.actions";
import adventuresActions from "../../state/adventures/adventures.actions";
import adventureAction from "../../state/adventure/adventure.actions";

import adventuresConstants from "../../state/adventures/adventures.constants";

import adventuresService from "../../state/adventures/adventures.service";
import adventureService from "../../state/adventure/adventure.service";
import categoryService from "../../state/categories/categories.service";
import listsService from "../../state/lists/lists.service";
import listService from "../../state/list/list.service";

import constants from "../../config";
import StatisticModal from "../../components/statisticModal/statisticModal";

import "./adventures.css";
import PresentationModePage from "./presentationModePage";

class Adventures extends React.Component {
  state = {
    filter: {
      type: "all", // Type: all / category / search / report
      category: 1, // Category filter
      list: 1,
      search: "", // Searchstring
      loading: false, // Filter in progress
      error: "", // Filtering error
    },
    pagination: {
      page: 1,
      count: 0,
      size: 100,
    },
    presentationMode: false,
    showStatisticModal: false,
    selectedAdventureId: null,
  };

  setPresentationMode = () => {
    this.setState((prevState) => ({
      presentationMode: !prevState.presentationMode,
    }));
  };

  componentDidMount() {
    if (!this.props.categories) {
      categoryService
        .getAllCategories()
        .then(this.props.fetchCategoriesSuccess)
        .catch((error) => {
          alert(error);
        });
    }
    if (!this.props.lists) {
      listsService
        .getAllLists()
        .then(this.props.fetchListsSuccess)
        .catch((error) => {
          alert(error);
        });
    }
  }

  getAdventures(newState) {
    adventuresService
      .getAdventures(newState.filter, newState.pagination)
      .then((data) => {
        this.props.fetchAdventuresSuccess(data.adventures, data.count);
        newState.pagination.count = data.count;
        this.setState(newState);
      })
      .catch((error) => {
        alert(error);
      });
  }

  didSelectCategory(categoryId) {
    const newState = { ...this.state };
    newState.filter.type = adventuresConstants.ADVENTURES_FILTER_CATEGORY;
    newState.filter.category = categoryId;
    newState.pagination.page = 1;
    this.getAdventures(newState);
  }

  didSelectList(listId) {
    const newState = { ...this.state };
    newState.filter.type = adventuresConstants.ADVENTURES_FILTER_LIST;
    newState.filter.list = listId;
    newState.pagination.page = 1;
    listService
      .getList(listId)
      .then((data) => {
        this.props.fetchAdventuresSuccess(data.adventures, data.adventures.length);
        newState.pagination.count = data.adventures.length;
        this.setState(newState);
      })
      .catch((error) => {
        alert(error);
      });
  }

  didSearch(searchString) {
    const newState = Object.assign({}, this.state);
    newState.filter.type = adventuresConstants.ADVENTURES_FILTER_SEARCH;
    newState.filter.search = searchString;
    newState.pagination.page = 1;
    this.getAdventures(newState);
  }

  didPressReported(reasonCode) {
    const newState = Object.assign({}, this.state);
    newState.filter.type = adventuresConstants.ADVENTURES_FILTER_REPORT;
    newState.filter.search = reasonCode;
    newState.pagination.page = 1;
    this.getAdventures(newState);
  }

  didSelectAdventure(adventureId) {
    this.props.history.push("/adventure/" + adventureId);
  }

  showStatistic(adventureId) {
    this.setState({
      showStatisticModal: true,
      selectedAdventureId: adventureId,
    });
  }

  closeStatisticModal = () => {
    this.setState({
      showStatisticModal: false,
      selectedAdventureId: null,
    });
  };

  deleteAdventure(adventureId) {
    if (!window.confirm("Är du säker?")) return;

    adventureService
      .deleteAdventure(adventureId)
      .then(() => {
        this.props.removeAdventureSuccess(adventureId);
        this.getAdventures({ ...this.state });
      })
      .catch((error) => {
        alert(error);
      });
  }

  importRef = React.createRef();

  didPressImportAdventure(e) {
    const file = this.importRef.current.files[0];
    adventureService
      .importAdventure(file)
      .then((adventure) => {
        this.didSearch(adventure.title);
      })
      .catch((error) => {
        alert(error);
      });
  }

  previousPage() {
    const newState = Object.assign({}, this.state);
    newState.pagination.page = newState.pagination.page - 1;
    this.getAdventures(newState);
  }

  nextPage() {
    const newState = Object.assign({}, this.state);
    newState.pagination.page = newState.pagination.page + 1;
    this.getAdventures(newState);
  }

  changePage(pageId) {
    const newState = Object.assign({}, this.state);
    newState.pagination.page = pageId;
    this.getAdventures(newState);
  }

  render() {
    const columns = [
      { title: "Titel", value: "title", type: "text" },
      { title: "Spela", value: "view_slug", type: "link", prefix: `${constants.BASEURL}/` },
      { title: "Editera", value: "slug", type: "link", prefix: `${constants.BASEURL}/redigera/` },
      { title: "Skapad", value: "created_at", type: "time" },
      { title: "Updaterad", value: "updated_at", type: "time" },
      { title: "Visningar", value: "view_count", type: "int" },
      { title: "Länk", value: "view_slug", type: "text" },
    ];

    const reportCodes = [
      { id: "1", title: "Våldsamt eller stötande innehåll", code: "violent" },
      { id: "2", title: "Hatiskt eller kränkande innehåll", code: "hateful" },
      { id: "3", title: "Hets mot folkgrupp", code: "racism" },
      { id: "4", title: "Upphovsrättsskyddat material", code: "copyright" },
      { id: "5", title: "Vileseledande eller spam", code: "spam" },
      { id: "6", title: "Annat", code: "other" },
    ];

    const { page, count, size, showStatisticModal, selectedAdventureId } = this.state;

    return (
      <div className="sticky-top p-3" style={{ margin: 0, padding: 0, backgroundColor: this.state.presentationMode ? "#343635" : "white" }}>
        <div className="row">
          <div className="col">{!this.state.presentationMode && <h1>PS</h1>}</div>
          <div className="col-auto">
            <button className="btn btn-primary" onClick={this.setPresentationMode}>
              {this.state.presentationMode ? <>Standardläge</> : <>Presentationsläge</>}
            </button>
          </div>
        </div>

        {!this.state.presentationMode ? (
          <>
            <Filter
              categories={this.props.categories}
              lists={this.props.lists}
              selectedCategoryId={this.state.filter.category}
              selectedListId={this.state.filter.list}
              reportCodes={reportCodes}
              onSelectCategory={this.didSelectCategory.bind(this)}
              onSelectList={this.didSelectList.bind(this)}
              onSearch={this.didSearch.bind(this)}
              onShowReported={this.didPressReported.bind(this)}
              onImportAdventure={this.didPressImportAdventure.bind(this)}
              importRef={this.importRef}
            />
            <DataTable
              actionsColumn="Åtgärder"
              statisticColumn="Statistik"
              selectColumn="Visa"
              deleteColumn="Radera"
              error={this.props.adventures.error}
              columns={columns}
              items={this.props.adventures.items}
              onStatistic={this.showStatistic.bind(this)}
              onSelect={this.didSelectAdventure.bind(this)}
              onDelete={this.deleteAdventure.bind(this)}
            />
            <Pagination
              previous="Föregående"
              next="Nästa"
              page={page}
              count={count}
              size={size}
              neighbors="5"
              onClickPrevious={this.previousPage.bind(this)}
              onClickNext={this.nextPage.bind(this)}
              onChangePage={this.changePage.bind(this)}
            />
          </>
        ) : (
          <>
            <PresentationModePage adventuresList={this.props.adventures.items} />
          </>
        )}
        <StatisticModal show={showStatisticModal} handleClose={this.closeStatisticModal} adventureId={selectedAdventureId} />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    categories: state.categories.categories,
    lists: state.lists.lists.items,
    adventures: state.adventures.adventures,
    adventure: state.adventure,
    filter: state.adventures.filter,
    pagination: state.adventures.pagination,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,

    fetchCategoriesSuccess: (categories) => {
      dispatch(categoriesActions.fetchAllSuccess(categories));
    },

    fetchListsSuccess: (lists) => {
      dispatch(listsActions.fetchSuccess(lists));
    },

    fetchAdventuresSuccess: (adventures, count) => {
      dispatch(adventuresActions.fetchSuccess(adventures, count));
    },

    removeAdventureSuccess: (adventureId) => {
      dispatch(adventureAction.removeSuccess(adventureId));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Adventures);
