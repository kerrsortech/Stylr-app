'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, Menu, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoreProduct } from '@/lib/store/store-products';
import { ProductCard } from '@/components/store/ProductCard';

export function StoreNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { name: 'New & Featured', href: '/store' },
    { name: 'Men', href: '/store?category=men', submenu: ['Shoes', 'Clothing', 'Accessories'] },
    { name: 'Women', href: '/store?category=women', submenu: ['Shoes', 'Clothing', 'Accessories'] },
    { name: 'Kids', href: '/store?category=kids', submenu: ['Shoes', 'Clothing', 'Accessories'] },
    { name: 'Sale', href: '/store?category=sale' },
  ];

  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Handle search with API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/store/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.products || []);
        } else {
          console.error('Search failed:', response.statusText);
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close search on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSearchOpen]);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleResultClick = () => {
    handleCloseSearch();
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-black" />
            <span className="text-2xl font-bold text-black">Stylr Store</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:justify-center flex-1">
            <div className="flex items-center space-x-8">
              {categories.map((category) => (
                <div
                  key={category.name}
                  className="relative"
                  onMouseEnter={() => setHoveredCategory(category.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Link
                    href={category.href}
                    className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
                  >
                    {category.name}
                  </Link>
                  {category.submenu && hoveredCategory === category.name && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-2 z-50">
                      {category.submenu.map((item) => (
                        <Link
                          key={item}
                          href={`${category.href}&subcategory=${item.toLowerCase()}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {item}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button 
              onClick={handleSearchClick}
              className="p-2 text-gray-900 hover:text-gray-600 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Shopping Bag */}
            <button className="p-2 text-gray-900 hover:text-gray-600 transition-colors relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-4 w-4 bg-black text-white text-xs rounded-full flex items-center justify-center">
                0
              </span>
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-900"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {categories.map((category) => (
              <div key={category.name}>
                <Link
                  href={category.href}
                  className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
                {category.submenu && (
                  <div className="pl-4 space-y-1">
                    {category.submenu.map((item) => (
                      <Link
                        key={item}
                        href={`${category.href}&subcategory=${item.toLowerCase()}`}
                        className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={handleCloseSearch}
        >
          <div 
            className="absolute top-0 left-0 right-0 bg-white shadow-xl max-h-screen overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col overflow-hidden">
              {/* Search Input */}
              <div className="relative flex items-center">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-black" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Try: 'red jacket under $100' or 'blue running shoes'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-14 py-4 text-lg bg-gray-100 text-black placeholder-gray-500 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-colors"
                />
                {/* Close Button */}
                <button
                  onClick={handleCloseSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-black hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="mt-6 flex-1 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                      <p className="text-gray-500">Analyzing your search...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for &quot;{searchQuery}&quot;
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                        {searchResults.map((product) => (
                          <div key={product.id} onClick={handleResultClick}>
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-2">No products found</p>
                      <p className="text-sm text-gray-400">
                        Try searching with different keywords or natural language like &quot;red jacket under $100&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Popular Searches (when no query) */}
              {!searchQuery && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Try searching with natural language</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'red jacket under $100',
                      'blue running shoes',
                      'winter jacket',
                      'basketball shoes',
                      'casual sneakers'
                    ].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

