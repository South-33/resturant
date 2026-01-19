// ============================================
// PRODUCTS & CATEGORIES - Queries and Mutations
// ============================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// SHARED VALIDATORS
// ============================================

// New variation group structure
const variationOptionValidator = v.object({
    name: v.string(),
    priceAdjustment: v.number(),
});

const variationGroupValidator = v.object({
    name: v.string(),
    required: v.boolean(),
    defaultOption: v.optional(v.string()), // Default option to select
    options: v.array(variationOptionValidator),
});

// Legacy variation validator (for backwards compatibility)
const legacyVariationValidator = v.object({
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
        variationGroups: v.optional(v.array(variationGroupValidator)),
        // Legacy support
        variations: v.optional(v.array(legacyVariationValidator)),
    },
    handler: async (ctx, args) => {
        // Verify category exists
        const category = await ctx.db.get(args.categoryId);
        if (!category) {
            throw new Error("Category not found");
        }

        // Products can have variationGroups, legacy variations, or neither (simple products)
        // No validation needed - all are valid

        const productId = await ctx.db.insert("products", {
            categoryId: args.categoryId,
            name: args.name,
            description: args.description,
            imageUrl: args.imageUrl,
            basePrice: args.basePrice,
            isPopular: args.isPopular ?? false,
            variationGroups: args.variationGroups,
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
        variationGroups: v.optional(v.array(variationGroupValidator)),
        variations: v.optional(v.array(legacyVariationValidator)),
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

        // Allow empty variation groups (simple products with no options)
        // No validation needed - products can have 0 variation groups

        // Build update object, keeping undefined values to allow clearing fields
        const validUpdates: any = {};
        for (const [key, value] of Object.entries(updates)) {
            // Include the value even if it's an empty array or undefined
            // This allows clearing variationGroups by setting it to undefined or []
            if (value !== undefined || key === 'variationGroups') {
                validUpdates[key] = value;
            }
        }

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

/**
 * Toggle product active status (in stock / out of stock)
 */
export const toggleProductActive = mutation({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error("Product not found");
        }

        const newActive = !(product.isActive ?? true);
        await ctx.db.patch(args.productId, { isActive: newActive });
        return { isActive: newActive };
    },
});

/**
 * Bulk toggle active status
 */
export const bulkToggleActive = mutation({
    args: {
        productIds: v.array(v.id("products")),
        isActive: v.boolean(),
    },
    handler: async (ctx, args) => {
        await Promise.all(
            args.productIds.map((id) =>
                ctx.db.patch(id, { isActive: args.isActive })
            )
        );
        return { updated: args.productIds.length };
    },
});

/**
 * Bulk delete products
 */
export const bulkDeleteProducts = mutation({
    args: {
        productIds: v.array(v.id("products")),
    },
    handler: async (ctx, args) => {
        await Promise.all(args.productIds.map((id) => ctx.db.delete(id)));
        return { deleted: args.productIds.length };
    },
});

/**
 * Bulk toggle popular status
 */
export const bulkTogglePopular = mutation({
    args: {
        productIds: v.array(v.id("products")),
        isPopular: v.boolean(),
    },
    handler: async (ctx, args) => {
        await Promise.all(
            args.productIds.map((id) =>
                ctx.db.patch(id, { isPopular: args.isPopular })
            )
        );
        return { updated: args.productIds.length };
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

        // Seed products with new variationGroups structure
        const productData = [
            // Coffee
            {
                categoryId: categoryIds["Coffee"],
                name: "Amazon Signature",
                description: "Rich flavor of our signature blend",
                imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop",
                basePrice: 1.6,
                isPopular: true,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.55 },
                            { name: "Frappe", priceAdjustment: 0.7 },
                        ],
                    },
                    {
                        name: "Sugar Level",
                        required: false,
                        options: [
                            { name: "0%", priceAdjustment: 0 },
                            { name: "25%", priceAdjustment: 0 },
                            { name: "50%", priceAdjustment: 0 },
                            { name: "75%", priceAdjustment: 0 },
                            { name: "100%", priceAdjustment: 0 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Honey Black Coffee",
                description: "Bold black coffee sweetened with natural honey",
                imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop",
                basePrice: 2.0,
                isPopular: true,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.5 },
                        ],
                    },
                    {
                        name: "Sugar Level",
                        required: false,
                        options: [
                            { name: "Less Sweet", priceAdjustment: 0 },
                            { name: "Normal", priceAdjustment: 0 },
                            { name: "Extra Sweet", priceAdjustment: 0 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Cappuccino",
                description: "Espresso-based coffee with steamed milk foam",
                imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop",
                basePrice: 1.6,
                isPopular: true,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.55 },
                        ],
                    },
                    {
                        name: "Size",
                        required: false,
                        options: [
                            { name: "Regular", priceAdjustment: 0 },
                            { name: "Large", priceAdjustment: 0.5 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Latte Amazon",
                description: "Coffee-based drink with espresso and steamed milk",
                imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop",
                basePrice: 1.75,
                isPopular: true,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.5 },
                            { name: "Frappe", priceAdjustment: 0.75 },
                        ],
                    },
                    {
                        name: "Extra Shot",
                        required: false,
                        options: [
                            { name: "No Extra", priceAdjustment: 0 },
                            { name: "+1 Shot", priceAdjustment: 0.5 },
                            { name: "+2 Shots", priceAdjustment: 1.0 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Coffee"],
                name: "Mocha",
                description: "Chocolate-flavored espresso with steamed milk",
                imageUrl: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=400&fit=crop",
                basePrice: 2.2,
                isPopular: false,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.5 },
                        ],
                    },
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
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.5 },
                        ],
                    },
                    {
                        name: "Sugar Level",
                        required: false,
                        options: [
                            { name: "0%", priceAdjustment: 0 },
                            { name: "50%", priceAdjustment: 0 },
                            { name: "100%", priceAdjustment: 0 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Tea"],
                name: "Thai Milk Tea",
                description: "Classic Thai tea with condensed milk",
                imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=400&fit=crop",
                basePrice: 2.0,
                isPopular: true,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Iced", priceAdjustment: 0 },
                            { name: "Frappe", priceAdjustment: 0.5 },
                        ],
                    },
                    {
                        name: "Ice Level",
                        required: false,
                        options: [
                            { name: "Less Ice", priceAdjustment: 0 },
                            { name: "Normal Ice", priceAdjustment: 0 },
                            { name: "Extra Ice", priceAdjustment: 0 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Tea"],
                name: "Oolong Tea",
                description: "Traditional Taiwanese oolong tea",
                imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop",
                basePrice: 1.5,
                isPopular: false,
                variationGroups: [
                    {
                        name: "Temperature",
                        required: true,
                        options: [
                            { name: "Hot", priceAdjustment: 0 },
                            { name: "Iced", priceAdjustment: 0.3 },
                        ],
                    },
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
                variationGroups: [
                    {
                        name: "Size",
                        required: true,
                        options: [
                            { name: "Regular", priceAdjustment: 0 },
                            { name: "Large", priceAdjustment: 1.0 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Juice & Smoothies"],
                name: "Berry Blast",
                description: "Mixed berries with banana and ice",
                imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=400&fit=crop",
                basePrice: 2.8,
                isPopular: false,
                variationGroups: [
                    {
                        name: "Size",
                        required: true,
                        options: [
                            { name: "Regular", priceAdjustment: 0 },
                            { name: "Large", priceAdjustment: 1.0 },
                        ],
                    },
                ],
            },
            // Food
            {
                categoryId: categoryIds["Food"],
                name: "Croissant",
                description: "Freshly baked butter croissant",
                imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop",
                basePrice: 1.2,
                isPopular: false,
                variationGroups: [
                    {
                        name: "Type",
                        required: true,
                        options: [
                            { name: "Plain", priceAdjustment: 0 },
                            { name: "Chocolate", priceAdjustment: 0.5 },
                            { name: "Almond", priceAdjustment: 0.7 },
                        ],
                    },
                ],
            },
            {
                categoryId: categoryIds["Food"],
                name: "Chocolate Cake",
                description: "Rich dark chocolate layer cake",
                imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop",
                basePrice: 2.5,
                isPopular: false,
                variationGroups: [
                    {
                        name: "Size",
                        required: true,
                        options: [
                            { name: "Slice", priceAdjustment: 0 },
                            { name: "Whole Cake", priceAdjustment: 15.0 },
                        ],
                    },
                ],
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
 * Validate variation groups in products and identify issues
 */
export const validateProductVariations = query({
    args: {},
    handler: async (ctx) => {
        const allProducts = await ctx.db.query("products").collect();
        const issues: Array<{
            productId: string;
            productName: string;
            issue: string;
            severity: "error" | "warning";
        }> = [];

        for (const product of allProducts) {
            // Check for products with variationGroups
            if (product.variationGroups && product.variationGroups.length > 0) {
                // Check each variation group
                for (const group of product.variationGroups) {
                    // Empty options
                    if (!group.options || group.options.length === 0) {
                        issues.push({
                            productId: product._id,
                            productName: product.name,
                            issue: `Variation group "${group.name}" has no options`,
                            severity: "error",
                        });
                    }

                    // Check for duplicate option names
                    if (group.options) {
                        const optionNames = group.options.map((o) => o.name);
                        const duplicates = optionNames.filter(
                            (name, index) => optionNames.indexOf(name) !== index
                        );
                        if (duplicates.length > 0) {
                            issues.push({
                                productId: product._id,
                                productName: product.name,
                                issue: `Variation group "${group.name}" has duplicate options: ${duplicates.join(", ")}`,
                                severity: "warning",
                            });
                        }
                    }
                }

                // Check for duplicate group names
                const groupNames = product.variationGroups.map((g) => g.name);
                const duplicateGroups = groupNames.filter(
                    (name, index) => groupNames.indexOf(name) !== index
                );
                if (duplicateGroups.length > 0) {
                    issues.push({
                        productId: product._id,
                        productName: product.name,
                        issue: `Product has duplicate variation groups: ${duplicateGroups.join(", ")}`,
                        severity: "warning",
                    });
                }
            }

            // Check for negative prices
            if (product.basePrice < 0) {
                issues.push({
                    productId: product._id,
                    productName: product.name,
                    issue: `Base price is negative: $${product.basePrice}`,
                    severity: "error",
                });
            }

            // Check for price adjustments that would result in negative final price
            if (product.variationGroups) {
                for (const group of product.variationGroups) {
                    for (const option of group.options) {
                        const finalPrice = product.basePrice + option.priceAdjustment;
                        if (finalPrice < 0) {
                            issues.push({
                                productId: product._id,
                                productName: product.name,
                                issue: `Option "${option.name}" in "${group.name}" would result in negative price: $${finalPrice.toFixed(2)}`,
                                severity: "error",
                            });
                        }
                    }
                }
            }
        }

        return {
            totalProducts: allProducts.length,
            issuesFound: issues.length,
            errors: issues.filter((i) => i.severity === "error").length,
            warnings: issues.filter((i) => i.severity === "warning").length,
            issues,
        };
    },
});

/**
 * Migrate products from old variations format to new variationGroups format
 * This converts products with legacy variations[] to variationGroups[]
 */
export const migrateProductsToVariationGroups = mutation({
    args: {},
    handler: async (ctx) => {
        // Get all products that have old variations but not new variationGroups
        const allProducts = await ctx.db.query("products").collect();
        
        const productsToMigrate = allProducts.filter(
            (p) => p.variations && p.variations.length > 0 && !p.variationGroups
        );

        if (productsToMigrate.length === 0) {
            return {
                message: "No products need migration",
                migrated: 0,
                alreadyMigrated: allProducts.filter((p) => p.variationGroups).length,
                simple: allProducts.filter((p) => !p.variations && !p.variationGroups).length,
            };
        }

        // Migrate each product
        let migrated = 0;
        for (const product of productsToMigrate) {
            // Convert old variations to new format
            // Old format: variations: [{ name: "Hot", price: 2.0 }]
            // New format: variationGroups: [{ name: "Temperature", required: true, options: [...] }]
            
            const variationGroups = [
                {
                    name: "Options", // Generic name for migrated variations
                    required: true,
                    options: product.variations!.map((v) => ({
                        name: v.name,
                        // Convert absolute price to price adjustment from base price
                        priceAdjustment: v.price - product.basePrice,
                    })),
                },
            ];

            await ctx.db.patch(product._id, {
                variationGroups,
                // Keep old variations for reference (can be removed later)
                // variations: undefined, // Uncomment to remove old data
            });

            migrated++;
        }

        return {
            message: `Successfully migrated ${migrated} products`,
            migrated,
            total: allProducts.length,
        };
    },
});

/**
 * Get migration status - check how many products use old vs new format
 */
export const getMigrationStatus = query({
    args: {},
    handler: async (ctx) => {
        const allProducts = await ctx.db.query("products").collect();

        const withVariationGroups = allProducts.filter((p) => p.variationGroups && p.variationGroups.length > 0);
        const withLegacyVariations = allProducts.filter((p) => p.variations && p.variations.length > 0 && !p.variationGroups);
        const simpleProducts = allProducts.filter((p) => !p.variations && !p.variationGroups);
        const bothFormats = allProducts.filter((p) => p.variations && p.variationGroups);

        return {
            total: allProducts.length,
            withVariationGroups: withVariationGroups.length,
            withLegacyVariations: withLegacyVariations.length,
            simpleProducts: simpleProducts.length,
            bothFormats: bothFormats.length,
            needsMigration: withLegacyVariations.length > 0,
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
