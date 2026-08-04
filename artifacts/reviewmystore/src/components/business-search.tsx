import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { useAutocompletePlaces, getAutocompletePlacesQueryKey, type PlaceAutocompleteSuggestion } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BusinessSearchProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSelect: (suggestion: PlaceAutocompleteSuggestion) => void;
}

/**
 * Google Places autocomplete search box. Debounces keystrokes, shows a
 * dropdown of live suggestions from our backend proxy, and reports the
 * selected suggestion back to the caller (which is responsible for fetching
 * full place details).
 */
export function BusinessSearch({
  placeholder = "Search for your business by name...",
  className,
  inputClassName,
  autoFocus,
  onSelect,
}: BusinessSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useAutocompletePlaces(
    { input: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length > 2,
        queryKey: getAutocompletePlacesQueryKey({ input: debouncedQuery }),
      },
    },
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = data?.suggestions ?? [];
  const showDropdown = isOpen && debouncedQuery.length > 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn("h-14 pl-12 pr-12 text-base rounded-full shadow-md", inputClassName)}
        />
        {isFetching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
          {isFetching && suggestions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Searching Google...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No businesses found. Try a different search.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(s);
                      setQuery(s.mainText);
                      setIsOpen(false);
                      sessionTokenRef.current = crypto.randomUUID();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium text-sm truncate">{s.mainText}</span>
                      {s.secondaryText && (
                        <span className="block text-xs text-muted-foreground truncate">{s.secondaryText}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
