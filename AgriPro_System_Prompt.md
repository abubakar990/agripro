# AgriPro — Complete Farm Management System
## Full Context Prompt for AI-Assisted / Vibe Coding

---

> **Purpose of this document:** Give this entire file as a system prompt or context to any AI coding platform (Cursor, Lovable, Bolt, v0, Replit AI, etc.) to build the complete AgriPro farm management system from scratch.

---

## 1. PROJECT OVERVIEW

Build a **full-stack, multi-farm agricultural business management system** called **AgriPro** for a Pakistani family farming business based in Rahim Yar Khan (RYK), Punjab, Pakistan.

The system must be production-quality, visually polished, and practical for daily farm use by non-technical family members. All monetary values are in **Pakistani Rupees (PKR)**. All weight units use **maan** (local unit), **kg**, or **quintal**. All yields are tracked in **maan**.

### Core Philosophy
- **Per-farm data isolation with combined view** — every data record belongs to a specific farm. Users can filter to see one farm's data or all farms combined.
- **Revenue ≠ Sales only** — revenue can come from crop sales, livestock sales, dairy, machine rental, land lease, subsidies, etc.
- **Expenses ≠ Purchases only** — expenses include seeds, fertilizer, labor wages, fuel, machine repair, land rent, utility bills, bank charges, etc.
- **Complete financial picture** — Balance Sheet, P&L, Assets, Liabilities, Receivables, and Payables all in one place.

---

## 2. TECH STACK

### Option A — React (Recommended for web app)
```
Frontend:  React 18 + Vite
Styling:   Tailwind CSS
Charts:    Recharts
Icons:     Tabler Icons (@tabler/icons-react)
Export:    SheetJS (xlsx) for Excel, browser print API for PDF
State:     React useState / useContext (no Redux needed)
Backend:   Optional — Supabase (PostgreSQL + Auth + Realtime)
```

### Option B — Next.js (If SSR needed)
```
Framework: Next.js 14 (App Router)
Styling:   Tailwind CSS
Database:  Supabase or PlanetScale (MySQL)
Auth:      Supabase Auth or NextAuth
```

### Option C — Flutter (Mobile app)
```
Framework: Flutter 3.x
State:     Riverpod or Bloc
Database:  Supabase (remote) + Hive (local cache)
Charts:    fl_chart
Export:    pdf package + share_plus
```

> **For quickest build:** Use React + Vite + Tailwind + Supabase.

---

## 3. GLOBAL DESIGN SYSTEM

### Color Palette
```
Primary Green:        #1a4d2e   (dark forest green — main brand color)
Primary Light:        #2d7a4a   (hover states)
Accent Green:         #4caf50   (success, active states)
Revenue Green:        #2e7d32   (income amounts)
Expense Red:          #c62828   (expense amounts)
Warning Amber:        #856404   (pending, low stock)
Info Blue:            #1565c0   (neutral financial data)
Background:           #f0f4f0   (main app background)
Card White:           #ffffff
Border Light:         #e0e0e0
Text Primary:         #1a1a1a
Text Secondary:       #666666
Text Muted:           #999999
```

### Typography
```
Font family:   'Segoe UI', system-ui, -apple-system, sans-serif
Heading:       700 weight, 15–22px
Body:          400 weight, 13–14px
Label:         700 weight, 10–11px, uppercase, letter-spacing: 1px
Monospace:     For PKR amounts — font-weight: 700–800
```

### Layout
```
Sidebar width (open):   230px
Sidebar width (closed):  60px
Header height:           58px
Main padding:            22px 24px
Card border-radius:      12px
Button border-radius:    8px
Input border-radius:     8px
```

### Component Specifications

**Cards:**
- White background, box-shadow: `0 2px 10px rgba(0,0,0,0.06)`
- Border-radius: 12px
- KPI cards have a colored left border (4px) matching the data type

**Badges:**
- Border-radius: 20px (pill shape)
- Padding: 3px 10px
- Font: 11px bold

**Tables:**
- Header: Primary green background (#1a4d2e), white text
- Alternating row colors: white / #fafcfa
- Row padding: 9px 12px
- Font: 12–13px

**Buttons:**
- Primary: Green background (#1a4d2e), white text
- Outline: Transparent background, green border
- Danger: Red (#c62828) background, white text
- Small: padding 6px 14px, font 12px
- Default: padding 10px 18px, font 13px

**Modals:**
- Overlay: rgba(0,0,0,0.55)
- Modal: white, border-radius 16px, max-width 460px (wide: 640px)
- Header: primary green, white text, sticky
- Max-height: 92vh, scrollable body

---

## 4. DATABASE SCHEMA

All tables include `farm_id` for per-farm filtering. Use these exact field names for consistency.

### 4.1 farms
```sql
CREATE TABLE farms (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,         -- "Main Farm", "North Field"
  location      VARCHAR(200),                  -- "Sardargarh, RYK"
  area          VARCHAR(50),                   -- "45 Acres"
  ownership     VARCHAR(50),                   -- "Owned" | "Leased"
  land_value    DECIMAL(15,2) DEFAULT 0,       -- PKR value of land
  status        VARCHAR(20) DEFAULT 'Active',  -- "Active" | "Idle"
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 4.2 revenue
```sql
CREATE TABLE revenue (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  date          DATE NOT NULL,
  category      VARCHAR(100) NOT NULL,   -- See Revenue Categories below
  description   TEXT,
  party         VARCHAR(200),            -- Buyer / source name
  amount        DECIMAL(15,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

**Revenue Categories (flexible, not hardcoded):**
```
Crop Sale | Livestock Sale | Dairy / Milk | Machine Rental |
Land Lease | Subsidy / Grant | Investment Return | Other Income
```

### 4.3 expenses
```sql
CREATE TABLE expenses (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  date          DATE NOT NULL,
  category      VARCHAR(100) NOT NULL,   -- See Expense Categories below
  description   TEXT,
  party         VARCHAR(200),            -- Vendor / payee name
  amount        DECIMAL(15,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

**Expense Categories (flexible, not hardcoded):**
```
Seeds | Fertilizer | Pesticide | Irrigation | Labor / Wages |
Fuel | Machine Repair | Transport | Land Rent | Utility Bills |
Bank Charges | Other Expense
```

### 4.4 credit_entries
```sql
CREATE TABLE credit_entries (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  date          DATE NOT NULL,
  type          VARCHAR(50),             -- "Credit Purchase" | "Credit Sale"
  party         VARCHAR(200) NOT NULL,
  item          TEXT,                    -- What was bought/sold
  total_amount  DECIMAL(15,2) NOT NULL,
  advance       DECIMAL(15,2) DEFAULT 0,
  due_date      DATE,
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 4.5 credit_payments
```sql
CREATE TABLE credit_payments (
  id                SERIAL PRIMARY KEY,
  credit_entry_id   INTEGER REFERENCES credit_entries(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,
  note              TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### 4.6 loans
```sql
CREATE TABLE loans (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
  date            DATE NOT NULL,
  type            VARCHAR(20),           -- "Borrowed" | "Lent"
  party           VARCHAR(200) NOT NULL, -- Bank / person name
  purpose         TEXT,
  principal       DECIMAL(15,2) NOT NULL,
  interest_rate   DECIMAL(5,2) DEFAULT 0,
  tenure_months   INTEGER DEFAULT 0,
  monthly_install DECIMAL(15,2) DEFAULT 0,
  paid            DECIMAL(15,2) DEFAULT 0,
  due_date        DATE,
  status          VARCHAR(20) DEFAULT 'Active',
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.7 loan_payments
```sql
CREATE TABLE loan_payments (
  id          SERIAL PRIMARY KEY,
  loan_id     INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 4.8 inventory
```sql
CREATE TABLE inventory (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  item        VARCHAR(200) NOT NULL,
  category    VARCHAR(100),     -- "Fertilizer" | "Seed" | "Pesticide" | "Fuel" | "Equipment" | "Other"
  qty         DECIMAL(10,2) DEFAULT 0,
  unit        VARCHAR(50),      -- "Bags" | "kg" | "Litre" | "maan" | "Pieces"
  reorder_level DECIMAL(10,2) DEFAULT 0,
  value       DECIMAL(15,2) DEFAULT 0,  -- Current estimated PKR value
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 4.9 workers
```sql
CREATE TABLE workers (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  name        VARCHAR(200) NOT NULL,
  role        VARCHAR(100),   -- "Field Worker" | "Tractor Operator" | "Irrigator" | etc.
  daily_rate  DECIMAL(10,2) NOT NULL,
  phone       VARCHAR(20),
  status      VARCHAR(20) DEFAULT 'Active',
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 4.10 attendance
```sql
CREATE TABLE attendance (
  id          SERIAL PRIMARY KEY,
  worker_id   INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  farm_id     INTEGER REFERENCES farms(id),
  date        DATE NOT NULL,
  present     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(worker_id, date)
);
```

### 4.11 machinery
```sql
CREATE TABLE machinery (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
  name            VARCHAR(200) NOT NULL,   -- "John Deere Tractor 5310"
  type            VARCHAR(100),             -- "Tractor" | "Pump" | "Thresher" | etc.
  year            INTEGER,
  reg_no          VARCHAR(100),
  purchase_price  DECIMAL(15,2) DEFAULT 0,
  current_value   DECIMAL(15,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.12 machine_usage
```sql
CREATE TABLE machine_usage (
  id          SERIAL PRIMARY KEY,
  machine_id  INTEGER REFERENCES machinery(id) ON DELETE CASCADE,
  farm_id     INTEGER REFERENCES farms(id),
  date        DATE NOT NULL,
  hours       DECIMAL(8,2) DEFAULT 0,
  fuel_litres DECIMAL(8,2) DEFAULT 0,
  operator    VARCHAR(200),
  activity    VARCHAR(500),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 4.13 livestock
```sql
CREATE TABLE livestock (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
  type            VARCHAR(100),   -- "Buffalo" | "Cow" | "Goat" | "Sheep" | "Camel"
  tag             VARCHAR(50),    -- "BUF-01"
  name            VARCHAR(100),   -- Optional common name
  gender          VARCHAR(10),    -- "Male" | "Female"
  dob             DATE,
  purchase_price  DECIMAL(15,2) DEFAULT 0,
  current_value   DECIMAL(15,2) DEFAULT 0,
  milk_avg_litres DECIMAL(6,2) DEFAULT 0,  -- Average daily milk in litres
  status          VARCHAR(20) DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.14 animal_health
```sql
CREATE TABLE animal_health (
  id            SERIAL PRIMARY KEY,
  livestock_id  INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  event         VARCHAR(100),   -- "Vaccination" | "Treatment" | "Deworming" | "Breeding" | "Calving"
  treatment     TEXT,
  vet           VARCHAR(200),
  cost          DECIMAL(10,2) DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 4.15 crop_cycles
```sql
CREATE TABLE crop_cycles (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  crop          VARCHAR(100),     -- "Wheat" | "Cotton" | "Rice" | "Sugarcane" | "Maize"
  variety       VARCHAR(200),     -- "Akbar-19" | "BT-121"
  area          VARCHAR(50),      -- "30 Acres"
  sowing_date   DATE,
  harvest_date  DATE,
  status        VARCHAR(20),      -- "Growing" | "Harvested" | "Failed"
  exp_yield     VARCHAR(100),     -- "1800 maan"
  act_yield     VARCHAR(100),     -- Actual yield after harvest
  revenue       DECIMAL(15,2) DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 4.16 crop_expenses
```sql
CREATE TABLE crop_expenses (
  id              SERIAL PRIMARY KEY,
  crop_cycle_id   INTEGER REFERENCES crop_cycles(id) ON DELETE CASCADE,
  label           VARCHAR(200),   -- "Seed", "Fertilizer", "Labor"
  amount          DECIMAL(15,2) NOT NULL
);
```

### 4.17 vendors_buyers
```sql
CREATE TABLE vendors_buyers (
  id                SERIAL PRIMARY KEY,
  type              VARCHAR(10),   -- "Vendor" | "Buyer"
  name              VARCHAR(200) NOT NULL,
  contact           VARCHAR(50),
  address           TEXT,
  total_business    DECIMAL(15,2) DEFAULT 0,
  total_settled     DECIMAL(15,2) DEFAULT 0,
  note              TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### 4.18 mandi_prices
```sql
CREATE TABLE mandi_prices (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  commodity   VARCHAR(100) NOT NULL,  -- "Wheat" | "Cotton" | "Rice Basmati" | "Sugarcane"
  price       DECIMAL(10,2) NOT NULL,
  unit        VARCHAR(50),            -- "per maan" | "per kg" | "per quintal"
  market      VARCHAR(200),           -- "RYK Mandi"
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 4.19 irrigation_log
```sql
CREATE TABLE irrigation_log (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  date        DATE NOT NULL,
  field       VARCHAR(200),   -- "Block A" | "North-1"
  source      VARCHAR(100),   -- "Tubewell" | "Canal" | "Rain"
  hours       DECIMAL(8,2) DEFAULT 0,
  cost        DECIMAL(10,2) DEFAULT 0,
  crop        VARCHAR(100),
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 4.20 spray_log
```sql
CREATE TABLE spray_log (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  date        DATE NOT NULL,
  field       VARCHAR(200),
  chemical    VARCHAR(300),   -- "Lambda Cyhalothrin"
  qty         VARCHAR(100),   -- "2L" | "5kg"
  crop        VARCHAR(100),
  purpose     VARCHAR(200),   -- "Pest control" | "Disease control" | "Weed control"
  cost        DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 5. APPLICATION MODULES

### MODULE 1 — SIDEBAR NAVIGATION

**Structure:**

```
OVERVIEW
  └── Dashboard

FINANCIALS
  ├── Revenue
  ├── Expenses
  ├── Credit Ledger
  └── Loans & Borrowed

FARM OPS
  ├── Crop Cycles
  ├── Irrigation Log
  ├── Spray Log
  └── Mandi Prices

PEOPLE
  └── Labor & Payroll

ASSETS
  ├── Inventory
  ├── Machinery
  └── Livestock

PARTIES
  └── Vendors & Buyers

REPORTS
  └── Financial Reports
```

**Sidebar behavior:**
- Collapsible (icon-only when closed, full labels when open)
- Active item highlighted with semi-transparent white background
- Group labels visible only when sidebar is open
- "Credit Ledger" shows a red badge count if there are overdue entries
- Sidebar is sticky (stays while main content scrolls)

---

### MODULE 2 — GLOBAL FARM FILTER

This is the most critical cross-cutting feature.

**Implementation:**
- A `farmFilter` state at the root level: `"all"` or a specific `farm_id`
- A **farm selector dropdown** in the top header
- A **farm filter bar** (pill buttons) at the top of each module page
- Every data fetch/filter must respect `farmFilter`

**Filter logic:**
```javascript
// If farmFilter === "all": show all records
// If farmFilter === farmId: show only records where farm_id === farmId

const filteredData = data.filter(item =>
  farmFilter === "all" || item.farm_id === farmFilter
);
```

**Header farm selector:**
```
[🌾 All Farms ▼]  — dropdown with all farms listed
```

**Farm filter bar (inside each module):**
```
[ 🌾 All Farms ]  [ 🏡 Main Farm ]  [ 🏡 North Field ]  [ 🏡 South Plot ]
```
Active pill: dark green background, white text
Inactive pill: white background, gray border

---

### MODULE 3 — DASHBOARD

**KPI Cards (8 cards, 4 per row on desktop):**
1. Total Revenue — green, trending-up icon
2. Total Expenses — red, trending-down icon
3. Net Profit / Loss — blue (profit) or red (loss)
4. Credit Receivable — amber, credit-card icon
5. Outstanding Loan Debt — red, bank icon
6. Total Asset Value (machinery + livestock + inventory) — green
7. Today's Attendance (present / total workers) — green
8. Livestock Count — amber

**Alert banners (clickable, navigate to relevant module):**
- Show if any overdue credit entries exist → red banner → click → Credit Ledger
- Show if any low stock items → amber banner → click → Inventory
- Show if outstanding loan debt exists → blue banner → click → Loans

**Charts (2 side by side):**
- Left: Revenue by Category — horizontal bar chart with progress bars (no chart library needed, pure CSS)
- Right: Expense by Category — same style, red bars

**Recent Transactions table:**
- Last 6 entries from Revenue + Expenses combined, sorted by date desc
- Columns: Date | Type (Revenue/Expense badge) | Category | Description | Party | Amount

---

### MODULE 4 — REVENUE

**Important:** Revenue is NOT just crop sales. It includes any money coming INTO the farm.

**Revenue Categories (user can also type custom):**
```
Crop Sale         — selling wheat, cotton, rice, sugarcane etc.
Livestock Sale    — selling animals
Dairy / Milk      — regular milk income
Machine Rental    — renting out tractor/thresher to others
Land Lease        — leasing out farmland to other farmers
Subsidy / Grant   — government Kisan card, ZTBL subsidy etc.
Investment Return — profit from any investment
Other Income      — anything else
```

**Page layout:**
1. Farm filter bar
2. Section header with "+ Add Revenue" button
3. KPI cards: Total Revenue | Entry Count | Top Category | Top Category Amount
4. Category breakdown grid: each category shows its total in a small card
5. Full table: Date | Farm | Category | Description | Party | Amount | Delete

**Add Revenue form fields:**
- Farm (dropdown of all farms)
- Date (date picker, default today)
- Revenue Category (dropdown from list above, can type custom)
- Description (free text)
- Party / Buyer name (free text)
- Amount in PKR (number input)

---

### MODULE 5 — EXPENSES

**Important:** Expenses are NOT just purchases. They include all money going OUT of the farm.

**Expense Categories:**
```
Seeds             — any seed purchase
Fertilizer        — DAP, Urea, SOP etc.
Pesticide         — any chemical spray
Irrigation        — tubewell electricity, canal charges
Labor / Wages     — daily worker payments
Fuel              — diesel, petrol for tractor/vehicles
Machine Repair    — workshop bills, spare parts
Transport         — truck/tractor hire, freight
Land Rent         — lease payment for rented land
Utility Bills     — electricity, water supply
Bank Charges      — loan interest, processing fees
Other Expense     — anything else
```

**Page layout:** Same structure as Revenue but in red theme.

**Add Expense form fields:** Same as Revenue form.

---

### MODULE 6 — CREDIT LEDGER

Track transactions where full payment is not made upfront — either buying on credit or selling on credit.

**Credit types:**
- **Credit Purchase** — bought goods but haven't paid in full yet (you OWE money)
- **Credit Sale** — sold goods but haven't received full payment yet (OWED TO you)

**Card-based layout (not table):**

Each credit entry is a card showing:
- Party name + Farm name
- Item description + Date + Due Date (red if overdue)
- Type badge + Status badge (Pending / Partial / Paid)
- **Progress bar:** Paid amount vs Total amount
  - Green fill when Paid
  - Amber fill when Partial
  - Red fill when Pending
- Payment history list (date, amount, note)
- "Record Payment" button (only if not fully paid)
- Note/comment

**Payment recording:**
When "Record Payment" is clicked:
- Show info box: Total | Already Paid | Remaining
- Form: Date | Amount | Note
- On save: add to payment history, recalculate status

**Status calculation:**
```javascript
const paidSoFar = payments.reduce((sum, p) => sum + p.amount, 0);
if (paidSoFar >= totalAmount) status = "Paid";
else if (paidSoFar > 0) status = "Partial";
else status = "Pending";
```

**Overdue detection:**
```javascript
const isOverdue = status !== "Paid" && dueDate < today;
```

**KPI cards:** Total Credit | Paid/Collected | Outstanding | Overdue Count

---

### MODULE 7 — LOANS & BORROWED

Track all borrowed money (from banks, individuals) and money lent to others.

**Split into two sections:**
1. **📥 You Borrowed (Payables)** — money you owe to others
2. **📤 You Lent (Receivables)** — money others owe you

**Card layout for each loan:**
- Party name + Farm + Purpose
- Interest rate (if any) | Due date | Monthly installment (if fixed)
- Progress bar (red for borrowed, blue for lent)
- Payment history
- Overdue badge if past due date
- Cleared badge if fully repaid
- "Record Repayment" / "Record Recovery" button

**Add Loan form fields:**
- Farm (dropdown)
- Date
- Type: Borrowed | Lent
- Party name (bank or person)
- Purpose
- Principal amount (PKR)
- Interest rate % (0 if none)
- Tenure in months (0 if flexible)
- Monthly installment (0 if flexible)
- Due / Return date
- Note

**KPI cards:** Total Borrowed | Repaid | Outstanding Debt | Money Lent (Receivable)

---

### MODULE 8 — CROP CYCLES

Track each crop from sowing to harvest with full cost accounting.

**Card layout for each cycle:**
- Crop name + Variety (large heading)
- Farm | Area | Sowing date → Harvest date
- Status badge (Growing / Harvested / Failed)
- Grid of metrics:
  - Expected Yield
  - Actual Yield
  - Revenue earned
  - Total Expenses
  - **Net Profit** (Revenue − Expenses, highlighted blue)
- Expense breakdown line: "Seed: Rs 12,000 | Fertilizer: Rs 38,000 | Labor: Rs 42,000"

**Add Crop Cycle form:**
- Farm
- Crop type (Wheat / Cotton / Rice / Sugarcane / Maize / Sunflower / Other)
- Variety
- Area (text: "30 Acres")
- Sowing date
- Expected harvest date
- Status
- Expected yield

**After harvest, user should be able to update:**
- Actual yield
- Revenue received
- Final expense additions

---

### MODULE 9 — LABOR & PAYROLL

Upgrade from simple "days worked" to full attendance tracking.

**Attendance Sheet (main feature):**
- Date picker at the top (default: today)
- Table with one row per worker:
  - Worker name | Role | Daily Rate | Present/Absent toggle | Days worked (cumulative) | Total wages
- Two buttons per worker: **✓ Present** (green) and **✗ Absent** (red)
- Buttons highlight to show today's status
- **Payroll total row** at the bottom

**Payroll Summary button:**
- Shows popup/modal with full breakdown:
  - Worker Name | Role | Days Worked | Daily Rate | Total Wages | Status
  - Grand total
  - Can export this as PDF or Excel

**Worker cards (separate section below attendance):**
- Worker name + Role + Farm
- Total days worked (all time)
- Total wages earned
- Phone number

**Add Worker form:**
- Farm
- Full name
- Role (Field Worker / Tractor Operator / Irrigator / Harvesting / Supervisor / Other)
- Daily rate (PKR)
- Phone number (optional)

---

### MODULE 10 — INVENTORY

Track all physical stock on hand.

**Low stock alerts:**
- If qty ≤ reorder_level → show warning banner at top of page
- Row highlighted in the table
- Badge shows "Low" or "Out of Stock"

**Table columns:** Farm | Item | Category | Qty | Unit | Reorder Level | Value | Status

**Status logic:**
```
qty === 0            → "Out of Stock" (red badge)
qty <= reorder_level → "Low" (amber badge)
qty > reorder_level  → "OK" (green badge)
```

**KPI cards:** Total Items | Total Value | Low Stock Count

---

### MODULE 11 — MACHINERY & EQUIPMENT

Track all farm equipment with usage logs.

**Machine cards (grid):**
- Machine name + Type + Year + Farm
- Registration/Serial number
- Current value
- Total hours logged (from usage)
- Total fuel consumed (from usage)
- "Log Usage" button
- "Remove" button (danger)

**Usage Log table (below cards):**
- Date | Machine | Farm | Activity | Hours | Fuel (L) | Operator

**Add Machine form:**
- Farm
- Machine name (e.g. "John Deere 5310")
- Type (Tractor / Pump/Tubewell / Thresher / Harvester / Sprayer / Generator / Other)
- Year
- Registration/Serial number
- Purchase price
- Current value

**Log Usage form:**
- Machine (dropdown)
- Date
- Activity description
- Hours used
- Fuel consumed (litres)
- Operator name
- Notes

**KPI cards:** Machine Count | Total Asset Value | Usage Records | Total Hours

---

### MODULE 12 — LIVESTOCK

Track individual animals with health records.

**Animal cards (grid):**
- Type + Tag + Name (if named)
- Gender | Farm | DOB
- Purchase price | Current value
- Daily milk output (if applicable, shown in green)
- Recent health events (last 2 events shown inline)
- "+ Health Log" button

**Health event display:**
- Small list inside each animal card
- Format: `2026-03-10 — Vaccination: FMD Vaccine (Rs 800)`

**Add Animal form:**
- Farm
- Type (Buffalo / Cow / Goat / Sheep / Camel / Other)
- Tag/ID (e.g. "BUF-03")
- Name (optional)
- Gender
- Date of birth
- Purchase price
- Current value
- Daily milk in litres (0 if not milking)

**Add Health Event form:**
- Animal (dropdown)
- Date
- Event type (Vaccination / Treatment / Deworming / Breeding / Calving / Check-up / Other)
- Treatment/medicine details
- Vet name
- Cost
- Note

**KPI cards:** Total Animals | Total Value | Milking Animals | Daily Milk (total litres)

---

### MODULE 13 — VENDORS & BUYERS

Maintain a directory of all business parties.

**Tabbed interface:** Vendors (Suppliers) | Buyers (Customers)

**Party cards:**
- Name + Contact + Address
- Total business done
- Total settled/paid
- **Outstanding amount** — shown prominently in amber if > 0
- For Vendor: "You owe: Rs X"
- For Buyer: "They owe: Rs X"
- Note

**Add party form:**
- Type (Vendor / Buyer)
- Name
- Contact number
- Address
- Note

---

### MODULE 14 — MANDI PRICES

Track daily commodity market prices for sell/buy timing.

**Price cards at top (one per commodity):**
- Commodity name
- Latest price (large, bold, green)
- Unit (per maan / per kg)
- Market name
- Price trend: ▲ higher than last entry (green) or ▼ lower (red) with comparison

**History table below:**
- Date | Commodity | Price | Unit | Market

**Add Price form:**
- Date
- Commodity (Wheat / Cotton / Rice Basmati / Rice Common / Sugarcane / Maize / Other)
- Price (PKR)
- Unit (per maan / per kg / per quintal)
- Market name

---

### MODULE 15 — IRRIGATION LOG

**Table columns:** Date | Farm | Field/Block | Water Source | Hours | Crop | Cost | Note

**Add form:**
- Farm
- Date
- Field/Block name
- Source (Tubewell / Canal / Rain / Other)
- Hours
- Cost (PKR)
- Crop being irrigated
- Note

---

### MODULE 16 — SPRAY LOG

**Table columns:** Date | Farm | Field | Chemical | Quantity | Crop | Purpose | Cost

**Add form:**
- Farm
- Date
- Field/Block
- Chemical/Product name
- Quantity (e.g. "2L", "5kg")
- Crop
- Purpose (Pest control / Disease control / Weed control / Growth boost / Other)
- Cost (PKR)

---

### MODULE 17 — FINANCIAL REPORTS

**Most important module — instant financial snapshot.**

**Four report tabs:**

#### Tab 1: Balance Sheet
Split into two columns: Assets (left) | Liabilities (right)

**ASSETS calculation:**
```
Land Value          = farms[filtered].land_value (sum)
Machinery Value     = machinery[filtered].current_value (sum)
Livestock Value     = livestock[filtered].current_value (sum)
Inventory Value     = inventory[filtered].value (sum)
Cash / Bank (Est.)  = max(0, total_revenue - total_expenses)
Credit Receivable   = sum of (Credit Sale total - paid) for unpaid entries
Loans Receivable    = sum of (Lent principal - paid) for active loans
─────────────────────────────────────────────────────
TOTAL ASSETS        = sum of all above
```

**LIABILITIES calculation:**
```
Loans Payable       = sum of (Borrowed principal - paid) for active loans
Credit Payable      = sum of (Credit Purchase total - paid) for unpaid entries
─────────────────────────────────────────────────────
TOTAL LIABILITIES   = Loans Payable + Credit Payable
```

**NET WORTH (Equity):**
```
Net Worth = Total Assets − Total Liabilities
```

Show as a large prominent number at the bottom, green if positive, red if negative.

#### Tab 2: P&L Statement
```
REVENUE
  Crop Sale:           Rs xxx
  Dairy / Milk:        Rs xxx
  Machine Rental:      Rs xxx
  ... (all categories with values)
  ───────────────────────────────
  Total Revenue:       Rs xxx

EXPENSES
  Seeds:               Rs xxx
  Fertilizer:          Rs xxx
  Labor / Wages:       Rs xxx
  ... (all categories with values)
  ───────────────────────────────
  Total Expenses:      Rs xxx

  ═══════════════════════════════
  NET PROFIT / LOSS:   Rs xxx
```

#### Tab 3: Assets Snapshot
Card grid showing each asset class with value and count.

| Card | Content |
|------|---------|
| 🏡 Land | Land value + farm count |
| 🚜 Machinery | Value + machine count |
| 🐄 Livestock | Value + animal count |
| 📦 Inventory | Value + item count |
| 💰 Cash / Bank (Est.) | Revenue − Expenses |
| 🤝 Credit Receivable | Pending from buyers |
| 📤 Loans Receivable | Money lent pending |
| 🏆 Net Worth | Assets − Liabilities |

#### Tab 4: Receivables / Payables
Two-column layout:

**Left — RECEIVABLES (others owe you):**
- Each pending Credit Sale entry
- Each active "Lent" loan entry
- Total receivable at bottom

**Right — PAYABLES (you owe others):**
- Each pending Credit Purchase entry
- Each active "Borrowed" loan entry
- Total payable at bottom

---

### MODULE 18 — REPORT EXPORTS

**Three export formats:**

#### PDF Export
- Open a new browser window with a styled print-ready HTML page
- Include a "🖨️ Print / Save PDF" button at top right of the page
- On click, call `window.print()`
- CSS media query hides the button during print
- Report includes:
  - Logo/header area with farm name and generation date
  - KPI summary cards
  - All relevant tables
  - Footer with generation timestamp
- Make it printer-friendly (no dark backgrounds in print)

#### Excel Export (using SheetJS)
```javascript
import * as XLSX from "xlsx";

function exportExcel(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}
```

**Full Report Excel sheets:**
1. P&L Summary
2. Revenue Entries
3. Expense Entries
4. Credit Ledger
5. Loans Summary
6. Labor & Payroll
7. Inventory
8. Balance Sheet

#### CSV Export
- Simple comma-separated download
- One file per data type

---

## 6. BUSINESS LOGIC & CALCULATIONS

### 6.1 PKR Formatting
```javascript
const formatPKR = (amount) =>
  "Rs " + Number(amount || 0).toLocaleString("en-PK");
```

### 6.2 Date Formatting
```javascript
const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-PK", {
        day: "2-digit", month: "short", year: "numeric"
      })
    : "—";
```

### 6.3 Credit Status
```javascript
function getCreditStatus(entry) {
  const paid = entry.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid >= entry.totalAmount) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
}
```

### 6.4 Overdue Detection
```javascript
function isOverdue(entry) {
  const status = getCreditStatus(entry);
  return status !== "Paid" && entry.dueDate && entry.dueDate < TODAY;
}
```

### 6.5 Worker Payroll
```javascript
function getWorkerDaysWorked(workerId, attendanceRecords, farmFilter) {
  return attendanceRecords.filter(a =>
    a.workerId === workerId &&
    a.present === true &&
    (farmFilter === "all" || a.farmId === farmFilter)
  ).length;
}

function getWorkerTotalWages(worker, attendanceRecords, farmFilter) {
  return getWorkerDaysWorked(worker.id, attendanceRecords, farmFilter)
    * worker.dailyRate;
}
```

### 6.6 Balance Sheet
```javascript
function calculateBalanceSheet(state, farmFilter) {
  const filter = (arr) =>
    arr.filter(x => farmFilter === "all" || x.farmId === farmFilter);

  const totalRevenue = filter(state.revenue).reduce((s, r) => s + r.amount, 0);
  const totalExpenses = filter(state.expenses).reduce((s, e) => s + e.amount, 0);
  const getPaid = (entry) => entry.payments.reduce((s, p) => s + p.amount, 0);

  const assets = {
    land:      filter(state.farms).reduce((s, f) => s + f.landValue, 0),
    machinery: filter(state.machinery).reduce((s, m) => s + m.currentValue, 0),
    livestock: filter(state.livestock).reduce((s, l) => s + l.currentValue, 0),
    inventory: filter(state.inventory).reduce((s, i) => s + i.value, 0),
    cash:      Math.max(0, totalRevenue - totalExpenses),
    creditReceivable: filter(state.credit)
      .filter(c => c.type === "Credit Sale")
      .reduce((s, c) => s + (c.totalAmount - getPaid(c)), 0),
    loansReceivable: filter(state.loans)
      .filter(l => l.type === "Lent")
      .reduce((s, l) => s + (l.principal - l.paid), 0),
  };

  const liabilities = {
    loansBorrowed: filter(state.loans)
      .filter(l => l.type === "Borrowed")
      .reduce((s, l) => s + (l.principal - l.paid), 0),
    creditPayable: filter(state.credit)
      .filter(c => c.type === "Credit Purchase")
      .reduce((s, c) => s + (c.totalAmount - getPaid(c)), 0),
  };

  const totalAssets = Object.values(assets).reduce((s, v) => s + v, 0);
  const totalLiabilities = Object.values(liabilities).reduce((s, v) => s + v, 0);
  const netWorth = totalAssets - totalLiabilities;

  return { assets, liabilities, totalAssets, totalLiabilities, netWorth };
}
```

---

## 7. SEED / DEMO DATA

Pre-populate with this sample data so the app looks functional on first load.

### Farms
```
1. Main Farm     — Sardargarh, RYK   — 45 Acres — Owned — Land Value: Rs 9,000,000
2. North Field   — Rahim Yar Khan    — 18 Acres — Owned — Land Value: Rs 3,600,000
3. South Plot    — Bahawalpur        — 12 Acres — Leased — Land Value: Rs 0
```

### Revenue entries
```
Rs 185,000 — Crop Sale         — Wheat harvest         — Al-Rehman Flour Mill  — Farm 1
Rs  32,000 — Dairy / Milk      — April milk supply     — Local Dairy Co.       — Farm 1
Rs  55,000 — Livestock Sale    — 2 goats sold          — Local Market          — Farm 2
Rs  15,000 — Machine Rental    — Tractor hire 3 days   — Bashir Ahmad          — Farm 1
Rs 115,200 — Crop Sale         — Rice 960 maan         — Chaudhry Rice Mill    — Farm 3
Rs  28,000 — Land Lease        — Winter lease Block C  — Neighbour Raza        — Farm 1
```

### Expense entries
```
Rs  44,400 — Fertilizer    — DAP 24 bags           — Malik Agri Store  — Farm 1
Rs  32,400 — Fuel          — Tractor diesel 300L   — PSO Pump          — Farm 1
Rs  28,400 — Seeds         — Cotton seed BT 40kg   — National Seeds    — Farm 2
Rs   7,500 — Irrigation    — Tubewell electricity  — MEPCO             — Farm 1
Rs   4,800 — Pesticide     — Lambda 8L             — Malik Agri Store  — Farm 1
Rs  35,000 — Land Rent     — Q1 lease payment      — Landlord          — Farm 3
Rs  18,500 — Machine Repair— Tractor engine svc    — Workshop Ali      — Farm 1
Rs  42,000 — Labor / Wages — Harvesting team April — Daily Labour      — Farm 1
```

### Machinery
```
John Deere Tractor 5310  — Tractor   — 2019 — Farm 1 — Value: Rs 2,100,000
Tubewell Pump 30HP       — Pump      — 2021 — Farm 1 — Value: Rs   380,000
Thresher Machine         — Harvester — 2020 — Farm 2 — Value: Rs   220,000
```

### Livestock
```
Buffalo "Kaali"  — Female — DOB: 2020-03-15 — Farm 1 — Value: Rs 200,000 — Milk: 8L/day
Buffalo "Sufaid" — Female — DOB: 2019-08-20 — Farm 1 — Value: Rs 190,000 — Milk: 7L/day
Goat GT-01       — Female — DOB: 2022-05-01 — Farm 1 — Value: Rs  45,000
Goat GT-02       — Male   — DOB: 2022-06-15 — Farm 2 — Value: Rs  42,000
```

### Workers
```
Ahmad Khan    — Tractor Operator — Rs 1,200/day — Farm 1
Zafar Ali     — Field Worker     — Rs   800/day — Farm 1
Raheem Bux    — Field Worker     — Rs   800/day — Farm 2
Gulzar Ahmad  — Irrigator        — Rs   900/day — Farm 1
```

### Mandi Prices
```
Wheat       — Rs 5,850/maan — RYK Mandi — 2026-05-14
Cotton      — Rs 8,600/maan — RYK Mandi — 2026-05-14
Rice Basmati— Rs 4,300/maan — RYK Mandi — 2026-05-14
Sugarcane   — Rs   450/maan — RYK Mandi — 2026-05-14
```

---

## 8. USER EXPERIENCE REQUIREMENTS

### 8.1 Empty States
Every list/table must have a friendly empty state:
```
(icon)
No [items] recorded yet.
Click "+ Add New" to get started.
```

### 8.2 Confirmation
- Delete actions must show a browser `confirm()` dialog or a custom confirmation modal
- "Are you sure you want to delete this?" before removing any record

### 8.3 Form Validation
- Required fields: Date, Amount (must be > 0), Category, Party name
- Show inline error messages below fields in red
- Don't allow form submission with empty required fields

### 8.4 Loading States
- Show a spinner or skeleton loading state while fetching from backend
- Use optimistic updates where possible

### 8.5 Responsive Design
- Sidebar collapses to bottom navigation on mobile
- Tables become horizontally scrollable on small screens
- Card grids collapse from 3-4 columns to 1-2 on mobile
- Modals take full screen width on mobile with padding

### 8.6 Overdue Alerts
- Any entry with due date < today and status ≠ Paid → shown in red
- Due date text turns red
- "Overdue" badge appears
- Dashboard shows alert banner

---

## 9. NOTIFICATION / ALERT SYSTEM

Show these alerts on the dashboard:

| Condition | Alert Color | Message |
|-----------|-------------|---------|
| Credit entries overdue | Red | "X overdue credit entries need attention" |
| Inventory low stock | Amber | "X items are running low on stock" |
| Loan overdue | Red | "Loan payment overdue for [party]" |
| All good | Green | (no alerts shown, clean dashboard) |

Each alert is clickable and navigates to the relevant module.

---

## 10. PERMISSIONS & MULTI-USER (OPTIONAL, Phase 2)

If implementing auth:

| Role | Permissions |
|------|-------------|
| Owner / Admin | Full access, can delete, can view reports |
| Manager | Add/edit entries, cannot delete, cannot see loans |
| Worker | Only view attendance for themselves |

---

## 11. LOCALIZATION

| Setting | Value |
|---------|-------|
| Currency | PKR (Pakistani Rupee) |
| Currency symbol | "Rs " (prefix, with space) |
| Date format | DD MMM YYYY (e.g. "15 May 2026") |
| Weight units | maan, kg, quintal |
| Language | English (with Urdu labels for field names optional) |
| Number format | Pakistani comma grouping (e.g. 1,00,000 or 100,000) |
| Time zone | Asia/Karachi (PKT, UTC+5) |

---

## 12. PERFORMANCE REQUIREMENTS

- Initial load time: < 3 seconds
- All filtering/sorting: instant (client-side)
- Export generation: < 2 seconds for PDF, < 1 second for CSV
- Must work offline for data viewing (if using PWA/local storage)
- Minimum 1000 records before pagination is needed

---

## 13. FILE STRUCTURE (React)

```
src/
├── App.jsx                    — Root component, global state
├── main.jsx                   — Entry point
├── constants/
│   ├── categories.js          — REV_CATS, EXP_CATS arrays
│   ├── navConfig.js           — NAV items with groups
│   └── seedData.js            — Demo data for initial load
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   └── FarmFilterBar.jsx
│   ├── shared/
│   │   ├── KpiCards.jsx
│   │   ├── DataTable.jsx
│   │   ├── Modal.jsx
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── FormField.jsx
│   │   ├── ProgressBar.jsx
│   │   └── EmptyState.jsx
│   └── modules/
│       ├── Dashboard.jsx
│       ├── Revenue.jsx
│       ├── Expenses.jsx
│       ├── CreditLedger.jsx
│       ├── Loans.jsx
│       ├── CropCycles.jsx
│       ├── Irrigation.jsx
│       ├── SprayLog.jsx
│       ├── MandiPrices.jsx
│       ├── Labor.jsx
│       ├── Inventory.jsx
│       ├── Machinery.jsx
│       ├── Livestock.jsx
│       ├── VendorsBuyers.jsx
│       └── Reports.jsx
├── utils/
│   ├── format.js              — formatPKR, formatDate
│   ├── calculations.js        — balance sheet, P&L, payroll
│   ├── exportPDF.js           — PDF generation function
│   └── exportExcel.js         — Excel generation function
└── hooks/
    ├── useFarmFilter.js       — Farm filter state + logic
    └── useAlerts.js           — Dashboard alert calculations
```

---

## 14. QUICK START PROMPT FOR CODING AI

If you are giving this to an AI coding assistant, add this at the beginning:

```
Build a complete React + Tailwind CSS web application called "AgriPro" based on the 
specifications below. Create all modules in a single-page application with a collapsible 
sidebar. Use demo/seed data to pre-populate all modules. No backend is required — use 
React state (useState) for all data. Include SheetJS for Excel export and browser print 
API for PDF. Every module must respect a global farm filter. The color scheme is dark 
forest green (#1a4d2e) as primary. Build it production-quality.
```

---

## 15. REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-05-01 | Basic accounts: Sales, Expenses, Credit, Loans |
| v2.0 | 2026-05-10 | Added Reports with PDF/Excel export |
| v3.0 | 2026-05-12 | Added Credit Ledger with payment tracking, Loans with repayment |
| v4.0 | 2026-05-15 | Full rewrite: Revenue/Expense flexibility, Farm filter, Livestock, Machinery, Labor/Payroll, Crop Cycles, Vendors, Mandi, Balance Sheet, Receivables/Payables |

---

*Built for: Abu Bakar — NGS Technologies / Family Farm, Rahim Yar Khan, Pakistan*
*System Name: AgriPro Farm Manager*
*Version: 4.0 | Date: May 2026*
