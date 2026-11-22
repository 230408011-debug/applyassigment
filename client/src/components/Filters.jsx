export const genres = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];

export default function Filters({ filters, onChange, disabled }) {
  function change(event) {
    onChange({ ...filters, [event.target.name]: event.target.value });
  }
  return <fieldset className="filters" disabled={disabled}>
    <legend>Search and filter</legend>
    <label>Search title or author<input name="q" value={filters.q} onChange={change} placeholder="Search books" /></label>
    <label>Genre<select name="genre" value={filters.genre} onChange={change}>
      <option value="">All genres</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}
    </select></label>
    <label>Read state<select name="read" value={filters.read} onChange={change}>
      <option value="">All books</option><option value="true">Read</option><option value="false">Unread</option>
    </select></label>
    <label>Sort by<select name="sort" value={filters.sort} onChange={change}>
      <option value="">Added order</option><option value="title">Title</option><option value="author">Author</option>
      <option value="year">Year</option><option value="rating">Rating</option>
    </select></label>
    <label>Direction<select name="order" value={filters.order} onChange={change}>
      <option value="asc">Ascending</option><option value="desc">Descending</option>
    </select></label>
  </fieldset>;
}
