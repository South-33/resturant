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
        isActive: v.optional(v.boolean()), // Out of stock when false
        // Multiple variation groups (e.g., Size, Sugar Level, Ice Level)
        variationGroups: v.optional(v.array(
            v.object({
                name: v.string(), // e.g., "Size", "Sugar Level"
                required: v.boolean(),
                defaultOption: v.optional(v.string()), // Default option name to select
                options: v.array(
                    v.object({
                        name: v.string(), // e.g., "Large", "50%"
                        priceAdjustment: v.number(), // Price change from base (can be 0)
                    })
                ),
            })
        )),
        // Legacy field for backwards compatibility (optional)
        variations: v.optional(v.array(
            v.object({
                name: v.string(),
                price: v.number(),
            })
        )),
    })
        .index("by_category", ["categoryId"])
        .index("by_popular", ["isPopular"])
        .index("by_active", ["isActive"]),

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
        paymentMethod: v.optional(v.union(
            v.literal("cash"),
            v.literal("khqr")
        )),
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
        // Selected variations as array of group selections
        selectedVariations: v.optional(v.array(
            v.object({
                groupName: v.string(), // e.g., "Size"
                optionName: v.string(), // e.g., "Large"
                priceAdjustment: v.number(),
            })
        )),
        // Customer notes for this item
        notes: v.optional(v.string()),
        quantity: v.number(),
        price: v.number(), // Total price including all adjustments
        // Legacy field for backwards compatibility
        variation: v.optional(v.string()),
    })
        .index("by_order", ["orderId"]),

    // ----------------------------------------
    // RESTAURANT SETTINGS (singleton)
    // ----------------------------------------
    settings: defineTable({
        key: v.literal("restaurant"), // singleton pattern
        name: v.string(),
        tagline: v.optional(v.string()),
        rating: v.optional(v.number()),
        ratingCount: v.optional(v.string()), // "200+ ratings"
        currency: v.optional(v.string()), // "$", "៛", etc.
        taxRate: v.optional(v.number()), // 0.1 = 10%
    }),

    // ----------------------------------------
    // FLOOR PLAN (restaurant layout)
    // ----------------------------------------
    floorPlan: defineTable({
        key: v.literal("layout"), // singleton pattern
        gridWidth: v.number(), // e.g., 12
        gridHeight: v.number(), // e.g., 8
        doorPosition: v.optional(v.object({
            x: v.number(),
            y: v.number(),
            width: v.number(),
            side: v.union(v.literal("top"), v.literal("bottom"), v.literal("left"), v.literal("right")),
        })),
    }),

    // ----------------------------------------
    // TABLES (individual tables on floor plan)
    // ----------------------------------------
    tables: defineTable({
        tableId: v.string(), // "T1", "VIP1", etc.
        name: v.optional(v.string()), // Display name override
        x: v.number(), // Grid position
        y: v.number(),
        width: v.number(), // Grid units (1 = normal, 2 = large)
        height: v.number(),
        shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
        capacity: v.optional(v.number()), // Seats
    })
        .index("by_tableId", ["tableId"]),
});
