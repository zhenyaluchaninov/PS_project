import React from "react";
import "./datatable.css";

const DataTable = ({
  title,
  error,
  addTitle,
  actionsColumn,
  statisticColumn,
  selectColumn,
  editColumn,
  deleteColumn,
  columns,
  items,
  onStatistic,
  onDelete,
  onSelect,
  onAdd,
  onEdit,
}) => {
  function onClickDelete(e, itemId) {
    e.preventDefault();
    const categoryId = parseInt(itemId);
    if (onDelete) onDelete(categoryId);
  }

  function onClickAdd(e) {
    e.preventDefault();
    if (onAdd) onAdd();
  }

  function onClickSelect(e, itemId) {
    e.preventDefault();
    if (onSelect) onSelect(itemId);
  }

  function onClickEdit(e, itemId) {
    e.preventDefault();
    if (onEdit) onEdit(itemId);
  }

  function onClickStatistic(e, itemId) {
    e.preventDefault();
    if (onStatistic) onStatistic(itemId);
  }

  const formatColumn = (index, style, value) => {
    switch (style) {
      case "badge":
        return (
          <td key={index}>
            <span className="badge badge-secondary">{value}</span>
          </td>
        );
      default:
        return <td key={index}>{value}</td>;
    }
  };

  const tableColumns = columns.map((item, index) => {
    return (
      <th scope="col" key={index}>
        {item.title}
      </th>
    );
  });
  const tableHeader = (
    <thead>
      <tr>
        {tableColumns}
        {actionsColumn && (
          <th scope="col" className="text-right">
            {actionsColumn}
          </th>
        )}
      </tr>
    </thead>
  );

  const tableRows = !items
    ? ""
    : items.map((item, rowIndex) => {
        const itemId = item.id;

        const tableRowColumns = columns.map((col, colIndex) => {
          const columnTitle = col.title;
          const columnValue = item[col.value];
          const columnType = col.type;
          const columnPrefix = col.prefix;
          const columnStyle = col.style;

          if (columnType === "link") {
            return (
              <td key={colIndex}>
                <a href={columnPrefix + columnValue} rel="noopener noreferrer" target="_blank">
                  {columnTitle}
                </a>
              </td>
            );
          }

          if (columnType === "time") {
            const opts = { timeZone: "UTC" };
            const parsedDate = new Date(Date.parse(columnValue));
            const dateValue = parsedDate.toLocaleString("sv-SE", opts);
            return <td key={colIndex}>{dateValue}</td>;
          }
          if (columnTitle === "Roll") {
            return <td key={colIndex}>{columnValue === 1 ? "Admin" : "Medskapare"}</td>;
          }

          return formatColumn(colIndex, columnStyle, columnValue);
        });

        return (
          <tr key={rowIndex}>
            {tableRowColumns}
            <td className="text-right">
              {statisticColumn && (
                <button type="button" className="btn btn-sm btn-secondary mr-2" onClick={(e) => onClickStatistic(e, itemId)}>
                  <i className="fas fa-chart-bar mr-1"></i>
                  {statisticColumn}
                </button>
              )}
              {selectColumn && (
                <button type="button" className="btn btn-sm btn-secondary mr-2" onClick={(e) => onClickSelect(e, itemId)}>
                  <i className="fas fa-edit mr-1"></i>
                  {selectColumn}
                </button>
              )}
              {editColumn && (
                <button type="button" className="btn btn-sm btn-secondary mr-2" onClick={(e) => onClickEdit(e, itemId)}>
                  <i className="fas fa-edit mr-1"></i>
                  {editColumn}
                </button>
              )}
              {deleteColumn && (
                <button type="button" className="btn btn-sm btn-danger" onClick={(e) => onClickDelete(e, itemId)}>
                  <i className="fas fa-trash-alt mr-1"></i>
                  {deleteColumn}
                </button>
              )}
            </td>
          </tr>
        );
      });

  const tableContent = <tbody>{tableRows}</tbody>;
  let addAction;
  if (addTitle) {
    addAction = (
      <button className="btn btn-sm btn-primary mb-2" onClick={onClickAdd}>
        <i className="fas fa-plus-circle mr-1"></i>
        {addTitle}
      </button>
    );
  }

  return (
    <>
      <h1>{title}</h1>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="row">
        <div className="col text-right">{addAction}</div>
      </div>
      {items.length > 0 && (
        <table className="table table-hover table-striped">
          {tableHeader}
          {tableContent}
        </table>
      )}
    </>
  );
};

export default DataTable;
