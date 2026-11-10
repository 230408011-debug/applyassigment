import { createContext, useContext, useReducer } from 'react';
const AuthContext = createContext(null);
function reducer(state, action) {
  switch (action.type) {
    case 'LOGGED_IN': return { user: action.user };
    case 'LOGGED_OUT': return { user: null };
    default: return state;
  }
}
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { user: null });
  return <AuthContext.Provider value={{ user: state.user, dispatch }}>{children}</AuthContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside an AuthProvider.');
  return auth;
}
