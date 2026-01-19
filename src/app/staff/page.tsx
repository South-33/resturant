'use client';

// ============================================
// STAFF DASHBOARD (Kitchen + Cashier + Menu)
// Unified view for restaurant operations
// ============================================

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
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
    selectedVariations: {
        groupName: string;
        optionName: string;
        priceAdjustment: number;
    }[];
    notes?: string;
    quantity: number;
    price: number;
    // Legacy field
    variation?: string;
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
    isActive?: boolean;
    variationGroups?: {
        name: string;
        required: boolean;
        defaultOption?: string;
        options: { name: string; priceAdjustment: number }[];
    }[];
    variations?: { name: string; price: number }[];
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
            <main className="flex-1 overflow-hidden relative">
                <div className={`h-full w-full ${activeTab === 'cashier' ? 'block' : 'hidden'}`}>
                    <CashierView />
                </div>
                <div className={`h-full w-full ${activeTab === 'kitchen' ? 'block' : 'hidden'}`}>
                    <KitchenView />
                </div>
                <div className={`h-full w-full ${activeTab === 'menu' ? 'block' : 'hidden'}`}>
                    <MenuManagementView />
                </div>
            </main>
        </div>
    );
}

// ============================================
// CASHIER VIEW
// ============================================

interface TableData {
    _id: Id<"tables">;
    tableId: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'square' | 'round';
    capacity?: number;
}

interface FloorPlanData {
    gridWidth: number;
    gridHeight: number;
    doorPosition?: {
        x: number;
        y: number;
        width: number;
        side: 'top' | 'bottom' | 'left' | 'right';
    };
}

function CashierView() {
    const orders = useQuery(api.orders.getAllOrders) as Order[] | undefined;
    const updatePaymentStatus = useMutation(api.orders.updatePaymentStatus);

    // Convex Queries & Mutations
    const serverTables = useQuery(api.settings.getTables);
    const serverFloorPlan = useQuery(api.settings.getFloorPlan);
    const saveTablesMutation = useMutation(api.settings.bulkUpdateTables);
    const saveFloorPlanMutation = useMutation(api.settings.updateFloorPlan);

    // Default fallbacks (in case server is empty/fresh)
    const defaultTables: TableData[] = useMemo(() => [], []); // Memoize to prevent recreation
    const defaultFloorPlan: FloorPlanData = useMemo(
        () => ({ gridWidth: 12, gridHeight: 8, doorPosition: { x: 5, y: 0, width: 2, side: 'top' as const } }),
        []
    );

    const tablesData = useMemo(() => serverTables ?? defaultTables, [serverTables, defaultTables]);
    const floorPlan = useMemo(() => serverFloorPlan ?? defaultFloorPlan, [serverFloorPlan, defaultFloorPlan]);

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [tableNotes, setTableNotes] = useState<{ [key: string]: string }>({});
    const [editingNote, setEditingNote] = useState(false);
    const [noteInput, setNoteInput] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [localTables, setLocalTables] = useState<TableData[]>([]);
    const [localFloorPlan, setLocalFloorPlan] = useState<FloorPlanData | null>(null);
    const [draggingTable, setDraggingTable] = useState<string | null>(null);
    const [resizingTable, setResizingTable] = useState<string | null>(null);
    const [renamingTable, setRenamingTable] = useState<string | null>(null);
    const [resizingEntrance, setResizingEntrance] = useState<'left' | 'right' | null>(null);
    const [renameInput, setRenameInput] = useState('');

    // Ghost dragging state
    const [draggingEntrance, setDraggingEntrance] = useState(false);
    const [ghostPosition, setGhostPosition] = useState<{ x: number, y: number, width: number, height: number, type: 'table' | 'entrance' } | null>(null);

    // Time state for elapsed time calculations (updates every minute)
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Auto-scale floor plan to fit container
    const containerRef = useRef<HTMLDivElement>(null);
    // Start with window size (if available) to avoid "tiny" initial render
    const [containerSize, setContainerSize] = useState(() => {
        if (typeof window !== 'undefined') {
            return { width: window.innerWidth, height: window.innerHeight - 100 }; // -100 for header
        }
        return { width: 1200, height: 800 };
    });

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    setContainerSize({ width: clientWidth, height: clientHeight });
                }
            }
        };

        // Initial manual check
        updateSize();
        // Fallback checks
        const timer1 = setTimeout(updateSize, 100);
        const timer2 = setTimeout(updateSize, 500);

        // ResizeObserver is the primary source of truth
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    // We use contentRect which is the precise inner dimension
                    setContainerSize({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height,
                    });
                }
            }
        });

        observer.observe(containerRef.current);
        // Window resize backup
        window.addEventListener('resize', updateSize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    // Sync local state
    useEffect(() => {
        if (!isEditMode) {
            setLocalTables(tablesData);
            setLocalFloorPlan(floorPlan);
        }
    }, [tablesData, floorPlan, isEditMode]);

    if (orders === undefined || serverTables === undefined || serverFloorPlan === undefined) {
        return <LoadingSpinner />;
    }

    const tables = isEditMode ? localTables : tablesData;
    const grid = localFloorPlan ?? floorPlan;

    // Calculate optimal cell size to fill container
    const padding = 40; // Standard padding
    const topPadding = 64; // Reduced top padding for better balance
    const safetyBuffer = 40; // Extra buffer to ensure no scrollbars trigger unexpectedly

    // We calculate based on the RAW container size now
    const gridWidthPx = containerSize.width - padding * 2;
    // Explicitly subtract the topPadding plus our safety buffer only here
    const gridHeightPx = containerSize.height - (padding + topPadding + safetyBuffer);

    const cellSizeX = gridWidthPx / grid.gridWidth;
    const cellSizeY = gridHeightPx / grid.gridHeight;
    const cellSize = Math.max(50, Math.min(300, Math.floor(Math.min(cellSizeX, cellSizeY)))); // Clamp between 50-300px

    const floorPlanWidth = grid.gridWidth * cellSize + padding * 2;
    const floorPlanHeight = grid.gridHeight * cellSize + padding + topPadding;

    const getTableInfo = (tableId: string) => {
        const tableOrders = orders.filter(o => o.tableId === tableId);
        const unpaidOrder = tableOrders.find(o => o.paymentStatus === 'pending');

        if (!unpaidOrder) {
            return { status: 'empty' as const, order: null };
        }

        let foodStatus: 'pending' | 'preparing' | 'ready' | 'served' = 'pending';
        if (unpaidOrder.status === 'preparing') foodStatus = 'preparing';
        if (unpaidOrder.status === 'done') foodStatus = 'ready';

        return {
            status: 'occupied' as const,
            order: unpaidOrder,
            foodStatus,
            timeElapsed: Math.floor((currentTime - unpaidOrder._creationTime) / 60000),
        };
    };

    const activeTableInfo = selectedTableId ? getTableInfo(selectedTableId) : null;
    const activeOrder = activeTableInfo?.order;

    const handleMarkPaid = async (orderId: Id<"orders">, method: 'cash' | 'khqr') => {
        await updatePaymentStatus({ orderId, paymentStatus: 'paid', paymentMethod: method });
        setSelectedTableId(null);
    };

    const handleSaveNote = () => {
        if (selectedTableId) {
            setTableNotes(prev => ({ ...prev, [selectedTableId]: noteInput }));
        }
        setEditingNote(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-stone-200 text-stone-600';
            case 'preparing': return 'bg-blue-100 text-blue-700';
            case 'ready': return 'bg-green-100 text-green-700'; // Green light for ready
            case 'served': return 'bg-stone-800 text-white';
            default: return 'bg-stone-200 text-stone-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Ordered';
            case 'preparing': return 'Cooking';
            case 'ready': return '✅ Ready';
            case 'served': return '🍽️ Served';
            default: return status;
        }
    };

    // Edit mode handlers
    const startEdit = () => {
        setLocalTables([...tablesData]);
        setLocalFloorPlan({ ...floorPlan });
        setIsEditMode(true);
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setLocalTables(tablesData);
        setLocalFloorPlan(floorPlan);
    };

    const saveEdit = async () => {
        if (!localFloorPlan) return;

        // Save to Convex
        await Promise.all([
            saveTablesMutation({
                tables: localTables.map(t => ({
                    // We map to the API expected format. 
                    // Note: API expects 'id' (optional), but primarily uses 'tableId' to match.
                    // We filter out fake IDs that start with 'T' if they aren't real Convex IDs, 
                    // but actually the backend logic relying on 'tableId' means we can just pass the fields we care about.
                    tableId: t.tableId,
                    name: t.name,
                    x: t.x,
                    y: t.y,
                    width: t.width,
                    height: t.height,
                    shape: t.shape,
                    capacity: t.capacity
                }))
            }),
            saveFloorPlanMutation({
                gridWidth: localFloorPlan.gridWidth,
                gridHeight: localFloorPlan.gridHeight,
                doorPosition: localFloorPlan.doorPosition
            })
        ]);

        setIsEditMode(false);
    };

    const addTable = () => {
        const nextNum = localTables.length + 1;
        const newTable: TableData = {
            _id: `T${nextNum}` as Id<"tables">,
            tableId: `T${nextNum}`,
            x: 1,
            y: 2,
            width: 2,
            height: 1,
            shape: 'square',
        };
        setLocalTables([...localTables, newTable]);
    };

    const deleteTable = (tableId: string) => {
        setLocalTables(localTables.filter(t => t.tableId !== tableId));
    };

    const updateTablePosition = (tableId: string, x: number, y: number) => {
        setLocalTables(localTables.map(t =>
            t.tableId === tableId ? { ...t, x: Math.max(0, Math.min(grid.gridWidth - t.width, x)), y: Math.max(0, Math.min(grid.gridHeight - t.height, y)) } : t
        ));
    };

    const updateTableSize = (tableId: string, width: number, height: number) => {
        setLocalTables(localTables.map(t =>
            t.tableId === tableId ? { ...t, width: Math.max(1, Math.min(4, width)), height: Math.max(1, Math.min(3, height)) } : t
        ));
    };

    const renameTable = (tableId: string, newName: string | undefined) => {
        setLocalTables(localTables.map(t =>
            t.tableId === tableId ? { ...t, name: newName || undefined } : t
        ));
    };

    return (
        <div className="flex h-full relative">
            {/* Floor Plan Grid */}
            <div ref={containerRef} className="flex-1 bg-stone-50 p-6 overflow-auto flex flex-col relative">
                <div
                    className="relative bg-white rounded-2xl border-2 border-stone-200 shadow-xl overflow-hidden transition-all duration-300 my-auto"
                    style={{ width: floorPlanWidth, height: floorPlanHeight }}
                >
                    {/* Edit Controls - Inside Container */}
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {isEditMode ? (
                            <>
                                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-sm">
                                    <input
                                        type="number"
                                        value={localFloorPlan?.gridWidth || 8}
                                        onChange={(e) => localFloorPlan && setLocalFloorPlan({ ...localFloorPlan, gridWidth: parseInt(e.target.value) || 8 })}
                                        className="w-8 text-center text-sm font-bold border-b border-stone-200 focus:outline-none"
                                        min={4} max={20}
                                    />
                                    <span className="text-stone-300 text-xs">×</span>
                                    <input
                                        type="number"
                                        value={localFloorPlan?.gridHeight || 6}
                                        onChange={(e) => localFloorPlan && setLocalFloorPlan({ ...localFloorPlan, gridHeight: parseInt(e.target.value) || 6 })}
                                        className="w-8 text-center text-sm font-bold border-b border-stone-200 focus:outline-none"
                                        min={4} max={20}
                                    />
                                </div>
                                <button onClick={addTable} className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 shadow-sm">
                                    + Add
                                </button>
                                <button onClick={cancelEdit} className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-lg shadow-sm">
                                    Cancel
                                </button>
                                <button onClick={saveEdit} className="px-3 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-lg shadow-sm">
                                    Save
                                </button>
                            </>
                        ) : (
                            <button onClick={startEdit} className="px-3 py-1.5 bg-white border border-stone-200 text-stone-500 hover:text-stone-900 text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm">
                                <IconEdit className="w-3.5 h-3.5" /> Edit Layout
                            </button>
                        )}
                    </div>

                    {/* Internal padding area - Drop Zone */}
                    <div
                        className="absolute"
                        style={{
                            left: padding,
                            top: topPadding,
                            width: grid.gridWidth * cellSize,
                            height: grid.gridHeight * cellSize
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isEditMode) return;

                            const rect = e.currentTarget.getBoundingClientRect();
                            const mouseX = e.clientX - rect.left;
                            const mouseY = e.clientY - rect.top;
                            const rawX = Math.floor(mouseX / cellSize);
                            const rawY = Math.floor(mouseY / cellSize);

                            if (draggingTable) {
                                const activeTable = tables.find(t => t.tableId === draggingTable);
                                if (!activeTable) return;

                                const clampedX = Math.max(0, Math.min(grid.gridWidth - activeTable.width, rawX));
                                const clampedY = Math.max(0, Math.min(grid.gridHeight - activeTable.height, rawY));

                                if (!ghostPosition || ghostPosition.x !== clampedX || ghostPosition.y !== clampedY) {
                                    setGhostPosition({
                                        x: clampedX,
                                        y: clampedY,
                                        width: activeTable.width,
                                        height: activeTable.height,
                                        type: 'table'
                                    });
                                }
                            } else if (draggingEntrance && grid.doorPosition) {
                                // Entrance dragging logic (constrained to Horizontal axis of current side)
                                // We keep the side fixed for now as requested "moveable", assuming along the wall.
                                // If needed we could detect if mouse is near top vs bottom to switch side.
                                const clampedX = Math.max(0, Math.min(grid.gridWidth - grid.doorPosition.width, rawX));
                                const sideY = grid.doorPosition.side === 'top' ? 0 : grid.gridHeight - 1; // logical Y for ghost

                                if (!ghostPosition || ghostPosition.x !== clampedX) {
                                    setGhostPosition({
                                        x: clampedX,
                                        y: sideY, // Only used for ghost rendering
                                        width: grid.doorPosition.width,
                                        height: 0.5, // Special identifier logic could use this, but we have type now
                                        type: 'entrance'
                                    });
                                }
                            }
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isEditMode || !ghostPosition) return;

                            if (draggingTable) {
                                updateTablePosition(draggingTable, ghostPosition.x, ghostPosition.y);
                                setDraggingTable(null);
                            } else if (draggingEntrance && localFloorPlan) {
                                setLocalFloorPlan({
                                    ...localFloorPlan,
                                    doorPosition: { ...localFloorPlan.doorPosition!, x: ghostPosition.x }
                                });
                                setDraggingEntrance(false);
                            }
                            setGhostPosition(null);
                        }}
                    >
                        {/* Grid lines - always visible now */}
                        <div className="absolute inset-0 pointer-events-none opacity-50">
                            {Array.from({ length: grid.gridWidth + 1 }).map((_, i) => (
                                <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-stone-100" style={{ left: i * cellSize }} />
                            ))}
                            {Array.from({ length: grid.gridHeight + 1 }).map((_, i) => (
                                <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-stone-100" style={{ top: i * cellSize }} />
                            ))}
                        </div>

                        {/* Ghost Placeholder */}
                        {ghostPosition && isEditMode && (
                            <div
                                className={`absolute border-2 rounded-xl z-0 transition-all duration-75 pointer-events-none flex items-center justify-center
                                ${ghostPosition.type === 'entrance' ? 'border-amber-400 bg-amber-100/50' : 'border-blue-500 bg-blue-100/50'}`}
                                style={{
                                    left: ghostPosition.x * cellSize + (ghostPosition.type === 'entrance' ? 0 : 6),
                                    top: ghostPosition.type === 'entrance'
                                        ? (grid.doorPosition?.side === 'top' ? 0 : undefined)
                                        : ghostPosition.y * cellSize + 6,
                                    bottom: ghostPosition.type === 'entrance' && grid.doorPosition?.side === 'bottom' ? 0 : undefined,
                                    width: ghostPosition.width * cellSize - (ghostPosition.type === 'entrance' ? 0 : 12),
                                    height: ghostPosition.type === 'entrance' ? 28 : ghostPosition.height * cellSize - 12,
                                }}
                            >
                                <div className={`font-bold opacity-60 text-sm ${ghostPosition.type === 'entrance' ? 'text-amber-700' : 'text-blue-900/40'}`}>
                                    Drop
                                </div>
                            </div>
                        )}

                        {/* Door / Entrance */}
                        {/* Door / Entrance */}
                        {grid.doorPosition && (
                            <div
                                className={`absolute bg-gradient-to-b from-amber-50 to-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 text-xs font-bold rounded-b-lg shadow-sm
                                    ${isEditMode ? 'cursor-move border-dashed hover:border-amber-500' : ''}
                                    ${draggingEntrance ? 'opacity-0' : ''}`}
                                style={{
                                    left: grid.doorPosition.x * cellSize,
                                    top: grid.doorPosition.side === 'top' ? 0 : undefined,
                                    bottom: grid.doorPosition.side === 'bottom' ? 0 : undefined,
                                    width: grid.doorPosition.width * cellSize,
                                    height: 28,
                                }}
                                draggable={isEditMode && !resizingEntrance}
                                onDragStart={(e) => {
                                    if (!isEditMode || resizingEntrance) {
                                        e.preventDefault();
                                        return;
                                    }
                                    setDraggingEntrance(true);
                                    e.dataTransfer.effectAllowed = 'move';

                                    // RELIABLE: Hide default drag image using canvas
                                    const canvas = document.createElement('canvas');
                                    canvas.width = 1;
                                    canvas.height = 1;
                                    document.body.appendChild(canvas);
                                    e.dataTransfer.setDragImage(canvas, 0, 0);
                                    setTimeout(() => {
                                        if (document.body.contains(canvas)) {
                                            document.body.removeChild(canvas);
                                        }
                                    }, 0);
                                }}
                                onDragEnd={() => {
                                    setDraggingEntrance(false);
                                    setGhostPosition(null);
                                }}
                            >
                                {isEditMode && (
                                    <>
                                        {/* Left Resize Handle */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-400/30 flex items-center justify-center"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                if (!localFloorPlan || !grid.doorPosition) return;
                                                setResizingEntrance('left');
                                                const startX = e.clientX;
                                                const initialDoorX = grid.doorPosition.x;
                                                const initialDoorW = grid.doorPosition.width;

                                                const handleMove = (moveE: MouseEvent) => {
                                                    const dx = Math.round((moveE.clientX - startX) / cellSize);
                                                    const newX = Math.max(0, Math.min(initialDoorX + initialDoorW - 1, initialDoorX + dx));
                                                    const newW = initialDoorW + (initialDoorX - newX);

                                                    if (newW >= 1 && newX >= 0) {
                                                        setLocalFloorPlan(prev => prev ? {
                                                            ...prev,
                                                            doorPosition: { ...prev.doorPosition!, x: newX, width: newW }
                                                        } : null);
                                                    }
                                                };

                                                const handleUp = () => {
                                                    setResizingEntrance(null);
                                                    window.removeEventListener('mousemove', handleMove);
                                                    window.removeEventListener('mouseup', handleUp);
                                                };

                                                window.addEventListener('mousemove', handleMove);
                                                window.addEventListener('mouseup', handleUp);
                                            }}
                                        >
                                            <div className="w-1 h-3 bg-amber-400 rounded-full" />
                                        </div>

                                        {/* Right Resize Handle */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-400/30 flex items-center justify-center"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                if (!localFloorPlan || !grid.doorPosition) return;
                                                setResizingEntrance('right');
                                                const startX = e.clientX;
                                                const initialDoorW = grid.doorPosition.width;

                                                const handleMove = (moveE: MouseEvent) => {
                                                    const dx = Math.round((moveE.clientX - startX) / cellSize);
                                                    const newW = Math.max(1, Math.min(grid.gridWidth - grid.doorPosition!.x, initialDoorW + dx));

                                                    setLocalFloorPlan(prev => prev ? {
                                                        ...prev,
                                                        doorPosition: { ...prev.doorPosition!, width: newW }
                                                    } : null);
                                                };

                                                const handleUp = () => {
                                                    setResizingEntrance(null);
                                                    window.removeEventListener('mousemove', handleMove);
                                                    window.removeEventListener('mouseup', handleUp);
                                                };

                                                window.addEventListener('mousemove', handleMove);
                                                window.addEventListener('mouseup', handleUp);
                                            }}
                                        >
                                            <div className="w-1 h-3 bg-amber-400 rounded-full" />
                                        </div>
                                    </>
                                )}
                                <span className="pointer-events-none select-none">
                                    {isEditMode ? 'ENTRANCE' : 'ENTRANCE'}
                                </span>
                            </div>
                        )}

                        {/* Tables */}
                        {tables.map(table => {
                            const info = getTableInfo(table.tableId);
                            const hasNote = tableNotes[table.tableId];
                            const isSelected = selectedTableId === table.tableId;
                            const isDragging = draggingTable === table.tableId;
                            const isRenaming = renamingTable === table.tableId;

                            return (
                                <div
                                    key={table.tableId}
                                    className={`absolute rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-transform transition-colors transition-shadow duration-200 shadow-sm group/table
                                    ${isSelected && !isEditMode ? 'ring-4 ring-orange-500/30 scale-[1.02] shadow-md' : ''}
                                    ${isDragging ? 'opacity-0' : ''}
                                    ${info.status === 'occupied' ? 'bg-orange-50 border-orange-400' : 'bg-white border-stone-200'}
                                    ${isEditMode ? 'border-dashed hover:border-blue-400 cursor-move' : 'cursor-pointer hover:shadow-md hover:border-stone-300'}`}
                                    style={{
                                        left: table.x * cellSize + 6,
                                        top: table.y * cellSize + 6,
                                        width: table.width * cellSize - 12,
                                        height: table.height * cellSize - 12,
                                    }}
                                    onClick={() => !isEditMode && setSelectedTableId(table.tableId)}
                                    onDoubleClick={() => {
                                        if (isEditMode && !isRenaming) {
                                            setRenamingTable(table.tableId);
                                            setRenameInput(table.name || table.tableId);
                                        }
                                    }}
                                    draggable={isEditMode && !resizingTable && !isRenaming}
                                    onDragStart={(e) => {
                                        if (!isEditMode || resizingTable || isRenaming) {
                                            e.preventDefault();
                                            return;
                                        }
                                        setDraggingTable(table.tableId);
                                        e.dataTransfer.effectAllowed = 'move';

                                        // RELIABLE: Hide default drag image using canvas
                                        const canvas = document.createElement('canvas');
                                        canvas.width = 1;
                                        canvas.height = 1;
                                        // We append it to body to ensure it's "visible" to the browser engine, then remove it
                                        document.body.appendChild(canvas);
                                        e.dataTransfer.setDragImage(canvas, 0, 0);
                                        // Cleanup
                                        setTimeout(() => {
                                            if (document.body.contains(canvas)) {
                                                document.body.removeChild(canvas);
                                            }
                                        }, 0);
                                    }}
                                    onDragEnd={() => {
                                        setDraggingTable(null);
                                        setGhostPosition(null);
                                    }}
                                >
                                    {/* Note indicator */}
                                    {hasNote && !isEditMode && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm" />}

                                    {/* Table name/ID - editable in edit mode */}
                                    {isRenaming ? (
                                        <input
                                            type="text"
                                            value={renameInput}
                                            onChange={(e) => setRenameInput(e.target.value)}
                                            onBlur={() => {
                                                renameTable(table.tableId, renameInput.trim() || undefined);
                                                setRenamingTable(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    renameTable(table.tableId, renameInput.trim() || undefined);
                                                    setRenamingTable(null);
                                                } else if (e.key === 'Escape') {
                                                    setRenamingTable(null);
                                                }
                                            }}
                                            className="w-16 text-center text-lg font-bold bg-white border border-blue-400 rounded px-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className={`text-lg font-bold ${info.status === 'occupied' ? 'text-orange-600' : 'text-stone-600'}`}>
                                            {table.name || table.tableId}
                                        </span>
                                    )}

                                    {/* Status */}
                                    {!isEditMode && (
                                        info.status === 'occupied' && info.order ? (
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(info.foodStatus || 'pending')}`}>
                                                {getStatusLabel(info.foodStatus || 'pending')}
                                            </span>
                                        ) : (
                                            <span className="text-xs uppercase font-medium text-stone-400">Empty</span>
                                        )
                                    )}

                                    {/* Edit mode controls */}
                                    {isEditMode && (
                                        <>
                                            {/* Delete button - only visible on hover */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteTable(table.tableId); }}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 opacity-0 group-hover/table:opacity-100 transition-opacity z-10"
                                            >
                                                ×
                                            </button>
                                            {/* Resize handle */}
                                            <div
                                                className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-center justify-center"
                                                draggable={false}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setResizingTable(table.tableId);
                                                    const startX = e.clientX;
                                                    const startY = e.clientY;
                                                    const startW = table.width;
                                                    const startH = table.height;

                                                    const handleMove = (moveE: MouseEvent) => {
                                                        moveE.preventDefault();
                                                        const dx = Math.round((moveE.clientX - startX) / cellSize);
                                                        const dy = Math.round((moveE.clientY - startY) / cellSize);
                                                        updateTableSize(table.tableId, startW + dx, startH + dy);
                                                    };

                                                    const handleUp = () => {
                                                        setResizingTable(null);
                                                        window.removeEventListener('mousemove', handleMove);
                                                        window.removeEventListener('mouseup', handleUp);
                                                    };

                                                    window.addEventListener('mousemove', handleMove);
                                                    window.addEventListener('mouseup', handleUp);
                                                }}
                                            >
                                                <svg viewBox="0 0 10 10" className="w-3 h-3 text-stone-400">
                                                    <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Order Details Panel */}
            <div className={`fixed inset-0 z-50 bg-white transition-transform duration-300 lg:static lg:w-[400px] lg:translate-x-0 lg:border-l lg:border-stone-200 flex flex-col ${selectedTableId && !isEditMode ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                {selectedTableId && activeOrder && !isEditMode ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-4 border-b border-stone-100">
                            <div className="flex items-center gap-3 mb-3">
                                <button onClick={() => setSelectedTableId(null)} className="lg:hidden p-2 -ml-2 hover:bg-stone-100 rounded-full">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">Table {selectedTableId}</h2>
                                    <p className="text-stone-400 text-sm">Order #{activeOrder.orderNumber}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">Unpaid</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(activeTableInfo?.foodStatus || 'pending')}`}>
                                        {getStatusLabel(activeTableInfo?.foodStatus || 'pending')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs text-stone-500">
                                <span>⏱️ {activeTableInfo?.timeElapsed || 0} min ago</span>
                                <span>🍽️ {activeOrder.items.length} items</span>
                            </div>
                        </div>

                        {/* Table Note */}
                        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                            {editingNote ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={noteInput}
                                        onChange={(e) => setNoteInput(e.target.value)}
                                        placeholder="VIP, allergies, special requests..."
                                        className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-orange-500"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveNote} className="px-3 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg">Save</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setNoteInput(tableNotes[selectedTableId] || ''); setEditingNote(true); }}
                                    className="w-full text-left text-sm text-stone-500 hover:text-stone-700"
                                >
                                    {tableNotes[selectedTableId] ? (
                                        <span className="flex items-center gap-2"><span className="text-blue-500">📝</span>{tableNotes[selectedTableId]}</span>
                                    ) : (
                                        <span className="text-stone-400 italic">+ Add note (VIP, allergies...)</span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Order Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="text-xs font-bold text-stone-400 uppercase mb-3">Order Items</h3>
                            <div className="space-y-3">
                                {activeOrder.items.map((item) => (
                                    <div key={item._id} className="flex justify-between items-center bg-stone-50 rounded-lg p-3">
                                        <div className="flex gap-3 items-center">
                                            <span className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 text-sm">{item.quantity}x</span>
                                            <div>
                                                <p className="font-medium text-stone-800">{item.productName}</p>
                                                <p className="text-xs text-stone-400">
                                                    {item.selectedVariations?.map(v => v.optionName).join(', ') || item.variation || ''}
                                                </p>
                                                {item.notes && (
                                                    <p className="text-xs text-blue-500 italic mt-0.5">Note: {item.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-semibold text-stone-700">${item.price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer - Payment */}
                        <div className="p-4 bg-white border-t border-stone-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-stone-500">Total</span>
                                <span className="text-2xl font-bold">${activeOrder.total.toFixed(2)}</span>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleMarkPaid(activeOrder._id, 'khqr')}
                                    className="w-full h-12 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-[0.98] transition-all"
                                >
                                    <span className="text-lg">📱</span> Paid via KHQR
                                </button>
                                <button
                                    onClick={() => handleMarkPaid(activeOrder._id, 'cash')}
                                    className="w-full h-12 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all"
                                >
                                    <span className="text-lg">💵</span> Received Cash
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full items-center justify-center text-center p-8 text-stone-400">
                        {selectedTableId && !isEditMode && (
                            <button onClick={() => setSelectedTableId(null)} className="lg:hidden absolute top-4 left-4 p-2 hover:bg-stone-100 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
                            <IconSearch className="w-7 h-7 text-stone-300" />
                        </div>
                        <h3 className="font-semibold text-stone-600 mb-1">{isEditMode ? 'Edit Mode Active' : selectedTableId ? `Table ${selectedTableId} is free` : 'Select a Table'}</h3>
                        <p className="text-sm">{isEditMode ? 'Drag tables to reposition them' : selectedTableId ? 'No active orders' : 'Click on a table to view details'}</p>
                    </div>
                )}
            </div>
        </div >
    );
}

// ============================================
// KITCHEN VIEW
// ============================================

function KitchenView() {
    const orders = useQuery(api.orders.getAllOrders) as Order[] | undefined;
    const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
    const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'done'>('pending');
    
    // Time state for elapsed time calculations (updates every minute)
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    if (orders === undefined) {
        return <LoadingSpinner />;
    }

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const doneOrders = orders.filter(o => o.status === 'done').slice(0, 10);

    const handleUpdateStatus = async (orderId: Id<"orders">, status: OrderStatus) => {
        await updateOrderStatus({ orderId, status });
    };

    const tabs = [
        { key: 'pending' as const, label: 'Pending', count: pendingOrders.length, color: 'orange' },
        { key: 'preparing' as const, label: 'Preparing', count: preparingOrders.length, color: 'blue' },
        { key: 'done' as const, label: 'Done', count: doneOrders.length, color: 'green' },
    ];

    const getTabOrders = () => {
        switch (activeTab) {
            case 'pending': return pendingOrders;
            case 'preparing': return preparingOrders;
            case 'done': return doneOrders;
        }
    };

    return (
        <div className="flex flex-col h-full bg-stone-100">
            {/* Mobile Tab Bar */}
            <div className="lg:hidden flex border-b border-stone-200 bg-white">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-3 text-sm font-semibold transition-all relative
                            ${activeTab === tab.key ? 'text-stone-900' : 'text-stone-400'}`}
                    >
                        {tab.label}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs
                            ${tab.color === 'orange' ? 'bg-orange-100 text-orange-700' : ''}
                            ${tab.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                            ${tab.color === 'green' ? 'bg-green-100 text-green-700' : ''}`}>
                            {tab.count}
                        </span>
                        {activeTab === tab.key && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />
                        )}
                    </button>
                ))}
            </div>

            {/* Mobile Content */}
            <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-3">
                {getTabOrders().length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                        <p className="text-lg mb-1">No {activeTab} orders</p>
                        <p className="text-sm">Orders will appear here</p>
                    </div>
                ) : (
                    getTabOrders().map(order => (
                        <KitchenOrderCard
                            key={order._id}
                            order={order}
                            status={activeTab}
                            currentTime={currentTime}
                            onAction={
                                activeTab === 'pending'
                                    ? () => handleUpdateStatus(order._id, 'preparing')
                                    : activeTab === 'preparing'
                                        ? () => handleUpdateStatus(order._id, 'done')
                                        : undefined
                            }
                            actionLabel={activeTab === 'pending' ? 'Start Cooking' : activeTab === 'preparing' ? 'Mark Done' : undefined}
                        />
                    ))
                )}
            </div>

            {/* Desktop 3-Column Layout */}
            <div className="hidden lg:flex flex-1 p-4 gap-4 overflow-hidden">
                <KanbanColumn title="Pending" count={pendingOrders.length} color="orange" isEmpty={pendingOrders.length === 0}>
                    {pendingOrders.map(order => (
                        <KitchenOrderCard
                            key={order._id}
                            order={order}
                            status="pending"
                            currentTime={currentTime}
                            onAction={() => handleUpdateStatus(order._id, 'preparing')}
                            actionLabel="Start Cooking"
                        />
                    ))}
                </KanbanColumn>

                <KanbanColumn title="Preparing" count={preparingOrders.length} color="blue" isEmpty={preparingOrders.length === 0}>
                    {preparingOrders.map(order => (
                        <KitchenOrderCard
                            key={order._id}
                            order={order}
                            status="preparing"
                            currentTime={currentTime}
                            onAction={() => handleUpdateStatus(order._id, 'done')}
                            actionLabel="Mark Done"
                        />
                    ))}
                </KanbanColumn>

                <KanbanColumn title="Done" count={doneOrders.length} color="green" isEmpty={doneOrders.length === 0}>
                    {doneOrders.map(order => (
                        <KitchenOrderCard
                            key={order._id}
                            order={order}
                            status="done"
                            currentTime={currentTime}
                        />
                    ))}
                </KanbanColumn>
            </div>
        </div>
    );
}

function KanbanColumn({ children, title, count, color, isEmpty }: { children: React.ReactNode; title: string; count: number; color: string; isEmpty?: boolean }) {
    const colors: Record<string, { badge: string; header: string }> = {
        orange: { badge: 'bg-orange-100 text-orange-700', header: 'border-orange-200' },
        blue: { badge: 'bg-blue-100 text-blue-700', header: 'border-blue-200' },
        green: { badge: 'bg-green-100 text-green-700', header: 'border-green-200' },
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className={`p-4 font-bold border-b-2 ${colors[color].header} flex items-center justify-between bg-white`}>
                <span className="text-stone-800">{title}</span>
                <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${colors[color].badge}`}>{count}</span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 bg-stone-50/30">
                {isEmpty ? (
                    <div className="text-center py-8 text-stone-400">
                        <p className="text-sm">No orders</p>
                    </div>
                ) : children}
            </div>
        </div>
    );
}

function KitchenOrderCard({ order, status, onAction, actionLabel, currentTime }: {
    order: Order;
    status: 'pending' | 'preparing' | 'done';
    onAction?: () => void;
    actionLabel?: string;
    currentTime: number;
}) {
    const minutesAgo = Math.floor((currentTime - order._creationTime) / 60000);
    const isUrgent = status === 'pending' && minutesAgo > 5;

    const statusStyles = {
        pending: 'bg-orange-50 border-orange-200',
        preparing: 'bg-blue-50 border-blue-200',
        done: 'bg-stone-50 border-stone-200 opacity-70',
    };

    const btnStyles = {
        pending: 'bg-orange-500 hover:bg-orange-600 text-white',
        preparing: 'bg-blue-500 hover:bg-blue-600 text-white',
        done: '',
    };

    return (
        <div className={`${statusStyles[status]} border-2 rounded-xl p-4 shadow-sm ${isUrgent ? 'ring-2 ring-red-400' : ''}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl text-stone-800">#{order.orderNumber}</span>
                    <span className="bg-stone-200 px-2 py-0.5 rounded-lg text-xs font-bold text-stone-600">{order.tableId}</span>
                </div>
                <div className="text-right">
                    <span className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-stone-400'}`}>
                        {minutesAgo}m ago
                    </span>
                    {isUrgent && <span className="block text-[10px] text-red-500 font-bold">URGENT</span>}
                </div>
            </div>

            <div className="space-y-1.5 mb-4">
                {order.items.map(item => (
                    <div key={item._id} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
                        <span className="font-bold text-stone-700 w-6">{item.quantity}×</span>
                        <span className="text-stone-800 font-medium">{item.productName}</span>
                        {(item.selectedVariations?.length > 0 || item.variation) && (
                            <span className="text-stone-400 text-xs">
                                ({item.selectedVariations?.map(v => v.optionName).join(', ') || item.variation})
                            </span>
                        )}
                        {item.notes && (
                            <span className="w-full text-xs text-blue-500 italic ml-6">Note: {item.notes}</span>
                        )}
                    </div>
                ))}
            </div>

            {onAction && (
                <button
                    onClick={onAction}
                    className={`w-full py-3 text-sm font-bold rounded-xl transition-all active:scale-[0.98] ${btnStyles[status]}`}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ============================================
// MENU MANAGEMENT VIEW
// ============================================

// Helper to validate URL
function isValidUrl(urlString: string): boolean {
    if (!urlString || urlString.trim() === '') return false;
    try {
        new URL(urlString);
        return true;
    } catch {
        return false;
    }
}

function MenuManagementView() {
    const categories = useQuery(api.products.getCategories) as Category[] | undefined;
    const products = useQuery(api.products.getAllProducts) as Product[] | undefined;

    const createProduct = useMutation(api.products.createProduct);
    const updateProduct = useMutation(api.products.updateProduct);
    const deleteProduct = useMutation(api.products.deleteProduct);
    const togglePopular = useMutation(api.products.toggleProductPopular);
    const toggleActive = useMutation(api.products.toggleProductActive);
    const bulkToggleActive = useMutation(api.products.bulkToggleActive);
    const bulkDeleteProducts = useMutation(api.products.bulkDeleteProducts);
    const bulkTogglePopular = useMutation(api.products.bulkTogglePopular);
    const createCategory = useMutation(api.products.createCategory);
    const updateCategory = useMutation(api.products.updateCategory);
    const deleteCategoryMutation = useMutation(api.products.deleteCategory);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<Id<"products">>>(new Set());

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            let matchesCategory = false;
            if (selectedCategory === 'all') {
                matchesCategory = true;
            } else if (selectedCategory === 'popular') {
                matchesCategory = p.isPopular;
            } else {
                matchesCategory = p.categoryId === selectedCategory;
            }
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    if (!categories || !products) {
        return <LoadingSpinner />;
    }

    const handleTogglePopular = async (productId: Id<"products">) => {
        await togglePopular({ productId });
    };

    const handleToggleActive = async (productId: Id<"products">) => {
        await toggleActive({ productId });
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

    // Bulk selection handlers
    const toggleSelection = (id: Id<"products">) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredProducts.map(p => p._id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkSetActive = async (isActive: boolean) => {
        await bulkToggleActive({ productIds: Array.from(selectedIds), isActive });
        clearSelection();
    };

    const handleBulkDelete = async () => {
        if (confirm(`Delete ${selectedIds.size} selected products?`)) {
            await bulkDeleteProducts({ productIds: Array.from(selectedIds) });
            clearSelection();
        }
    };

    const handleBulkSetPopular = async (isPopular: boolean) => {
        await bulkTogglePopular({ productIds: Array.from(selectedIds), isPopular });
        clearSelection();
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-56 bg-white border-r border-stone-200 p-4 flex flex-col gap-1 overflow-y-auto hidden lg:flex">
                <h3 className="font-bold text-stone-800 mb-2">Categories</h3>
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between ${selectedCategory === 'all' ? 'bg-orange-100 text-orange-700' : 'hover:bg-stone-100'}`}
                >
                    <span>All Products</span>
                    <span className="text-stone-400 text-xs">{products.length}</span>
                </button>

                {/* Popular - virtual category */}
                <button
                    onClick={() => setSelectedCategory('popular')}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between ${selectedCategory === 'popular' ? 'bg-orange-100 text-orange-700' : 'hover:bg-stone-100'}`}
                >
                    <span>🔥 Popular</span>
                    <span className="text-stone-400 text-xs">{products.filter(p => p.isPopular).length}</span>
                </button>

                <div className="h-px bg-stone-200 my-2" />

                {categories.filter(cat => cat.name.toLowerCase() !== 'popular').map(cat => {
                    const count = products.filter(p => p.categoryId === cat._id).length;
                    return (
                        <div
                            key={cat._id}
                            className={`group relative px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center cursor-pointer ${selectedCategory === cat._id ? 'bg-orange-100 text-orange-700' : 'hover:bg-stone-100'}`}
                            onClick={() => setSelectedCategory(cat._id)}
                        >
                            <span className="truncate">{cat.icon} {cat.name}</span>
                            <div className="relative w-12 flex justify-end">
                                {/* Count - always visible but fades on hover */}
                                <span className="text-stone-400 text-xs transition-opacity group-hover:opacity-0">{count}</span>
                                {/* Buttons - absolute positioned to prevent layout shift */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
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

                {/* Selection Toolbar - always visible */}
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center gap-4">
                    {/* Select all checkbox */}
                    <button
                        onClick={() => selectedIds.size === filteredProducts.length ? clearSelection() : selectAll()}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                            ${selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : selectedIds.size > 0
                                    ? 'bg-orange-200 border-orange-500'
                                    : 'border-stone-300 hover:border-stone-400'}`}
                    >
                        {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 && <IconCheck className="w-3 h-3" />}
                        {selectedIds.size > 0 && selectedIds.size < filteredProducts.length && <span className="w-2 h-0.5 bg-orange-500 rounded" />}
                    </button>

                    <span className="text-sm text-stone-600">
                        {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredProducts.length} selected` : `${filteredProducts.length} products`}
                    </span>

                    <div className="flex-1" />

                    {/* Bulk actions - always visible, disabled when none selected */}
                    <div className="flex items-center gap-1.5">
                        {/* Stock actions */}
                        <button
                            onClick={() => handleBulkSetActive(true)}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                        >
                            ✅ In Stock
                        </button>
                        <button
                            onClick={() => handleBulkSetActive(false)}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100"
                        >
                            🚫 Out of Stock
                        </button>

                        <div className="w-px h-5 bg-stone-200 mx-1" />

                        {/* Popular actions */}
                        <button
                            onClick={() => handleBulkSetPopular(true)}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100"
                        >
                            🔥 Mark Popular
                        </button>
                        <button
                            onClick={() => handleBulkSetPopular(false)}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100"
                        >
                            Remove Popular
                        </button>

                        <div className="w-px h-5 bg-stone-200 mx-1" />

                        {/* Delete */}
                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-red-200 text-red-600 hover:bg-red-50"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const isActive = product.isActive !== false;
                            const isSelected = selectedIds.has(product._id);
                            const category = categories.find(c => c._id === product.categoryId);
                            return (
                                <div
                                    key={product._id}
                                    onClick={() => toggleSelection(product._id)}
                                    className={`bg-white rounded-xl border overflow-hidden group hover:shadow-md transition-all relative cursor-pointer
                                        ${isSelected ? 'ring-2 ring-orange-500 border-orange-500' : 'border-stone-200'}
                                        ${!isActive ? 'opacity-60' : ''}`}
                                >
                                    {/* Selection indicator */}
                                    <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all pointer-events-none
                                        ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/90 border-stone-300'}`}
                                    >
                                        {isSelected && <IconCheck className="w-4 h-4" />}
                                    </div>

                                    <div className="relative h-32 bg-stone-100">
                                        {product.imageUrl && isValidUrl(product.imageUrl) ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                className={`object-cover ${!isActive ? 'grayscale' : ''}`}
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">
                                                {category?.icon || '📦'}
                                            </div>
                                        )}
                                        {/* Status badges */}
                                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                            {category && (
                                                <span className="bg-stone-800 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                    {category.icon} {category.name}
                                                </span>
                                            )}
                                            {product.isPopular && (
                                                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    🔥 Popular
                                                </span>
                                            )}
                                            {!isActive && (
                                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                        {/* Hover actions */}
                                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleActive(product._id); }}
                                                className={`p-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-white text-stone-600' : 'bg-green-100 text-green-700'}`}
                                                title={isActive ? 'Mark out of stock' : 'Mark in stock'}
                                            >
                                                {isActive ? '🚫' : '✅'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTogglePopular(product._id); }}
                                                className={`p-1.5 rounded-lg text-xs font-bold ${product.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-white text-stone-600'}`}
                                                title="Toggle popular"
                                            >
                                                🔥
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3" onClick={(e) => e.stopPropagation()}>
                                        <h4 className={`font-bold text-sm mb-0.5 truncate ${!isActive ? 'text-stone-400' : ''}`}>
                                            {product.name}
                                        </h4>
                                        <p className="text-xs text-stone-500 mb-2 line-clamp-1">{product.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className={`font-bold ${isActive ? 'text-orange-600' : 'text-stone-400'}`}>
                                                ${product.basePrice.toFixed(2)}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }}
                                                className="text-xs text-stone-500 hover:text-orange-600 font-medium"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                    onDelete={editingProduct ? async (productId) => {
                        await deleteProduct({ productId });
                    } : undefined}
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

interface VariationGroupForm {
    name: string;
    required: boolean;
    defaultOption?: string;
    options: { name: string; priceAdjustment: string }[];
}

interface ProductFormData {
    categoryId: Id<"categories">;
    name: string;
    description: string;
    imageUrl: string;
    basePrice: number;
    isPopular?: boolean;
    variationGroups: {
        name: string;
        required: boolean;
        defaultOption?: string;
        options: { name: string; priceAdjustment: number }[];
    }[];
}

function ProductFormModal({
    product,
    categories,
    onClose,
    onSave,
    onDelete,
}: {
    product: Product | null;
    categories: Category[];
    onClose: () => void;
    onSave: (data: ProductFormData) => Promise<void>;
    onDelete?: (productId: Id<"products">) => Promise<void>;
}) {
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
    const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() || '');
    const [categoryId, setCategoryId] = useState<Id<"categories"> | ''>(product?.categoryId || '');
    const [isPopular, setIsPopular] = useState(product?.isPopular || false);
    
    // Filter out "Popular" - it's a tag, not a category
    const validCategories = categories.filter(cat => 
        cat.name.toLowerCase() !== 'popular'
    );
    
    // Initialize variation groups from product or start empty
    const [variationGroups, setVariationGroups] = useState<VariationGroupForm[]>(() => {
        if (product?.variationGroups && product.variationGroups.length > 0) {
            return product.variationGroups.map(g => ({
                name: g.name,
                required: g.required,
                defaultOption: g.defaultOption,
                options: g.options.map(o => ({
                    name: o.name,
                    priceAdjustment: o.priceAdjustment.toString(),
                })),
            }));
        }
        // Start with no variation groups - let user add if needed
        return [];
    });
    
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !name || !basePrice) return;

        setIsSaving(true);
        try {
            const processedGroups = variationGroups.length > 0 
                ? variationGroups
                    .filter(g => g.name && g.options.some(o => o.name))
                    .map(g => ({
                        name: g.name,
                        required: g.required,
                        defaultOption: g.defaultOption,
                        options: g.options
                            .filter(o => o.name)
                            .map(o => ({
                                name: o.name,
                                priceAdjustment: parseFloat(o.priceAdjustment) || 0,
                            })),
                    }))
                : [];

            await onSave({
                categoryId: categoryId as Id<"categories">,
                name,
                description: description || '',
                imageUrl: (imageUrl && isValidUrl(imageUrl)) 
                    ? imageUrl 
                    : 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
                basePrice: parseFloat(basePrice),
                isPopular,
                variationGroups: processedGroups,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Variation Group Handlers
    const addVariationGroup = () => {
        setVariationGroups([...variationGroups, {
            name: '',
            required: false,
            options: [{ name: '', priceAdjustment: '0' }],
        }]);
    };

    const removeVariationGroup = (groupIndex: number) => {
        // Allow removing all groups - products can have no variations
        setVariationGroups(variationGroups.filter((_, i) => i !== groupIndex));
    };

    const updateGroupName = (groupIndex: number, name: string) => {
        setVariationGroups(variationGroups.map((g, i) => 
            i === groupIndex ? { ...g, name } : g
        ));
    };

    const updateGroupDefaultOption = (groupIndex: number, defaultOption: string) => {
        setVariationGroups(variationGroups.map((g, i) => 
            i === groupIndex ? { ...g, defaultOption: defaultOption || undefined } : g
        ));
    };

    const toggleGroupRequired = (groupIndex: number) => {
        setVariationGroups(variationGroups.map((g, i) => 
            i === groupIndex ? { ...g, required: !g.required } : g
        ));
    };

    const addOption = (groupIndex: number) => {
        setVariationGroups(variationGroups.map((g, i) => 
            i === groupIndex 
                ? { ...g, options: [...g.options, { name: '', priceAdjustment: '0' }] }
                : g
        ));
    };

    const removeOption = (groupIndex: number, optionIndex: number) => {
        setVariationGroups(variationGroups.map((g, i) => 
            i === groupIndex 
                ? { ...g, options: g.options.filter((_, oi) => oi !== optionIndex) }
                : g
        ));
    };

    const updateOption = (groupIndex: number, optionIndex: number, field: 'name' | 'priceAdjustment', value: string) => {
        setVariationGroups(variationGroups.map((g, gi) => 
            gi === groupIndex 
                ? {
                    ...g,
                    options: g.options.map((o, oi) => 
                        oi === optionIndex ? { ...o, [field]: value } : o
                    ),
                }
                : g
        ));
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
                            {validCategories.map(cat => (
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
                        <span className="text-sm font-medium">Mark as Popular</span>
                    </label>

                    {/* Variation Groups */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-stone-700">
                                Variation Groups 
                                <span className="text-xs text-stone-400 font-normal ml-1">(Optional)</span>
                            </label>
                            <button
                                type="button"
                                onClick={addVariationGroup}
                                className="text-xs text-orange-600 font-medium flex items-center gap-1 hover:text-orange-700"
                            >
                                <IconPlus className="w-3 h-3" /> Add Group
                            </button>
                        </div>
                        
                        {variationGroups.length === 0 ? (
                            <div className="border-2 border-dashed border-stone-200 rounded-lg p-6 text-center">
                                <p className="text-sm text-stone-500 mb-2">No variation groups</p>
                                <p className="text-xs text-stone-400 mb-3">
                                    Simple product with no options to choose from
                                </p>
                                <button
                                    type="button"
                                    onClick={addVariationGroup}
                                    className="text-xs text-orange-600 font-medium hover:text-orange-700"
                                >
                                    + Add Variation Group (e.g., Size, Temperature, Sugar Level)
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {variationGroups.map((group, gi) => (
                                    <div key={gi} className="border border-stone-200 rounded-lg p-3 bg-stone-50">
                                        {/* Group Header */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={group.name}
                                                onChange={(e) => updateGroupName(gi, e.target.value)}
                                                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 bg-white"
                                                placeholder="Group name (e.g. Size, Sugar Level)"
                                            />
                                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={group.required}
                                                    onChange={() => toggleGroupRequired(gi)}
                                                    className="w-4 h-4 rounded text-orange-500"
                                                />
                                                Required
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => removeVariationGroup(gi)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <IconTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        {/* Default Option */}
                                        {group.options.some(o => o.name) && (
                                            <div className="mb-3 ml-2">
                                                <label className="block text-xs font-medium text-stone-600 mb-1">
                                                    Default Selection <span className="text-stone-400 font-normal">(Optional)</span>
                                                </label>
                                                <select
                                                    value={group.defaultOption || ''}
                                                    onChange={(e) => updateGroupDefaultOption(gi, e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:border-orange-500 bg-white"
                                                >
                                                    <option value="">None (customer chooses)</option>
                                                    {group.options
                                                        .filter(o => o.name)
                                                        .map((option, oi) => (
                                                            <option key={oi} value={option.name}>
                                                                {option.name} {option.priceAdjustment !== '0' && `(+$${option.priceAdjustment})`}
                                                            </option>
                                                        ))}
                                                </select>
                                                <p className="text-xs text-stone-400 mt-1">
                                                    Pre-selects this option when modal opens
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Options */}
                                        <div className="space-y-2 ml-2">
                                            {group.options.map((option, oi) => (
                                                <div key={oi} className="flex gap-2 items-center">
                                                    <span className="text-stone-400 text-xs">-</span>
                                                    <input
                                                        type="text"
                                                        value={option.name}
                                                        onChange={(e) => updateOption(gi, oi, 'name', e.target.value)}
                                                        className="flex-1 px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:border-orange-500 bg-white"
                                                        placeholder="Option name"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-stone-500">+$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={option.priceAdjustment}
                                                            onChange={(e) => updateOption(gi, oi, 'priceAdjustment', e.target.value)}
                                                            className="w-16 px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:border-orange-500 bg-white"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {group.options.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(gi, oi)}
                                                            className="p-1 text-red-400 hover:text-red-600"
                                                        >
                                                            <IconClose className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addOption(gi)}
                                                className="text-xs text-orange-600 font-medium ml-3 hover:text-orange-700"
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-stone-400 mt-2">
                            {variationGroups.length === 0 
                                ? "Leave empty for simple products with no customization options."
                                : "Price adjustments are added to the base price. Use 0 for no change."}
                        </p>
                    </div>
                </form>

                <div className="p-4 border-t border-stone-100 flex gap-3">
                    {product && onDelete && (
                        <button
                            type="button"
                            onClick={async () => {
                                if (confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                                    await onDelete(product._id);
                                    onClose();
                                }
                            }}
                            className="py-2.5 px-4 border border-red-200 rounded-lg font-medium text-red-600 hover:bg-red-50"
                        >
                            <IconTrash className="w-4 h-4 inline mr-1" />
                            Delete
                        </button>
                    )}
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
