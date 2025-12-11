import React, { useState } from "react";
import Dropdown from "../../components/dropdown/dropdown";

const Filter = ({
  categories,
  lists,
  selectedCategoryId,
  selectedListId,
  reportCodes,
  onSelectCategory,
  onSelectList,
  onSearch,
  onShowReported,
  onImportAdventure,
  importRef,
}) => {
  const [searchString, setSearchString] = useState("");

  function didClickSearch(e) {
    e.preventDefault();
    if (onSearch) onSearch(searchString);
  }

  function onSelectItem(item) {
    if (onSelectCategory) onSelectCategory(item.id);
  }

  function onSelectReportItem(item) {
    console.log(item);
    if (onShowReported) onShowReported(item.code);
  }

  const category = categories && categories.find((x) => x.id === selectedCategoryId);
  const categoryTitle = category && category.title;
  const list = lists && lists.find((x) => x.id === selectedListId);
  const listTitle = list && list.title;

  return (
    <div className="card mb-4">
      <div className="card-header">
        <div className="nav nav-tabs card-header-tabs" id="nav-tab" role="tablist">
          <a
            className="nav-item nav-link active"
            id="nav-category-tab"
            data-toggle="tab"
            href="#nav-category"
            role="tab"
            aria-controls="nav-category"
            aria-selected="true"
          >
            Kategori
          </a>
          <a className="nav-item nav-link" id="nav-list-tab" data-toggle="tab" href="#nav-list" role="tab" aria-controls="nav-list" aria-selected="true">
            Spellistor
          </a>
          <a className="nav-item nav-link" id="nav-search-tab" data-toggle="tab" href="#nav-search" role="tab" aria-controls="nav-search" aria-selected="false">
            Sök
          </a>
          <a className="nav-item nav-link" id="nav-report-tab" data-toggle="tab" href="#nav-report" role="tab" aria-controls="nav-report" aria-selected="false">
            Rapporterade
          </a>
          <a className="nav-item nav-link" id="nav-import-tab" data-toggle="tab" href="#nav-import" role="tab" aria-controls="nav-import" aria-selected="false">
            Importera
          </a>
        </div>
      </div>

      <div className="card-body">
        <div className="tab-content" id="nav-tabContent">
          <div className="tab-pane fade show active" id="nav-category" role="tabpanel" aria-labelledby="nav-category-tab">
            <div style={{ display: "flex", alignItems: "center" }}>
              <Dropdown placeHolder="Välj kategori" items={categories} onSelectItem={onSelectItem} />
              <div style={{ paddingLeft: 16 }}>
                <b>{categoryTitle}</b>
              </div>
            </div>
          </div>

          <div className="tab-pane fade" id="nav-list" role="tabpanel" aria-labelledby="nav-list-tab">
            <div style={{ display: "flex", alignItems: "center" }}>
              <Dropdown placeHolder="Välj spellista" items={lists} onSelectItem={(e) => onSelectList(e.id)} />
              <div style={{ paddingLeft: 16 }}>
                <b>{listTitle}</b>
              </div>
            </div>
          </div>

          <div className="tab-pane fade" id="nav-search" role="tabpanel" aria-labelledby="nav-search-tab">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <div className="col">
                  <input className="form-control form-control-lg" type="text" placeholder="Söksträng ..." onChange={(e) => setSearchString(e.target.value)} />
                </div>
                <div className="col">
                  <button disabled={searchString.length < 3} className="btn btn-lg btn-primary" onClick={didClickSearch}>
                    Sök
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="tab-pane fade" id="nav-report" role="tabpanel" aria-labelledby="nav-report-tab">
            <Dropdown placeHolder="Välj kategori" items={reportCodes} onSelectItem={onSelectReportItem} />
          </div>

          <div className="tab-pane fade" id="nav-import" role="tabpanel" aria-labelledby="nav-import-tab">
            <label>
              Välj en fil: <input type="file" ref={importRef} id="importInput" name="importInput" onChange={onImportAdventure} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filter;
