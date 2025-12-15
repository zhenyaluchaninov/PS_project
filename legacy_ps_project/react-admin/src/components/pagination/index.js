import React from "react";

const Pagination = ({previous,next, page, count, size, neighbors, onChangePage, onClickPrevious, onClickNext}) => {

  function didClickPageButton(e, pageId) {
    e.preventDefault();
    if (onChangePage)
      onChangePage(pageId);
  }

  function didClickPrevious(e) {
    e.preventDefault();
    if (onClickPrevious)
      onClickPrevious();
  }

  function didClickNext(e) {
    e.preventDefault();
    if (onClickNext)
      onClickNext();
  }

  // If number of items are less than the page size, dont render
  if (!count || !size || (count <= size)) return <div />;

  const numPages = Math.ceil(count/size);
  const numNeighbors = parseInt(neighbors);
  const maxPaginationSize = (numNeighbors * 2) + 1;

  const showPrevButton = page > 1;
  const showNextButton = page < numPages;

  const prevButton = <li className="page-item">
                      <button className="page-link" disabled={!showPrevButton} onClick={e => didClickPrevious(e)} tabIndex="-1">{previous}</button>
                      </li>;

  const nextButton = <li className="page-item">
                      <button className="page-link" disabled={!showNextButton} onClick={e => didClickNext(e)}>{next}</button>
                      </li>;

  // Returns the lower boundary
  const calculateLowerBoundary = (totalPages, paginationSize, activePage) => {

    const highLimit = totalPages - maxPaginationSize;

    // If totalPages is less than minimal pagination size
    if (totalPages <= maxPaginationSize) return 0; 

    // If activePage's offset is larger than its default offset and less than its final offset
    if ((activePage > paginationSize) && (activePage <= highLimit)) return (activePage - paginationSize - 1);
    
    // If activePage is in the last elements of the pagination
    if (activePage > highLimit) {
      // Calculate remainder
      let remainder = totalPages - activePage;
      // Remainder is not yet down to the final paginationBlock
      if (remainder >= paginationSize) {
        return activePage - (paginationSize + 1);
      } else {
        return totalPages - maxPaginationSize;
      }
    }
    return 0;
  };

  const pageButtons = (num, activePage) => {

    // Neighbor limits the number of buttons to render around the active page
    const lowerBoundary = calculateLowerBoundary(numPages,numNeighbors,activePage);
    const actualPaginationSize = maxPaginationSize > numPages ? numPages : maxPaginationSize;    
    const pages = Array.from({length: actualPaginationSize}, (v, i) => 1 + (i) + lowerBoundary);

    return pages.map((pageId)=>{
      const isActive = (pageId === activePage);
      if (isActive)
        return <li className="page-item active" key={pageId}>
                <button className="page-link" onClick={e => didClickPageButton(e, pageId)}>{pageId}<span className="sr-only">(current)</span></button>
                </li>;

      return <li className="page-item" key={pageId}>
              <button className="page-link" onClick={e => didClickPageButton(e, pageId)}>{pageId}</button>
              </li>;
    });
  }

  return (
    <nav aria-label="...">
      <ul className="pagination">
        {prevButton}
        {pageButtons(numPages, page)}
        {nextButton}
      </ul>
    </nav>
  );

};

export default Pagination;
