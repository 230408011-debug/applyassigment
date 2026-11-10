import { Outlet } from 'react-router';
import NavBar from './NavBar';
import { useLocalStorage } from '../hooks/useLocalStorage';
export default function Layout() {
  const [theme, setTheme] = useLocalStorage('assignment7-theme', 'light');
  return <div className={`app ${theme === 'dark' ? 'dark' : 'light'}`}>
    <NavBar theme={theme} toggleTheme={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} />
    <main id="main"><Outlet /></main>
    <footer>Özcan Öztürk · 230408011 <span>Web Programming · Assignment 7 · Fall 2026</span></footer>
  </div>;
}
