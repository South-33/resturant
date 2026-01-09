# 🍜 Restaurant Ordering App

A 3-screen restaurant ordering system with customer menu and kitchen order management.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS + Framer Motion-like CSS animations |
| State | Zustand (cart & orders) |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Realtime) *Planned* |
| Deployment | Vercel |

---

## Screens

### 1. Menu (`/`)
Customer-facing menu with categories, product grid, and customization modal.

**Features:**
- Hero banner with restaurant branding
- Horizontal category tabs (Popular 🔥, Coffee, Tea, Food, Juice & Smoothies)
- Product grid (2 cols mobile, 4 cols desktop)
- Product customization modal (variations like Hot/Iced/Frappe)
- Floating cart button with item count

### 2. Cart (`/cart`)
Order review and checkout.

**Features:**
- Cart items with quantity controls (+/-)
- "You might also like" suggestions
- Subtotal & total calculation
- Submit Order button → creates order in DB

### 3. Kitchen (`/kitchen?pin=XXXX`)
Staff order management dashboard.

> **Security:** Protected by PIN code query param. Incorrect/missing PIN shows PIN entry screen.

**Features:**
- 3-column Kanban: Pending | Preparing | Done
- Real-time updates via Supabase subscriptions
- Order cards with items, time elapsed, action buttons
- Audio ping on new order (optional)

---

## Database Schema

```sql
-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  sort_order int default 0
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null,
  description text,
  image_url text,
  base_price decimal(10,2) not null,
  is_popular boolean default false,
  variations jsonb -- [{name: "Hot", price: 1.60}, {name: "Iced", price: 2.15}]
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial,
  status text default 'pending', -- pending | preparing | done
  total decimal(10,2),
  created_at timestamptz default now()
);

-- Order Items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text, -- denormalized for display
  variation text,
  quantity int default 1,
  price decimal(10,2)
);

-- Enable realtime
alter publication supabase_realtime add table orders;
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Menu screen
│   ├── cart/page.tsx         # Cart screen
│   ├── kitchen/page.tsx      # Kitchen dashboard
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ProductCard.tsx
│   ├── ProductModal.tsx
│   ├── CartItem.tsx
│   ├── OrderCard.tsx
│   └── CategoryTabs.tsx
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── store.ts              # Zustand cart store
│   └── mock-data.ts          # Mock products for frontend dev
└── types/
    └── index.ts
```

---

## Development Phases

### Phase 1: Frontend ✅ Complete
- [x] Project setup (Next.js 16 + Tailwind)
- [x] Mock data and Zustand stores
- [x] Menu screen with product grid, categories, & variation modal
- [x] Cart screen with quantity controls
- [x] Kitchen dashboard with Kanban layout
- [x] **UI Polish**: SVG icons, Unsplash images, smooth animations
- [x] localStorage persistence

### Phase 2: Supabase Integration (Coming Soon)
- [ ] Create Supabase project
- [ ] Run database migrations
- [ ] Replace mock data with Supabase queries
- [ ] Add real-time subscriptions for kitchen
- [ ] Submit order → insert into database

### Phase 3: Deployment
- [ ] Deploy to Vercel

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
KITCHEN_PIN=1234
```

---

## Commands

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build
```
