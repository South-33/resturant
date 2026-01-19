// ============================================
// RESTAURANT SETTINGS, FLOOR PLAN & TABLES
// ============================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================
// RESTAURANT SETTINGS
// ============================================

const DEFAULT_SETTINGS = {
    key: "restaurant" as const,
    name: "Delicious Café",
    tagline: "Fresh coffee & treats",
    rating: 4.8,
    ratingCount: "200+ ratings",
    currency: "$",
    taxRate: 0.1,
};

export const getSettings = query({
    args: {},
    handler: async (ctx) => {
        const settings = await ctx.db
            .query("settings")
            .filter((q) => q.eq(q.field("key"), "restaurant"))
            .first();
        return settings ?? DEFAULT_SETTINGS;
    },
});

export const updateSettings = mutation({
    args: {
        name: v.optional(v.string()),
        tagline: v.optional(v.string()),
        rating: v.optional(v.number()),
        ratingCount: v.optional(v.string()),
        currency: v.optional(v.string()),
        taxRate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("settings")
            .filter((q) => q.eq(q.field("key"), "restaurant"))
            .first();

        const updates = Object.fromEntries(
            Object.entries(args).filter(([_, v]) => v !== undefined)
        );

        if (existing) {
            await ctx.db.patch(existing._id, updates);
        } else {
            await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, ...updates });
        }
        return { success: true };
    },
});

// ============================================
// FLOOR PLAN
// ============================================

const DEFAULT_FLOOR_PLAN = {
    key: "layout" as const,
    gridWidth: 12,
    gridHeight: 8,
    doorPosition: { x: 5, y: 0, width: 2, side: "top" as const },
};

export const getFloorPlan = query({
    args: {},
    handler: async (ctx) => {
        const plan = await ctx.db
            .query("floorPlan")
            .filter((q) => q.eq(q.field("key"), "layout"))
            .first();
        return plan ?? DEFAULT_FLOOR_PLAN;
    },
});

export const updateFloorPlan = mutation({
    args: {
        gridWidth: v.optional(v.number()),
        gridHeight: v.optional(v.number()),
        doorPosition: v.optional(v.object({
            x: v.number(),
            y: v.number(),
            width: v.number(),
            side: v.union(v.literal("top"), v.literal("bottom"), v.literal("left"), v.literal("right")),
        })),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("floorPlan")
            .filter((q) => q.eq(q.field("key"), "layout"))
            .first();

        const updates = Object.fromEntries(
            Object.entries(args).filter(([_, v]) => v !== undefined)
        );

        if (existing) {
            await ctx.db.patch(existing._id, updates);
        } else {
            await ctx.db.insert("floorPlan", { ...DEFAULT_FLOOR_PLAN, ...updates });
        }
        return { success: true };
    },
});

// ============================================
// TABLES
// ============================================

export const getTables = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query("tables").collect();
    },
});

export const createTable = mutation({
    args: {
        tableId: v.string(),
        name: v.optional(v.string()),
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
        shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
        capacity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Check if tableId already exists
        const existing = await ctx.db
            .query("tables")
            .withIndex("by_tableId", (q) => q.eq("tableId", args.tableId))
            .first();

        if (existing) {
            throw new Error(`Table ${args.tableId} already exists`);
        }

        const id = await ctx.db.insert("tables", {
            tableId: args.tableId,
            name: args.name,
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
            shape: args.shape ?? "square",
            capacity: args.capacity,
        });
        return { id };
    },
});

export const updateTable = mutation({
    args: {
        id: v.id("tables"),
        tableId: v.optional(v.string()),
        name: v.optional(v.string()),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
        capacity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, validUpdates);
        return { success: true };
    },
});

export const deleteTable = mutation({
    args: { id: v.id("tables") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const bulkUpdateTables = mutation({
    args: {
        tables: v.array(v.object({
            id: v.optional(v.id("tables")),
            tableId: v.string(),
            name: v.optional(v.string()),
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
            shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
            capacity: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        // Get all existing tables
        const existing = await ctx.db.query("tables").collect();
        const existingMap = new Map(existing.map(t => [t.tableId, t]));
        const incomingIds = new Set(args.tables.map(t => t.tableId));

        // Delete tables not in incoming list
        for (const table of existing) {
            if (!incomingIds.has(table.tableId)) {
                await ctx.db.delete(table._id);
            }
        }

        // Update or create tables
        for (const table of args.tables) {
            const existingTable = existingMap.get(table.tableId);
            if (existingTable) {
                await ctx.db.patch(existingTable._id, {
                    name: table.name,
                    x: table.x,
                    y: table.y,
                    width: table.width,
                    height: table.height,
                    shape: table.shape ?? "square",
                    capacity: table.capacity,
                });
            } else {
                await ctx.db.insert("tables", {
                    tableId: table.tableId,
                    name: table.name,
                    x: table.x,
                    y: table.y,
                    width: table.width,
                    height: table.height,
                    shape: table.shape ?? "square",
                    capacity: table.capacity,
                });
            }
        }

        return { success: true, count: args.tables.length };
    },
});

// Initialize default tables
export const initializeDefaultTables = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("tables").first();
        if (existing) {
            return { success: false, message: "Tables already exist" };
        }

        // Create default 12 tables in a 4x3 grid
        const defaultTables = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const num = row * 4 + col + 1;
                defaultTables.push({
                    tableId: `T${num}`,
                    x: col * 3 + 1, // Spread across grid
                    y: row * 2 + 2, // Start below door area
                    width: 2,
                    height: 1,
                    shape: "square" as const,
                });
            }
        }

        for (const table of defaultTables) {
            await ctx.db.insert("tables", table);
        }

        return { success: true, count: defaultTables.length };
    },
});
