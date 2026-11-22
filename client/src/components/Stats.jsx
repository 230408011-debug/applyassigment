export default function Stats({ stats }) {
  if (!stats) return null;
  return <section className="stats" aria-label="Reading statistics"><h2>Statistics</h2>
    <p>Total: <strong>{stats.total}</strong> · Read: <strong>{stats.read}</strong> · Unread: <strong>{stats.unread}</strong> · Average rating: <strong>{stats.averageRating === null ? 'Not rated' : stats.averageRating.toFixed(2)}</strong></p>
    <p>By genre: {Object.entries(stats.byGenre).map(([genre, count]) => `${genre}: ${count}`).join(' · ') || 'No books'}</p>
    <small>Counts cover the whole reading list, including books hidden by filters.</small>
  </section>;
}
