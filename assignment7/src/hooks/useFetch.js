import { useEffect, useReducer } from 'react';
const initial = { loading: true, error: null, data: null };
function reducer(state, action) {
  switch (action.type) {
    case 'START': return initial;
    case 'SUCCESS': return { loading: false, error: null, data: action.data };
    case 'ERROR': return { loading: false, error: action.error, data: null };
    default: return state;
  }
}
// Pass a stable API function; inputs are its arguments before the AbortSignal.
export function useFetch(fetcher, inputs = []) {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    dispatch({ type: 'START' });
    Promise.resolve().then(() => fetcher(...inputs, controller.signal))
      .then(data => { if (active) dispatch({ type: 'SUCCESS', data }); })
      .catch(error => {
        if (active && error.name !== 'AbortError') dispatch({ type: 'ERROR', error: error.message });
      });
    return () => { active = false; controller.abort(); };
    // The caller supplies the dependency inputs, like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, ...inputs]);
  return state;
}
