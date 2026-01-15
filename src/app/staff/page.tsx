'use client';

// ============================================
// STAFF DASHBOARD (Kitchen + Cashier + Menu)
// Unified view for restaurant operations
// ============================================

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import Image from 'next/image';
import {
    IconCheck,
    IconStore,
    IconSearch,
    IconPlus,
    IconTrash,
    IconClose,
    IconEdit,
} from '@/lib/icons';

// ============================================
// TYPES
// ============================================

type OrderStatus = 'pending' | 'preparing' | 'done';
type PaymentStatus = 'pending' | 'paid';
type StaffTab = 'cashier' | 'kitchen' | 'menu';

interface OrderItem {
    _id: Id<"orderItems">;
    _creationTime: number;
    orderId: Id<"orders">;
    productId?: Id<"products">;
    productName: string;
    variation: string;
    quantity: number;
    price: number;
}

interface Order {
    _id: Id<"orders">;
    _creationTime: number;
    orderNumber: number;
    tableId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    total: number;
    items: OrderItem[];
}

interface Category {
    _id: Id<"categories">;
    _creationTime: number;
    name: string;
    icon?: string;
    sortOrder: number;
}

interface Product {
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

// PIN for staff access
const STAFF_PIN = '1234';

// ============================================
// MAIN EXPORT
// ============================================

export default function StaffPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <StaffDashboard />
        </Suspense>
    );
}

function LoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

// ============================================
// STAFF DASHBOARD
// ============================================

function StaffDashboard() {
    const searchParams = useSearchParams();
    const [pinInput, setPinInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinError, setPinError] = useState(false);
    const [activeTab, setActiveTab] = useState<StaffTab>('cashier');

    // Check PIN from URL
    useEffect(() => {
        const urlPin = searchParams.get('pin');
        if (urlPin === STAFF_PIN) {
            setIsAuthenticated(true);
        }
    }, [searchParams]);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pinInput === STAFF_PIN) {
            setIsAuthenticated(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPinInput('');
        }
    };

    // AUTH SCREEN
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <IconStore className="w-10 h-10 text-orange-600" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-stone-800">Staff Access</h1>
                    <p className="text-stone-500 mb-8">Enter PIN to access dashboard</p>

                    <form onSubmit={handlePinSubmit}>
                        <div className="flex justify-center gap-2 mb-6">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full border-2 ${pinInput.length > i
                                        ? 'bg-orange-500 border-orange-500'
                                        : 'bg-transparent border-stone-200'
                                        }`}
                                />
                            ))}
                        </div>

                        <input
                            type="password"
                            maxLength={4}
                            value={pinInput}
                            onChange={(e) => {
                                setPinInput(e.target.value.replace(/\D/g, ''));
                                setPinError(false);
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                            autoFocus
                        />

                        {pinError && (
                            <div className="text-red-500 text-sm font-medium animate-shake mb-4">
                                Incorrect PIN
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        if (num === '⌫') setPinInput(prev => prev.slice(0, -1));
                                        else if (typeof num === 'number') setPinInput(prev => (prev + num).slice(0, 4));
                                    }}
                                    className={`h-14 rounded-xl font-bold text-xl flex items-center justify-center transition-all ${typeof num === 'number'
                                        ? 'bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300'
                                        : num === '⌫'
                                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                            : 'invisible'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // MAIN DASHBOARD
    return (
        <div className="min-h-screen bg-stone-100 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 px-4 lg:px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
                    <h1 className="font-bold text-lg lg:text-xl text-stone-800 tracking-tight whitespace-nowrap">
                        Delicious Café
                    </h1>

                    {/* Tab Toggle */}
                    <div className="bg-stone-100 p-1 rounded-lg flex gap-0.5">
                        {(['cashier', 'kitchen', 'menu'] as StaffTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 lg:px-4 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all capitalize ${activeTab === tab
                                    ? 'bg-white text-stone-900 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                {tab === 'cashier' ? 'POS' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {activeTab === 'cashier' && <CashierView />}
                {activeTab === 'kitchen' && <KitchenView />}
                {activeTab === 'menu' && <MenuManagementView />}
            </main>
        </div>
    );
}

// ============================================
// CASHIER VIEW
// ============================================

function CashierView() {
    const orders = useQuery(api.orders.getAllOrders) as Order[] | undefined;
    const updatePaymentStatus = useMutation(api.orders.updatePaymentStatus);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

    if (orders === undefined) {
        return <LoadingSpinner />;
    }

    const getTableStatus = (tableId: string) => {
        const tableOrders = orders.filter(o => o.tableId === tableId);
        if (tableOrders.length === 0) return 'empty';
        const unpaidOrder = tableOrders.find(o => o.paymentStatus === 'pending');
        if (unpaidOrder) return 'occupied';
        return 'free';
    };

    const activeOrder = selectedTableId
        ? orders.find(o => o.tableId === selectedTableId && o.paymentStatus === 'pending')
        : null;

    const handleMarkPaid = async (orderId: Id<"orders">) => {
        await updatePaymentStatus({ orderId, paymentStatus: 'paid' });
        setSelectedTableId(null);
    };

    return (
        <div className="flex h-full relative">
            {/* Table Grid */}
            <div className="flex-1 bg-stone-100 p-4 lg:p-6 overflow-y-auto">
                <h2 className="text-lg font-bold text-stone-700 mb-4">Tables</h2>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => {
                        const id = `T${i + 1}`;
                        const status = getTableStatus(id);
                        return (
                            <button
                                key={id}
                                onClick={() => setSelectedTableId(id)}
                                className={`h-20 lg:h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all
                                    ${selectedTableId === id ? 'ring-4 ring-orange-500/20 scale-[1.02]' : 'hover:scale-[1.02]'}
                                    ${status === 'occupied' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-stone-200'}`}
                            >
                                <span className={`text-lg lg:text-2xl font-bold ${status === 'occupied' ? 'text-orange-600' : 'text-stone-400'}`}>
                                    {id}
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${status === 'occupied' ? 'bg-orange-200 text-orange-800' : 'bg-stone-100 text-stone-400'}`}>
                                    {status === 'occupied' ? 'Active' : 'Empty'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Order Details Panel */}
            <div className={`fixed inset-0 z-50 bg-white transition-transform duration-300 lg:static lg:w-[380px] lg:translate-x-0 lg:border-l lg:border-stone-200 ${selectedTableId ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                {selectedTableId && activeOrder ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-stone-100 flex items-center gap-3">
                            <button onClick={() => setSelectedTableId(null)} className="lg:hidden p-2 -ml-2 hover:bg-stone-100 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold">Table {selectedTableId}</h2>
                                <p className="text-stone-400 text-sm">Order #{activeOrder.orderNumber}</p>
                            </div>
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">Unpaid</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {activeOrder.items.map((item) => (
                                <div key={item._id} className="flex justify-between items-start">
                                    <div className="flex gap-2">
                                        <span className="w-7 h-7 rounded bg-stone-100 flex items-center justify-center font-bold text-stone-600 text-sm">{item.quantity}x</span>
                                        <div>
                                            <p className="font-medium text-stone-800">{item.productName}</p>
                                            <p className="text-xs text-stone-400">{item.variation}</p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-stone-600">${item.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-stone-50 border-t">
                            <div className="flex justify-between mb-4 text-lg">
                                <span className="text-stone-500">Total</span>
                                <span className="font-bold">${activeOrder.total.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={() => handleMarkPaid(activeOrder._id)}
                                className="w-full h-12 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-[0.98] transition-all"
                            >
                                <IconCheck className="w-5 h-5" />
                                Mark as Paid
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full items-center justify-center text-center p-8 text-stone-400">
                        {selectedTableId && (
                            <button onClick={() => setSelectedTableId(null)} className="lg:hidden absolute top-4 left-4 p-2 hover:bg-stone-100 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                            <IconSearch className="w-6 h-6 text-stone-300" />
                        </div>
                        <h3 className="font-medium text-stone-600 mb-1">{selectedTableId ? `Table ${selectedTableId} is free` : 'Select a Table'}</h3>
                        <p className="text-sm">{selectedTableId ? 'No active orders' : 'Click on a table to view details'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// KITCHEN VIEW
// ============================================

function KitchenView() {
    const orders = useQuery(api.orders.getAllOrders) as Order[] | undefined;
    const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

    if (orders === undefined) {
        return <LoadingSpinner />;
    }

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const doneOrders = orders.filter(o => o.status === 'done').slice(0, 10);

    const handleUpdateStatus = async (orderId: Id<"orders">, status: OrderStatus) => {
        await updateOrderStatus({ orderId, status });
    };

    return (
        <div className="flex h-full overflow-x-auto p-4 gap-4">
            {/* Pending */}
            <KanbanColumn title="Pending" count={pendingOrders.length} color="orange">
                {pendingOrders.map(order => (
                    <OrderCard
                        key={order._id}
                        order={order}
                        actionLabel="Start"
                        onAction={() => handleUpdateStatus(order._id, 'preparing')}
                        colorClass="bg-orange-50 border-orange-200"
                        btnClass="bg-orange-500 text-white hover:bg-orange-600"
                    />
                ))}
            </KanbanColumn>

            {/* Preparing */}
            <KanbanColumn title="Preparing" count={preparingOrders.length} color="blue">
                {preparingOrders.map(order => (
                    <OrderCard
                        key={order._id}
                        order={order}
                        actionLabel="Done"
                        onAction={() => handleUpdateStatus(order._id, 'done')}
                        colorClass="bg-blue-50 border-blue-200"
                        btnClass="bg-blue-500 text-white hover:bg-blue-600"
                    />
                ))}
            </KanbanColumn>

            {/* Done */}
            <KanbanColumn title="Done" count={doneOrders.length} color="green">
                {doneOrders.length === 0 ? (
                    <div className="text-center p-6 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-sm">
                        No completed orders
                    </div>
                ) : (
                    doneOrders.map(order => (
                        <OrderCard key={order._id} order={order} colorClass="bg-stone-50 border-stone-200 opacity-60" />
                    ))
                )}
            </KanbanColumn>
        </div>
    );
}

function KanbanColumn({ children, title, count, color }: { children: React.ReactNode; title: string; count: number; color: string }) {
    const colors: Record<string, string> = {
        orange: 'bg-orange-50 text-orange-700',
        blue: 'bg-blue-50 text-blue-700',
        green: 'bg-green-50 text-green-700',
    };

    return (
        <div className="flex-1 min-w-[280px] max-w-sm flex flex-col h-full bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="p-3 font-bold border-b border-stone-100 flex items-center justify-between bg-white">
                <span>{title}</span>
                <span className={`px-2 py-0.5 rounded-full text-sm ${colors[color]}`}>{count}</span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 bg-stone-50/50">{children}</div>
        </div>
    );
}

function OrderCard({ order, onAction, actionLabel, colorClass, btnClass }: { order: Order; onAction?: () => void; actionLabel?: string; colorClass: string; btnClass?: string }) {
    return (
        <div className={`${colorClass} border rounded-xl p-3 shadow-sm`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-stone-800">#{order.orderNumber}</span>
                    <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-stone-500">{order.tableId}</span>
                </div>
                <span className="text-[10px] text-stone-400">{new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="space-y-0.5 mb-3">
                {order.items.map(item => (
                    <div key={item._id} className="flex gap-1.5 text-sm">
                        <span className="font-bold w-4">{item.quantity}x</span>
                        <span className="text-stone-700">{item.productName}</span>
                    </div>
                ))}
            </div>
            {onAction && (
                <button onClick={onAction} className={`w-full py-2 text-sm font-bold rounded-lg transition-all ${btnClass}`}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ============================================
// MENU MANAGEMENT VIEW
// ============================================

function MenuManagementView() {
    const categories = useQuery(api.products.getCategories) as Category[] | undefined;
    const products = useQuery(api.products.getAllProducts) as Product[] | undefined;

    const createProduct = useMutation(api.products.createProduct);
    const updateProduct = useMutation(api.products.updateProduct);
    const deleteProduct = useMutation(api.products.deleteProduct);
    const togglePopular = useMutation(api.products.toggleProductPopular);
    const createCategory = useMutation(api.products.createCategory);
    const updateCategory = useMutation(api.products.updateCategory);
    const deleteCategoryMutation = useMutation(api.products.deleteCategory);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    if (!categories || !products) {
        return <LoadingSpinner />;
    }

    const handleDeleteProduct = async (productId: Id<"products">) => {
        if (confirm('Delete this product?')) {
            await deleteProduct({ productId });
        }
    };

    const handleTogglePopular = async (productId: Id<"products">) => {
        await togglePopular({ productId });
    };

    const handleDeleteCategory = async (categoryId: Id<"categories">) => {
        const count = products.filter(p => p.categoryId === categoryId).length;
        const message = count > 0
            ? `Delete this category and its ${count} product${count > 1 ? 's' : ''}?`
            : 'Delete this category?';
        if (confirm(message)) {
            await deleteCategoryMutation({ categoryId, deleteProducts: true });
            if (selectedCategory === categoryId) {
                setSelectedCategory('all');
            }
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-56 bg-white border-r border-stone-200 p-4 flex flex-col gap-2 overflow-y-auto hidden lg:flex">
                <h3 className="font-bold text-stone-800 mb-2">Categories</h3>
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === 'all' ? 'bg-orange-100 text-orange-700' : 'hover:bg-stone-100'}`}
                >
                    All Products ({products.length})
                </button>
                {categories.map(cat => {
                    const count = products.filter(p => p.categoryId === cat._id).length;
                    return (
                        <div
                            key={cat._id}
                            className={`group relative px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center cursor-pointer ${selectedCategory === cat._id ? 'bg-orange-100 text-orange-700' : 'hover:bg-stone-100'}`}
                            onClick={() => setSelectedCategory(cat._id)}
                        >
                            <span>{cat.icon} {cat.name}</span>
                            <div className="flex items-center gap-1">
                                <span className="text-stone-400 group-hover:hidden">{count}</span>
                                <div className="hidden group-hover:flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCategory(cat);
                                        }}
                                        className="p-1 hover:bg-stone-200 rounded"
                                        title="Edit category"
                                    >
                                        <IconEdit className="w-3.5 h-3.5 text-stone-500" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCategory(cat._id);
                                        }}
                                        className="p-1 hover:bg-red-100 rounded"
                                        title="Delete category"
                                    >
                                        <IconTrash className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <button
                    onClick={() => setIsAddingCategory(true)}
                    className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 flex items-center gap-2 mt-2"
                >
                    <IconPlus className="w-4 h-4" /> Add Category
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 bg-white border-b border-stone-200 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    {/* Mobile category select */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="lg:hidden px-3 py-2 border border-stone-200 rounded-lg text-sm"
                    >
                        <option value="all">All</option>
                        {categories.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setIsAddingProduct(true)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-all"
                    >
                        <IconPlus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <div key={product._id} className="bg-white rounded-xl border border-stone-200 overflow-hidden group hover:shadow-md transition-all">
                                <div className="relative h-32 bg-stone-100">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    />
                                    {product.isPopular && (
                                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            🔥 Popular
                                        </span>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleTogglePopular(product._id)}
                                            className={`p-1.5 rounded-lg text-xs font-bold ${product.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-white text-stone-600'}`}
                                            title="Toggle popular"
                                        >
                                            🔥
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(product._id)}
                                            className="p-1.5 bg-white rounded-lg text-red-500 hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h4 className="font-bold text-sm mb-0.5 truncate">{product.name}</h4>
                                    <p className="text-xs text-stone-500 mb-2 line-clamp-1">{product.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-orange-600">${product.basePrice.toFixed(2)}</span>
                                        <button
                                            onClick={() => setEditingProduct(product)}
                                            className="text-xs text-stone-500 hover:text-orange-600 font-medium"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12 text-stone-400">
                            <p className="text-lg mb-2">No products found</p>
                            <p className="text-sm">Try adjusting your search or add a new product</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Product Modal */}
            {(editingProduct || isAddingProduct) && (
                <ProductFormModal
                    product={editingProduct}
                    categories={categories}
                    onClose={() => {
                        setEditingProduct(null);
                        setIsAddingProduct(false);
                    }}
                    onSave={async (data) => {
                        if (editingProduct) {
                            await updateProduct({ productId: editingProduct._id, ...data });
                        } else {
                            await createProduct(data);
                        }
                        setEditingProduct(null);
                        setIsAddingProduct(false);
                    }}
                />
            )}

            {/* Category Modal */}
            {(isAddingCategory || editingCategory) && (
                <CategoryFormModal
                    category={editingCategory}
                    onClose={() => {
                        setIsAddingCategory(false);
                        setEditingCategory(null);
                    }}
                    onSave={async (data) => {
                        if (editingCategory) {
                            await updateCategory({ categoryId: editingCategory._id, ...data });
                        } else {
                            await createCategory(data);
                        }
                        setIsAddingCategory(false);
                        setEditingCategory(null);
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// PRODUCT FORM MODAL
// ============================================

interface ProductFormData {
    categoryId: Id<"categories">;
    name: string;
    description: string;
    imageUrl: string;
    basePrice: number;
    isPopular?: boolean;
    variations: { name: string; price: number }[];
}

function ProductFormModal({
    product,
    categories,
    onClose,
    onSave,
}: {
    product: Product | null;
    categories: Category[];
    onClose: () => void;
    onSave: (data: ProductFormData) => Promise<void>;
}) {
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
    const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() || '');
    const [categoryId, setCategoryId] = useState<Id<"categories"> | ''>(product?.categoryId || '');
    const [isPopular, setIsPopular] = useState(product?.isPopular || false);
    const [variations, setVariations] = useState<{ name: string; price: string }[]>(
        product?.variations.map(v => ({ name: v.name, price: v.price.toString() })) || [{ name: 'Regular', price: '' }]
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !name || !basePrice || variations.length === 0) return;

        setIsSaving(true);
        try {
            await onSave({
                categoryId: categoryId as Id<"categories">,
                name,
                description,
                imageUrl: imageUrl || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
                basePrice: parseFloat(basePrice),
                isPopular,
                variations: variations
                    .filter(v => v.name && v.price)
                    .map(v => ({ name: v.name, price: parseFloat(v.price) })),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const addVariation = () => {
        setVariations([...variations, { name: '', price: '' }]);
    };

    const removeVariation = (index: number) => {
        if (variations.length > 1) {
            setVariations(variations.filter((_, i) => i !== index));
        }
    };

    const updateVariation = (index: number, field: 'name' | 'price', value: string) => {
        setVariations(variations.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold">{product ? 'Edit Product' : 'Add Product'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                        <IconClose className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value as Id<"categories">)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            required
                        >
                            <option value="">Select category</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.icon} {cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            placeholder="e.g. Cappuccino"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none"
                            rows={2}
                            placeholder="Short description..."
                        />
                    </div>

                    {/* Image URL */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Image URL</label>
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-stone-400 mt-1">Leave empty for default image</p>
                    </div>

                    {/* Base Price */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Base Price ($) *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    {/* Popular Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isPopular}
                            onChange={(e) => setIsPopular(e.target.checked)}
                            className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium">🔥 Mark as Popular</span>
                    </label>

                    {/* Variations */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Variations *</label>
                        <div className="space-y-2">
                            {variations.map((v, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={v.name}
                                        onChange={(e) => updateVariation(i, 'name', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                                        placeholder="Name (e.g. Hot, Iced)"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={v.price}
                                        onChange={(e) => updateVariation(i, 'price', e.target.value)}
                                        className="w-24 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                                        placeholder="Price"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeVariation(i)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        disabled={variations.length === 1}
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addVariation}
                            className="mt-2 text-sm text-orange-600 font-medium flex items-center gap-1 hover:text-orange-700"
                        >
                            <IconPlus className="w-4 h-4" /> Add Variation
                        </button>
                    </div>
                </form>

                <div className="p-4 border-t border-stone-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !categoryId || !name || !basePrice}
                        className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// CATEGORY FORM MODAL
// ============================================

function CategoryFormModal({
    category,
    onClose,
    onSave,
}: {
    category: Category | null;
    onClose: () => void;
    onSave: (data: { name: string; icon?: string }) => Promise<void>;
}) {
    const [name, setName] = useState(category?.name || '');
    const [icon, setIcon] = useState(category?.icon || '');
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = !!category;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsSaving(true);
        try {
            await onSave({ name, icon: icon || undefined });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold">{isEditing ? 'Edit Category' : 'Add Category'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                        <IconClose className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            placeholder="e.g. Pastries"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Icon (Emoji)</label>
                        <input
                            type="text"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            placeholder="🥐"
                            maxLength={2}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !name}
                            className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50"
                        >
                            {isSaving ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save' : 'Add')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
