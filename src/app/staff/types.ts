import { Id } from '../../../convex/_generated/dataModel';

export type OrderStatus = 'pending' | 'preparing' | 'done';
export type PaymentStatus = 'pending' | 'paid';
export type StaffTab = 'cashier' | 'kitchen' | 'menu';

export interface OrderItem {
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

export interface Order {
    _id: Id<"orders">;
    _creationTime: number;
    orderNumber: number;
    tableId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    total: number;
    items: OrderItem[];
}

export interface Category {
    _id: Id<"categories">;
    _creationTime: number;
    name: string;
    icon?: string;
    sortOrder: number;
}

export interface Product {
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
