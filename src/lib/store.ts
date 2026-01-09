// ============================================
// TYPES, MOCK DATA, AND CART STORE
// Consolidated file for AI-friendly maintenance
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
    status: 'pending' | 'preparing' | 'done';
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
// MOCK DATA
// ============================================

export const CATEGORIES: Category[] = [
    { id: 'popular', name: 'Popular', sortOrder: 0 },
    { id: 'coffee', name: 'Coffee', sortOrder: 1 },
    { id: 'tea', name: 'Tea', sortOrder: 2 },
    { id: 'smoothies', name: 'Juice & Smoothies', sortOrder: 3 },
    { id: 'food', name: 'Food', sortOrder: 4 },
];

export const PRODUCTS: Product[] = [
    // Coffee
    {
        id: 'coffee-1',
        categoryId: 'coffee',
        name: 'Amazon Signature',
        description: 'Rich flavor of our signature blend that wins the heart of millions',
        imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
        basePrice: 1.60,
        isPopular: true,
        variations: [
            { name: 'Hot', price: 1.60 },
            { name: 'Iced', price: 2.15 },
            { name: 'Frappe', price: 2.30 },
        ],
    },
    {
        id: 'coffee-2',
        categoryId: 'coffee',
        name: 'Honey Black Coffee',
        description: 'Bold black coffee sweetened with natural honey',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop',
        basePrice: 2.00,
        isPopular: true,
        variations: [
            { name: 'Hot', price: 2.00 },
            { name: 'Iced', price: 2.50 },
        ],
    },
    {
        id: 'coffee-3',
        categoryId: 'coffee',
        name: 'Cappuccino',
        description: 'Espresso-based coffee with steamed milk foam',
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop',
        basePrice: 1.60,
        isPopular: true,
        variations: [
            { name: 'Hot', price: 1.60 },
            { name: 'Iced', price: 2.15 },
        ],
    },
    {
        id: 'coffee-4',
        categoryId: 'coffee',
        name: 'Latte Amazon',
        description: 'Coffee-based drink with espresso and steamed milk',
        imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop',
        basePrice: 1.75,
        isPopular: true,
        variations: [
            { name: 'Hot', price: 1.75 },
            { name: 'Iced', price: 2.25 },
            { name: 'Frappe', price: 2.50 },
        ],
    },
    {
        id: 'coffee-5',
        categoryId: 'coffee',
        name: 'Mocha',
        description: 'Chocolate-flavored espresso with steamed milk',
        imageUrl: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=400&fit=crop',
        basePrice: 2.20,
        isPopular: false,
        variations: [
            { name: 'Hot', price: 2.20 },
            { name: 'Iced', price: 2.70 },
        ],
    },
    // Tea
    {
        id: 'tea-1',
        categoryId: 'tea',
        name: 'Green Tea Latte',
        description: 'Premium matcha green tea with creamy milk',
        imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=400&fit=crop',
        basePrice: 1.80,
        isPopular: true,
        variations: [
            { name: 'Hot', price: 1.80 },
            { name: 'Iced', price: 2.30 },
        ],
    },
    {
        id: 'tea-2',
        categoryId: 'tea',
        name: 'Thai Milk Tea',
        description: 'Classic Thai tea with condensed milk',
        imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=400&fit=crop',
        basePrice: 2.00,
        isPopular: true,
        variations: [
            { name: 'Iced', price: 2.00 },
            { name: 'Frappe', price: 2.50 },
        ],
    },
    {
        id: 'tea-3',
        categoryId: 'tea',
        name: 'Oolong Tea',
        description: 'Traditional Taiwanese oolong tea',
        imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop',
        basePrice: 1.50,
        isPopular: false,
        variations: [
            { name: 'Hot', price: 1.50 },
            { name: 'Iced', price: 1.80 },
        ],
    },
    // Smoothies
    {
        id: 'smoothie-1',
        categoryId: 'smoothies',
        name: 'Mango Smoothie',
        description: 'Fresh mango blended with yogurt',
        imageUrl: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=400&fit=crop',
        basePrice: 2.50,
        isPopular: false,
        variations: [{ name: 'Regular', price: 2.50 }],
    },
    {
        id: 'smoothie-2',
        categoryId: 'smoothies',
        name: 'Berry Blast',
        description: 'Mixed berries with banana and ice',
        imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=400&fit=crop',
        basePrice: 2.80,
        isPopular: false,
        variations: [{ name: 'Regular', price: 2.80 }],
    },
    // Food
    {
        id: 'food-1',
        categoryId: 'food',
        name: 'Croissant',
        description: 'Freshly baked butter croissant',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop',
        basePrice: 1.20,
        isPopular: false,
        variations: [{ name: 'Plain', price: 1.20 }],
    },
    {
        id: 'food-2',
        categoryId: 'food',
        name: 'Chocolate Cake',
        description: 'Rich dark chocolate layer cake',
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
        basePrice: 2.50,
        isPopular: false,
        variations: [{ name: 'Slice', price: 2.50 }],
    },
];

// Get popular products
export const getPopularProducts = () => PRODUCTS.filter(p => p.isPopular);

// Get products by category
export const getProductsByCategory = (categoryId: string) => {
    if (categoryId === 'popular') return getPopularProducts();
    return PRODUCTS.filter(p => p.categoryId === categoryId);
};

// ============================================
// MOCK ORDERS (for Kitchen demo)
// ============================================

let orderCounter = 1000;

export const createMockOrder = (items: CartItem[]): Order => {
    orderCounter++;
    return {
        id: `order-${orderCounter}`,
        orderNumber: orderCounter,
        status: 'pending',
        items: items.map(item => ({
            id: `item-${Date.now()}-${Math.random()}`,
            productName: item.product.name,
            variation: item.variation.name,
            quantity: item.quantity,
            price: item.variation.price * item.quantity,
        })),
        total: items.reduce((sum, item) => sum + item.variation.price * item.quantity, 0),
        createdAt: new Date(),
    };
};

// ============================================
// CART STORE (Zustand)
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

// ============================================
// ORDERS STORE (with localStorage persistence)
// ============================================

interface OrdersStore {
    orders: Order[];
    addOrder: (order: Order) => void;
    updateOrderStatus: (orderId: string, status: Order['status']) => void;
    clearDoneOrders: () => void;
}

export const useOrdersStore = create<OrdersStore>()(
    persist(
        (set, get) => ({
            orders: [],

            addOrder: (order) => {
                set({ orders: [order, ...get().orders] });
            },

            updateOrderStatus: (orderId, status) => {
                set({
                    orders: get().orders.map(order =>
                        order.id === orderId ? { ...order, status } : order
                    ),
                });
            },

            clearDoneOrders: () => {
                set({ orders: get().orders.filter(order => order.status !== 'done') });
            },
        }),
        { name: 'restaurant-orders' }
    )
);
