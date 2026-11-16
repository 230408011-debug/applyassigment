# Assignment 8 — Study Programme Information Server

Özcan Öztürk · 230408011 · CMP309 Web Programming  
GitHub username: `230408011-debug`

This is a small information server for a fictional Web Development Study Programme.
It serves a plain HTML page and several text and JSON routes. The only direct
package dependency is Express 5. All course data is defined in `server.js`;
there is no database, login or saved subscription.

## Install and run

Use a current Node.js LTS release and npm. The tested versions are recorded in the testing section.

```sh
npm ci
npm start
```

Open <http://localhost:3000/> in a browser. Do not open `public/index.html`
directly from disk. Stop the server with Ctrl+C.

For automatic restart when files change:

```sh
npm run dev
```

The development script uses Node's built-in `--watch`, without nodemon.
For another port on Linux/macOS:

```sh
PORT=3100 npm start
```

On Windows PowerShell:

```powershell
$env:PORT = "3100"
npm start
```

The server prints its full local address on startup. `process.env.PORT` takes
priority; without it, the port is 3000. Static files use an absolute path based
on `import.meta.url`, so starting `node /full/path/to/assignment8/server.js`
from a different folder also works.

## File organization

```text
assignment8/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

- `server.js`: hard-coded data, two middleware functions, static serving, routes and final 404 handler.
- `public/index.html`: programme introduction, seven API buttons and response area.
- `public/styles.css`: external styles, including a small-screen layout.
- `public/app.js`: Fetch requests, status/body display and error handling.
- `package.json`: ES modules, Express dependency and start/dev scripts.
- `package-lock.json`: exact dependency versions for repeatable installation.
- `.gitignore`: excludes `node_modules/` and `.env`.

## Routes

| Method | Path | Response |
| --- | --- | --- |
| GET | `/` | 200, programme page from `public/index.html` |
| GET | `/hello` | 200, plain text with my name |
| GET | `/robots.txt` | 200, plain text robots instructions |
| GET | `/old-page` | 302 redirect to `/hello` |
| GET | `/api/courses` | 200, array of three courses with id, title and credits |
| GET | `/api/status` | 200, status, actual Node version and process uptime in seconds |
| GET | `/api/headers` | 200, request User-Agent and Accept headers |
| POST | `/api/subscribe` | 201, `{"subscribed":true}` |
| GET | `/api/admin` | 403, `{"error":"Forbidden"}` |
| GET | `/api/stats` | 200, `{"requestsServed":number}` |
| Any unmatched request | Path starting with `/api` | 404, `{"error":"Not found"}` |
| Any unmatched request | Other path | 404, plain text `Page not found` |

Subscribe does not read or store a body: its response is the simulation requested
in the assignment. Admin is always forbidden; it does not implement authentication.
Header values are returned in a new object, without modifying `req.headers` or
other objects supplied by Express. Missing header values are represented by `null`.

## Middleware order and counting

The logger runs first, then the counter, then `express.static`, the routes, and
finally the 404 fallback. Both custom middleware functions call `next()` so
Express can continue processing the request. The logger prints an ISO timestamp,
HTTP method and original URL, including any query string.

The counter includes every incoming request that reaches this app: the page,
CSS, JavaScript, API calls, redirects, 404s and other HTTP methods. Static files
and 404s are included because the counter runs before either can send a response.
`/api/stats` includes its own request. Following a redirect makes a second request,
so both requests count. The counter is only in memory and resets on restart.

The fallback uses `app.use` with no wildcard path, which works with Express 5.
It stays after static serving and all real routes so they can respond first.

## Browser page

Each of the six API routes has a button, plus one for `/api/missing`.
The subscribe button uses POST; all the others use GET. Requests use relative
paths so the page and API use the same host and port. The page displays the
actual HTTP status and formats JSON with two-space indentation.

Fetch still returns a response for HTTP 403 and 404. The page displays their
status and body as errors rather than treating them as network failures.
A `catch` handles connection failures, and a `finally` re-enables the buttons.
Response text is displayed using `textContent`.

## Testing evidence

### GET /api/courses

```sh
curl --include http://localhost:3000/api/courses
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 186
ETag: W/"ba-G1yhF1dkBB1ei18C6jS5eBPP5Xk"
Date: Mon, 16 Nov 2026 16:51:11 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":"WEB101","title":"Web Foundations","credits":5},{"id":"JS102","title":"JavaScript Basics","credits":6},{"id":"NODE201","title":"Introduction to Back-end Development","credits":5}]
```

### POST /api/subscribe

```sh
curl --include --request POST http://localhost:3000/api/subscribe
```

```http
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 19
ETag: W/"13-oWAPIqDXuocNexKhPYW9ayyk98c"
Date: Mon, 16 Nov 2026 16:51:11 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"subscribed":true}
```

### GET /api/admin

```sh
curl --include http://localhost:3000/api/admin
```

```http
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-TLNzmZqKxaTuFdX/dVWWPBu44/c"
Date: Mon, 16 Nov 2026 16:51:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Forbidden"}
```

### GET /old-page

```sh
curl --include http://localhost:3000/old-page
```

```http
HTTP/1.1 302 Found
X-Powered-By: Express
Location: /hello
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 28
Date: Mon, 16 Nov 2026 16:51:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to /hello
```

### GET /api/missing

```sh
curl --include http://localhost:3000/api/missing
```

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-bm7tJgu8FHlq5QU+Y6gDxOGPfRc"
Date: Mon, 16 Nov 2026 16:51:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Not found"}
```

### GET /missing-page

```sh
curl --include http://localhost:3000/missing-page
```

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 14
ETag: W/"e-vDAjs2Bjp2gdskaBRytU+hHw1Ow"
Date: Mon, 16 Nov 2026 16:51:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Page not found
```

The six outputs above were captured from the running server on 16 November
2026. Date headers and process values will change on another run. The redirect
command deliberately does not use `--location`, so its original 302 is visible.

### Additional checks

The project was checked with Node.js v24.22.1 and then with the current LTS,
Node.js v26.13.1 (Lithium), using Express 5.3.0. All routes and response content
types passed. A separate server launched from `/tmp` on port 3103 successfully
served the page, CSS and JavaScript, confirming that neither the working folder
nor port 3000 is hard-coded into the static file or browser URLs.

Starting with a fresh process, the first `/api/stats` request returned 1.
Requests for static files, valid routes, unmatched routes and incorrect methods
were then counted; the next stats response matched the expected total of 17.
The course array was unchanged after these requests.

A Chromium browser check clicked all seven buttons and checked the displayed
HTTP status and response body. Both expected HTTP errors appeared correctly.
A simulated connection failure displayed the network error message and
re-enabled the buttons; a later successful request worked normally. No page
JavaScript errors were reported, and the 390px mobile layout had no horizontal
page overflow.

## Reasoning questions

### 1. Route order experiment

In a separate copy, the final 404 middleware was moved above the logger,
static serving and routes. `/api/courses` returned 404 with
`{"error":"Not found"}`, and opening `/` in Chromium displayed `Page not found`
instead of the programme page. The fallback sent a response before Express
could reach those later handlers. The submitted version keeps it last.

### 2. Middleware experiment

In another separate copy, `next()` was removed only from the logger.
The browser navigation stayed pending and the test stopped waiting after
2000ms; this timeout came from the test, not a response from Express.
The server printed `2026-11-16T16:52:25.937Z GET /` but sent no response because
control never reached the counter, static handler or routes. The working
version calls `next()` in both middleware functions.

### 3. Status codes

201 indicates that a request created something, which matches the simulated
subscription operation in this assignment. A missing page uses 404 so browsers,
scripts and other clients can recognize that the requested resource does not
exist. Returning 200 with an error message would incorrectly describe that
request as successful.

### 4. Configuration

`process.env.PORT` lets the environment choose a port without editing the
source file. This is useful on hosting services and when port 3000 is already
occupied. The fallback keeps the project easy to run locally when PORT is unset.

### 5. Dependencies

`node_modules` contains installed dependencies, which are large and can be
recreated from the committed package files. After cloning the repository, a
teammate should enter the project folder, run `npm ci`, and then run `npm start`
with an appropriate Node.js LTS version installed. `npm ci` installs the exact
versions recorded in `package-lock.json`.

### 6. Same origin

Through the server, the page and API share the same scheme, host and port,
so a relative URL such as `/api/courses` points to the correct server.
Opening the HTML from disk gives it a `file:` URL, and that relative path no
longer points to the HTTP API. If an absolute HTTP URL were used instead,
browser same-origin policy and CORS rules would apply to that cross-origin
request, with local files generally treated as opaque origins. The intended
solution is to open the page through Express, not disable browser protections.

## Self-study notes

- **Process information:** The [Node.js process documentation](https://nodejs.org/api/process.html#processuptime)
  says `process.uptime()` returns the number of seconds the current process has
  been running, including fractions. `process.version` provides the actual Node
  version string. These values are read when `/api/status` is requested.
- **Plain text:** The [Express response documentation](https://expressjs.com/en/5x/api/response/#restype)
  explains how `res.type()` sets the response Content-Type. The robots route
  uses `res.type('text/plain').send(...)`; its body is text rather than JSON or HTML.
- **Static paths:** The [Express static files guide](https://expressjs.com/en/5x/starter/static-files)
  warns that relative static paths depend on the directory where Node is started.
  `new URL('./public/', import.meta.url)` and `fileURLToPath` give the absolute
  path relative to `server.js`, so the static directory is found from any folder.
- **Readable JSON:** The [MDN JSON.stringify reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_space_parameter)
  explains that the third argument controls indentation. The browser uses
  `JSON.stringify(body, null, 2)` to make nested JSON easy to read.
- **Fetch errors:** The [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
  explains that HTTP errors do not reject a fetch promise. The page uses
  `response.ok` for the success/error display and `catch` for network failures.

## Challenges

The middleware order needed care because static files can finish a response
before later handlers run. Placing the logger and counter first made static
requests count too. The fallback experiment also showed why a real route must
be given a chance to respond before the 404 handler.

Another issue was distinguishing HTTP errors from network errors in the page.
Displaying the status and body even when `response.ok` is false keeps the 403
and 404 demonstrations useful. The other-folder test checked the absolute
static path instead of assuming the server would always start in the project
folder.
