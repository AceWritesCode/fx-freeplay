import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, ChevronRight, ChevronDown, Check, Plus, Folder, Loader2 } from 'lucide-react';
import { mt5BridgeClient, type TradableSymbolInfo } from '@/bridge/mt5BridgeClient';

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => Promise<void> | void;
  watchlistSymbols: Array<{ name: string }>;
  initialQuery?: string;
}

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  watchlistSymbols,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [symbols, setSymbols] = useState<TradableSymbolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isAdding, setIsAdding] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Set of already added symbol names for O(1) checks
  const existingSet = useMemo(() => {
    return new Set(watchlistSymbols.map((s) => s.name.toUpperCase()));
  }, [watchlistSymbols]);

  // Load tradable symbols from MT5 when opened
  useEffect(() => {
    if (!isOpen) return;

    setQuery(initialQuery);
    setSelectedCategory('All');
    setSelectedIndex(0);

    let isMounted = true;
    setLoading(true);

    mt5BridgeClient
      .getTradableSymbols()
      .then((res) => {
        if (!isMounted) return;
        setCategories(res.categories || []);
        setSymbols(res.symbols || []);
      })
      .catch((err) => {
        console.error('[SymbolSearchModal] Failed to load symbols:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Auto-focus input after render
    setTimeout(() => {
      inputRef.current?.focus();
      if (initialQuery) {
        inputRef.current?.setSelectionRange(initialQuery.length, initialQuery.length);
      }
    }, 50);

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialQuery]);

  // Filter symbols based on category & search query
  const filteredSymbols = useMemo(() => {
    const trimmed = query.trim().toUpperCase();

    return symbols.filter((s) => {
      // 1. Category filter
      if (selectedCategory !== 'All' && s.category !== selectedCategory) {
        return false;
      }

      // 2. Query filter
      if (!trimmed) return true;

      const nameMatch = s.name.toUpperCase().includes(trimmed);
      const descMatch = s.description.toUpperCase().includes(trimmed);
      return nameMatch || descMatch;
    });
  }, [symbols, selectedCategory, query]);

  // Group filtered symbols by category (and optional subCategory)
  const groupedData = useMemo(() => {
    const groups: Array<{ category: string; items: TradableSymbolInfo[] }> = [];

    // Grouping
    const map = new Map<string, TradableSymbolInfo[]>();
    for (const s of filteredSymbols) {
      const cat = s.category || 'Other';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(s);
    }

    // Sort categories alphabetically
    const sortedCats = Array.from(map.keys()).sort();
    for (const cat of sortedCats) {
      groups.push({
        category: cat,
        items: map.get(cat)!,
      });
    }

    return groups;
  }, [filteredSymbols]);

  // Toggle category collapse
  const toggleCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Flattened visible list for arrow-key navigation
  const visibleList = useMemo(() => {
    // If a search query is typed or category is specific, we don't collapse
    if (query.trim() || selectedCategory !== 'All') {
      return filteredSymbols;
    }
    const list: TradableSymbolInfo[] = [];
    for (const g of groupedData) {
      if (!collapsedCategories[g.category]) {
        list.push(...g.items);
      }
    }
    return list;
  }, [filteredSymbols, groupedData, collapsedCategories, query, selectedCategory]);

  // Handle symbol selection
  const handleSelect = async (sym: TradableSymbolInfo) => {
    if (isAdding) return;
    try {
      setIsAdding(sym.name);
      await onSelectSymbol(sym.name);
      onClose();
    } catch (e) {
      console.error('[SymbolSearchModal] Select error:', e);
    } finally {
      setIsAdding(null);
    }
  };

  // Keyboard navigation within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < visibleList.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (visibleList[selectedIndex]) {
        handleSelect(visibleList[selectedIndex]);
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-def rounded-2xl shadow-2xl w-[640px] max-w-[92vw] h-[580px] max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header with Title and Close button */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-bold text-txt-primary tracking-tight">Symbol search</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="px-5 py-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-txt-muted absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search symbol, currency, or market..."
              className="w-full bg-surface-elevated/70 border border-border-def focus:border-accent text-txt-primary placeholder-txt-muted rounded-xl pl-10 pr-9 py-2.5 text-sm font-medium outline-hidden transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 p-1 rounded-full text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border-sub">
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedIndex(0);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-accent text-txt-inverse shadow-sm'
                : 'bg-surface-elevated text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-accent text-txt-inverse shadow-sm'
                    : 'bg-surface-elevated text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Content Body / Symbol List */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-txt-muted">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs font-medium">Fetching tradable symbols from broker...</span>
            </div>
          ) : visibleList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-txt-muted">
              <Search className="w-8 h-8 opacity-40 mb-1" />
              <p className="text-xs font-semibold text-txt-primary">No matching symbols found</p>
              <p className="text-[11px] text-txt-muted">Try searching with a different ticker or category</p>
            </div>
          ) : query.trim() || selectedCategory !== 'All' ? (
            // Flat List View when user searches or clicks a specific category
            <div className="flex flex-col gap-0.5">
              {filteredSymbols.map((sym, idx) => {
                const isSelected = idx === selectedIndex;
                const isAlreadyInWatchlist = existingSet.has(sym.name.toUpperCase());
                const isCurrentAdding = isAdding === sym.name;

                return (
                  <div
                    key={sym.name}
                    data-selected={isSelected}
                    onClick={() => handleSelect(sym)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-accent-muted border border-accent/40 shadow-xs'
                        : 'hover:bg-surface-hover border border-transparent'
                    }`}
                  >
                    {/* Left: Symbol Name and Description */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-bold text-sm text-accent tracking-wide shrink-0">
                        {sym.name}
                      </span>
                      <span className="text-xs text-txt-muted truncate">
                        {sym.description}
                      </span>
                    </div>

                    {/* Right: Spread and Action Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      {sym.spread > 0 && (
                        <span className="text-[11px] font-mono font-medium text-txt-muted bg-surface-elevated px-2 py-0.5 rounded-md">
                          Spread {sym.spread}
                        </span>
                      )}
                      {isCurrentAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      ) : isAlreadyInWatchlist ? (
                        <div title="In Watchlist" className="p-1 rounded-full text-status-success">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div title="Add to Chart &amp; Watchlist" className="p-1 rounded-full text-txt-muted hover:text-accent">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Collapsible Category Groups when browsing 'All' without active text query
            <div className="flex flex-col gap-2">
              {groupedData.map((group) => {
                const isCollapsed = !!collapsedCategories[group.category];

                return (
                  <div key={group.category} className="flex flex-col">
                    {/* Category Group Header Banner */}
                    <button
                      onClick={() => toggleCollapse(group.category)}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-elevated/60 hover:bg-surface-elevated text-xs font-bold text-txt-secondary transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-txt-muted" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                        )}
                        <Folder className="w-3.5 h-3.5 text-accent" />
                        <span className="tracking-wide uppercase text-[11px] font-bold text-txt-primary">
                          {group.category}
                        </span>
                        <span className="text-[10px] text-txt-muted font-normal">
                          ({group.items.length})
                        </span>
                      </div>
                    </button>

                    {/* Symbols under this Category */}
                    {!isCollapsed && (
                      <div className="flex flex-col gap-0.5 pl-3 pt-1">
                        {group.items.map((sym) => {
                          const flatIdx = visibleList.indexOf(sym);
                          const isSelected = flatIdx === selectedIndex;
                          const isAlreadyInWatchlist = existingSet.has(sym.name.toUpperCase());
                          const isCurrentAdding = isAdding === sym.name;

                          return (
                            <div
                              key={sym.name}
                              data-selected={isSelected}
                              onClick={() => handleSelect(sym)}
                              className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-accent-muted border border-accent/40 shadow-xs'
                                  : 'hover:bg-surface-hover border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-bold text-xs text-accent tracking-wide shrink-0">
                                  {sym.name}
                                </span>
                                <span className="text-[11px] text-txt-muted truncate">
                                  {sym.description}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {sym.spread > 0 && (
                                  <span className="text-[10px] font-mono text-txt-muted bg-surface-elevated px-1.5 py-0.5 rounded">
                                    {sym.spread} pts
                                  </span>
                                )}
                                {isCurrentAdding ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                                ) : isAlreadyInWatchlist ? (
                                  <Check className="w-3.5 h-3.5 text-status-success" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-txt-muted hover:text-accent" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 border-t border-border-sub bg-surface-elevated/40 flex items-center justify-between text-[11px] text-txt-muted">
          <div className="flex items-center gap-3">
            <span><strong className="text-txt-primary">↑↓</strong> Navigate</span>
            <span><strong className="text-txt-primary">Enter</strong> Select</span>
            <span><strong className="text-txt-primary">Esc</strong> Close</span>
          </div>
          <span>{filteredSymbols.length} tradable instruments</span>
        </div>
      </div>
    </div>
  );
};
