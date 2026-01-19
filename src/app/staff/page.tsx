'use client';

// ============================================
// STAFF DASHBOARD (Kitchen + Cashier + Menu)
// Unified view for restaurant operations
// ============================================

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
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
    IconArrowLeft,
    IconMenu,
    IconDoor,
    IconTable,
} from '@/lib/icons';

// ============================================
// TYPES & INTERFACES
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
    entrances?: {
        id: string;
        x: number;
        y: number;
        width: number;
        side: 'top' | 'bottom' | 'left' | 'right';
    }[];
}

// ============================================
// HELPERS
// ============================================

function isValidUrl(urlString: string): boolean {
    if (!urlString || urlString.trim() === '') return false;
    try {
        new URL(urlString);
        return true;
    } catch {
        return false;
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-stone-200 text-stone-600';
        case 'preparing': return 'bg-blue-100 text-blue-700';
        case 'ready': return 'bg-green-100 text-green-700';
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
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState<StaffTab>('cashier');
    const validatePin = useMutation(api.settings.validatePin);

    useEffect(() => {
        const storedAuth = sessionStorage.getItem('staff_auth');
        if (storedAuth === 'true') {
            setIsAuthenticated(true);
            return;
        }

        const urlPin = searchParams.get('pin');
        if (urlPin) {
            validatePin({ pin: urlPin }).then(res => {
                if (res.isValid) {
                    setIsAuthenticated(true);
                    sessionStorage.setItem('staff_auth', 'true');
                }
            }).catch(console.error);
        }
    }, [searchParams, validatePin]);

    if (!isAuthenticated) {
        return <PinEntry onAuthenticated={() => setIsAuthenticated(true)} validatePin={validatePin} />;
    }

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col h-screen overflow-hidden">
            <header className="bg-white border-b border-stone-200 px-4 lg:px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
                    <div className="bg-stone-100 p-1 rounded-lg flex gap-0.5">
                        {(['cashier', 'kitchen', 'menu'] as StaffTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 lg:px-4 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
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
                    </span>Live
                </div>
            </header>
            <main className="flex-1 overflow-hidden relative">
                <div className={`h-full w-full ${activeTab === 'cashier' ? 'block' : 'hidden'}`}><CashierView /></div>
                <div className={`h-full w-full ${activeTab === 'kitchen' ? 'block' : 'hidden'}`}><KitchenView /></div>
                <div className={`h-full w-full ${activeTab === 'menu' ? 'block' : 'hidden'}`}><MenuManagementView /></div>
            </main>
        </div>
    );
}

// ============================================
// PIN ENTRY COMPONENT
// ============================================

function PinEntry({ onAuthenticated, validatePin }: { onAuthenticated: () => void; validatePin: any }) {
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handlePinDigit = useCallback(async (digit: number) => {
        if (isVerifying || pinInput.length >= 4) return;

        const newPin = pinInput + digit;
        setPinInput(newPin);
        setPinError(false);

        if (newPin.length === 4) {
            setIsVerifying(true);
            // Small delay for visual feedback of the last dot
            setTimeout(async () => {
                try {
                    const res = await validatePin({ pin: newPin });
                    if (res.isValid) {
                        onAuthenticated();
                        sessionStorage.setItem('staff_auth', 'true');
                        setPinError(false);
                    } else {
                        setPinError(true);
                        setPinInput('');
                    }
                } catch (err) {
                    console.error("PIN validation error:", err);
                    setPinError(true);
                    setPinInput('');
                } finally {
                    setIsVerifying(false);
                }
            }, 200);
        }
    }, [pinInput, isVerifying, validatePin, onAuthenticated]);

    const handleBackspace = useCallback(() => {
        setPinInput(prev => prev.slice(0, -1));
        setPinError(false);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                handlePinDigit(parseInt(e.key));
            } else if (e.key === 'Backspace') {
                handleBackspace();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePinDigit, handleBackspace]);

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <IconStore className="w-10 h-10 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-stone-800">Staff Access</h1>
                <p className="text-stone-500 mb-8">Enter PIN to access dashboard</p>
                <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${pinInput.length > i ? 'bg-orange-500 border-orange-500 scale-110' : 'bg-transparent border-stone-300'}`} />
                    ))}
                </div>
                {pinError && (
                    <div className="text-red-500 text-sm font-medium mb-4 animate-pulse">Incorrect PIN</div>
                )}
                <div className="grid grid-cols-3 gap-3 select-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <button key={digit} type="button" onClick={() => handlePinDigit(digit)} className="h-16 rounded-xl font-bold text-2xl flex items-center justify-center transition-all bg-stone-100 text-stone-800 active:bg-stone-300 active:scale-95 touch-manipulation">{digit}</button>
                    ))}
                    <div className="h-16" />
                    <button type="button" onClick={() => handlePinDigit(0)} className="h-16 rounded-xl font-bold text-2xl flex items-center justify-center transition-all bg-stone-100 text-stone-800 active:bg-stone-300 active:scale-95 touch-manipulation">0</button>
                    <button type="button" onClick={handleBackspace} className="h-16 rounded-xl font-bold text-xl flex items-center justify-center transition-all bg-red-50 text-red-500 active:bg-red-200 active:scale-95 touch-manipulation" aria-label="Backspace">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                        </svg>
                    </button>
                </div>
            </div>
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
    entrances?: {
        id: string;
        x: number;
        y: number;
        width: number;
        side: 'top' | 'bottom' | 'left' | 'right';
    }[];
}

function CashierView() {
    const orders = useQuery(api.orders.getAllOrders) as Order[] | undefined;
    const updatePaymentStatus = useMutation(api.orders.updatePaymentStatus);
    const serverTables = useQuery(api.settings.getTables);
    const serverFloorPlan = useQuery(api.settings.getFloorPlan);
    const saveTablesMutation = useMutation(api.settings.bulkUpdateTables);
    const saveFloorPlanMutation = useMutation(api.settings.updateFloorPlan);

    const defaultTables: TableData[] = useMemo(() => [], []);
    const defaultFloorPlan: FloorPlanData = useMemo(() => ({ gridWidth: 12, gridHeight: 8, entrances: [{ id: "E1", x: 5, y: 0, width: 2, side: "top" as const }] }), []);
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
    const [resizingEntrance, setResizingEntrance] = useState<{ id: string, handle: 'left' | 'right' } | null>(null);
    const [renameInput, setRenameInput] = useState('');
    const [draggingEntranceId, setDraggingEntranceId] = useState<string | null>(null);
    const [ghostPosition, setGhostPosition] = useState<{ id?: string, x: number, y: number, width: number, height: number, type: 'table' | 'entrance', side?: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const [currentTime, setCurrentTime] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) setContainerSize({ width: clientWidth, height: clientHeight });
            }
        };
        // Initial check
        updateSize();
        // Force check after valid mount painting
        const timer = setTimeout(updateSize, 50);

        // Observer
        if (!containerRef.current) return;
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        window.addEventListener('resize', updateSize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => { if (!isEditMode) { setLocalTables(tablesData); setLocalFloorPlan(floorPlan); } }, [tablesData, floorPlan, isEditMode]);

    const tables = useMemo(() => isEditMode ? localTables : tablesData, [isEditMode, localTables, tablesData]);
    const grid: FloorPlanData = useMemo(() => localFloorPlan ?? floorPlan, [localFloorPlan, floorPlan]);

    // Safety buffer for margins so grid doesn't touch edges
    const safetyBuffer = 40;

    // Calculate Cell Size based on available container space (Header is now outside this container)
    const cellSize = useMemo(() => {
        let width = containerSize.width;
        let height = containerSize.height;

        // Smart Fallback if container hasn't measured yet (prevents tiny grid on refresh)
        if (width === 0 || height === 0) {
            if (typeof window !== 'undefined') {
                width = window.innerWidth; // Estimate full width
                height = window.innerHeight - 64; // Estimate height minus header
            } else {
                return 60; // Mobile/SSR safe default
            }
        }

        const availableWidth = width - safetyBuffer * 2;
        const availableHeight = height - safetyBuffer * 2;
        const cellW = availableWidth / (grid.gridWidth || 1);
        const cellH = availableHeight / (grid.gridHeight || 1);
        return Math.max(30, Math.floor(Math.min(cellW, cellH)));
    }, [containerSize.width, containerSize.height, grid.gridWidth, grid.gridHeight]);

    // Grid Dimensions
    const floorPlanWidth = grid.gridWidth * cellSize;
    const floorPlanHeight = grid.gridHeight * cellSize;

    const getGridPosition = useCallback((clientX: number, clientY: number) => {
        if (!dropZoneRef.current) return null;
        const rect = dropZoneRef.current.getBoundingClientRect();
        return { x: Math.floor((clientX - rect.left) / cellSize), y: Math.floor((clientY - rect.top) / cellSize) };
    }, [cellSize]);

    const updateTablePosition = useCallback((tableId: string, x: number, y: number) => {
        setLocalTables(prev => prev.map(t => t.tableId === tableId ? { ...t, x: Math.max(0, Math.min(grid.gridWidth - t.width, x)), y: Math.max(0, Math.min(grid.gridHeight - t.height, y)) } : t));
    }, [grid.gridWidth, grid.gridHeight]);

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isEditMode) return;
        const pos = getGridPosition(e.clientX, e.clientY);
        if (!pos) return;
        if (draggingTable && dragOffset) {
            const activeTable = tables.find(t => t.tableId === draggingTable);
            if (activeTable) {
                setGhostPosition({
                    x: Math.max(0, Math.min(grid.gridWidth - activeTable.width, pos.x - dragOffset.x)),
                    y: Math.max(0, Math.min(grid.gridHeight - activeTable.height, pos.y - dragOffset.y)),
                    width: activeTable.width,
                    height: activeTable.height,
                    type: 'table'
                });
            }
        } else if (draggingEntranceId && grid.entrances) {
            const activeEntrance = grid.entrances.find(ent => ent.id === draggingEntranceId);
            if (!activeEntrance) return;
            const dTop = pos.y, dBottom = (grid.gridHeight - 1) - pos.y, dLeft = pos.x, dRight = (grid.gridWidth - 1) - pos.x;
            const minD = Math.min(dTop, dBottom, dLeft, dRight);
            let side: 'top' | 'bottom' | 'left' | 'right' = 'top', x = pos.x, y = pos.y;
            if (minD === dTop) { side = 'top'; x = Math.max(0, Math.min(grid.gridWidth - activeEntrance.width, pos.x)); y = 0; }
            else if (minD === dBottom) { side = 'bottom'; x = Math.max(0, Math.min(grid.gridWidth - activeEntrance.width, pos.x)); y = grid.gridHeight - 1; }
            else if (minD === dLeft) { side = 'left'; x = 0; y = Math.max(0, Math.min(grid.gridHeight - activeEntrance.width, pos.y)); }
            else { side = 'right'; x = grid.gridWidth - 1; y = Math.max(0, Math.min(grid.gridHeight - activeEntrance.width, pos.y)); }
            setGhostPosition({ id: draggingEntranceId, x, y, width: (side === 'top' || side === 'bottom') ? activeEntrance.width : 0.5, height: (side === 'left' || side === 'right') ? activeEntrance.width : 0.5, type: 'entrance', side });
        }
    }, [isEditMode, draggingTable, draggingEntranceId, dragOffset, tables, grid, getGridPosition]);

    const handlePointerUp = useCallback(() => {
        if (draggingTable && ghostPosition) updateTablePosition(draggingTable, ghostPosition.x, ghostPosition.y);
        else if (draggingEntranceId && ghostPosition && localFloorPlan?.entrances) {
            setLocalFloorPlan({ ...localFloorPlan, entrances: localFloorPlan.entrances.map(ent => ent.id === draggingEntranceId ? { ...ent, x: ghostPosition.x, y: ghostPosition.y, side: ghostPosition.side || 'top' } : ent) });
        }
        setDraggingTable(null); setDraggingEntranceId(null); setGhostPosition(null); setDragOffset(null);
    }, [draggingTable, draggingEntranceId, ghostPosition, localFloorPlan, updateTablePosition]);

    const startTableDrag = useCallback((tableId: string, e: React.PointerEvent) => {
        if (!isEditMode || resizingTable || renamingTable) return;
        e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingTable(tableId);
        const pos = getGridPosition(e.clientX, e.clientY);
        if (pos) { const table = tables.find(t => t.tableId === tableId); if (table) setDragOffset({ x: pos.x - table.x, y: pos.y - table.y }); }
    }, [isEditMode, resizingTable, renamingTable, tables, getGridPosition]);

    const startEntranceDrag = useCallback((entranceId: string, e: React.PointerEvent) => {
        if (!isEditMode || resizingEntrance) return;
        e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingEntranceId(entranceId);
    }, [isEditMode, resizingEntrance]);

    useEffect(() => {
        if (!draggingTable && !draggingEntranceId) return;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => { window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); };
    }, [draggingTable, draggingEntranceId, handlePointerMove, handlePointerUp]);

    if (orders === undefined || serverTables === undefined || serverFloorPlan === undefined) return <LoadingSpinner />;

    const getTableInfo = (tableId: string) => {
        const unpaidOrder = orders.filter(o => o.tableId === tableId).find(o => o.paymentStatus === 'pending');
        if (!unpaidOrder) return { status: 'empty' as const, order: null };
        let foodStatus: 'pending' | 'preparing' | 'ready' | 'served' = 'pending';
        if (unpaidOrder.status === 'preparing') foodStatus = 'preparing';
        if (unpaidOrder.status === 'done') foodStatus = 'ready';
        return { status: 'occupied' as const, order: unpaidOrder, foodStatus, timeElapsed: Math.floor((currentTime - unpaidOrder._creationTime) / 60000) };
    };

    const activeTableInfo = selectedTableId ? getTableInfo(selectedTableId) : null;
    const activeOrder = activeTableInfo?.order;

    const handleMarkPaid = async (orderId: Id<"orders">, method: 'cash' | 'khqr') => { await updatePaymentStatus({ orderId, paymentStatus: 'paid', paymentMethod: method }); setSelectedTableId(null); };
    const handleSaveNote = () => { if (selectedTableId) setTableNotes(prev => ({ ...prev, [selectedTableId]: noteInput })); setEditingNote(false); };
    const getStatusColor = (status: string) => { switch (status) { case 'pending': return 'bg-stone-200 text-stone-600'; case 'preparing': return 'bg-blue-100 text-blue-700'; case 'ready': return 'bg-green-100 text-green-700'; case 'served': return 'bg-stone-800 text-white'; default: return 'bg-stone-200 text-stone-600'; } };
    const getStatusLabel = (status: string) => { switch (status) { case 'pending': return 'Ordered'; case 'preparing': return 'Cooking'; case 'ready': return '✅ Ready'; case 'served': return '🍽️ Served'; default: return status; } };

    const startEdit = () => { setLocalTables([...tablesData]); setLocalFloorPlan({ ...floorPlan }); setIsEditMode(true); };
    const cancelEdit = () => { setIsEditMode(false); setLocalTables(tablesData); setLocalFloorPlan(floorPlan); };
    const saveEdit = async () => { if (!localFloorPlan) return; await Promise.all([saveTablesMutation({ tables: localTables.map(t => ({ tableId: t.tableId, name: t.name, x: t.x, y: t.y, width: t.width, height: t.height, shape: t.shape, capacity: t.capacity })) }), saveFloorPlanMutation({ gridWidth: localFloorPlan.gridWidth, gridHeight: localFloorPlan.gridHeight, entrances: localFloorPlan.entrances })]); setIsEditMode(false); };
    const addTable = () => {
        const nextNum = localTables.length + 1;
        // Find first empty spot
        let startX = 1, startY = 1;
        let found = false;
        // Simple search for a 2x1 spot
        for (let y = 1; y < (localFloorPlan?.gridHeight || 8) - 1; y++) {
            for (let x = 1; x < (localFloorPlan?.gridWidth || 10) - 2; x++) {
                // Check if this spot overlaps with any existing table
                const overlaps = localTables.some(t =>
                    x < t.x + t.width &&
                    x + 2 > t.x &&
                    y < t.y + t.height &&
                    y + 1 > t.y
                );
                if (!overlaps) {
                    startX = x; startY = y; found = true; break;
                }
            }
            if (found) break;
        }
        // If no spot found, default to cascading offset or something, but for now just use the found or default 1,2
        setLocalTables([...localTables, { _id: `T${nextNum}` as Id<"tables">, tableId: `T${nextNum}`, x: startX, y: startY, width: 2, height: 1, shape: 'square' }]);
    };
    const addEntrance = () => {
        if (localFloorPlan) {
            const nextNum = (localFloorPlan.entrances?.length || 0) + 1;
            // Find a free perimeter spot
            let x = 0, y = 0, side: 'top' | 'bottom' | 'left' | 'right' = 'top';
            let found = false;
            const gw = localFloorPlan.gridWidth;
            const gh = localFloorPlan.gridHeight;

            // Try Top
            for (let i = 1; i < gw - 1; i++) {
                if (!localFloorPlan.entrances?.some(e => e.side === 'top' && e.x === i)) { x = i; y = 0; side = 'top'; found = true; break; }
            }
            // Try Bottom
            if (!found) for (let i = 1; i < gw - 1; i++) {
                if (!localFloorPlan.entrances?.some(e => e.side === 'bottom' && e.x === i)) { x = i; y = gh - 1; side = 'bottom'; found = true; break; }
            }
            // Try Left
            if (!found) for (let i = 1; i < gh - 1; i++) {
                if (!localFloorPlan.entrances?.some(e => e.side === 'left' && e.y === i)) { x = 0; y = i; side = 'left'; found = true; break; }
            }
            // Try Right
            if (!found) for (let i = 1; i < gh - 1; i++) {
                if (!localFloorPlan.entrances?.some(e => e.side === 'right' && e.y === i)) { x = gw - 1; y = i; side = 'right'; found = true; break; }
            }

            setLocalFloorPlan({ ...localFloorPlan, entrances: [...(localFloorPlan.entrances || []), { id: `E${nextNum}`, x, y, width: 1, side }] });
        }
    };
    const deleteTable = (tableId: string) => setLocalTables(localTables.filter(t => t.tableId !== tableId));
    const deleteEntrance = (id: string) => { if (localFloorPlan) setLocalFloorPlan({ ...localFloorPlan, entrances: localFloorPlan.entrances?.filter(e => e.id !== id) }); };
    const updateTableSize = (tableId: string, width: number, height: number) => setLocalTables(localTables.map(t => t.tableId === tableId ? { ...t, width: Math.max(1, Math.min(4, width)), height: Math.max(1, Math.min(3, height)) } : t));
    const renameTable = (tableId: string, newName: string | undefined) => setLocalTables(localTables.map(t => t.tableId === tableId ? { ...t, name: newName || undefined } : t));

    return (
        <div className="flex h-full relative">
            <div className="flex-1 overflow-hidden flex flex-col bg-stone-50 select-none">
                <div className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 z-40 shadow-sm shrink-0">
                    {isEditMode ? (
                        <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-3 mr-2">
                                    <div className="flex items-center bg-white rounded-xl border border-stone-200 h-10 p-1 shadow-sm select-none">
                                        <span className="pl-2 pr-1 text-[9px] font-black text-stone-300 uppercase tracking-wider">H-Grid</span>
                                        <button
                                            onClick={() => localFloorPlan && setLocalFloorPlan({ ...localFloorPlan, gridWidth: Math.max(4, localFloorPlan.gridWidth - 1) })}
                                            className="w-8 h-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-600 rounded-lg transition-colors active:scale-95 active:bg-stone-200"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                                        </button>
                                        <span className="min-w-[24px] text-center font-bold text-stone-700 text-sm">{localFloorPlan?.gridWidth}</span>
                                        <button
                                            onClick={() => localFloorPlan && setLocalFloorPlan({ ...localFloorPlan, gridWidth: Math.min(20, localFloorPlan.gridWidth + 1) })}
                                            className="w-8 h-full flex items-center justify-center text-stone-400 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors active:scale-95 active:bg-orange-100"
                                        >
                                            <IconPlus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="flex items-center bg-white rounded-xl border border-stone-200 h-10 p-1 shadow-sm select-none">
                                        <span className="pl-2 pr-1 text-[9px] font-black text-stone-300 uppercase tracking-wider">V-Grid</span>
                                        <button
                                            onClick={() => localFloorPlan && setLocalFloorPlan({ ...localFloorPlan, gridHeight: Math.max(4, localFloorPlan.gridHeight - 1) })}
                                            className="w-8 h-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-600 rounded-lg transition-colors active:scale-95 active:bg-stone-200"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                                        </button>
                                        <span className="min-w-[24px] text-center font-bold text-stone-700 text-sm">{localFloorPlan?.gridHeight}</span>
                                        <button
                                            onClick={() => localFloorPlan && setLocalFloorPlan({ ...localFloorPlan, gridHeight: Math.min(20, localFloorPlan.gridHeight + 1) })}
                                            className="w-8 h-full flex items-center justify-center text-stone-400 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors active:scale-95 active:bg-orange-100"
                                        >
                                            <IconPlus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-2 border-l border-stone-200 ml-2 pl-4">
                                    <button onClick={addTable} className="h-10 px-4 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 active:scale-95 transition-all flex items-center gap-2 shadow-sm font-bold text-xs" title="Add Table">
                                        <IconPlus className="w-3 h-3" /> Table
                                    </button>
                                    <button onClick={addEntrance} className="h-10 px-4 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 active:scale-95 transition-all flex items-center gap-2 shadow-sm font-bold text-xs" title="Add Entrance">
                                        <IconPlus className="w-3 h-3" /> Entrance
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={cancelEdit} className="h-10 px-4 bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition-all flex items-center justify-center">Discard</button>
                                <button onClick={saveEdit} className="h-10 px-6 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-all flex items-center justify-center">Save Floor Plan</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em]">Floor Plan</h3>
                            <button onClick={startEdit} className="h-10 px-6 bg-white border border-stone-200 text-stone-700 hover:text-orange-600 hover:border-orange-200 hover:shadow-sm transition-all text-sm font-bold rounded-xl flex items-center gap-2"><IconEdit className="w-4 h-4" /> Edit Layout</button>
                        </div>
                    )}
                </div>

                <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden active:cursor-grab">
                    <div
                        ref={dropZoneRef}
                        className="relative touch-none shadow-sm transition-all duration-300 ease-out box-content bg-white/40 ring-1 ring-stone-900/5 rounded-sm"
                        style={{ width: floorPlanWidth, height: floorPlanHeight }}
                    >
                        <div className="absolute inset-0 pointer-events-none opacity-50">
                            {Array.from({ length: grid.gridWidth + 1 }).map((_, i) => (<div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-stone-300/50" style={{ left: i * cellSize }} />))}
                            {Array.from({ length: grid.gridHeight + 1 }).map((_, i) => (<div key={`h${i}`} className="absolute left-0 right-0 h-px bg-stone-300/50" style={{ top: i * cellSize }} />))}
                        </div>

                        {tables.length === 0 && !isEditMode && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 pointer-events-none">
                                <IconTable className="w-12 h-12 mb-4 opacity-30" />
                                <p className="font-semibold text-lg mb-1">No Tables Yet</p>
                                <p className="text-sm opacity-60">Click "Edit Layout" to add tables</p>
                            </div>
                        )}

                        {ghostPosition && isEditMode && (
                            <GhostIndicator position={ghostPosition} cellSize={cellSize} />
                        )}

                        {grid.entrances?.map(ent => (
                            <EntranceElement
                                key={ent.id}
                                ent={ent}
                                isEditMode={isEditMode}
                                cellSize={cellSize}
                                grid={grid}
                                localFloorPlan={localFloorPlan}
                                setLocalFloorPlan={setLocalFloorPlan}
                                draggingEntranceId={draggingEntranceId}
                                resizingEntrance={resizingEntrance}
                                setResizingEntrance={setResizingEntrance}
                                startEntranceDrag={startEntranceDrag}
                                deleteEntrance={deleteEntrance}
                            />
                        ))}

                        {tables.map(table => (
                            <TableElement
                                key={table.tableId}
                                table={table}
                                cellSize={cellSize}
                                isEditMode={isEditMode}
                                isSelected={selectedTableId === table.tableId}
                                isDragging={draggingTable === table.tableId}
                                isRenaming={renamingTable === table.tableId}
                                renameInput={renameInput}
                                setRenameInput={setRenameInput}
                                info={getTableInfo(table.tableId)}
                                hasNote={!!tableNotes[table.tableId]}
                                setSelectedTableId={setSelectedTableId}
                                setRenamingTable={setRenamingTable}
                                renameTable={renameTable}
                                deleteTable={deleteTable}
                                resizingTable={resizingTable}
                                setResizingTable={setResizingTable}
                                updateTableSize={updateTableSize}
                                startTableDrag={startTableDrag}
                                getStatusColor={getStatusColor}
                                getStatusLabel={getStatusLabel}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className={`fixed inset-0 z-50 bg-white transition-transform duration-300 lg:static lg:w-[400px] lg:translate-x-0 lg:border-l lg:border-stone-200 flex flex-col ${selectedTableId && !isEditMode ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                <OrderDetailsPanel
                    selectedTableId={selectedTableId}
                    setSelectedTableId={setSelectedTableId}
                    activeTableInfo={activeTableInfo}
                    activeOrder={activeOrder}
                    isEditMode={isEditMode}
                    editingNote={editingNote}
                    setEditingNote={setEditingNote}
                    noteInput={noteInput}
                    setNoteInput={setNoteInput}
                    tableNote={selectedTableId ? tableNotes[selectedTableId] : undefined}
                    handleSaveNote={handleSaveNote}
                    handleMarkPaid={handleMarkPaid}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                />
            </div>
        </div>
    );
}

// ============================================
// CASHIER SUB-COMPONENTS
// ============================================

function GhostIndicator({ position, cellSize }: { position: any, cellSize: number }) {
    return (
        <div
            className={`absolute border-2 rounded-xl z-0 transition-all duration-75 pointer-events-none flex items-center justify-center ${position.type === 'entrance' ? 'border-amber-400 bg-amber-100/50' : 'border-blue-500 bg-blue-100/50'}`}
            style={{
                left: (position.type === 'entrance' && position.side === 'right') ? undefined : position.x * cellSize + (position.type === 'entrance' && (position.side === 'left' || position.side === 'right') ? 0 : (position.type === 'entrance' ? 0 : 6)),
                right: (position.type === 'entrance' && position.side === 'right') ? 0 : undefined,
                top: position.type === 'entrance' ? (position.side === 'bottom' ? undefined : position.y * cellSize) : position.y * cellSize + 6,
                bottom: position.type === 'entrance' && position.side === 'bottom' ? 0 : undefined,
                width: (position.type === 'entrance' && (position.side === 'left' || position.side === 'right')) ? 28 : position.width * cellSize - (position.type === 'entrance' ? 0 : 12),
                height: (position.type === 'entrance' && (position.side === 'top' || position.side === 'bottom')) ? 28 : position.height * cellSize - (position.type === 'entrance' ? 0 : 12)
            }}
        >
            <div className={`font-bold opacity-60 text-sm ${position.type === 'entrance' ? 'text-amber-700' : 'text-blue-900/40'}`}>Drop</div>
        </div>
    );
}

function EntranceElement({
    ent, isEditMode, cellSize, grid, localFloorPlan, setLocalFloorPlan, draggingEntranceId, resizingEntrance, setResizingEntrance, startEntranceDrag, deleteEntrance
}: any) {
    return (
        <div
            className={`absolute group bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 text-[10px] tracking-widest font-black shadow-sm select-none touch-none z-20 ${isEditMode ? 'cursor-move border-dashed hover:border-amber-400 active:scale-[0.98]' : ''} ${draggingEntranceId === ent.id ? 'opacity-30' : ''} ${ent.side === 'top' ? 'rounded-b-xl border-t-0' : ent.side === 'bottom' ? 'rounded-t-xl border-b-0' : ent.side === 'left' ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0'}`}
            style={{
                left: ent.side === 'right' ? undefined : (ent.x * cellSize),
                right: ent.side === 'right' ? 0 : undefined,
                top: ent.side === 'bottom' ? undefined : (ent.y * cellSize),
                bottom: ent.side === 'bottom' ? 0 : undefined,
                width: (ent.side === 'top' || ent.side === 'bottom') ? ent.width * cellSize : 28,
                height: (ent.side === 'left' || ent.side === 'right') ? ent.width * cellSize : 28
            }}
            onPointerDown={(e) => startEntranceDrag(ent.id, e)}
        >
            {isEditMode && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteEntrance(ent.id); }}
                        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md transform scale-0 group-hover:scale-100 transition-transform duration-200 z-50 hover:bg-red-600"
                        title="Delete Entrance"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div
                        className={`absolute cursor-pointer hover:bg-amber-400/30 active:bg-amber-400/50 flex items-center justify-center touch-none ${(ent.side === 'top' || ent.side === 'bottom') ? 'left-0 top-0 bottom-0 w-6' : 'top-0 left-0 right-0 h-6'}`}
                        onPointerDown={(e) => {
                            e.stopPropagation(); e.preventDefault(); if (!localFloorPlan) return; (e.target as HTMLElement).setPointerCapture(e.pointerId);
                            setResizingEntrance({ id: ent.id, handle: 'left' });
                            const startX = e.clientX, startY = e.clientY, initialDoorX = ent.x, initialDoorY = ent.y, initialDoorW = ent.width, side = ent.side;
                            const handleMove = (moveE: PointerEvent) => {
                                if (side === 'top' || side === 'bottom') {
                                    const dx = Math.round((moveE.clientX - startX) / cellSize), newX = Math.max(0, Math.min(initialDoorX + initialDoorW - 1, initialDoorX + dx)), newW = initialDoorW + (initialDoorX - newX);
                                    if (newW >= 1 && newX >= 0) setLocalFloorPlan((prev: any) => prev ? { ...prev, entrances: prev.entrances?.map((e: any) => e.id === ent.id ? { ...e, x: newX, width: newW } : e) } : null);
                                } else {
                                    const dy = Math.round((moveE.clientY - startY) / cellSize), newY = Math.max(0, Math.min(initialDoorY + initialDoorW - 1, initialDoorY + dy)), newW = initialDoorW + (initialDoorY - newY);
                                    if (newW >= 1 && newY >= 0) setLocalFloorPlan((prev: any) => prev ? { ...prev, entrances: prev.entrances?.map((e: any) => e.id === ent.id ? { ...e, y: newY, width: newW } : e) } : null);
                                }
                            };
                            const handleUp = () => { setResizingEntrance(null); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp); };
                            window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp);
                        }}
                    >
                        <div className={`${(ent.side === 'top' || ent.side === 'bottom') ? 'w-1.5 h-4' : 'w-4 h-1.5'} bg-amber-400 rounded-full`} />
                    </div>
                    <div
                        className={`absolute cursor-pointer hover:bg-amber-400/30 active:bg-amber-400/50 flex items-center justify-center touch-none ${(ent.side === 'top' || ent.side === 'bottom') ? 'right-0 top-0 bottom-0 w-6' : 'bottom-0 left-0 right-0 h-6'}`}
                        onPointerDown={(e) => {
                            e.stopPropagation(); e.preventDefault(); if (!localFloorPlan) return; (e.target as HTMLElement).setPointerCapture(e.pointerId);
                            setResizingEntrance({ id: ent.id, handle: 'right' });
                            const startX = e.clientX, startY = e.clientY, initialDoorW = ent.width, side = ent.side;
                            const handleMove = (moveE: PointerEvent) => {
                                if (side === 'top' || side === 'bottom') {
                                    const dx = Math.round((moveE.clientX - startX) / cellSize), newW = Math.max(1, Math.min(grid.gridWidth - ent.x, initialDoorW + dx));
                                    setLocalFloorPlan((prev: any) => prev ? { ...prev, entrances: prev.entrances?.map((e: any) => e.id === ent.id ? { ...e, width: newW } : e) } : null);
                                } else {
                                    const dy = Math.round((moveE.clientY - startY) / cellSize), newW = Math.max(1, Math.min(grid.gridHeight - ent.y, initialDoorW + dy));
                                    setLocalFloorPlan((prev: any) => prev ? { ...prev, entrances: prev.entrances?.map((e: any) => e.id === ent.id ? { ...e, width: newW } : e) } : null);
                                }
                            };
                            const handleUp = () => { setResizingEntrance(null); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp); };
                            window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp);
                        }}
                    >
                        <div className={`${(ent.side === 'top' || ent.side === 'bottom') ? 'w-1.5 h-4' : 'w-4 h-1.5'} bg-amber-400 rounded-full`} />
                    </div>
                </>
            )}
            <span className={`pointer-events-none select-none ${(ent.side === 'left' || ent.side === 'right') ? 'rotate-90' : ''}`}>ENTRANCE</span>
        </div>
    );
}

function TableElement({
    table, cellSize, isEditMode, isSelected, isDragging, isRenaming, renameInput, setRenameInput, info, hasNote, setSelectedTableId, setRenamingTable, renameTable, deleteTable, resizingTable, setResizingTable, updateTableSize, startTableDrag, getStatusColor, getStatusLabel
}: any) {
    return (
        <div
            className={`absolute rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-transform transition-colors transition-shadow duration-200 shadow-sm group hover:shadow-md select-none touch-none ${isSelected && !isEditMode ? 'ring-4 ring-orange-500/30 scale-[1.02] shadow-md' : ''} ${isDragging ? 'opacity-30' : ''} ${info.status === 'occupied' ? 'bg-orange-50 border-orange-400' : 'bg-white border-stone-200'} ${isEditMode ? 'border-dashed hover:border-blue-400 active:scale-[0.98] cursor-move' : 'cursor-pointer hover:shadow-md hover:border-stone-300 active:scale-[0.98]'}`}
            style={{ left: table.x * cellSize + 6, top: table.y * cellSize + 6, width: table.width * cellSize - 12, height: table.height * cellSize - 12 }}
            onClick={() => !isEditMode && !isDragging && setSelectedTableId(table.tableId)}
            onDoubleClick={() => { if (isEditMode && !isRenaming) { setRenamingTable(table.tableId); setRenameInput(table.name || table.tableId); } }}
            onPointerDown={(e) => { if (isEditMode && !resizingTable && !isRenaming) startTableDrag(table.tableId, e); }}
        >
            {hasNote && !isEditMode && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm" />}
            {isRenaming ? (
                <div className="relative flex items-center justify-center w-full px-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onBlur={() => { renameTable(table.tableId, renameInput.trim() || undefined); setRenamingTable(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { renameTable(table.tableId, renameInput.trim() || undefined); setRenamingTable(null); } else if (e.key === 'Escape') setRenamingTable(null); }}
                        className="!w-full text-center text-lg font-bold bg-white border-2 border-orange-500 rounded-xl py-0.5 focus:outline-none shadow-lg z-50"
                        autoFocus
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className={`text-lg font-bold ${info.status === 'occupied' ? 'text-orange-600' : 'text-stone-600'}`}>{table.name || table.tableId}</span>
                    {isEditMode && (<div className="flex items-center gap-1 opacity-40"><IconEdit className="w-3 h-3 text-orange-400" /><span className="text-[10px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">Edit Name</span></div>)}
                </div>
            )}
            {!isEditMode && info.status === 'occupied' && info.order ? (
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(info.foodStatus || 'pending')}`}>
                    {getStatusLabel(info.foodStatus || 'pending')}
                </span>
            ) : !isEditMode ? (<span className="text-xs uppercase font-medium text-stone-400">Empty</span>) : null}
            {isEditMode && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); deleteTable(table.tableId); }} onPointerDown={(e) => e.stopPropagation()} className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center text-stone-400 hover:text-red-500 z-10 opacity-0 group-hover:opacity-100 touch-manipulation transition-opacity" title="Delete table"><IconClose className="w-6 h-6" /></button>
                    <div
                        className="absolute bottom-0 right-0 w-10 h-10 cursor-se-resize z-10 flex items-center justify-center touch-none text-stone-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        onPointerDown={(e) => {
                            e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); setResizingTable(table.tableId);
                            const startX = e.clientX, startY = e.clientY, startW = table.width, startH = table.height;
                            const handleMove = (moveE: PointerEvent) => { moveE.preventDefault(); const dx = Math.round((moveE.clientX - startX) / cellSize), dy = Math.round((moveE.clientY - startY) / cellSize); updateTableSize(table.tableId, startW + dx, startH + dy); };
                            const handleUp = () => { setResizingTable(null); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp); };
                            window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp);
                        }}
                    >
                        <svg viewBox="0 0 10 10" className="w-7 h-7"><path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                </>
            )}
        </div>
    );
}

function OrderDetailsPanel({
    selectedTableId, setSelectedTableId, activeTableInfo, activeOrder, isEditMode, editingNote, setEditingNote, noteInput, setNoteInput, tableNote, handleSaveNote, handleMarkPaid, getStatusColor, getStatusLabel
}: any) {
    if (!selectedTableId || !activeOrder || isEditMode) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center p-8 text-stone-400">
                {selectedTableId && !isEditMode && (
                    <button onClick={() => setSelectedTableId(null)} className="lg:hidden absolute top-4 left-4 p-2 hover:bg-stone-100 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                )}
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4"><IconSearch className="w-7 h-7 text-stone-300" /></div>
                <h3 className="font-semibold text-stone-600 mb-1">{isEditMode ? 'Edit Mode Active' : selectedTableId ? `Table ${selectedTableId} is free` : 'Select a Table'}</h3>
                <p className="text-sm">{isEditMode ? 'Drag tables to reposition them' : selectedTableId ? 'No active orders' : 'Click on a table to view details'}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-stone-100">
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => setSelectedTableId(null)} className="lg:hidden p-2 -ml-2 hover:bg-stone-100 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold">Table {selectedTableId}</h2>
                        <p className="text-stone-400 text-sm">Order #{activeOrder.orderNumber}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">Unpaid</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(activeTableInfo?.foodStatus || 'pending')}`}>{getStatusLabel(activeTableInfo?.foodStatus || 'pending')}</span>
                    </div>
                </div>
                <div className="flex gap-4 text-xs text-stone-500"><span>⏱️ {activeTableInfo?.timeElapsed || 0} min ago</span><span>🍽️ {activeOrder.items.length} items</span></div>
            </div>
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                {editingNote ? (
                    <div className="flex gap-2">
                        <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="VIP, allergies, special requests..." className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-orange-500" autoFocus />
                        <button onClick={handleSaveNote} className="px-3 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg">Save</button>
                    </div>
                ) : (
                    <button onClick={() => { setNoteInput(tableNote || ''); setEditingNote(true); }} className="w-full text-left text-sm text-stone-500 hover:text-stone-700">
                        {tableNote ? (<span className="flex items-center gap-2"><span className="text-blue-500">📝</span>{tableNote}</span>) : (<span className="text-stone-400 italic">+ Add note (VIP, allergies...)</span>)}
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-bold text-stone-400 uppercase mb-3">Order Items</h3>
                <div className="space-y-3">
                    {activeOrder.items.map((item: any) => (
                        <div key={item._id} className="flex justify-between items-center bg-stone-50 rounded-lg p-3">
                            <div className="flex gap-3 items-center">
                                <span className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 text-sm">{item.quantity}x</span>
                                <div>
                                    <p className="font-medium text-stone-800">{item.productName}</p>
                                    {item.selectedVariations && item.selectedVariations.length > 0 && (<p className="text-xs text-stone-400">{item.selectedVariations.map((v: any) => v.optionName).join(', ')}</p>)}
                                    {item.notes && (<p className="text-xs text-blue-600 italic mt-0.5">Note: {item.notes}</p>)}
                                </div>
                            </div>
                            <p className="font-bold text-stone-700">${item.price.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-4 border-t border-stone-100 bg-stone-50/50">
                <div className="flex justify-between items-center mb-4"><span className="text-stone-500 font-medium">Order Total</span><span className="text-2xl font-bold text-stone-900">${activeOrder.total.toFixed(2)}</span></div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleMarkPaid(activeOrder._id, 'cash')} className="py-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-sm">💵 Cash Paid</button>
                    <button onClick={() => handleMarkPaid(activeOrder._id, 'khqr')} className="py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-sm shadow-stone-200">📱 QR Paid</button>
                </div>
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
    const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'done'>('pending');
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    useEffect(() => { const timer = setInterval(() => setCurrentTime(Date.now()), 60000); return () => clearInterval(timer); }, []);
    if (orders === undefined) return <LoadingSpinner />;
    const pendingOrders = orders.filter(o => o.status === 'pending'), preparingOrders = orders.filter(o => o.status === 'preparing'), doneOrders = orders.filter(o => o.status === 'done').slice(0, 10);
    const tabs = [{ key: 'pending' as const, label: 'Pending', count: pendingOrders.length, color: 'orange' }, { key: 'preparing' as const, label: 'Preparing', count: preparingOrders.length, color: 'blue' }, { key: 'done' as const, label: 'Done', count: doneOrders.length, color: 'green' }];
    const getTabOrders = () => { switch (activeTab) { case 'pending': return pendingOrders; case 'preparing': return preparingOrders; case 'done': return doneOrders; } };
    return (
        <div className="flex flex-col h-full bg-stone-100">
            <div className="lg:hidden flex border-b border-stone-200 bg-white">{tabs.map(tab => (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-semibold transition-all relative ${activeTab === tab.key ? 'text-stone-900' : 'text-stone-400'}`}>{tab.label}<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${tab.color === 'orange' ? 'bg-orange-100 text-orange-700' : tab.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{tab.count}</span>{activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />}</button>))}</div>
            <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-3">{getTabOrders().length === 0 ? (<div className="text-center py-12 text-stone-400"><p className="text-lg mb-1">No {activeTab} orders</p><p className="text-sm">Orders will appear here</p></div>) : getTabOrders().map(order => (<KitchenOrderCard key={order._id} order={order} status={activeTab} currentTime={currentTime} onAction={activeTab === 'pending' ? () => updateOrderStatus({ orderId: order._id, status: 'preparing' }) : activeTab === 'preparing' ? () => updateOrderStatus({ orderId: order._id, status: 'done' }) : undefined} actionLabel={activeTab === 'pending' ? 'Start Cooking' : activeTab === 'preparing' ? 'Mark Done' : undefined} />))}</div>
            <div className="hidden lg:flex flex-1 p-4 gap-4 overflow-hidden"><KanbanColumn title="Pending" count={pendingOrders.length} color="orange" isEmpty={pendingOrders.length === 0}>{pendingOrders.map(order => (<KitchenOrderCard key={order._id} order={order} status="pending" currentTime={currentTime} onAction={() => updateOrderStatus({ orderId: order._id, status: 'preparing' })} actionLabel="Start Cooking" />))}</KanbanColumn><KanbanColumn title="Preparing" count={preparingOrders.length} color="blue" isEmpty={preparingOrders.length === 0}>{preparingOrders.map(order => (<KitchenOrderCard key={order._id} order={order} status="preparing" currentTime={currentTime} onAction={() => updateOrderStatus({ orderId: order._id, status: 'done' })} actionLabel="Mark Done" />))}</KanbanColumn><KanbanColumn title="Done" count={doneOrders.length} color="green" isEmpty={doneOrders.length === 0}>{doneOrders.map(order => (<KitchenOrderCard key={order._id} order={order} status="done" currentTime={currentTime} />))}</KanbanColumn></div>
        </div>
    );
}

function KanbanColumn({ children, title, count, color, isEmpty }: { children: React.ReactNode; title: string; count: number; color: string; isEmpty?: boolean }) {
    const colors: Record<string, { badge: string; header: string }> = { orange: { badge: 'bg-orange-100 text-orange-700', header: 'border-orange-200' }, blue: { badge: 'bg-blue-100 text-blue-700', header: 'border-blue-200' }, green: { badge: 'bg-green-100 text-green-700', header: 'border-green-200' } };
    return (<div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm"><div className={`p-4 font-bold border-b-2 ${colors[color].header} flex items-center justify-between bg-white`}><span>{title}</span><span className={`px-2.5 py-1 rounded-full text-sm font-bold ${colors[color].badge}`}>{count}</span></div><div className="p-3 space-y-3 overflow-y-auto flex-1 bg-stone-50/30">{isEmpty ? <div className="text-center py-8 text-stone-400"><p className="text-sm">No orders</p></div> : children}</div></div>);
}

function KitchenOrderCard({ order, status, onAction, actionLabel, currentTime }: { order: Order; status: 'pending' | 'preparing' | 'done'; onAction?: () => void; actionLabel?: string; currentTime: number; }) {
    const minutesAgo = Math.floor((currentTime - order._creationTime) / 60000), isUrgent = status === 'pending' && minutesAgo > 5;
    const statusStyles = { pending: 'bg-orange-50 border-orange-200', preparing: 'bg-blue-50 border-blue-200', done: 'bg-stone-50 border-stone-200 opacity-70' }, btnStyles = { pending: 'bg-orange-500 hover:bg-orange-600 text-white', preparing: 'bg-blue-500 hover:bg-blue-600 text-white', done: '' };
    return (<div className={`${statusStyles[status]} border-2 rounded-xl p-4 shadow-sm ${isUrgent ? 'ring-2 ring-red-400' : ''}`}><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-2"><span className="font-bold text-xl text-stone-800">#{order.orderNumber}</span><span className="bg-stone-200 px-2 py-0.5 rounded-lg text-xs font-bold text-stone-600">{order.tableId}</span></div><div className="text-right"><span className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-stone-400'}`}>{minutesAgo}m ago</span>{isUrgent && <span className="block text-[10px] text-red-500 font-bold">URGENT</span>}</div></div><div className="space-y-1.5 mb-4">{order.items.map(item => (<div key={item._id} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm"><span className="font-bold text-stone-700 w-6">{item.quantity}×</span><span className="text-stone-800 font-medium">{item.productName}</span>{(item.selectedVariations?.length > 0 || item.variation) && (<span className="text-stone-400 text-xs">({item.selectedVariations?.map(v => v.optionName).join(', ') || item.variation})</span>)}{item.notes && (<span className="w-full text-xs text-blue-500 italic ml-6">Note: {item.notes}</span>)}</div>))}</div>{onAction && <button onClick={onAction} className={`w-full py-3 text-sm font-bold rounded-xl transition-all active:scale-[0.98] ${btnStyles[status]}`}>{actionLabel}</button>}</div>);
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
    const toggleActive = useMutation(api.products.toggleProductActive);
    const bulkToggleActive = useMutation(api.products.bulkToggleActive);
    const bulkDeleteProducts = useMutation(api.products.bulkDeleteProducts);
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
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const isResizing = useRef(false);

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (isResizing.current) {
            setSidebarWidth(Math.max(160, Math.min(450, e.clientX)));
        }
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        setIsResizingSidebar(false);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', stopResizing);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [handlePointerMove]);

    const startResizing = useCallback((e: React.PointerEvent) => {
        isResizing.current = true;
        setIsResizingSidebar(true);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [handlePointerMove, stopResizing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', stopResizing);
        };
    }, [handlePointerMove, stopResizing]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all'
                ? true
                : selectedCategory === 'popular'
                    ? p.isPopular
                    : p.categoryId === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    if (!categories || !products) return <LoadingSpinner />;

    const handleDeleteCategory = async (categoryId: Id<"categories">) => {
        const count = products.filter(p => p.categoryId === categoryId).length;
        if (confirm(count > 0 ? `Delete category and its ${count} products?` : 'Delete this category?')) {
            try {
                await deleteCategoryMutation({ categoryId, deleteProducts: true });
                if (selectedCategory === categoryId) setSelectedCategory('all');
            } catch (err) {
                console.error("Failed to delete category:", err);
                alert("Could not delete category.");
            }
        }
    };

    const toggleSelection = (id: Id<"products">) => setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    return (
        <div className="flex h-full relative overflow-hidden bg-stone-50">
            <CategorySidebar
                sidebarWidth={sidebarWidth}
                isResizingSidebar={isResizingSidebar}
                startResizing={startResizing}
                categories={categories}
                products={products}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                setEditingCategory={setEditingCategory}
                setIsAddingCategory={setIsAddingCategory}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-white border-b border-stone-200 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full !pl-12 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddingProduct(true)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-all"
                    >
                        <IconPlus className="w-4 h-4" />Add Product
                    </button>
                </div>

                <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center gap-4">
                    <button
                        onClick={() => selectedIds.size === filteredProducts.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredProducts.map(p => p._id)))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? 'bg-orange-500 border-orange-500 text-white' : selectedIds.size > 0 ? 'bg-orange-200 border-orange-500' : 'border-stone-300 hover:border-stone-400'}`}
                    >
                        {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 && <IconCheck className="w-3 h-3" />}
                        {selectedIds.size > 0 && selectedIds.size < filteredProducts.length && <span className="w-2 h-0.5 bg-orange-500 rounded" />}
                    </button>
                    <span className="text-sm text-stone-600">
                        {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredProducts.length} selected` : `${filteredProducts.length} products`}
                    </span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => { bulkToggleActive({ productIds: Array.from(selectedIds), isActive: true }); setSelectedIds(new Set()); }}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-40"
                        >
                            ✅ In Stock
                        </button>
                        <button
                            onClick={() => { bulkToggleActive({ productIds: Array.from(selectedIds), isActive: false }); setSelectedIds(new Set()); }}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                        >
                            🚫 Out of Stock
                        </button>
                        <div className="w-px h-5 bg-stone-200 mx-1" />
                        <button
                            onClick={() => { if (confirm(`Delete ${selectedIds.size} products?`)) { bulkDeleteProducts({ productIds: Array.from(selectedIds) }); setSelectedIds(new Set()); } }}
                            disabled={selectedIds.size === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <ProductGrid
                        products={filteredProducts}
                        selectedIds={selectedIds}
                        toggleSelection={toggleSelection}
                        categories={categories}
                        setEditingProduct={setEditingProduct}
                        toggleActive={(productId: any) => toggleActive({ productId })}
                        togglePopular={(productId: any) => togglePopular({ productId })}
                    />
                </div>
            </div>

            {(editingProduct || isAddingProduct) && (
                <ProductFormModal
                    product={editingProduct}
                    categories={categories}
                    onClose={() => { setEditingProduct(null); setIsAddingProduct(false); }}
                    onSave={async (data) => {
                        try {
                            if (editingProduct) await updateProduct({ productId: editingProduct._id, ...data });
                            else await createProduct(data);
                            setEditingProduct(null);
                            setIsAddingProduct(false);
                        } catch (err) { alert("Failed to save product."); }
                    }}
                    onDelete={editingProduct ? async (productId) => {
                        if (confirm("Delete this product?")) {
                            await deleteProduct({ productId });
                            setEditingProduct(null);
                        }
                    } : undefined}
                />
            )}
            {(isAddingCategory || editingCategory) && (
                <CategoryFormModal
                    category={editingCategory}
                    onClose={() => { setIsAddingCategory(false); setEditingCategory(null); }}
                    onDelete={editingCategory ? () => handleDeleteCategory(editingCategory._id) : undefined}
                    onSave={async (data) => {
                        try {
                            if (editingCategory) await updateCategory({ categoryId: editingCategory._id, ...data });
                            else await createCategory(data);
                            setIsAddingCategory(false);
                            setEditingCategory(null);
                        } catch (err) { alert("Failed to save category."); }
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// MENU SUB-COMPONENTS
// ============================================

function CategorySidebar({
    sidebarWidth, isResizingSidebar, startResizing, categories, products, selectedCategory, setSelectedCategory, setEditingCategory, setIsAddingCategory
}: any) {
    return (
        <div
            className={`bg-white border-r border-stone-200 flex flex-col relative group/sidebar ${!isResizingSidebar ? 'transition-[width] duration-300 ease-in-out' : ''}`}
            style={{ width: sidebarWidth }}
        >
            <div className="flex-1 flex flex-col min-w-[160px] p-4 gap-1 overflow-y-auto visible">
                <h3 className="font-bold text-stone-800 mb-4 px-2">Categories</h3>
                <CategoryItem
                    label="All Products"
                    icon="📦"
                    count={products.length}
                    isActive={selectedCategory === 'all'}
                    onClick={() => setSelectedCategory('all')}
                />
                <CategoryItem
                    label="Popular Items"
                    icon="🔥"
                    count={products.filter((p: any) => p.isPopular).length}
                    isActive={selectedCategory === 'popular'}
                    onClick={() => setSelectedCategory('popular')}
                />
                <div className="h-px bg-stone-100 my-3 mx-2" />
                <div className="space-y-1">
                    {categories.filter((cat: any) => cat.name.toLowerCase() !== 'popular').map((cat: any) => (
                        <CategoryItem
                            key={cat._id}
                            label={cat.name}
                            icon={cat.icon}
                            count={products.filter((p: any) => p.categoryId === cat._id).length}
                            isActive={selectedCategory === cat._id}
                            onClick={() => setSelectedCategory(cat._id)}
                            onEdit={() => setEditingCategory(cat)}
                        />
                    ))}
                </div>
                <button
                    onClick={() => setIsAddingCategory(true)}
                    className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold text-stone-500 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center gap-2 mt-4 border border-dashed border-stone-200 hover:border-orange-200"
                >
                    <div className="w-6 h-6 bg-stone-100 rounded-lg flex items-center justify-center"><IconPlus className="w-4 h-4" /></div>
                    Add Category
                </button>
            </div>
            <div
                onPointerDown={startResizing}
                className={`absolute top-0 -right-1 w-2 h-full cursor-col-resize z-10 hover:bg-orange-400/50 transition-colors ${isResizingSidebar ? 'bg-orange-500' : 'bg-transparent group-hover/sidebar:bg-stone-200'}`}
            />
        </div>
    );
}

function CategoryItem({ label, icon, count, isActive, onClick, onEdit }: any) {
    return (
        <div
            onClick={onClick}
            className={`group/item relative px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center cursor-pointer ${isActive ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'hover:bg-stone-100 text-stone-600'}`}
        >
            <div className={`flex-1 min-w-0 flex items-center gap-2 transition-all duration-200 ${onEdit ? 'group-hover/item:pr-8' : ''}`}>
                <span className="text-base flex-shrink-0">{icon}</span>
                <span className="truncate">{label}</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
                {onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-all active:scale-95"
                    >
                        <IconEdit className="w-4 h-4" />
                    </button>
                )}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-orange-200/50' : 'bg-stone-200 text-stone-500'}`}>
                    {count}
                </span>
            </div>
        </div>
    );
}

function ProductGrid({ products, selectedIds, toggleSelection, categories, setEditingProduct, toggleActive, togglePopular }: any) {
    if (products.length === 0) {
        return (
            <div className="text-center py-20 text-stone-400 bg-white rounded-3xl border-2 border-dashed border-stone-100">
                <IconSearch className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try adjusting your search or category</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any) => (
                <ProductCard
                    key={product._id}
                    product={product}
                    isSelected={selectedIds.has(product._id)}
                    category={categories.find((c: any) => c._id === product.categoryId)}
                    onToggleSelect={() => toggleSelection(product._id)}
                    onEdit={() => setEditingProduct(product)}
                    toggleActive={() => toggleActive(product._id)}
                    togglePopular={() => togglePopular(product._id)}
                />
            ))}
        </div>
    );
}

function ProductCard({ product, isSelected, category, onToggleSelect, onEdit, toggleActive, togglePopular }: any) {
    const isActive = product.isActive !== false;

    return (
        <div
            onClick={onToggleSelect}
            className={`bg-white rounded-2xl border-2 overflow-hidden group hover:shadow-lg transition-all relative cursor-pointer ${isSelected ? 'border-orange-500 ring-2 ring-orange-500/10' : 'border-stone-100'} ${!isActive ? 'opacity-60 bg-stone-50' : ''}`}
        >
            <div className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all pointer-events-none ${isSelected ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white/90 border-stone-200'}`}>
                {isSelected && <IconCheck className="w-4 h-4" />}
            </div>

            <div className="relative h-40 bg-stone-100">
                {product.imageUrl && isValidUrl(product.imageUrl) ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className={`object-cover transition-transform duration-500 group-hover:scale-110 ${!isActive ? 'grayscale' : ''}`}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-stone-50 select-none">
                        {category?.icon || '📦'}
                    </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                    {category && (
                        <span className="bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                            {category.icon} {category.name}
                        </span>
                    )}
                    {product.isPopular && (
                        <span className="bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                            🔥 POPULAR
                        </span>
                    )}
                </div>

                <div className="absolute bottom-2 right-2 flex items-center gap-2 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md backdrop-blur-md border transition-all active:scale-90 ${isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-red-500 border-red-500 text-white'}`}
                        title={isActive ? "Mark Out of Stock" : "Mark In Stock"}
                    >
                        {isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        )}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); togglePopular(); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md backdrop-blur-md border transition-all active:scale-90 ${product.isPopular ? 'bg-orange-700 border-orange-700' : 'bg-white/90 border-stone-200 hover:border-orange-300'}`}
                        title="Toggle Popular"
                    >
                        <span className="text-sm">🔥</span>
                    </button>
                </div>
            </div>

            <div className="p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold text-base truncate flex-1 pr-2 ${!isActive ? 'text-stone-400' : 'text-stone-900'}`}>{product.name}</h4>
                    <span className={`font-black ${isActive ? 'text-orange-600' : 'text-stone-300'}`}>${product.basePrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-stone-500 mb-4 line-clamp-2 h-8 leading-relaxed italic">{product.description || "No description provided."}</p>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="w-full py-2 bg-stone-50 hover:bg-stone-900 hover:text-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 transition-all uppercase tracking-wider"
                >
                    Edit Details
                </button>
            </div>
        </div>
    );
}

interface VariationGroupForm { name: string; required: boolean; defaultOption?: string; options: { name: string; priceAdjustment: string }[]; }
interface ProductFormData { categoryId: Id<"categories">; name: string; description: string; imageUrl: string; basePrice: number; isPopular?: boolean; variationGroups: { name: string; required: boolean; defaultOption?: string; options: { name: string; priceAdjustment: number }[]; }[]; }

function ProductFormModal({ product, categories, onClose, onSave, onDelete, }: { product: Product | null; categories: Category[]; onClose: () => void; onSave: (data: ProductFormData) => Promise<void>; onDelete?: (productId: Id<"products">) => Promise<void>; }) {
    const [name, setName] = useState(product?.name || ''), [description, setDescription] = useState(product?.description || ''), [imageUrl, setImageUrl] = useState(product?.imageUrl || ''), [basePrice, setBasePrice] = useState(product?.basePrice?.toString() || ''), [categoryId, setCategoryId] = useState<Id<"categories"> | ''>(product?.categoryId || ''), [isPopular, setIsPopular] = useState(product?.isPopular || false);
    const validCategories = categories.filter(cat => cat.name.toLowerCase() !== 'popular');
    const [variationGroups, setVariationGroups] = useState<VariationGroupForm[]>(() => { if (product?.variationGroups && product.variationGroups.length > 0) return product.variationGroups.map(g => ({ name: g.name, required: g.required, defaultOption: g.defaultOption, options: g.options.map(o => ({ name: o.name, priceAdjustment: o.priceAdjustment.toString() })) })); return []; });
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const categoryButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryButtonRef.current && !categoryButtonRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!categoryId || !name || !basePrice) return; setIsSaving(true); try { const processedGroups = variationGroups.length > 0 ? variationGroups.filter(g => g.name && g.options.some(o => o.name)).map(g => ({ name: g.name, required: g.required, defaultOption: g.defaultOption, options: g.options.filter(o => o.name).map(o => ({ name: o.name, priceAdjustment: parseFloat(o.priceAdjustment) || 0 })) })) : []; await onSave({ categoryId: categoryId as Id<"categories">, name, description, imageUrl: imageUrl || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop', basePrice: parseFloat(basePrice), isPopular, variationGroups: processedGroups }); } finally { setIsSaving(false); } };
    const reorderOptions = (groupIndex: number, oldIndex: number, newIndex: number) => { if (newIndex < 0 || newIndex >= variationGroups[groupIndex].options.length) return; setVariationGroups(variationGroups.map((g, gi) => { if (gi !== groupIndex) return g; const newOptions = [...g.options], [removed] = newOptions.splice(oldIndex, 1); newOptions.splice(newIndex, 0, removed); return { ...g, options: newOptions }; })); };

    // Drag and Drop Logic
    const dragItem = useRef<any>(null);
    const dragOverItem = useRef<any>(null);

    const handleSort = () => {
        if (!dragItem.current || !dragOverItem.current) return;
        const { groupIndex: d_gi, optionIndex: d_oi } = dragItem.current;
        const { groupIndex: o_gi, optionIndex: o_oi } = dragOverItem.current;
        // Only allow sorting within the same group
        if (d_gi !== o_gi || d_oi === o_oi) return;

        const newGroups = [...variationGroups];
        const group = newGroups[d_gi];
        const newOptions = [...group.options];
        const draggedOption = newOptions[d_oi];

        // Remove and insert
        newOptions.splice(d_oi, 1);
        newOptions.splice(o_oi, 0, draggedOption);

        newGroups[d_gi] = { ...group, options: newOptions };
        setVariationGroups(newGroups);

        // Reset
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between"><h2 className="text-lg font-bold">{product ? 'Edit Product' : 'Add Product'}</h2><button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-stone-100 rounded-full"><IconClose className="w-5 h-5" /></button></div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
                        <div className="relative" ref={categoryButtonRef as any}>
                            <button
                                type="button"
                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium text-left flex items-center justify-between transition-all outline-none ${isCategoryOpen ? 'border-orange-500 ring-4 ring-orange-500/10 z-20 relative' : 'border-stone-200 hover:border-stone-300'} ${categoryId ? 'text-stone-800' : 'text-stone-400'}`}
                            >
                                <span className="flex items-center gap-2">
                                    {categoryId ? (
                                        <>
                                            <span className="text-lg">{categories.find(c => c._id === categoryId)?.icon}</span>
                                            <span>{categories.find(c => c._id === categoryId)?.name}</span>
                                        </>
                                    ) : (
                                        "Select category"
                                    )}
                                </span>
                                <svg className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {isCategoryOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-100 rounded-xl shadow-xl z-50 overflow-hidden animation-fade-in origin-top">
                                    <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                                        {validCategories.map(cat => (
                                            <button
                                                key={cat._id}
                                                type="button"
                                                onClick={() => { setCategoryId(cat._id); setIsCategoryOpen(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${categoryId === cat._id ? 'bg-orange-50 text-orange-700' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                                            >
                                                <span className="text-lg w-6 text-center">{cat.icon}</span>
                                                {cat.name}
                                                {categoryId === cat._id && <IconCheck className="w-4 h-4 ml-auto text-orange-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500" placeholder="e.g. Cappuccino" required /></div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 resize-none" rows={2} /></div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Image URL</label><input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500" /></div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Base Price ($) *</label><input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-orange-500" required /></div>
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                            <input
                                type="checkbox"
                                checked={isPopular}
                                onChange={(e) => setIsPopular(e.target.checked)}
                                className="w-4 h-4 rounded text-orange-500 border-stone-300 focus:ring-orange-500"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-stone-700 group-hover:text-stone-900 transition-colors">Mark as Popular</span>
                            </div>
                        </label>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-3"><label className="text-sm font-medium">Variations</label><button type="button" onClick={() => setVariationGroups([...variationGroups, { name: '', required: false, options: [{ name: '', priceAdjustment: '0' }] }])} className="text-xs text-orange-600 font-medium">+ Add Group</button></div>
                        <div className="space-y-4">
                            {variationGroups.map((group, gi) => (
                                <div key={gi} className="border border-stone-200 rounded-xl p-4 bg-white shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={group.name}
                                                onChange={(e) => setVariationGroups(variationGroups.map((g, i) => i === gi ? { ...g, name: e.target.value } : g))}
                                                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-bold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-orange-500 focus:bg-white bg-stone-50"
                                                placeholder="Variation Group Name (e.g. Size, Sugar)"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setVariationGroups(variationGroups.map((g, i) => i === gi ? { ...g, required: !g.required } : g))}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${group.required ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-300 hover:bg-stone-200'}`}
                                            >
                                                {group.required && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                            </button>
                                            <span className="text-xs font-semibold text-stone-500">Required</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setVariationGroups(variationGroups.filter((_, i) => i !== gi))}
                                            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete Group"
                                        >
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-2 pl-2 border-l-2 border-stone-100 overflow-hidden">
                                        {group.options.map((option, oi) => (
                                            <div
                                                key={oi}
                                                className="flex gap-2 items-center group/opt transition-all w-full overflow-hidden"
                                                onDragEnter={() => {
                                                    if (dragItem.current) {
                                                        dragOverItem.current = { groupIndex: gi, optionIndex: oi };
                                                    }
                                                }}
                                                onDragEnd={(e) => {
                                                    e.currentTarget.classList.remove('opacity-50');
                                                    handleSort();
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                            >
                                                <div
                                                    className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-stone-300 hover:text-stone-600 transition-colors touch-none"
                                                    draggable
                                                    onDragStart={(e) => {
                                                        dragItem.current = { groupIndex: gi, optionIndex: oi };
                                                        const row = e.currentTarget.closest('.group\\/opt');
                                                        if (row) {
                                                            e.dataTransfer.setDragImage(row, 0, 0);
                                                            // Delay adding opacity so drag image is captured fully opaque
                                                            setTimeout(() => row.classList.add('opacity-50'), 0);
                                                        }
                                                    }}
                                                >
                                                    <div className="w-3 h-0.5 bg-current rounded-full"></div>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={option.name}
                                                    onChange={(e) => setVariationGroups(variationGroups.map((g, i) => i === gi ? { ...g, options: g.options.map((o, j) => j === oi ? { ...o, name: e.target.value } : o) } : g))}
                                                    className="flex-[3] min-w-0 px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-orange-500"
                                                    placeholder="Option Name"
                                                />
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={option.priceAdjustment === '0' ? '$ 0' : `$ ${option.priceAdjustment}`}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                                                        setVariationGroups(variationGroups.map((g, i) => i === gi ? { ...g, options: g.options.map((o, j) => j === oi ? { ...o, priceAdjustment: raw || '0' } : o) } : g));
                                                    }}
                                                    className="flex-[1] max-w-[72px] py-2.5 px-3 text-sm font-medium text-stone-700 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all text-center"
                                                    placeholder="$ 0"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setVariationGroups(variationGroups.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g))}
                                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors"
                                                >
                                                    <IconClose className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setVariationGroups(variationGroups.map((g, i) => i === gi ? { ...g, options: [...g.options, { name: '', priceAdjustment: '0' }] } : g))}
                                            className="text-xs text-orange-600 font-bold hover:text-orange-700 flex items-center gap-1 py-1 px-2 hover:bg-orange-50 rounded-lg transition-colors mt-2"
                                        >
                                            <IconPlus className="w-3 h-3" /> Add Option
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
                <div className="p-4 border-t border-stone-100 flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 border border-stone-200 rounded-xl font-bold text-stone-600">Cancel</button><button type="button" onClick={handleSubmit} disabled={isSaving || !categoryId || !name || !basePrice} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold">{isSaving ? 'Saving...' : 'Save Product'}</button></div>
            </div>
        </div>
    );
}

function CategoryFormModal({ category, onClose, onSave, onDelete, }: { category: Category | null; onClose: () => void; onSave: (data: { name: string; icon?: string }) => Promise<void>; onDelete?: () => Promise<void>; }) {
    const [name, setName] = useState(category?.name || ''), [icon, setIcon] = useState(category?.icon || ''), [isSaving, setIsSaving] = useState(false), [isDeleting, setIsDeleting] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name) return; setIsSaving(true); try { await onSave({ name, icon: icon || undefined }); } finally { setIsSaving(false); } };
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between"><h2 className="text-lg font-bold">{category ? 'Edit Category' : 'Add Category'}</h2><button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400"><IconClose className="w-5 h-5" /></button></div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" required /></div>
                    <div><label className="block text-sm font-medium text-stone-700 mb-1">Icon (Emoji)</label><input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" maxLength={2} /></div>
                    <div className="flex flex-col gap-2 pt-2"><button type="submit" disabled={isSaving || isDeleting || !name} className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold">{isSaving ? 'Saving...' : (category ? 'Save Changes' : 'Create Category')}</button><div className="flex gap-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 border border-stone-200 rounded-xl font-medium text-stone-600">Cancel</button>{category && onDelete && (<button type="button" onClick={async () => { setIsDeleting(true); try { await onDelete(); onClose(); } finally { setIsDeleting(false); } }} disabled={isSaving || isDeleting} className="flex-1 py-2.5 border border-red-100 rounded-xl font-medium text-red-500 flex items-center justify-center gap-2">{isDeleting ? 'Deleting...' : <><IconTrash className="w-4 h-4" />Delete</>}</button>)}</div></div>
                </form>
            </div>
        </div>
    );
}
