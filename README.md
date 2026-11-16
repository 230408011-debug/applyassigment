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
