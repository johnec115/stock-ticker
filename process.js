var http = require('http');
var url = require('url');
var querystring = require('querystring');  // Add querystring module
const { MongoClient } = require('mongodb'); // Import MongoClient

const connStr = 'mongodb+srv://johncarey:Bruinspal115@stock.j248z.mongodb.net/?retryWrites=true&w=majority&appName=Stock'; // MongoDB connection string

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  var urlObj = url.parse(req.url, true);
  var path = urlObj.pathname;

  if (path == "/") {
    const form = `
      <h1>Stock Search</h1>
      <form action='/process' method='GET'>
        <label for='query'>Enter Stock Ticker or Company Name:</label>
        <input type='text' name='query' id='query' required>
        <div>
          <label><input type='radio' name='searchBy' value='ticker' checked required> Ticker</label>
          <label><input type='radio' name='searchBy' value='name'> Company Name</label>
        </div>
        <button type='submit'>Search</button>
      </form>
    `;
    res.write(form);
  } else if (path == "/process" && req.method === 'GET') {
    // Parse the query string from the URL
    const queryData = new URLSearchParams(urlObj.search);
    // const queryData = params.get('query')
    const searchQuery = queryData.get('query');
    const searchBy = queryData.get('searchBy');

    // Check if both query and searchBy are provided
    if (!searchQuery || !searchBy) {
      res.write("<p>Error: Please enter a search query and select a search option (Ticker or Company Name).</p>");
      res.end();
      return;
    }

    // Build MongoDB query based on user input
    let mongoQuery;
    if (searchBy === 'ticker') {
      mongoQuery = { ticker: searchQuery }; // Search by ticker
    } else if (searchBy === 'name') {
      mongoQuery = { name: new RegExp(searchQuery, 'i') }; // Case-insensitive search by company name
    } else {
      res.write("<p>Error: Invalid search option selected.</p>");
      res.end();
      return;
    }

    // Query MongoDB for matching results
    const client = new MongoClient(connStr);

    async function findCompanies() {
      try {
        await client.connect();
        const dbo = client.db("Stock");
        const coll = dbo.collection('PublicCompanies');
        
        // Find matching companies
        const companies = await coll.find(mongoQuery).toArray();

        if (companies.length === 0) {
          res.write("<p>No companies found matching your search.</p>");
        } else {
          res.write("<h1>Search Results</h1>");
          res.write("<ul>");
          companies.forEach(company => {
            // Escape company details before inserting into HTML
            const name = company.name
            const ticker = company.ticker
            const price = company.price; // Ensure you properly handle price formatting if needed

            res.write(`
              <li><strong>${name}</strong> (${ticker}) - $${price}</li>
            `);
            console.log(name + ", " + ticker + ", " + price);
          });
          res.write("</ul>");
        }

        // Display a link back to the home page
        res.write("<a href='/'>Back to Home</a>");
      } catch (err) {
        console.log("Error: " + err);
        res.write("<p>Error processing your request. Please try again later.</p>");
      } finally {
        await client.close();
        res.end();
      }
    }

    findCompanies(); // Call the async function to search the database
  } else {
    res.statusCode = 404;
    res.write('<p>404 Not Found</p>');
    res.end();
  }

}).listen(2000, () => {
  console.log("Server running at http://localhost:2000/");
});