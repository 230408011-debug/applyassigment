export const DEMO_USERNAME = '230408011@st.biruni.edu.tr';
export function login(username, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username === DEMO_USERNAME && password === 'demo123456') resolve({ username });
      else reject(new Error('Invalid credentials'));
    }, 500);
  });
}
