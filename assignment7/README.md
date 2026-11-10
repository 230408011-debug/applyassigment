# OZ / SHOP — Assignment 7

**Student:** Özcan Öztürk  
**Student number:** 230408011  
**Course:** Web Programming, Fall 2026

## Run locally

Use Node.js 22.12+ (or Node.js 24).

```sh
cd assignment7
npm ci
npm run dev
```

Open the local address printed by Vite. `npm run build` produces `dist/`; `npm run preview` serves that build locally. `npm run lint` runs the scaffold's Oxlint check.

Demo username: `230408011@st.biruni.edu.tr`  
Demo password: `demo123456`

The account is simulated and authentication resets on reload. The cart and theme remain in browser localStorage. Product data comes from DummyJSON and requires an internet connection.

## File organization

```text
assignment7/
├── src/
│   ├── api/           productsApi.js, authApi.js
│   ├── hooks/         useFetch.js, useLocalStorage.js
│   ├── context/       AuthContext.jsx
│   ├── store/         cartStore.js
│   ├── utils/         formatPrice.js
│   ├── components/    Layout.jsx, NavBar.jsx, ProductCard.jsx, ProtectedRoute.jsx, ProductImage.jsx
│   ├── pages/         Home.jsx, ProductList.jsx, ProductDetail.jsx,
│   │                  Cart.jsx, Login.jsx, NotFound.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
└── package.json
```

`main.jsx` mounts the router and auth provider. `App.jsx` declares nested routes, while `Layout` renders their `Outlet` and shares navigation, theme and footer. The API modules contain no React code.

## Reasoning answers — draft to review and explain before submission

### 1. State choices

The signed-in user lives in Context with a reducer because multiple pages need the same authentication state; the cart lives in Zustand because cards, details, navigation and cart controls update or read it independently. Filters live in URL search parameters so a link reproduces the same view, while the product list stays in each useFetch instance because it is loaded page data. The theme lives in Layout through useLocalStorage, which persists the preference and passes it to the navigation toggle.

### 2. Context versus store

Authentication changes relatively rarely, so a Context update on login or logout is appropriate. Cart actions happen more frequently, and Zustand selectors let the navigation subscribe to just the derived quantity count, while action-only components subscribe to stable functions. Putting the cart in one broad Context would notify all its consumers on every cart change; using Zustand for authentication could work but would remove the required Context/reducer practice.

### 3. Custom hooks

useFetch shares the loading/error/data reducer, asynchronous request lifecycle and cancellation logic. Each call has its own reducer state and AbortController, so ProductList and ProductDetail do not share their data or loading flags. Cleanup both aborts the request and marks it inactive to prevent stale results from replacing newer data.

### 4. Route parameters

The id returned by useParams is a string, even when the URL looks numeric. The API layer checks its digit format and encodes it for the request, and the next-product link uses Number(id) before adding one to avoid string concatenation. Cart IDs come from the JSON API as numbers, so store comparisons use those numeric API IDs.

### 5. Protected routes

ProtectedRoute is a user-experience feature, not security: anyone can inspect or alter the JavaScript and browser state. The fixed demo credentials are public and the fake login does not prove identity to a server. Real protection requires backend authentication, secure session handling and server-side authorization for every protected resource or operation.

### 6. Deep links

On a plain static file server, reloading /products/3 normally asks for a file at that path, which does not exist and may return an HTTP 404 before React starts. Vite's SPA fallback serves index.html for application routes, allowing BrowserRouter to match the URL. A production host needs an equivalent rewrite to index.html while serving actual assets normally; this project does not assume GitHub Pages provides that rewrite automatically.

## Self-study notes and official references

- [React Router: useSearchParams](https://reactrouter.com/api/hooks/useSearchParams): changing search parameters performs navigation. ProductList copies the previous URLSearchParams, changes only the desired key, and sends the copy to setSearchParams so category, q and unrelated parameters remain intact. Categories and filtered products are derived during render.
- [Zustand: create](https://zustand.docs.pmnd.rs/reference/apis/create): the bound store exposes getState and subscribe outside React. The store reads and validates persisted JSON once, uses immutable updates, and saves only when the items reference changes through subscribe. Selectors return a primitive count, the existing items reference, or an existing action function rather than a newly constructed object.
- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage): storage persists strings across browser sessions and can throw when access is blocked. Both persistence paths use JSON and try/catch; the cart additionally checks the shape of each restored item. An unavailable storage area leaves the current in-memory UI usable.
- [MDN: CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties): Layout supplies a light/dark class and CSS variables change the background, text, borders and surfaces. useLocalStorage persists the preference, and its setter supports functional updates like useState.
- [React: useEffect](https://react.dev/reference/react/useEffect) and [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController): request cleanup aborts work when dependencies change or the component unmounts. The fake login form also ignores asynchronous completion after unmount.

## Implementation challenges and limitations

The main architectural challenges are preserving independent query parameters, preventing stale requests after a route ID change, and keeping cart persistence outside React. Those are addressed with copied URLSearchParams, AbortController plus an active flag, and a Zustand subscription. The demo has no checkout or backend, and it intentionally does not persist the signed-in user.

This README and implementation were prepared with AI assistance. The reasoning answers above are a draft: review them, run the application, and revise them in your own words as the assignment requests. No personal learning experience or earlier work history is claimed here.

## Git workflow status

The supplied repository was empty when first inspected. The repository now contains 14 commits, including separate improvements for accessible cart feedback, currency formatting, image fallbacks, validated theme storage, keyboard navigation, request retries, and pending login behavior. These recent commits do not establish progress spread over the assignment period, and commit timestamps have not been backdated. The stated deadline was 8 November 2026 at 23:59; confirm late-submission arrangements with the instructor.

## Validation

See `VALIDATION.md` for the executed checks and their limits. Generated node_modules and dist folders are excluded from Git.

## Follow-up improvements

Products use a shared USD formatter, and cart additions and total changes provide accessible feedback. Missing images have a fallback, invalid stored theme values reset to light, and a skip link supports keyboard users. Catalogue and detail requests can be retried without changing the current URL; login prevents duplicate submissions and disables inputs while pending.
