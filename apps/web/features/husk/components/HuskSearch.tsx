import { Search } from "lucide-react";

export function HuskSearch({
  onQueryChange,
  query,
  searchLabel,
}: {
  onQueryChange: (query: string) => void;
  query: string;
  searchLabel: string;
}) {
  return (
    <label className="husk-search">
      <Search aria-hidden="true" size={20} strokeWidth={2.4} />
      <span className="sr-only">{searchLabel}</span>
      <input
        className="husk-search__input"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchLabel}
        type="search"
        value={query}
      />
    </label>
  );
}
