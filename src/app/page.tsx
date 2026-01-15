'use client';

// ============================================
// MENU PAGE - Customer ordering screen
// Now fetches data from Convex
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  useCartStore,
  type Product,
  type ProductVariation,
} from '@/lib/store';
import {
  IconCart,
  IconStar,
  IconStore,
  IconFire,
  IconPlus,
  getCategoryIcon,
} from '@/lib/icons';
import CartDrawer from '@/components/CartDrawer';
import ProductModal from '@/components/ProductModal';

// ============================================
// TYPE ADAPTERS (Convex → Local)
// ============================================

interface ConvexCategory {
  _id: Id<"categories">;
  _creationTime: number;
  name: string;
  icon?: string;
  sortOrder: number;
}

interface ConvexProduct {
  _id: Id<"products">;
  _creationTime: number;
  categoryId: Id<"categories">;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  isPopular: boolean;
  variations: { name: string; price: number }[];
}

// Convert Convex product to local Product type (for cart compatibility)
function toLocalProduct(p: ConvexProduct): Product {
  return {
    id: p._id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    basePrice: p.basePrice,
    isPopular: p.isPopular,
    variations: p.variations,
  };
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('popular');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fetch data from Convex
  const convexCategories = useQuery(api.products.getCategories) as ConvexCategory[] | undefined;
  const convexProducts = useQuery(api.products.getAllProducts) as ConvexProduct[] | undefined;

  // Convert to local types
  const categories = useMemo(() => {
    if (!convexCategories || !convexProducts) return [];
    const products = convexProducts.map(toLocalProduct);
    const hasPopular = products.some(p => p.isPopular);

    const baseCategories = convexCategories.map(c => ({
      id: c._id,
      name: c.name,
      sortOrder: c.sortOrder
    }));

    if (hasPopular) {
      return [
        { id: 'popular', name: 'Popular', sortOrder: -1 },
        ...baseCategories
      ];
    }
    return baseCategories;
  }, [convexCategories, convexProducts]);

  const products = useMemo(() => {
    if (!convexProducts) return [];
    return convexProducts.map(toLocalProduct);
  }, [convexProducts]);

  // Refs for scroll management
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const cartItemCount = useCartStore(state => state.getItemCount());
  const cartTotal = useCartStore(state => state.getTotal());
  const addItem = useCartStore(state => state.addItem);
  const cartItems = useCartStore(state => state.items);

  // Client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll tab bar to show active category
  useEffect(() => {
    const activeTab = tabRefs.current[activeCategory];
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeCategory]);

  // Intersection Observer - updates active tab on manual scroll
  useEffect(() => {
    if (!mounted || categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;

        const visible = entries
          .filter(e => e.isIntersecting && e.intersectionRatio > 0.1)
          .map(e => ({ id: e.target.getAttribute('data-section'), ratio: e.intersectionRatio }))
          .filter((item): item is { id: string; ratio: number } => item.id !== null);

        if (visible.length > 0) {
          const best = visible.reduce((a, b) => (b.ratio > a.ratio ? b : a));

          if (scrollDebounceRef.current) {
            clearTimeout(scrollDebounceRef.current);
          }
          scrollDebounceRef.current = setTimeout(() => {
            setActiveCategory(best.id);
          }, 50);
        }
      },
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0.1, 0.5],
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
  }, [mounted, categories]);

  // Derived data
  const searchLower = searchQuery.toLowerCase();
  const filteredProducts = searchQuery
    ? products.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    )
    : null;

  const popularProducts = products.filter(p => p.isPopular);
  const categoryProducts = categories
    .filter(c => c.id !== 'popular')
    .map(cat => ({
      ...cat,
      products: products.filter(p => p.categoryId === cat.id),
    }));

  // Scroll to section handler
  const scrollToSection = (categoryId: string) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    isScrollingRef.current = true;
    setActiveCategory(categoryId);

    const element = sectionRefs.current[categoryId];
    if (element) {
      const offset = 80;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });

      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 700);
    } else {
      isScrollingRef.current = false;
    }
  };

  // Loading state
  if (!convexCategories || !convexProducts) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] page-content">
      {/* Header / Hero */}
      <header className="relative bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/30 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative px-4 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center text-[var(--primary)]">
              <IconStore className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                The Moon
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <IconStar className="w-4 h-4 text-yellow-500" />
                <span>4.8</span>
                <span className="text-[var(--text-muted)]">•</span>
                <span>200+ ratings</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-white rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="category-tabs scrollbar-hide sticky top-0 z-30">
        {categories.map(category => (
          <button
            key={category.id}
            ref={el => { tabRefs.current[category.id] = el; }}
            onClick={() => scrollToSection(category.id)}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
          >
            {getCategoryIcon(category.id === 'popular' ? 'popular' : category.name.toLowerCase(), 'w-4 h-4')}
            {category.name}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="p-4 pb-16">
        {/* Search Results */}
        {filteredProducts ? (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
            </h2>
            {filteredProducts.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">No products found</p>
            ) : (
              <div className="space-y-0">
                {filteredProducts.map(product => {
                  const cartQty = cartItems.filter(i => i.product.id === product.id).reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <ProductListItem
                      key={product.id}
                      product={product}
                      cartQuantity={cartQty}
                      onSelect={() => setSelectedProduct(product)}
                      onQuickAdd={() => {
                        if (product.variations.length === 1) {
                          addItem(product, product.variations[0]);
                        } else {
                          setSelectedProduct(product);
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Popular Section - Grid View */}
            {popularProducts.length > 0 && (
              <section
                ref={el => { sectionRefs.current['popular'] = el; }}
                data-section="popular"
                className="mb-8"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <IconFire className="w-5 h-5 text-[var(--primary)]" />
                    Popular
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">Most ordered right now</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {popularProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Category Sections - List View */}
            {categoryProducts.map(category => (
              <section
                key={category.id}
                ref={el => { sectionRefs.current[category.id] = el; }}
                data-section={category.id}
                className="mb-8"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {getCategoryIcon(category.name.toLowerCase(), 'w-5 h-5 text-[var(--primary)]')}
                    {category.name}
                  </h2>
                </div>

                <div className="space-y-0">
                  {category.products.map(product => {
                    const cartQty = cartItems.filter(i => i.product.id === product.id).reduce((sum, i) => sum + i.quantity, 0);
                    return (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        cartQuantity={cartQty}
                        onSelect={() => setSelectedProduct(product)}
                        onQuickAdd={() => {
                          if (product.variations.length === 1) {
                            addItem(product, product.variations[0]);
                          } else {
                            setSelectedProduct(product);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {/* Floating Cart Button */}
      {mounted && cartItemCount > 0 && (
        <div className="floating-cart">
          <button onClick={() => setIsCartOpen(true)} className="floating-cart-button">
            <IconCart className="w-5 h-5" />
            <span>{cartItemCount} items</span>
            <span className="text-white/60">•</span>
            <span>${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

// ============================================
// PRODUCT CARD (Grid View)
// ============================================

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: () => void;
}) {
  return (
    <div className="product-card cursor-pointer" onClick={onSelect}>
      <div className="relative">
        <div className="product-card-image overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>

        <button
          className="add-button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <IconPlus className="w-5 h-5" />
        </button>

        {product.isPopular && (
          <div className="absolute top-2 left-2 z-10">
            <PopularBadge />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-[var(--text-secondary)] text-sm">
          from ${product.basePrice.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

// ============================================
// PRODUCT LIST ITEM (List View)
// ============================================

function ProductListItem({
  product,
  cartQuantity = 0,
  onSelect,
  onQuickAdd,
}: {
  product: Product;
  cartQuantity?: number;
  onSelect: () => void;
  onQuickAdd?: () => void;
}) {
  return (
    <div
      className="flex gap-4 py-4 border-b border-[var(--border-light)] cursor-pointer hover:bg-black/[0.01] transition-colors"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base mb-0.5">{product.name}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-1">
          from ${product.basePrice.toFixed(2)}
        </p>
        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
          {product.description}
        </p>
        {product.isPopular && (
          <PopularBadge compact />
        )}
      </div>

      <div className="flex-shrink-0">
        <div className="w-24 h-24 rounded-xl overflow-visible relative">
          <div className="w-full h-full rounded-xl overflow-hidden relative">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
          <button
            className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors leading-none ${cartQuantity > 0
              ? 'bg-[var(--primary)] text-white'
              : 'bg-white border border-[var(--border)]'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd?.();
            }}
          >
            {cartQuantity > 0 ? (
              <span className="text-sm -mt-0.5">{cartQuantity}</span>
            ) : (
              <IconPlus className="w-5 h-5 text-[var(--text-primary)]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// POPULAR BADGE Component
// ============================================

function PopularBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-100 text-[10px] font-bold text-[var(--primary)] uppercase tracking-tight">
        <IconFire className="w-2.5 h-2.5" />
        Popular
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-pink-100 text-[11px] font-bold text-[var(--primary)] shadow-sm transition-transform hover:scale-105 active:scale-95">
      <IconFire className="w-3 h-3 text-[var(--primary)]" />
      Popular
    </div>
  );
}
