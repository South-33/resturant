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
    variations: ProductVariation[];
}

export interface CartItem {
    id: string;
    product: Product;
    variation: ProductVariation;
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
    variation: string;
    quantity: number;
    price: number;
}

// ============================================
// CART STORE (Zustand with localStorage)
// ============================================

interface CartStore {
    items: CartItem[];
    addItem: (product: Product, variation: ProductVariation) => void;
    removeItem: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product, variation) => {
                const items = get().items;
                const existing = items.find(
                    item => item.product.id === product.id && item.variation.name === variation.name
                );

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
                                variation,
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

            clearCart: () => set({ items: [] }),

            getTotal: () => {
                return get().items.reduce(
                    (sum, item) => sum + item.variation.price * item.quantity,
                    0
                );
            },

            getItemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            },
        }),
        { name: 'restaurant-cart' }
    )
);
