import React, { useState, useEffect, useCallback } from "react";
import adventureService from "../../state/adventure/adventure.service";

const StatisticModal = ({ show, handleClose, adventureId }) => {
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const formatDate = useCallback((date) => {
    return date.toLocaleString("sv-SE", {timeZone: "Europe/Stockholm"});
  }, []);

  useEffect(() => {
    const now = new Date();
    let fourYearsAgo = new Date();
    let tomorrow = new Date();
    fourYearsAgo.setFullYear(now.getFullYear() - 4);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0);

    fourYearsAgo = formatDate(fourYearsAgo);
    tomorrow = formatDate(tomorrow);

    setStartDate(fourYearsAgo);
    setEndDate(tomorrow);

    if (show && adventureId) {
      fetchStatistics(adventureId, fourYearsAgo, tomorrow);
    }
  }, [show, adventureId, formatDate]);

  const fetchStatistics = (adventureId, startDate, endDate) => {
    adventureService
      .getStatisticsByDates(adventureId, startDate, endDate)
      .then((data) => {
        setData(data);
      })
      .catch((err) => {
        alert("Kunde inte hämta statistik för äventyr från server", err);
      });
  };

  const handleDateChange = () => {
    if (new Date(startDate) > new Date(endDate)) {
      alert("Sluttdatum kan inte vara tidigare än startdatum.");
    }

    fetchStatistics(adventureId, startDate, endDate);
  };

  const modalStyles = {
    display: show ? "block" : "none",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1050,
    width: "80%",
    maxHeight: "90vh",
  };

  const modalDialogStyles = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const modalBodyStyles = {
    overflowY: "auto",
    maxHeight: "60vh",
  };

  const modalHeaderStyles = {
    backgroundColor: "#2b948f",
    color: "white",
  };

  const dateInputContainerStyles = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
  };

  const dateInputStyles = {
    flex: "0 0 48%",
  };

  return (
    <div className="modal" tabIndex="-1" role="dialog" style={modalStyles}>
      <div className="modal-dialog" role="document" style={modalDialogStyles}>
        <div className="modal-content">
          <div className="modal-header" style={modalHeaderStyles}>
            <h5 className="modal-title">Statistikdata</h5>
            <button type="button" className="close" aria-label="Close" onClick={handleClose} style={{ color: "white" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body" style={modalBodyStyles}>
            <div style={dateInputContainerStyles}>
              <div style={dateInputStyles}>
                <label htmlFor="startDate">Starttid:</label>
                <input
                  type="datetime-local"
                  id="startDate"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => {
                    let startDateObj = new Date(e.target.value);
                    let startDateString = formatDate(startDateObj);
                    setStartDate(startDateString);
                  }}
                  onBlur={handleDateChange}
                />
              </div>
              <div style={dateInputStyles}>
                <label htmlFor="endDate">Sluttid:</label>
                <input
                  type="datetime-local"
                  id="endDate"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => {
                    let endDateObj = new Date(e.target.value);
                    let endDateString = formatDate(endDateObj);
                    setEndDate(endDateString);
                  }}
                  onBlur={handleDateChange}
                />
              </div>
            </div>
            {data.length > 0 ? (
              <table className="table table-striped table-bordered table-hover">
                <thead>
                  <tr>
                    <th>Nod-id</th>
                    <th>Titel</th>
                    <th>Besöksräknare</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.node_id}</td>
                      <td>{item.title}</td>
                      <td>{item.visit_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              "Det finns ingen statistikdata för detta PS."
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticModal;
