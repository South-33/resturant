// ============================================
// ORDERS - Queries and Mutations
// Optimized with helper functions and best practices
// ============================================

import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================
// SHARED TYPES & VALIDATORS
// ============================================

// Reusable status validator
const orderStatusValidator = v.union(
    v.literal("pending"),
    v.literal("preparing"),
    v.literal("done")
);

const paymentStatusValidator = v.union(
    v.literal("pending"),
    v.literal("paid")
);

// Selected variation for an order item
const selectedVariationValidator = v.object({
    groupName: v.string(),
    optionName: v.string(),
    priceAdjustment: v.number(),
});

// Return type for orders with items
type OrderWithItems = Doc<"orders"> & { items: Doc<"orderItems">[] };

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetches items for an order using the by_order index
 * Kept as separate function to maintain reactivity on item changes
 */
async function getOrderItems(ctx: QueryCtx, orderId: Id<"orders">) {
    return ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect();
}

/**
 * Enriches orders with their items
 * Uses Promise.all for parallel fetching
 */
async function enrichOrdersWithItems(
    ctx: QueryCtx,
    orders: Doc<"orders">[]
): Promise<OrderWithItems[]> {
    return Promise.all(
        orders.map(async (order) => ({
            ...order,
            items: await getOrderItems(ctx, order._id),
        }))
    );
}

// ============================================
// QUERIES
// ============================================

/**
 * Get active orders (not done) for Kitchen Dashboard
 * Uses by_status index for efficient filtering
 */
export const getActiveOrders = query({
    args: {},
    handler: async (ctx) => {
        // Fetch pending and preparing orders separately using indexes
        // This is more efficient than filter() on the full table
        const [pendingOrders, preparingOrders] = await Promise.all([
            ctx.db
                .query("orders")
                .withIndex("by_status", (q) => q.eq("status", "pending"))
                .order("desc")
                .collect(),
            ctx.db
                .query("orders")
                .withIndex("by_status", (q) => q.eq("status", "preparing"))
                .order("desc")
                .collect(),
        ]);

        const orders = [...pendingOrders, ...preparingOrders];
        return enrichOrdersWithItems(ctx, orders);
    },
});

/**
 * Get orders by table - useful for cashier view
 * Uses by_table index
 */
export const getOrdersByTable = query({
    args: { tableId: v.string() },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
            .order("desc")
            .collect();

        return enrichOrdersWithItems(ctx, orders);
    },
});

/**
 * Get orders by status - for Kitchen Kanban columns
 * Uses by_status index
 */
export const getOrdersByStatus = query({
    args: { status: orderStatusValidator },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", args.status))
            .order("desc")
            .collect();

        return enrichOrdersWithItems(ctx, orders);
    },
});

/**
 * Get all orders for cashier view
 * Limited to recent orders for performance
 */
export const getAllOrders = query({
    args: {},
    handler: async (ctx) => {
        // Limit to last 100 orders for performance
        // For a real app, consider pagination
        const orders = await ctx.db
            .query("orders")
            .order("desc")
            .take(100);

        return enrichOrdersWithItems(ctx, orders);
    },
});

/**
 * Get recent unpaid orders (for cashier summary)
 * Uses by_payment index for efficient filtering
 */
export const getUnpaidOrders = query({
    args: {},
    handler: async (ctx) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_payment", (q) => q.eq("paymentStatus", "pending"))
            .order("desc")
            .collect();

        return enrichOrdersWithItems(ctx, orders);
    },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new order with items
 * Mutations are transactional - either all inserts succeed or none do
 */
export const createOrder = mutation({
    args: {
        tableId: v.string(),
        items: v.array(
            v.object({
                productId: v.optional(v.id("products")),
                productName: v.string(),
                selectedVariations: v.optional(v.array(selectedVariationValidator)),
                notes: v.optional(v.string()),
                quantity: v.number(),
                price: v.number(),
            })
        ),
        total: v.number(),
    },
    handler: async (ctx, args) => {
        // Validate items exist
        if (args.items.length === 0) {
            throw new Error("Order must have at least one item");
        }

        // Get next order number atomically
        const lastOrder = await ctx.db.query("orders").order("desc").first();
        const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;

        // Create order
        const orderId = await ctx.db.insert("orders", {
            orderNumber,
            tableId: args.tableId,
            status: "pending",
            paymentStatus: "pending",
            total: args.total,
        });

        // Create all order items in parallel
        await Promise.all(
            args.items.map((item) =>
                ctx.db.insert("orderItems", {
                    orderId,
                    productId: item.productId,
                    productName: item.productName,
                    selectedVariations: item.selectedVariations || undefined,
                    notes: item.notes,
                    quantity: item.quantity,
                    price: item.price,
                })
            )
        );

        return { orderId, orderNumber };
    },
});

/**
 * Update order status (Kitchen workflow)
 */
export const updateOrderStatus = mutation({
    args: {
        orderId: v.id("orders"),
        status: orderStatusValidator,
    },
    handler: async (ctx, args) => {
        // Verify order exists
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        await ctx.db.patch(args.orderId, { status: args.status });
        return { success: true };
    },
});

/**
 * Update payment status (Cashier workflow)
 * If paymentMethod is 'khqr', auto-set to paid
 */
export const updatePaymentStatus = mutation({
    args: {
        orderId: v.id("orders"),
        paymentStatus: paymentStatusValidator,
        paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("khqr"))),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        await ctx.db.patch(args.orderId, {
            paymentStatus: args.paymentStatus,
            ...(args.paymentMethod && { paymentMethod: args.paymentMethod }),
        });
        return { success: true };
    },
});

/**
 * Delete an order and its items
 */
export const deleteOrder = mutation({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        // Delete items first (cascade)
        const items = await getOrderItems(ctx, args.orderId);
        await Promise.all(items.map((item) => ctx.db.delete(item._id)));

        // Delete order
        await ctx.db.delete(args.orderId);
        return { success: true };
    },
});

/**
 * Clear all done & paid orders (cleanup utility)
 */
export const clearCompletedOrders = mutation({
    args: {},
    handler: async (ctx) => {
        const doneOrders = await ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", "done"))
            .collect();

        // Only delete orders that are both done AND paid
        const completedOrders = doneOrders.filter(
            (o) => o.paymentStatus === "paid"
        );

        let deletedCount = 0;
        for (const order of completedOrders) {
            const items = await getOrderItems(ctx, order._id);
            await Promise.all(items.map((item) => ctx.db.delete(item._id)));
            await ctx.db.delete(order._id);
            deletedCount++;
        }

        return { deletedCount };
    },
});
