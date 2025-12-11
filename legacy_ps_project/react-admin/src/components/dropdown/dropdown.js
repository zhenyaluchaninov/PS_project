import React from "react";

const Dropdown = ({placeHolder, items = [], onSelectItem}) => {

	const dropDownItems = !items ? "" : items.map(item => {
		return (
			<button className="dropdown-item" onClick={e => onSelectItem(item)} key={item.id}>
				{item.title}
			</button>
		);
	});
	return (
		<div className="dropdown">
			<button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
				{placeHolder}
			</button>
			<div className="dropdown-menu" style={{ maxHeight: "70vh", height: "auto", overflowX: "hidden" }} aria-labelledby="dropdownMenuButton">
				{dropDownItems}
			</div>
		</div>
	);
};

export default Dropdown;
