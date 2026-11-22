# Assignment 9 — Reading List

Özcan Öztürk · 230408011 · CMP309 Web Programming

This app keeps a reading list on an Express server and shows it in React.
Books can be searched, filtered, sorted, added, edited, marked read, rated and deleted.
There is no login or database. Restarting the server restores the six seed books.

## Install and run

Use Node.js 26 LTS and npm. Tested with Node v26.13.1.
Open two terminals in the project folder.

Terminal 1 — API, default `http://localhost:3000`:

```sh
cd server
npm ci
npm start
```

Terminal 2 — React, `http://localhost:5173`:

```sh
cd client
npm ci
cp .env.example .env
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173`. The `.env` file is local and must not be committed.
After changing `VITE_API_URL`, restart Vite. The base URL is the API origin,
for example `http://localhost:3000`, without `/api` at the end.
If `VITE_API_URL` is unset, the API module uses `http://localhost:3000`.

`server` has `npm run dev` for Node's built-in watch mode. No nodemon is used.
The API reads `PORT` (default 3000) and `CLIENT_ORIGIN` (default
`http://localhost:5173`). Both the client origin and port must match the actual
browser address, including `localhost` versus `127.0.0.1`.

For example, different ports can be used like this in Bash:

```sh
# In server/
PORT=3099 CLIENT_ORIGIN=http://localhost:5179 npm start

# In client/, in the other terminal
VITE_API_URL=http://localhost:3099 npm run dev -- --port 5179 --strictPort
```

PowerShell uses `$env:PORT="3099"` and
`$env:CLIENT_ORIGIN="http://localhost:5179"` before `npm start`;
set `$env:VITE_API_URL="http://localhost:3099"` in the client terminal.
There is no Vite proxy. The Express `cors` middleware sends one configured origin.

Checks:

```sh
cd server
npm test
# In client/:
npm run lint
npm run build
```

For a preview build, run `npm run preview -- --port 5173 --strictPort`
in `client/` while the API is running. Use the same allowed origin as above.

## File organization

```text
assignment9/
├── server/
│   ├── server.js          # routes, JSON parser, CORS and error handling
│   ├── booksStore.js      # seed data and async immutable operations
│   ├── validate.js        # book, id and query checks
│   ├── test/api.test.js   # API and store checks
│   ├── package.json
│   └── package-lock.json
├── client/
│   ├── src/
│   │   ├── api/books.js   # all Fetch calls and query encoding
│   │   ├── components/   # Filters, BookForm, BookList and Stats
│   │   ├── genres.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js    # no proxy
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## API behaviour

| Method and path | Result |
| --- | --- |
| `GET /api/books` | 200, JSON array after filtering, sorting and pagination |
| `GET /api/books/:id` | 200, one book; invalid id is 400, missing book is 404 |
| `POST /api/books` | 201, created book and Location header |
| `PUT /api/books/:id` | 200, complete replacement |
| `PATCH /api/books/:id` | 200, existing book merged with recognized changes |
| `DELETE /api/books/:id` | 204 with no body; repeating it gives 404 |
| `GET /api/stats` | 200, statistics calculated from all current books |
| `GET /api/crash` | Deliberately throws in an async handler: 500 JSON error |

`/api/crash` is kept only to demonstrate Express 5 async error handling for this
assignment. It logs the deliberate error and returns `{"error":"Something went wrong"}`;
the stack is not sent to the client. An unknown route returns
`{"error":"Not found"}` with 404. Malformed JSON returns a JSON error with 400.
All errors have one `error` property. Each route sends only one response.

Titles and authors are trimmed and must be 1–100 characters. Year must be an
integer from 1000 through the current year. Genre must be fiction, non-fiction,
science, history, fantasy or other. Read must be boolean. Rating must be null
or an integer from 1 to 5, and only read books can have a rating.
Duplicate title-and-author pairs are checked without case sensitivity.
A body id and unknown fields are ignored. IDs are assigned by the server and
are not reused after deletion.

POST and PUT require title, author, year and genre. Omitted read and rating
use false and null. In PUT this resets those optional fields; PATCH keeps
omitted fields and validates the full merged book. To mark a rated book
unread, send both `{"read":false,"rating":null}`. The UI does this automatically.

### Query options

All options can be combined. Invalid values, unknown parameters and repeated
parameters return 400. Query strings are built with URLSearchParams in the
API module, not in components.

| Parameter | Values |
| --- | --- |
| `genre` | One valid genre |
| `read` | `true` or `false` |
| `q` | Case-insensitive title or author substring; empty text matches all |
| `sort` | `title`, `author`, `year`, `rating`; omitted means id |
| `order` | `asc` (default), `desc` |
| `limit` | Integer 1–50, default 50 |
| `page` | Positive integer, default 1 |

Example: `/api/books?genre=fiction&read=true&sort=title&order=asc`.
The list is a plain array, not a pagination envelope. The API applies pagination
after filtering and sorting; the UI displays the default first 50 results.
Unrated books always sort last for rating, including descending order.
An id breaks sorting ties so the result stays consistent.

The store waits 25ms in each async function to simulate a slow data source.
It replaces arrays and objects with new values. Sorting uses a copy and
responses are copies too. Duplicate checking and committing a write happen
without an await in between, preventing two concurrent creates from adding
the same title-and-author pair.

The statistics cover the whole store, not only the displayed filter. The
average uses rated books only and is null when none is rated. The UI rounds
the displayed average to two decimal places; the API returns the actual mean.
Only genres containing books are present in byGenre.

## Tests and experiments

The API test covers CRUD, required fields, types, ranges, trimming, defaults,
unknown body fields, ids, duplicate POST/PUT/PATCH, concurrent duplicate creates,
query combinations, repeated queries, pagination, rating order, CORS preflight,
malformed JSON, unknown routes, the deliberate crash, empty statistics,
immutable store responses and restoring seeds after restart.

Chromium checks also passed for add, PUT edit, PATCH read/rating, DELETE,
server-side controls, encoded search, loading/error/empty states and refreshed
statistics. A delayed old search was cancelled and did not replace a newer
result. The submit button was disabled during a delayed save, and the new book
was not displayed until the server confirmed it. The duplicate server message
was displayed while the typed form values were kept. Network failure recovery
worked, no page exceptions were reported, and the 390px layout had no page overflow.

### Browser preflight observation

In the browser's network traffic, editing the test book triggered this preflight
before the PUT request. These values were captured from Chromium network events,
which provide the request and response details shown in DevTools Network.

```http
OPTIONS http://localhost:3099/api/books/7
Origin: http://localhost:5179
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5179
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Headers: content-type
Vary: Origin, Access-Control-Request-Headers
Content-Length: 0
```

JSON Content-Type and the PUT method make this a preflighted cross-origin
request. The browser checked these headers before sending the edit. Test ports
were 3099 for the API and 5179 for React; the normal setup above uses 3000/5173.

## Reasoning questions

### 1. Route and query parameters

The id identifies one resource, so `/api/books/3` is the address of that book.
Genre and sort change how a collection is listed without choosing a new resource.
An id in the query string would be another filter on `/api/books` and would
need a different handler and response convention.

### 2. Body parsing experiment

In a separate copy, express.json() was moved below the routes and the POST
handler logged req.body. It printed `req.body = undefined`, and POST returned
400 with `Send a JSON object with the book fields` because validation had no
parsed object to use. The submitted server keeps the JSON parser before the routes.

### 3. One response experiment

In another copy, the return before GET's early 404 was removed. The client
received the first 404, but the handler continued to res.json(book) and the
server logged `ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client`.
Returning immediately prevents that second attempt to respond.

### 4. PUT and PATCH

PATCH is useful for setting just a rating or toggling read without resending
the title and author. PUT is used when the edit form submits all book fields.
In the curl examples, PUT changes the full record and PATCH then changes only
its rating while the other values remain the same.

### 5. CORS experiment

With CLIENT_ORIGIN changed to `http://localhost:9999`, the browser console said
the Access-Control-Allow-Origin value did not match `http://localhost:5179`,
and Fetch failed. The server still logged `GET /api/books` because this was a
simple GET that reached the server, but the browser would not expose its response.
Curl still returned 200 because it does not enforce browser same-origin policy.

### 6. Server validation

A user can send requests with curl or change the client code, bypassing form
checks. The server therefore checks every body and query again before storing
data or using it. This also protects the API from mistakes in another client.

### 7. State and restart

During the reset test, records were deleted and the list became empty.
Restarting the server restored all six original seed books. The data lives
in the process's memory, so a database or another persistent store would be
needed to keep changes after restart; this assignment intentionally has neither.

## Self-study notes

- [URLSearchParams (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
  encodes query names and values. The API module uses it so spaces, ampersands
  and question marks in searches are sent as part of the value.
- [localeCompare (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare)
  returns a comparison result for text. The store uses it for title and author
  instead of trying to subtract strings.
- [Vite environment variables](https://vite.dev/guide/env-and-mode)
  are exposed through import.meta.env. VITE_API_URL uses the VITE_ prefix so
  Vite makes it available to the client; it contains a public URL, not a secret.
- [Express response methods](https://expressjs.com/en/5x/api/response/)
  include status() and end(). The delete route calls res.status(204).end()
  instead of trying to send JSON with a no-content response.
- [AbortController (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
  provides a signal for cancelling Fetch. The loading effect passes the same
  signal to the book and stats requests and aborts both in its cleanup.
  AbortError is ignored, and aborted requests cannot change displayed state.

## Challenges

The merged PATCH needed the same checks as a new book. For example, marking a
rated book unread without clearing its rating must fail, so the read-toggle
button sends both changes together. Another detail was keeping null ratings
last in both sort directions instead of reversing the entire comparison.

Changing controls quickly can leave older requests running. The cancellation
test checked that a delayed old result did not overwrite the newest search.
The body-parser and early-return experiments also made middleware order and
ending a handler easier to see.

## curl evidence

These are actual responses from the running server during testing. Date headers,
new ids and current-year validation can differ on another run. The examples
use test port 3099 and are shown in execution order. No credentials are needed.

### Statistics before a change

```sh
curl --include http://localhost:3099/api/stats
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 141
ETag: W/"8d-uj3JSlW6d94/+z/wwWQfOG47dTk"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":6,"read":3,"unread":3,"averageRating":4.333333333333333,"byGenre":{"fantasy":1,"fiction":2,"science":1,"history":1,"non-fiction":1}}
```

### List with combined query parameters

```sh
curl --include 'http://localhost:3099/api/books?genre=fiction&sort=title&order=asc'
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 234
ETag: W/"ea-v0w76ZUruXo8BdGgI6U6C8F6mlA"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":2,"title":"1984","author":"George Orwell","year":1949,"genre":"fiction","read":false,"rating":null},{"id":5,"title":"The Little Prince","author":"Antoine de Saint-Exupéry","year":1943,"genre":"fiction","read":true,"rating":4}]
```

### One book

```sh
curl --include http://localhost:3099/api/books/1
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 110
ETag: W/"6e-ifc3caofajoorIYMPwafSn0+dKo"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":1,"title":"The Hobbit","author":"J. R. R. Tolkien","year":1937,"genre":"fantasy","read":true,"rating":5}
```

### Create a book (201 and Location)

```sh
curl --include --request POST --header 'Content-Type: application/json' --data '{"title":"REST Notes","author":"Test Student","year":2024,"genre":"other"}' http://localhost:3099/api/books
```

```http
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Location: /api/books/8
Content-Type: application/json; charset=utf-8
Content-Length: 108
ETag: W/"6c-Tq1l4GT3Osa+YtfYEzkY2r4PhoM"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"read":false,"rating":null,"title":"REST Notes","author":"Test Student","year":2024,"genre":"other","id":8}
```

### Statistics after creating the book

```sh
curl --include http://localhost:3099/api/stats
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 151
ETag: W/"97-A+M1AjvSdqSdQG53NIQijzIj710"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":7,"read":3,"unread":4,"averageRating":4.333333333333333,"byGenre":{"fantasy":1,"fiction":2,"science":1,"history":1,"non-fiction":1,"other":1}}
```

### Invalid year (400)

```sh
curl --include --request POST --header 'Content-Type: application/json' --data '{"title":"REST Notes","author":"Test Student","year":999,"genre":"other"}' http://localhost:3099/api/books
```

```http
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 65
ETag: W/"41-Y4opfmVtgwtw5mwxTQun/KWhBfw"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"year must be an integer from 1000 to the current year"}
```

### Repeated query parameter (400)

```sh
curl --include 'http://localhost:3099/api/books?genre=fiction&genre=history'
```

```http
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 54
ETag: W/"36-IZzciCoGJsoVLecxPqow1HazVJM"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Query parameter genre must not be repeated"}
```

### Missing book (404)

```sh
curl --include http://localhost:3099/api/books/99999
```

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 26
ETag: W/"1a-9K7Ys+5Z9m3qczPTmMk82VGBL7g"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book not found"}
```

### Case-insensitive duplicate (409)

```sh
curl --include --request POST --header 'Content-Type: application/json' --data '{"title":"rest notes","author":"test student","year":2024,"genre":"other"}' http://localhost:3099/api/books
```

```http
HTTP/1.1 409 Conflict
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 60
ETag: W/"3c-YJy0XpDp5agPe/8cl8QkvyagI8A"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"A book with this title and author already exists"}
```

### PUT replaces the complete book

```sh
curl --include --request PUT --header 'Content-Type: application/json' --data '{"title":"Revised REST Notes","author":"Test Student","year":2025,"genre":"other","read":true,"rating":4}' http://localhost:3099/api/books/8
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 112
ETag: W/"70-T9G8imGfboxLZb8Kay9zmpAZAUM"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"read":true,"rating":4,"title":"Revised REST Notes","author":"Test Student","year":2025,"genre":"other","id":8}
```

### PATCH changes only the rating

```sh
curl --include --request PATCH --header 'Content-Type: application/json' --data '{"rating":5}' http://localhost:3099/api/books/8
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 112
ETag: W/"70-f5NWvu14Xbi/ldMl6/NKv12C5qU"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"read":true,"rating":5,"title":"Revised REST Notes","author":"Test Student","year":2025,"genre":"other","id":8}
```

### PATCH marks unread and clears the rating

```sh
curl --include --request PATCH --header 'Content-Type: application/json' --data '{"read":false,"rating":null}' http://localhost:3099/api/books/8
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 116
ETag: W/"74-n4sENVwjXY/lmPVW3CBlyIjQqoc"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"read":false,"rating":null,"title":"Revised REST Notes","author":"Test Student","year":2025,"genre":"other","id":8}
```

### Delete with an empty 204 response

```sh
curl --include --request DELETE http://localhost:3099/api/books/8
```

```http
HTTP/1.1 204 No Content
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

### Same delete repeated (404)

```sh
curl --include --request DELETE http://localhost:3099/api/books/8
```

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 26
ETag: W/"1a-9K7Ys+5Z9m3qczPTmMk82VGBL7g"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book not found"}
```

### Statistics after deleting

```sh
curl --include http://localhost:3099/api/stats
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 141
ETag: W/"8d-uj3JSlW6d94/+z/wwWQfOG47dTk"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":6,"read":3,"unread":3,"averageRating":4.333333333333333,"byGenre":{"fantasy":1,"fiction":2,"science":1,"history":1,"non-fiction":1}}
```

### Malformed JSON (400)

```sh
curl --include --request POST --header 'Content-Type: application/json' --data '{"title":' http://localhost:3099/api/books
```

```http
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 31
ETag: W/"1f-mmbNKNr5+JE5unTdzNmIUtedyt8"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Malformed JSON body"}
```

### Deliberate async error (500)

```sh
curl --include http://localhost:3099/api/crash
```

```http
HTTP/1.1 500 Internal Server Error
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5179
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 32
ETag: W/"20-cI8B1wZuBEyTE5ClDvphKZx7wd0"
Date: Sun, 22 Nov 2026 21:15:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Something went wrong"}
```
