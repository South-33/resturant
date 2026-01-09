'use client';

// ============================================
// MENU PAGE - Customer ordering screen
// Mobile-first responsive design
// ============================================

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CATEGORIES,
  PRODUCTS,
  getPopularProducts,
  useCartStore,
  type Product,
  type ProductVariation,
} from '@/lib/store';
import {
  IconCart,
  IconStar,
  IconClose,
  IconStore,
  IconFire,
  getCategoryIcon,
} from '@/lib/icons';

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('popular');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);

  // Refs for scroll management (refs don't cause re-renders)
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cartItemCount = useCartStore(state => state.getItemCount());
  const cartTotal = useCartStore(state => state.getTotal());

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

  // Debounce ref for scroll detection
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Intersection Observer - updates active tab on manual scroll
  useEffect(() => {
    if (!mounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if programmatic scrolling is in progress
        if (isScrollingRef.current) return;

        // Find the section with highest intersection ratio
        const visible = entries
          .filter(e => e.isIntersecting && e.intersectionRatio > 0.1)
          .map(e => ({ id: e.target.getAttribute('data-section'), ratio: e.intersectionRatio }))
          .filter((item): item is { id: string; ratio: number } => item.id !== null);

        if (visible.length > 0) {
          const best = visible.reduce((a, b) => (b.ratio > a.ratio ? b : a));

          // Debounce to prevent flicker
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
  }, [mounted]);

  // Memoized category data
  const popularProducts = getPopularProducts();
  const categoryProducts = CATEGORIES.filter(c => c.id !== 'popular').map(cat => ({
    ...cat,
    products: PRODUCTS.filter(p => p.categoryId === cat.id),
  }));

  // Scroll to section handler with debouncing
  const scrollToSection = (categoryId: string) => {
    // Debounce: clear any pending timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Lock observer immediately
    isScrollingRef.current = true;
    setActiveCategory(categoryId);

    const element = sectionRefs.current[categoryId];
    if (element) {
      const offset = 80; // Pixels below sticky header
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });

      // Unlock observer after scroll animation completes
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 700); // Slightly longer than typical smooth scroll
    } else {
      isScrollingRef.current = false;
    }
  };

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
                Delicious Café
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
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            ref={el => { tabRefs.current[category.id] = el; }}
            onClick={() => scrollToSection(category.id)}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
          >
            {getCategoryIcon(category.id, 'w-4 h-4')}
            {category.name}
          </button>
        ))}
      </nav>

      {/* Main Content - Continuous Scroll */}
      <main className="p-4 pb-16">
        {/* Popular Section - Grid View */}
        <section
          ref={el => { sectionRefs.current['popular'] = el; }}
          data-section="popular"
          className="mb-8"
        >
          <div className="mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {getCategoryIcon('popular', 'w-5 h-5 text-[var(--primary)]')}
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
                {getCategoryIcon(category.id, 'w-5 h-5 text-[var(--primary)]')}
                {category.name}
              </h2>
            </div>

            <div className="space-y-0">
              {category.products.map(product => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  onSelect={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Floating Cart Button */}
      {mounted && cartItemCount > 0 && (
        <div className="floating-cart">
          <Link href="/cart" className="floating-cart-button">
            <IconCart className="w-5 h-5" />
            <span>{cartItemCount} items</span>
            <span className="text-white/60">•</span>
            <span>${cartTotal.toFixed(2)}</span>
          </Link>
        </div>
      )}

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
          +
        </button>

        {product.isPopular && (
          <div className="absolute top-2 left-2 bg-[var(--primary)] text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            Popular
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
  onSelect,
}: {
  product: Product;
  onSelect: () => void;
}) {
  return (
    <div
      className="flex gap-4 py-4 border-b border-[var(--border-light)] cursor-pointer"
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
          <div className="inline-flex items-center gap-1 text-xs text-[var(--primary)]">
            <IconFire className="w-3 h-3" />
            Popular
          </div>
        )}
      </div>

      <div className="relative flex-shrink-0">
        <div className="w-24 h-24 rounded-xl overflow-hidden relative">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
        <button
          className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-[var(--border)] rounded-full flex items-center justify-center text-xl leading-none shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <span className="mt-[-2px]">+</span>
        </button>
      </div>
    </div>
  );
}

// ============================================
// PRODUCT MODAL (Bottom Sheet)
// ============================================

function ProductModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation>(
    product.variations[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const addItem = useCartStore(state => state.addItem);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200); // Match animation duration
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product, selectedVariation);
    }
    handleClose();
  };

  return (
    <>
      <div
        className={`modal-overlay ${isClosing ? 'closing' : ''}`}
        onClick={handleClose}
      />

      <div className={`modal-sheet ${isClosing ? 'closing' : ''}`}>
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <div className="h-48 sm:h-56 relative">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        <div className="p-5">
          <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            from ${product.basePrice.toFixed(2)}
          </p>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            {product.description}
          </p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Variation</h3>
              <span className="text-xs bg-[var(--text-primary)] text-white px-2 py-1 rounded-full">
                Required
              </span>
            </div>

            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              {product.variations.map(variation => (
                <label
                  key={variation.name}
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer border-b border-[var(--border-light)] last:border-b-0 transition-colors ${selectedVariation.name === variation.name
                    ? 'bg-[var(--primary-light)]'
                    : 'hover:bg-[var(--background)]'
                    }`}
                >
                  <span className="font-medium">{variation.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-secondary)]">
                      ${variation.price.toFixed(2)}
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 transition-all ${selectedVariation.name === variation.name
                      ? 'border-[var(--primary)] border-[5px]'
                      : 'border-[var(--border)]'
                      }`} />
                  </div>
                  <input
                    type="radio"
                    name="variation"
                    className="sr-only"
                    checked={selectedVariation.name === variation.name}
                    onChange={() => setSelectedVariation(variation)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 safe-bottom">
            <div className="quantity-control">
              <button
                className="quantity-button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                className="quantity-button"
                onClick={() => setQuantity(q => q + 1)}
              >
                +
              </button>
            </div>

            <button className="btn-primary flex-1" onClick={handleAddToCart}>
              Add to cart · ${(selectedVariation.price * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div >
    </>
  );
}
