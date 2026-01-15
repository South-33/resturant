// ============================================
// PRODUCTS & CATEGORIES - Queries and Mutations
// ============================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// SHARED VALIDATORS
// ============================================

const variationValidator = v.object({
    name: v.string(),
    price: v.number(),
});

// ============================================
// CATEGORY QUERIES
// ============================================

/**
 * Get all categories sorted by sortOrder
 */
export const getCategories = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db
            .query("categories")
            .withIndex("by_sort_order")
            .collect();
    },
});

/**
 * Get a single category by ID
 */
export const getCategoryById = query({
    args: { categoryId: v.id("categories") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.categoryId);
    },
});

// ============================================
// PRODUCT QUERIES
// ============================================

/**
 * Get all products
 */
export const getAllProducts = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query("products").collect();
    },
});

/**
 * Get products by category
 */
export const getProductsByCategory = query({
    args: { categoryId: v.id("categories") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("products")
            .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
            .collect();
    },
});

/**
 * Get popular products (for featured section)
 */
export const getPopularProducts = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db
            .query("products")
            .withIndex("by_popular", (q) => q.eq("isPopular", true))
            .collect();
    },
});

/**
 * Get a single product by ID
 */
export const getProductById = query({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.productId);
    },
});

// ============================================
// CATEGORY MUTATIONS
// ============================================

/**
 * Create a new category
 */
export const createCategory = mutation({
    args: {
        name: v.string(),
        icon: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Auto-assign sortOrder if not provided
        let sortOrder = args.sortOrder;
        if (sortOrder === undefined) {
            const lastCategory = await ctx.db
                .query("categories")
                .withIndex("by_sort_order")
                .order("desc")
                .first();
            sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;
        }

        const categoryId = await ctx.db.insert("categories", {
            name: args.name,
            icon: args.icon,
            sortOrder,
        });

        return { categoryId };
    },
});

/**
 * Update a category
 */
export const updateCategory = mutation({
    args: {
        categoryId: v.id("categories"),
        name: v.optional(v.string()),
        icon: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { categoryId, ...updates } = args;

        const category = await ctx.db.get(categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        // Filter out undefined values
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        if (Object.keys(validUpdates).length > 0) {
            await ctx.db.patch(categoryId, validUpdates);
        }

        return { success: true };
    },
});

/**
 * Delete a category (and optionally its products)
 */
export const deleteCategory = mutation({
    args: {
        categoryId: v.id("categories"),
        deleteProducts: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const category = await ctx.db.get(args.categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        // Check for products in this category
        const products = await ctx.db
            .query("products")
            .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
            .collect();

        if (products.length > 0 && !args.deleteProducts) {
            throw new Error(
                `Category has ${products.length} products. Set deleteProducts=true to delete them.`
            );
        }

        // Delete products if requested
        if (args.deleteProducts) {
            await Promise.all(products.map((p) => ctx.db.delete(p._id)));
        }

        await ctx.db.delete(args.categoryId);
        return { success: true, deletedProducts: products.length };
    },
});

// ============================================
// PRODUCT MUTATIONS
// ============================================

/**
 * Create a new product
 */
export const createProduct = mutation({
    args: {
        categoryId: v.id("categories"),
        name: v.string(),
        description: v.string(),
        imageUrl: v.string(),
        basePrice: v.number(),
        isPopular: v.optional(v.boolean()),
        variations: v.array(variationValidator),
    },
    handler: async (ctx, args) => {
        // Verify category exists
        const category = await ctx.db.get(args.categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        // Validate variations
        if (args.variations.length === 0) {
            throw new Error("Product must have at least one variation");
        }

        const productId = await ctx.db.insert("products", {
            categoryId: args.categoryId,
            name: args.name,
            description: args.description,
            imageUrl: args.imageUrl,
            basePrice: args.basePrice,
            isPopular: args.isPopular ?? false,
            variations: args.variations,
        });

        return { productId };
    },
});

/**
 * Update a product
 */
export const updateProduct = mutation({
    args: {
        productId: v.id("products"),
        categoryId: v.optional(v.id("categories")),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        basePrice: v.optional(v.number()),
        isPopular: v.optional(v.boolean()),
        variations: v.optional(v.array(variationValidator)),
    },
    handler: async (ctx, args) => {
        const { productId, ...updates } = args;

        const product = await ctx.db.get(productId);
        if (!product) {
            throw new Error("Product not found");
        }

        // Verify new category if provided
        if (updates.categoryId) {
            const category = await ctx.db.get(updates.categoryId);
            if (!category) {
                throw new Error("Category not found");
            }
        }

        // Validate variations if provided
        if (updates.variations && updates.variations.length === 0) {
            throw new Error("Product must have at least one variation");
        }

        // Filter out undefined values
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        if (Object.keys(validUpdates).length > 0) {
            await ctx.db.patch(productId, validUpdates);
        }

        return { success: true };
    },
});

/**
 * Delete a product
 */
export const deleteProduct = mutation({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error("Product not found");
        }

        await ctx.db.delete(args.productId);
        return { success: true };
    },
});

/**
 * Toggle product popularity
 */
export const toggleProductPopular = mutation({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error("Product not found");
        }

        await ctx.db.patch(args.productId, { isPopular: !product.isPopular });
        return { isPopular: !product.isPopular };
    },
});

// ============================================
// SEED DATA (for initial setup)
// ============================================

export const seedMenuData = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if already seeded
        const existingCategories = await ctx.db.query("categories").first();
        if (existingCategories) {
            return { message: "Data already seeded", seeded: false };
        }

        // Seed categories
        const categoryData = [
            { name: "Coffee", icon: "☕", sortOrder: 1 },
            { name: "Tea", icon: "🍵", sortOrder: 2 },
            { name: "Juice & Smoothies", icon: "🥤", sortOrder: 3 },
            { name: "Food", icon: "🍰", sortOrder: 4 },
        ];

        const categoryIds: Record<string, Id<"categories">> = {};
        for (const cat of categoryData) {
            const id = await ctx.db.insert("categories", cat);
            categoryIds[cat.name] = id;
        }

        // Seed products
        const productData = [
            // Coffee
            {
                categoryId: categoryIds["Coffee"],
                name: "Amazon Signature",
                description: "Rich flavor of our signature blend",
                imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop",
                basePrice: 1.6,
                isPopular: true,
                variations: [
                    { name: "Hot", price: 1.6 },
                    { name: "Iced", price: 2.15 },
                    { name: "Frappe", price: 2.3 },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Honey Black Coffee",
                description: "Bold black coffee sweetened with natural honey",
                imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop",
                basePrice: 2.0,
                isPopular: true,
                variations: [
                    { name: "Hot", price: 2.0 },
                    { name: "Iced", price: 2.5 },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Cappuccino",
                description: "Espresso-based coffee with steamed milk foam",
                imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop",
                basePrice: 1.6,
                isPopular: true,
                variations: [
                    { name: "Hot", price: 1.6 },
                    { name: "Iced", price: 2.15 },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Latte Amazon",
                description: "Coffee-based drink with espresso and steamed milk",
                imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop",
                basePrice: 1.75,
                isPopular: true,
                variations: [
                    { name: "Hot", price: 1.75 },
                    { name: "Iced", price: 2.25 },
                    { name: "Frappe", price: 2.5 },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Mocha",
                description: "Chocolate-flavored espresso with steamed milk",
                imageUrl: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=400&fit=crop",
                basePrice: 2.2,
                isPopular: false,
                variations: [
                    { name: "Hot", price: 2.2 },
                    { name: "Iced", price: 2.7 },
                ],
            },
            // Tea
            {
                categoryId: categoryIds["Tea"],
                name: "Green Tea Latte",
                description: "Premium matcha green tea with creamy milk",
                imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=400&fit=crop",
                basePrice: 1.8,
                isPopular: true,
                variations: [
                    { name: "Hot", price: 1.8 },
                    { name: "Iced", price: 2.3 },
                ],
            },
            {
                categoryId: categoryIds["Tea"],
                name: "Thai Milk Tea",
                description: "Classic Thai tea with condensed milk",
                imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=400&fit=crop",
                basePrice: 2.0,
                isPopular: true,
                variations: [
                    { name: "Iced", price: 2.0 },
                    { name: "Frappe", price: 2.5 },
                ],
            },
            {
                categoryId: categoryIds["Tea"],
                name: "Oolong Tea",
                description: "Traditional Taiwanese oolong tea",
                imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop",
                basePrice: 1.5,
                isPopular: false,
                variations: [
                    { name: "Hot", price: 1.5 },
                    { name: "Iced", price: 1.8 },
                ],
            },
            // Smoothies
            {
                categoryId: categoryIds["Juice & Smoothies"],
                name: "Mango Smoothie",
                description: "Fresh mango blended with yogurt",
                imageUrl: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=400&fit=crop",
                basePrice: 2.5,
                isPopular: false,
                variations: [{ name: "Regular", price: 2.5 }],
            },
            {
                categoryId: categoryIds["Juice & Smoothies"],
                name: "Berry Blast",
                description: "Mixed berries with banana and ice",
                imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=400&fit=crop",
                basePrice: 2.8,
                isPopular: false,
                variations: [{ name: "Regular", price: 2.8 }],
            },
            // Food
            {
                categoryId: categoryIds["Food"],
                name: "Croissant",
                description: "Freshly baked butter croissant",
                imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop",
                basePrice: 1.2,
                isPopular: false,
                variations: [{ name: "Plain", price: 1.2 }],
            },
            {
                categoryId: categoryIds["Food"],
                name: "Chocolate Cake",
                description: "Rich dark chocolate layer cake",
                imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop",
                basePrice: 2.5,
                isPopular: false,
                variations: [{ name: "Slice", price: 2.5 }],
            },
        ];

        for (const product of productData) {
            await ctx.db.insert("products", product);
        }

        return {
            message: "Seeded successfully",
            seeded: true,
            categoriesCount: categoryData.length,
            productsCount: productData.length,
        };
    },
});

/**
 * Clear all data (for testing)
 */
export const clearAllData = mutation({
    args: { confirm: v.literal("DELETE_ALL_DATA") },
    handler: async (ctx, args) => {
        // Delete all order items
        const orderItems = await ctx.db.query("orderItems").collect();
        await Promise.all(orderItems.map((item) => ctx.db.delete(item._id)));

        // Delete all orders
        const orders = await ctx.db.query("orders").collect();
        await Promise.all(orders.map((order) => ctx.db.delete(order._id)));

        // Delete all products
        const products = await ctx.db.query("products").collect();
        await Promise.all(products.map((product) => ctx.db.delete(product._id)));

        // Delete all categories
        const categories = await ctx.db.query("categories").collect();
        await Promise.all(categories.map((cat) => ctx.db.delete(cat._id)));

        return {
            deletedOrderItems: orderItems.length,
            deletedOrders: orders.length,
            deletedProducts: products.length,
            deletedCategories: categories.length,
        };
    },
});
