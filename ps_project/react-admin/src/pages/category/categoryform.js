import React, {useState, useEffect} from "react";
import LoadingIndicator from "../../components/loadingindicator"
import "./category.css";

const CategoryForm = ({isEdit,category,error,onSave,onCancel,onRemove}) => {

	const [sortOrder, setSortOrder] = useState(0);
	const [title, setTitle] = useState("");
	const [icon, setIcon] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	function saveCategory(e) {
		e.preventDefault();
	
		if (title.length === 0 || icon.length === 0) {
			setErrorMessage("Du måste ange titel och ikon");
			return;
		}
	
		var payload = {
		  title:title,
		  icon:icon,
		  sort_order:parseInt(sortOrder)
		};
	
		if (isEdit)
		  payload.id = category.id;

		onSave(payload);
	}

	function remove(e) {
		e.preventDefault();
		if (category)
			onRemove(category.id);
	}

	function cancel(e) {
		e.preventDefault();
		onCancel();
	}

	useEffect(()=>{
		if (category) {
			setSortOrder(category.sort_order);
			setTitle(category.title);
			setIcon(category.icon);
		}	
		if (error) {
			setErrorMessage(error);
		}
	}, [category, error]);

	if ((!category) && (!error))
		return <LoadingIndicator />;  

	let options = [];
	for (var i = 0; i <= 50; i++) options.push(i);

	return (
		<div className="p-4 border">
			{isEdit && <h3 className="mb-2 p-0">Redigera kategori</h3>}
      		{!isEdit && <h3 className="mb-2 p-0">Ny kategori</h3>}
      		{errorMessage && <h4>{errorMessage}</h4>}
			<form>
				<div className="form-group">
					<label htmlFor="inputAddress">Titel</label>
					<input
						type="text"
						className="form-control"
						placeholder="Titel"
						value={title}
						onChange={e => setTitle(e.target.value)}
					/>
				</div>
				<div className="form-group">
					<label htmlFor="inputAddress2">Ikon</label>
					<input
						type="text"
						className="form-control"
						placeholder="Ikon"
						value={icon}
						onChange={e => setIcon(e.target.value)}
					/>
					<small id="titleHelp" className="form-text text-muted">Ikonens kortnamn, se <a href="https://fontawesome.com/icons?d=gallery&m=free" rel="noopener noreferrer" target="_blank">fontawesome</a> f&ouml;r referens.</small>
				</div>
				<div className="form-group">
					<label htmlFor="sortOrder">Sortering</label>
					<select className="form-control" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
						{ options.map(index => <option key={index} value={index}>{index}</option>)}
					</select>
				</div>
				<button type="submit" className="btn btn-primary mr-2" onClick={saveCategory}>
					Spara
				</button>
        		{(isEdit && onRemove) &&
        		<button type="submit" className="btn btn-danger mr-2" onClick={remove}>
					Radera
				</button>}
        		<button type="submit" className="btn btn-secondary" onClick={cancel}>
					Avbryt
				</button>
			</form>
		</div>
	);
}

export default CategoryForm;
