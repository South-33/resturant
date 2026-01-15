'use client';

// ============================================
// CART DRAWER - Slide-in overlay cart
// Now submits orders to Convex
// ============================================

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
    useCartStore,
    type CartItem,
    type Product,
} from '@/lib/store';
import {
    IconCart,
    IconClose,
    IconTrash,
    IconCheck,
    IconPlus,
    IconMinus,
} from '@/lib/icons';
import ProductModal from '@/components/ProductModal';

// Type from Convex
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

// Convert to local type
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

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'khqr'>('cash');
    const [tableId, setTableId] = useState('T1');
    const [inlineProduct, setInlineProduct] = useState<Product | null>(null);
    const [canAnimateItems, setCanAnimateItems] = useState(false);
    const [orderNumber, setOrderNumber] = useState<number | null>(null);

    const items = useCartStore(state => state.items);
    const updateQuantity = useCartStore(state => state.updateQuantity);
    const removeItem = useCartStore(state => state.removeItem);
    const clearCart = useCartStore(state => state.clearCart);
    const getTotal = useCartStore(state => state.getTotal);

    // Convex
    const createOrder = useMutation(api.orders.createOrder);
    const convexPopularProducts = useQuery(api.products.getPopularProducts) as ConvexProduct[] | undefined;

    // Convert to local type for cart compatibility
    const popularProducts = useMemo(() => {
        if (!convexPopularProducts) return [];
        return convexPopularProducts.map(toLocalProduct);
    }, [convexPopularProducts]);

    const subtotal = getTotal();
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
            // Reset order placed state when drawer closes
            if (orderPlaced) {
                setTimeout(() => {
                    setOrderPlaced(false);
                    setOrderNumber(null);
                }, 300);
            }
        }, 200);
    };

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setCanAnimateItems(true), 300);
            return () => clearTimeout(timer);
        } else {
            setCanAnimateItems(false);
        }
    }, [isOpen]);

    const handleSubmitOrder = async () => {
        if (items.length === 0) return;

        setIsSubmitting(true);

        try {
            // Submit to Convex
            const result = await createOrder({
                tableId,
                items: items.map(item => ({
                    productName: item.product.name,
                    variation: item.variation.name,
                    quantity: item.quantity,
                    price: item.variation.price * item.quantity,
                })),
                total: total,
            });

            setOrderNumber(result.orderNumber);
            clearCart();
            setOrderPlaced(true);
        } catch (error) {
            console.error('Failed to create order:', error);
            alert('Failed to create order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onClick={handleClose}
            />

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[var(--background)] z-50 flex flex-col shadow-2xl ${isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'}`}>
                {orderPlaced ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <IconCheck className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
                        {orderNumber && (
                            <p className="text-4xl font-bold text-[var(--primary)] mb-4">
                                #{orderNumber}
                            </p>
                        )}
                        <p className="text-[var(--text-secondary)] mb-8">
                            Your order has been sent to the kitchen
                        </p>
                        <button onClick={handleClose} className="btn-primary px-8">
                            Continue Shopping
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-[var(--border-light)] sticky top-0 z-10">
                            <h2 className="font-bold text-lg flex-1 text-left">Your Cart</h2>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <IconClose className="w-5 h-5 text-gray-600" />
                            </button>
                        </header>

                        {/* Empty State */}
                        {items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                    <IconCart className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Your cart is empty</h3>
                                <p className="text-[var(--text-muted)] mb-8 max-w-xs mx-auto">
                                    Looks like you haven't added anything to your cart yet.
                                </p>
                                <button onClick={handleClose} className="btn-primary px-8">
                                    Start Ordering
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Cart Content */}
                                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                                    {/* Cart Items List */}
                                    <div className="p-5">
                                        {items.map(item => (
                                            <CartItemCard
                                                key={item.id}
                                                item={item}
                                                onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                                                onRemove={() => removeItem(item.id)}
                                                shouldAnimateEnter={canAnimateItems}
                                            />
                                        ))}
                                    </div>

                                    {/* Suggestions Section */}
                                    <div className="px-5 pb-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm">Popular with your order</h3>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-5 px-5">
                                            {popularProducts.slice(0, 4).map(product => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => setInlineProduct(product)}
                                                    className="flex-shrink-0 w-32 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 text-left active:scale-95 transition-transform"
                                                >
                                                    <div className="h-24 relative bg-gray-100">
                                                        <Image
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="128px"
                                                        />
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="font-semibold text-sm line-clamp-1 mb-1">{product.name}</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">
                                                            ${product.basePrice.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer - Table Selection & Payment */}
                                <div className="bg-white border-t border-[var(--border-light)] p-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">

                                    {/* Table Selection */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                            Select Table
                                        </label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent appearance-none"
                                            value={tableId}
                                            onChange={(e) => setTableId(e.target.value)}
                                        >
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <option key={i} value={`T${i + 1}`}>
                                                    Table {i + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Subtotal Details */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--text-secondary)]">Subtotal</span>
                                            <span className="font-medium">${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--text-secondary)]">Tax (10%)</span>
                                            <span className="font-medium">${tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-3 border-t border-dashed border-[var(--border-light)]">
                                            <span className="font-bold text-lg">Total</span>
                                            <span className="font-bold text-xl text-[var(--primary)]">${total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Payment Method & Checkout */}
                                    <div className="grid grid-cols-[auto_1fr] gap-3">
                                        {/* Payment Method Toggle */}
                                        <div className="flex bg-gray-100 rounded-xl p-1 h-14">
                                            <button
                                                onClick={() => setPaymentMethod('cash')}
                                                className={`px-4 rounded-lg flex flex-col items-center justify-center transition-all ${paymentMethod === 'cash'
                                                    ? 'bg-white shadow-sm text-[var(--text-primary)]'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                <span className="text-lg leading-none mb-0.5">💵</span>
                                                <span className="text-[10px] font-bold">CASH</span>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('khqr')}
                                                className={`px-4 rounded-lg flex flex-col items-center justify-center transition-all ${paymentMethod === 'khqr'
                                                    ? 'bg-white shadow-sm text-[var(--text-primary)]'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                <span className="text-lg leading-none mb-0.5">📱</span>
                                                <span className="text-[10px] font-bold">QR</span>
                                            </button>
                                        </div>

                                        <button
                                            className="btn-primary h-14 text-lg shadow-lg shadow-pink-200 flex items-center justify-center"
                                            onClick={handleSubmitOrder}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </span>
                                            ) : (
                                                <span>Pay ${total.toFixed(2)}</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Product Modal Overlay inside drawer */}
                {inlineProduct && (
                    <ProductModal
                        product={inlineProduct}
                        onClose={() => setInlineProduct(null)}
                    />
                )}
            </div>
        </>
    );
}

// ============================================
// CART ITEM CARD
// ============================================

function CartItemCard({
    item,
    onUpdateQuantity,
    onRemove,
    shouldAnimateEnter,
}: {
    item: CartItem;
    onUpdateQuantity: (qty: number) => void;
    onRemove: () => void;
    shouldAnimateEnter: boolean;
}) {
    const [isVisible, setIsVisible] = useState(!shouldAnimateEnter);

    useEffect(() => {
        if (shouldAnimateEnter) {
            const timer = requestAnimationFrame(() => setIsVisible(true));
            return () => cancelAnimationFrame(timer);
        }
    }, []);

    const handleRemove = () => {
        setIsVisible(false);
        setTimeout(() => {
            onRemove();
        }, 300);
    };

    const handleDecrement = () => {
        if (item.quantity > 1) {
            onUpdateQuantity(item.quantity - 1);
        } else {
            handleRemove();
        }
    };

    return (
        <div
            className={`
                grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isVisible
                    ? 'grid-rows-[1fr] opacity-100 translate-x-0 mb-4 p-[2px]'
                    : 'grid-rows-[0fr] opacity-0 translate-x-full mb-0 p-0'
                }
            `}
        >
            <div className="overflow-hidden min-h-0">
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-[var(--border-light)] relative group">
                    <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden relative flex-shrink-0 bg-gray-50">
                            <Image
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                                sizes="80px"
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-[15px] leading-tight pr-6">{item.product.name}</h3>
                                    {/* Delete Button (Top Right) */}
                                    <button
                                        onClick={handleRemove}
                                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded-md">
                                    {item.variation.name}
                                </p>
                            </div>

                            <div className="flex items-end justify-between mt-2">
                                <span className="font-bold text-[15px]">
                                    ${(item.variation.price * item.quantity).toFixed(2)}
                                </span>

                                {/* Quantity Control Pill */}
                                <div className="flex items-center bg-gray-100 rounded-lg p-1 h-8">
                                    <button
                                        className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm rounded-md transition-all active:scale-90"
                                        onClick={handleDecrement}
                                    >
                                        <IconMinus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-semibold">
                                        {item.quantity}
                                    </span>
                                    <button
                                        className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm rounded-md transition-all active:scale-90"
                                        onClick={() => onUpdateQuantity(item.quantity + 1)}
                                    >
                                        <IconPlus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
