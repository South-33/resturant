# 🍜 Restaurant Ordering App

A real-time restaurant ordering system with customer menu, kitchen order management, and staff dashboard.

## ✨ Features

- **Customer Menu** — Browse products, customize orders, add to cart
- **Real-time Kitchen** — Live Kanban board for order management
- **Cashier POS** — Table overview with payment tracking
- **Menu Management** — Staff can edit products *(coming soon)*

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS + CSS animations |
| State | Zustand (cart) |
| Backend | **Convex** (Reactive Database + Real-time) |
| Images | Unsplash URLs *(Cloudinary ready)* |
| Deployment | Vercel |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start Convex (creates project on first run)
npx convex dev
# → Copy NEXT_PUBLIC_CONVEX_URL to .env.local

# 3. Seed the menu data (run once)
npx convex run products:seedMenuData

# 4. Start Next.js (in another terminal)
pnpm dev

# 5. Open the app
# → Customer: http://localhost:3000
# → Staff:    http://localhost:3000/staff (PIN: 1234)
```

---

## 📱 Screens

### 1. Menu (`/`)
Customer-facing menu with categories, product grid, and customization modal.

- Hero banner with restaurant branding
- Horizontal category tabs (Popular 🔥, Coffee, Tea, Food, Juice & Smoothies)
- Product grid (2 cols mobile, 4 cols desktop)
- Product customization modal (variations like Hot/Iced/Frappe)
- Floating cart button with item count
- Slide-in cart drawer with checkout

### 2. Staff Dashboard (`/staff`)
Protected by PIN code (default: `1234`).

**Cashier View:**
- 12-table grid with status indicators
- Order details panel with payment controls
- Mark orders as paid

**Kitchen View:**
- 3-column Kanban: Pending → Preparing → Done
- Real-time order updates (auto-refresh via Convex)
- One-click status progression

**Menu Management:**
- Product grid with search & filter
- Add/Edit/Delete products with variations
- Category sidebar with product counts
- Toggle product popularity

---

## 🗄️ Database Schema

```typescript
// convex/schema.ts

categories: {
  name: string,
  icon?: string,
  sortOrder: number
}
  .index("by_sort_order", ["sortOrder"])

products: {
  categoryId: Id<"categories">,
  name: string,
  description: string,
  imageUrl: string,
  basePrice: number,
  isPopular: boolean,
  variations: [{ name: string, price: number }]
}
  .index("by_category", ["categoryId"])
  .index("by_popular", ["isPopular"])

orders: {
  orderNumber: number,
  tableId: string,
  status: "pending" | "preparing" | "done",
  paymentStatus: "pending" | "paid",
  total: number
}
  .index("by_status", ["status"])
  .index("by_table", ["tableId"])
  .index("by_payment", ["paymentStatus"])

orderItems: {
  orderId: Id<"orders">,
  productId?: Id<"products">,
  productName: string,  // Denormalized for display speed
  variation: string,
  quantity: number,
  price: number
}
  .index("by_order", ["orderId"])
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Customer menu
│   ├── staff/page.tsx        # Staff dashboard (Cashier + Kitchen)
│   ├── layout.tsx            # Root layout with Convex provider
│   └── globals.css
├── components/
│   ├── ConvexClientProvider.tsx
│   ├── CartDrawer.tsx
│   └── ProductModal.tsx
├── lib/
│   ├── store.ts              # Zustand cart store
│   └── icons.tsx             # SVG icons

convex/
├── schema.ts                 # Database schema
├── orders.ts                 # Order queries & mutations
└── products.ts               # Product queries & mutations
```

---

## 🖼️ Image Storage (Future)

Currently using **Unsplash URLs** for demo purposes.

For production, integrate **Cloudinary** for:
- Auto-optimization (WebP, compression)
- CDN delivery
- 25GB free bandwidth/month

```env
# Add to .env.local when ready
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Store only the Cloudinary URL in Convex to minimize bandwidth usage.

---

## 📊 Convex Free Tier Limits

| Resource | Limit | Your Estimate | Status |
|----------|-------|---------------|--------|
| Function calls | 1M/month | ~50-100k | ✅ |
| Database storage | 512 MB | <50 MB | ✅ |
| Database bandwidth | 1 GB/month | ~200 MB | ✅ |
| Real-time connections | 100 concurrent | 1-3 | ✅ |

**Verdict:** Free tier easily supports a single restaurant location.

---

## ✅ Development Progress

### Phase 1: Frontend ✅
- [x] Next.js 16 + Tailwind setup
- [x] Menu screen with product grid & categories
- [x] Cart drawer with quantity controls
- [x] Staff dashboard (Cashier + Kitchen)
- [x] Smooth animations & UI polish

### Phase 2: Convex Backend ✅
- [x] Database schema with optimized indexes
- [x] Order mutations (create, update status, update payment)
- [x] Product queries + seed mutation
- [x] Real-time subscriptions in Kitchen view
- [x] Cart → Convex order submission

### Phase 3: Menu Management ✅
- [x] Menu tab in Staff dashboard
- [x] Product list with search/filter
- [x] Add/Edit/Delete products
- [x] Product form with variations
- [x] Category sidebar & creation
- [x] Toggle product popularity

### Phase 4: Production 📋
- [ ] Deploy Convex to production
- [ ] Deploy frontend to Vercel
- [ ] Cloudinary image uploads
- [ ] Audio notifications for new orders

---

## 🔧 Environment Variables

```env
# Required
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Optional (for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## 📝 License

MIT
