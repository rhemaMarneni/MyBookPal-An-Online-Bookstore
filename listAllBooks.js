// function redirectToAnotherPage(bookId) {
//     console.log(bookId)
//     redirectURL = `bookDisplay.html?id=${bookId}`
//     window.location.href = redirectURL;
//   }
  
// function generateBookHTML(book) {
// return `
// <div class="book"  id="book${book.BookID}" data-category="${book.Genre}" onclick= "redirectToAnotherPage(${book.BookID})">
//   <img src="./assets/${book.Photos}" alt="${book.Title}" />
//   <h3>${book.Title}</h3>
//   <p>Author: ${book.Author}</p>
//   <p>Desciption: ${book.Book_description}</p>
//   <p>Category: ${book.Genre}</p>
//   <p>Price: ${book.Price}</p>
// </div>
// `;
// }
// const booksPerPage = 10; // Set the number of books per page
// let currentPage = 1;
// function displayBooks(data) {
//   const bookListContainer = document.getElementById('book-list');
//   bookListContainer.innerHTML = '';

//   const startIndex = (currentPage - 1) * booksPerPage;
//   const endIndex = startIndex + booksPerPage;

//   data.slice(startIndex, endIndex).forEach(book => {
//     const bookHTML = generateBookHTML(book);
//     bookListContainer.innerHTML += bookHTML;
//   });
// }

// function updatePagination(totalBooks) {
//   const totalPages = Math.ceil(totalBooks / booksPerPage);
//   const paginationContainer = document.getElementById('pagination');
//   paginationContainer.innerHTML = '';

//   for (let i = 1; i <= totalPages; i++) {
//     const pageLink = document.createElement('a');
//     pageLink.href = '#';
//     pageLink.textContent = i;

//     pageLink.addEventListener('click', () => {
//       currentPage = i;
//       fetchDataFromBackend();
//     });

//     paginationContainer.appendChild(pageLink);
//   }
// }


// function fetchDataFromBackend() {
// const backendURL = 'http://localhost:3000';
// const bookListContainer = document.getElementById('book-list');
// bookListContainer.innerHTML = '';

// const keyword = document.getElementById('searchInput').value.trim();
// const filterCheckboxes = document.querySelectorAll('.filter-btn input:checked');
// const priceCheckboxes = document.querySelectorAll('.price-btn input:checked');

// const selectedFilters = Array.from(filterCheckboxes).map(checkbox => checkbox.name);
// const selectedPrice = Array.from(priceCheckboxes).map(checkbox => checkbox.name)[0]; // Only allow one price checkbox to be checked
// const sortBy = document.getElementById('orderBy').value;


// let endpoint = '/books';
// let filteredData; // Declare filteredData outside the fetch block

// if (keyword !== '') {
// endpoint = `/books/search?keyword=${encodeURIComponent(keyword)}`;

// fetch(`${backendURL}${endpoint}`, {
//   method: 'GET',
// })
//   .then(response => response.json())
//   .then(data => {
//     if (Array.isArray(data)) {
//       // console.log("Condition",selectedFilters.length > 0 || selectedPrice || sortBy);
//       // console.log("sortBy",sortBy);
//       if (sortBy === 'low-High') {
//         data.sort((a, b) => a.Price - b.Price);
//       } else if (sortBy === 'High-low') {
//         data.sort((a, b) => b.Price - a.Price);
//       }

//       if (selectedFilters.length > 0 || selectedPrice) {
//         // Filter data based on selected filters and price constraints
        
//         filteredData = data.filter(book => {
//           const authorFilter = selectedFilters.includes(book.Author.toLowerCase());
//           const genreFilter = selectedFilters.includes(book.Genre.toLowerCase());
//           // console.log(selectedFilters,book.Genre.toLowerCase())
//           const bookConditionFilter = selectedFilters.includes(book.Book_condition.toLowerCase());
//           const priceFilter =
//             !selectedPrice ||
//             (selectedPrice === ">10" && book.Price > 10) ||
//             (selectedPrice === "<10" && book.Price < 10) ||
//             (selectedPrice === ">50" && book.Price > 50) ||
//             (selectedPrice === "<50" && book.Price < 50);
//             // console.log(selectedPrice,book.Price)

//             // console.log('A',authorFilter);
//             // console.log('BC ',bookConditionFilter);
//             // console.log('G',genreFilter);
//             // console.log('P',priceFilter);
            
          
//             if(selectedFilters.length > 0 && selectedPrice){
//               // console.log('Both');
//               return (authorFilter || bookConditionFilter || genreFilter) && priceFilter;
//             }
//             else if(selectedFilters.length>0){
//               // console.log('Filters');
//               return (authorFilter || bookConditionFilter || genreFilter);
//             }
//             else if(selectedPrice){
//               // console.log('Price');
//               return priceFilter;
//             }
          
//         });
//         // console.log('Filtering',filteredData)
//         // console.log('Sort By',sortBy)
      
//       filteredData.forEach(book => {
//         const bookHTML = generateBookHTML(book);
//         bookListContainer.innerHTML += bookHTML;
//         console.log(book);
//       });
//       displayBooks(filteredData);
//       updatePagination(filteredData.length);
//     }else{
//       data.forEach(book => {
//         const bookHTML = generateBookHTML(book);
//         bookListContainer.innerHTML += bookHTML;
//       });
//       displayBooks(data);
//       updatePagination(data.length);
//     }

//     }
//   })
//   .catch(error => console.error('Error fetching data from backend:', error));
// } else {
// endpoint = '/books';

// if (selectedFilters.length > 0) {
//   const featuresParam = selectedFilters.join(',');
//   endpoint = `/books/filter?features=${featuresParam}`;
// }

// if (selectedPrice) {
//   if(selectedFilters.length > 0) {
//   endpoint += `&price=${(selectedPrice)}`;
//   }
//   else{
//     endpoint+= `/order?price=${selectedPrice}`;
//   }
// }
// else{
//   if(selectedFilters.length > 0) {
//   endpoint += `&price=>0`;
//   }
// }

// if(sortBy){
//   if(selectedFilters.length>0|| selectedPrice) {
//   endpoint += `,order=${sortBy}`;
//   }
//   else{
//     endpoint += `/sort?order=${sortBy}`;
//   }

// }
// console.log(`${backendURL}${endpoint}`);

// fetch(`${backendURL}${endpoint}`, {
//   method: 'GET',
// })
//   .then(response => response.json())
//   .then(data => {
//     if (Array.isArray(data)) {
//       data.forEach(book => {
//         const bookHTML = generateBookHTML(book);
//         bookListContainer.innerHTML += bookHTML;
//       });
//     }
//   })
//   .catch(error => console.error('Error fetching data from backend:', error));
// }

// }

// document.addEventListener('DOMContentLoaded', () => {
// fetchDataFromBackend();
// const searchButton = document.querySelector('button');
// searchButton.addEventListener('click', fetchDataFromBackend);

// const applyFilterButton = document.getElementById('apply-filter');
// applyFilterButton.addEventListener('click', fetchDataFromBackend);

// });

const booksPerPage = 10; // Set the number of books per page
let currentPage = 1;
let totalBooks = 0;

function generateBookHTML(book) {
  return `
    <div class="book" id="book${book.BookID}" data-category="${book.Genre}" onclick="redirectToAnotherPage(${book.BookID})">
      <img src="./assets/${book.Photos}" alt="${book.Title}" />
      <h3>${book.Title}</h3>
      <p>Author: ${book.Author}</p>
      <p>Desciption: ${book.Book_description}</p>
      <p>Category: ${book.Genre}</p>
      <p>Price: ${book.Price}</p>
    </div>
  `;
}

function displayBooks(data) {
  const bookListContainer = document.getElementById('book-list');
  bookListContainer.innerHTML = '';

  const startIndex = (currentPage - 1) * booksPerPage;
  const endIndex = startIndex + booksPerPage;

  data.slice(startIndex, endIndex).forEach(book => {
    const bookHTML = generateBookHTML(book);
    bookListContainer.innerHTML += bookHTML;
  });
}

function updatePagination() {
  const totalPages = Math.ceil(totalBooks / booksPerPage);
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const pageLink = document.createElement('a');
    pageLink.href = '#';
    pageLink.textContent = i;

    pageLink.addEventListener('click', () => {
      currentPage = i;
      fetchDataFromBackend();
    });

    paginationContainer.appendChild(pageLink);
  }
}
function nextPage() {
  currentPage++;
  fetchDataFromBackend();
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchDataFromBackend();
  }
}

function fetchDataFromBackend() {
  const backendURL = 'http://localhost:3000';
  const bookListContainer = document.getElementById('book-list');
  bookListContainer.innerHTML = '';

  const keyword = document.getElementById('searchInput').value.trim();
  const filterCheckboxes = document.querySelectorAll('.filter-btn input:checked');
  const priceCheckboxes = document.querySelectorAll('.price-btn input:checked');

  const selectedFilters = Array.from(filterCheckboxes).map(checkbox => checkbox.name);
  const selectedPrice = Array.from(priceCheckboxes).map(checkbox => checkbox.name)[0];
  const sortBy = document.getElementById('orderBy').value;

  let endpoint = '/books';

  if (keyword !== '') {
    endpoint = `/books/search?keyword=${encodeURIComponent(keyword)}`;
  }

  fetch(`${backendURL}${endpoint}`, {
    method: 'GET',
  })
    .then(response => response.json())
    .then(data => {
      totalBooks = data.length;

      if (Array.isArray(data)) {
        if (sortBy === 'low-High') {
          data.sort((a, b) => a.Price - b.Price);
        } else if (sortBy === 'High-low') {
          data.sort((a, b) => b.Price - a.Price);
        }

        if (selectedFilters.length > 0 || selectedPrice) {
          const filteredData = data.filter(book => {
            const authorFilter = selectedFilters.includes(book.Author.toLowerCase());
            const genreFilter = selectedFilters.includes(book.Genre.toLowerCase());
            const bookConditionFilter = selectedFilters.includes(book.Book_condition.toLowerCase());
            const priceFilter =
              !selectedPrice ||
              (selectedPrice === ">10" && book.Price > 10) ||
              (selectedPrice === "<10" && book.Price < 10) ||
              (selectedPrice === ">50" && book.Price > 50) ||
              (selectedPrice === "<50" && book.Price < 50);

            return (authorFilter || bookConditionFilter || genreFilter) && priceFilter;
          });

          displayBooks(filteredData);
          updatePagination();
        } else {
          displayBooks(data);
          updatePagination();
        }
      }
    })
    .catch(error => console.error('Error fetching data from backend:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  fetchDataFromBackend();
  const searchButton = document.querySelector('button');
  searchButton.addEventListener('click', fetchDataFromBackend);

  const applyFilterButton = document.getElementById('apply-filter');
  applyFilterButton.addEventListener('click', fetchDataFromBackend);

  const previousPageButton = document.getElementById('previousPageButton');
  previousPageButton.addEventListener('click', previousPage);

  const nextPageButton = document.getElementById('nextPageButton');
  nextPageButton.addEventListener('click', nextPage);
});
