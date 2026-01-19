// ============================================
// TYPES AND CART STORE
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface Category {
    id: string;
    name: string;
    sortOrder: number;
}

// New variation group structure
export interface VariationOption {
    name: string;
    priceAdjustment: number;
}

export interface VariationGroup {
    name: string;
    required: boolean;
    defaultOption?: string; // Default option name to select
    options: VariationOption[];
}

// Selected variation for cart/order
export interface SelectedVariation {
    groupName: string;
    optionName: string;
    priceAdjustment: number;
}

// Legacy variation (for backwards compatibility)
export interface ProductVariation {
    name: string;
    price: number;
}

export interface Product {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    imageUrl: string;
    basePrice: number;
    isPopular: boolean;
    variationGroups?: VariationGroup[];
    // Legacy field (optional)
    variations?: ProductVariation[];
}

export interface CartItem {
    id: string;
    product: Product;
    selectedVariations?: SelectedVariation[];
    notes?: string;
    quantity: number;
}

export interface Order {
    id: string;
    orderNumber: number;
    tableId: string;
    status: 'pending' | 'preparing' | 'done';
    paymentStatus: 'pending' | 'paid';
    items: OrderItem[];
    total: number;
    createdAt: Date;
}

export interface OrderItem {
    id: string;
    productName: string;
    selectedVariations: SelectedVariation[];
    notes?: string;
    quantity: number;
    price: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total price for a cart item
 */
export function calculateItemPrice(basePrice: number, selectedVariations: SelectedVariation[] | undefined): number {
    if (!selectedVariations || selectedVariations.length === 0) {
        return basePrice;
    }
    const adjustments = selectedVariations.reduce((sum, v) => sum + v.priceAdjustment, 0);
    return basePrice + adjustments;
}

/**
 * Generate a unique key for cart item matching (product + variations combo)
 */
function getCartItemKey(productId: string, selectedVariations: SelectedVariation[] | undefined, notes?: string): string {
    if (!selectedVariations || selectedVariations.length === 0) {
        return `${productId}-${notes || ''}`;
    }
    const variationsKey = selectedVariations
        .map(v => `${v.groupName}:${v.optionName}`)
        .sort()
        .join('|');
    return `${productId}-${variationsKey}-${notes || ''}`;
}

/**
 * Format selected variations as a readable string
 */
export function formatVariations(selectedVariations: SelectedVariation[] | undefined): string {
    if (!selectedVariations || selectedVariations.length === 0) return '';
    return selectedVariations.map(v => v.optionName).join(', ');
}

// ============================================
// CART STORE (Zustand with localStorage)
// ============================================

interface CartStore {
    items: CartItem[];
    addItem: (product: Product, selectedVariations?: SelectedVariation[], notes?: string) => void;
    removeItem: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    updateNotes: (cartItemId: string, notes: string) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product, selectedVariations, notes) => {
                const items = get().items;
                const itemKey = getCartItemKey(product.id, selectedVariations, notes);
                
                // Find existing item with same product, variations, and notes
                const existing = items.find(item => {
                    const existingKey = getCartItemKey(item.product.id, item.selectedVariations, item.notes);
                    return existingKey === itemKey;
                });

                if (existing) {
                    set({
                        items: items.map(item =>
                            item.id === existing.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                    });
                } else {
                    set({
                        items: [
                            ...items,
                            {
                                id: `cart-${Date.now()}-${Math.random()}`,
                                product,
                                selectedVariations,
                                notes,
                                quantity: 1,
                            },
                        ],
                    });
                }
            },

            removeItem: (cartItemId) => {
                set({ items: get().items.filter(item => item.id !== cartItemId) });
            },

            updateQuantity: (cartItemId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(cartItemId);
                    return;
                }
                set({
                    items: get().items.map(item =>
                        item.id === cartItemId ? { ...item, quantity } : item
                    ),
                });
            },

            updateNotes: (cartItemId, notes) => {
                set({
                    items: get().items.map(item =>
                        item.id === cartItemId ? { ...item, notes } : item
                    ),
                });
            },

            clearCart: () => set({ items: [] }),

            getTotal: () => {
                return get().items.reduce((sum, item) => {
                    const itemPrice = calculateItemPrice(item.product.basePrice, item.selectedVariations);
                    return sum + itemPrice * item.quantity;
                }, 0);
            },

            getItemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            },
        }),
        { name: 'restaurant-cart' }
    )
);
