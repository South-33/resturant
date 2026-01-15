// ============================================
// CONVEX SCHEMA
// Restaurant ordering system database schema
// ============================================

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ----------------------------------------
    // CATEGORIES (Coffee, Tea, Food, etc.)
    // ----------------------------------------
    categories: defineTable({
        name: v.string(),
        icon: v.optional(v.string()),
        sortOrder: v.number(),
    })
        .index("by_sort_order", ["sortOrder"]),

    // ----------------------------------------
    // PRODUCTS (menu items)
    // ----------------------------------------
    products: defineTable({
        categoryId: v.id("categories"),
        name: v.string(),
        description: v.string(),
        imageUrl: v.string(),
        basePrice: v.number(),
        isPopular: v.boolean(),
        variations: v.array(
            v.object({
                name: v.string(),
                price: v.number(),
            })
        ),
    })
        .index("by_category", ["categoryId"])
        .index("by_popular", ["isPopular"]),

    // ----------------------------------------
    // ORDERS
    // ----------------------------------------
    orders: defineTable({
        orderNumber: v.number(),
        tableId: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("preparing"),
            v.literal("done")
        ),
        paymentStatus: v.union(
            v.literal("pending"),
            v.literal("paid")
        ),
        total: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_table", ["tableId"])
        .index("by_payment", ["paymentStatus"]),

    // ----------------------------------------
    // ORDER ITEMS (line items within an order)
    // ----------------------------------------
    orderItems: defineTable({
        orderId: v.id("orders"),
        productId: v.optional(v.id("products")), // Optional for flexibility
        productName: v.string(), // Denormalized for display speed
        variation: v.string(),
        quantity: v.number(),
        price: v.number(),
    })
        .index("by_order", ["orderId"]),
});
