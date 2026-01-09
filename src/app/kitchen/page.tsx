'use client';

// ============================================
// KITCHEN DASHBOARD - Staff order management
// PIN-protected, vertical layout for tablet
// ============================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOrdersStore, type Order } from '@/lib/store';
import { IconChef, IconCheck } from '@/lib/icons';

// Kitchen PIN (in production, use env var)
const KITCHEN_PIN = '1234';

import { Suspense } from 'react';

// ... imports ...

export default function KitchenPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <KitchenDashboard />
        </Suspense>
    );
}

function KitchenDashboard() {
    const searchParams = useSearchParams();
    const [pinInput, setPinInput] = useState('');
    // ... rest of component ...
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinError, setPinError] = useState(false);

    const orders = useOrdersStore(state => state.orders);
    const updateOrderStatus = useOrdersStore(state => state.updateOrderStatus);

    // Check PIN from URL or stored state
    useEffect(() => {
        const urlPin = searchParams.get('pin');
        if (urlPin === KITCHEN_PIN) {
            setIsAuthenticated(true);
        }
    }, [searchParams]);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pinInput === KITCHEN_PIN) {
            setIsAuthenticated(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPinInput('');
        }
    };

    // PIN Entry Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
                <div className="text-center max-w-xs">
                    <div className="w-20 h-20 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <IconChef className="w-10 h-10 text-[var(--primary)]" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Kitchen Access</h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Enter PIN to access the kitchen dashboard
                    </p>

                    <form onSubmit={handlePinSubmit}>
                        <input
                            type="password"
                            maxLength={4}
                            value={pinInput}
                            onChange={(e) => {
                                setPinInput(e.target.value.replace(/\D/g, ''));
                                setPinError(false);
                            }}
                            placeholder="••••"
                            className={`pin-input ${pinError ? 'border-red-500' : ''}`}
                            autoFocus
                        />
                        {pinError && (
                            <p className="text-red-500 text-sm mt-2">Incorrect PIN</p>
                        )}
                        <button
                            type="submit"
                            className="btn-primary mt-6"
                            disabled={pinInput.length < 4}
                        >
                            Enter Kitchen
                        </button>
                    </form>

                    <p className="text-xs text-[var(--text-muted)] mt-8">
                        Hint: Try 1234
                    </p>
                </div>
            </div>
        );
    }

    // Split orders by status
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const doneOrders = orders.filter(o => o.status === 'done');

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="bg-white border-b border-[var(--border)] px-4 pt-6 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-lg">Kitchen Dashboard</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            {orders.length} total orders
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm text-[var(--text-muted)]">Live</span>
                    </div>
                </div>
            </header>

            {/* Empty State */}
            {orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                        <IconChef className="w-8 h-8 text-stone-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No orders yet</h2>
                    <p className="text-[var(--text-muted)]">
                        Orders will appear here when customers place them
                    </p>
                </div>
            )}

            {/* Vertical Kanban Layout */}
            {orders.length > 0 && (
                <div className="p-4 space-y-6">
                    {/* Pending Section */}
                    <KanbanSection
                        title="Pending"
                        status="pending"
                        orders={pendingOrders}
                        onMoveToNext={(id) => updateOrderStatus(id, 'preparing')}
                        nextLabel="Start Preparing"
                    />

                    {/* Preparing Section */}
                    <KanbanSection
                        title="Preparing"
                        status="preparing"
                        orders={preparingOrders}
                        onMoveToNext={(id) => updateOrderStatus(id, 'done')}
                        nextLabel="Mark Done"
                    />

                    {/* Done Section */}
                    <KanbanSection
                        title="Done"
                        status="done"
                        orders={doneOrders}
                    />
                </div>
            )}
        </div>
    );
}

// ============================================
// KANBAN SECTION COMPONENT (Vertical)
// ============================================

function KanbanSection({
    title,
    status,
    orders,
    onMoveToNext,
    nextLabel,
}: {
    title: string;
    status: 'pending' | 'preparing' | 'done';
    orders: Order[];
    onMoveToNext?: (orderId: string) => void;
    nextLabel?: string;
}) {
    if (orders.length === 0 && status === 'done') return null;

    return (
        <div>
            <div className={`kanban-header ${status}`}>
                {title} ({orders.length})
            </div>

            {orders.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                    No orders
                </p>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            status={status}
                            onAction={onMoveToNext ? () => onMoveToNext(order.id) : undefined}
                            actionLabel={nextLabel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// ORDER CARD COMPONENT
// ============================================

function OrderCard({
    order,
    status,
    onAction,
    actionLabel,
}: {
    order: Order;
    status: 'pending' | 'preparing' | 'done';
    onAction?: () => void;
    actionLabel?: string;
}) {
    const timeAgo = getTimeAgo(order.createdAt);

    return (
        <div className={`order-card ${status}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg">#{order.orderNumber}</span>
                <span className="text-xs text-[var(--text-muted)]">{timeAgo}</span>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
                {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{item.quantity}x</span>
                        <span>{item.productName}</span>
                        <span className="text-[var(--text-muted)]">({item.variation})</span>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="text-sm text-[var(--text-secondary)] mb-3">
                Total: ${order.total.toFixed(2)}
            </div>

            {/* Action Button */}
            {onAction && actionLabel && (
                <button
                    onClick={onAction}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${status === 'pending'
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                >
                    {status === 'preparing' && <IconCheck className="w-4 h-4" />}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
}
