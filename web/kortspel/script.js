const text = document.getElementById("quote");
const next = document.getElementById("next");

next.onclick = () => getNewQuote(); 

import allQuotes from "./quotes.json" with { type: "json" };

function getNewQuote() {
  // Generates a random number between 0 and the length of the quotes array
  const indx = Math.floor(Math.random() * allQuotes.length);

  //Store the quote present at the randomly generated index
  const quote = allQuotes[indx];

  //function to dynamically display the quote and the author
  text.innerHTML = quote;
};

getNewQuote();
