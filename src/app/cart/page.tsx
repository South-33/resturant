'use client';

// ============================================
// CART PAGE - Order review & checkout
// Mobile-first responsive design
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    useCartStore,
    useOrdersStore,
    createMockOrder,
    PRODUCTS,
    type CartItem,
} from '@/lib/store';
import {
    IconCart,
    IconArrowLeft,
    IconTrash,
    IconCheck,
} from '@/lib/icons';

export default function CartPage() {
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);

    const items = useCartStore(state => state.items);
    const updateQuantity = useCartStore(state => state.updateQuantity);
    const removeItem = useCartStore(state => state.removeItem);
    const clearCart = useCartStore(state => state.clearCart);
    const getTotal = useCartStore(state => state.getTotal);
    const addOrder = useOrdersStore(state => state.addOrder);

    useEffect(() => {
        setMounted(true);
    }, []);

    const subtotal = mounted ? getTotal() : 0;
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const handleSubmitOrder = async () => {
        if (items.length === 0) return;

        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const order = createMockOrder(items);
        addOrder(order);
        clearCart();

        setIsSubmitting(false);
        setOrderPlaced(true);
    };

    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <IconCheck className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
                <p className="text-[var(--text-secondary)] mb-8">
                    Your order has been sent to the kitchen
                </p>
                <Link href="/" className="btn-primary inline-block text-center px-8">
                    Order More
                </Link>
            </div>
        );
    }

    if (mounted && items.length === 0) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                    <IconCart className="w-10 h-10 text-stone-400" />
                </div>
                <h1 className="text-xl font-bold mb-2">Your cart is empty</h1>
                <p className="text-[var(--text-secondary)] mb-8">
                    Add some delicious items to get started
                </p>
                <Link href="/" className="btn-primary inline-block text-center px-8">
                    Browse Menu
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] page-content">
            <header className="bg-white border-b border-[var(--border)] px-4 py-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="w-10 h-10 flex items-center justify-center rounded-full border border-[var(--border)]"
                    >
                        <IconArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg">Cart</h1>
                        <p className="text-sm text-[var(--text-muted)]">Delicious Café</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 px-4">
                    <ProgressStep step={1} label="Menu" completed />
                    <div className="flex-1 h-0.5 bg-[var(--text-primary)] mx-2" />
                    <ProgressStep step={2} label="Cart" active />
                    <div className="flex-1 h-0.5 bg-[var(--border)] mx-2" />
                    <ProgressStep step={3} label="Done" />
                </div>
            </header>

            <main className="p-4 pb-48">
                <div className="space-y-4">
                    {mounted && items.map(item => (
                        <CartItemCard
                            key={item.id}
                            item={item}
                            onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                            onRemove={() => removeItem(item.id)}
                        />
                    ))}
                </div>

                <Link
                    href="/"
                    className="flex items-center gap-2 mt-4 p-3 text-[var(--primary)] font-medium"
                >
                    <span className="text-lg">+</span>
                    Add more items
                </Link>

                <div className="mt-8">
                    <h3 className="font-bold mb-2">Popular with your order</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                        Other customers also bought these
                    </p>

                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                        {PRODUCTS.filter(p => p.isPopular).slice(0, 3).map(product => (
                            <div
                                key={product.id}
                                className="flex-shrink-0 w-28 bg-white rounded-xl overflow-hidden shadow-sm"
                            >
                                <div className="h-20 relative">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="112px"
                                    />
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        ${product.basePrice.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <div className="fixed bottom-6 left-0 right-0 bg-white border-t border-[var(--border)] p-4 safe-bottom">
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Tax (10%)</span>
                        <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>

                <button
                    className="btn-primary"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || !mounted || items.length === 0}
                >
                    {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>
            </div>
        </div>
    );
}

function ProgressStep({
    step,
    label,
    active,
    completed,
}: {
    step: number;
    label: string;
    active?: boolean;
    completed?: boolean;
}) {
    return (
        <div className="flex flex-col items-center">
            <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active || completed
                    ? 'bg-[var(--text-primary)] text-white'
                    : 'bg-[var(--border)] text-[var(--text-muted)]'
                    }`}
            >
                {completed ? <IconCheck className="w-4 h-4" /> : step}
            </div>
            <span className="text-xs mt-1 text-[var(--text-muted)]">{label}</span>
        </div>
    );
}

function CartItemCard({
    item,
    onUpdateQuantity,
    onRemove,
}: {
    item: CartItem;
    onUpdateQuantity: (qty: number) => void;
    onRemove: () => void;
}) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden relative flex-shrink-0">
                    <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{item.product.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{item.variation.name}</p>

                    <div className="flex items-center justify-between mt-2">
                        <div className="quantity-control">
                            <button className="quantity-button" onClick={() => onRemove()}>
                                <IconTrash className="w-3.5 h-3.5" />
                            </button>
                            <button
                                className="quantity-button"
                                onClick={() => onUpdateQuantity(item.quantity - 1)}
                            >
                                −
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                            </span>
                            <button
                                className="quantity-button"
                                onClick={() => onUpdateQuantity(item.quantity + 1)}
                            >
                                +
                            </button>
                        </div>

                        <span className="font-semibold">
                            ${(item.variation.price * item.quantity).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
