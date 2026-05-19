-- AgriPro Full Database Schema (SaaS Multi-tenant)

-- 5.1 Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id   VARCHAR(255),
  subscription_tier    VARCHAR(50) DEFAULT 'free',
  subscription_status  VARCHAR(50) DEFAULT 'active'
);

-- 5.2 Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role            VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- 4.1 farms
CREATE TABLE IF NOT EXISTS farms (
  id            SERIAL PRIMARY KEY,
  org_id        UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id), -- Legacy support
  name          VARCHAR(100) NOT NULL,
  location      VARCHAR(200),
  area          VARCHAR(50),
  ownership     VARCHAR(50),
  land_value    DECIMAL(15,2) DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'Active',
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4.2 revenue
CREATE TABLE IF NOT EXISTS revenue (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  user_id       UUID REFERENCES auth.users(id), -- Legacy support
  date          DATE NOT NULL,
  category      VARCHAR(100) NOT NULL,
  description   TEXT,
  party         VARCHAR(200),
  amount        DECIMAL(15,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4.3 expenses
CREATE TABLE IF NOT EXISTS expenses (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  user_id       UUID REFERENCES auth.users(id), -- Legacy support
  date          DATE NOT NULL,
  category      VARCHAR(100) NOT NULL,
  description   TEXT,
  party         VARCHAR(200),
  amount        DECIMAL(15,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4.4 credit_entries
CREATE TABLE IF NOT EXISTS credit_entries (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  user_id       UUID REFERENCES auth.users(id), -- Legacy support
  date          DATE NOT NULL,
  type          VARCHAR(50),
  party         VARCHAR(200) NOT NULL,
  item          TEXT,
  total_amount  DECIMAL(15,2) NOT NULL,
  advance       DECIMAL(15,2) DEFAULT 0,
  due_date      DATE,
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4.5 credit_payments
CREATE TABLE IF NOT EXISTS credit_payments (
  id                SERIAL PRIMARY KEY,
  credit_entry_id   INTEGER REFERENCES credit_entries(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id), -- Legacy support
  date              DATE NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,
  note              TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- 4.6 loans
CREATE TABLE IF NOT EXISTS loans (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
  user_id         UUID REFERENCES auth.users(id), -- Legacy support
  date            DATE NOT NULL,
  type            VARCHAR(20),
  party           VARCHAR(200) NOT NULL,
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

-- 4.7 loan_payments
CREATE TABLE IF NOT EXISTS loan_payments (
  id          SERIAL PRIMARY KEY,
  loan_id     INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  date        DATE NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.8 inventory
CREATE TABLE IF NOT EXISTS inventory (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  item        VARCHAR(200) NOT NULL,
  category    VARCHAR(100),
  qty         DECIMAL(10,2) DEFAULT 0,
  unit        VARCHAR(50),
  reorder_level DECIMAL(10,2) DEFAULT 0,
  value       DECIMAL(15,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.9 workers
CREATE TABLE IF NOT EXISTS workers (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  name        VARCHAR(200) NOT NULL,
  role        VARCHAR(100),
  daily_rate  DECIMAL(10,2) NOT NULL,
  phone       VARCHAR(20),
  status      VARCHAR(20) DEFAULT 'Active',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.10 attendance
CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  worker_id   INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  farm_id     INTEGER REFERENCES farms(id),
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  date        DATE NOT NULL,
  present     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(worker_id, date)
);

-- 4.11 machinery
CREATE TABLE IF NOT EXISTS machinery (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
  user_id         UUID REFERENCES auth.users(id), -- Legacy support
  name            VARCHAR(200) NOT NULL,
  type            VARCHAR(100),
  year            INTEGER,
  reg_no          VARCHAR(100),
  purchase_price  DECIMAL(15,2) DEFAULT 0,
  current_value   DECIMAL(15,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 4.12 machine_usage
CREATE TABLE IF NOT EXISTS machine_usage (
  id          SERIAL PRIMARY KEY,
  machine_id  INTEGER REFERENCES machinery(id) ON DELETE CASCADE,
  farm_id     INTEGER REFERENCES farms(id),
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  date        DATE NOT NULL,
  hours       DECIMAL(8,2) DEFAULT 0,
  fuel_litres DECIMAL(8,2) DEFAULT 0,
  operator    VARCHAR(200),
  activity    VARCHAR(500),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.13 livestock
CREATE TABLE IF NOT EXISTS livestock (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
  user_id         UUID REFERENCES auth.users(id), -- Legacy support
  type            VARCHAR(100),
  tag             VARCHAR(50),
  name            VARCHAR(100),
  gender          VARCHAR(10),
  dob             DATE,
  purchase_price  DECIMAL(15,2) DEFAULT 0,
  current_value   DECIMAL(15,2) DEFAULT 0,
  milk_avg_litres DECIMAL(6,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 4.14 animal_health
CREATE TABLE IF NOT EXISTS animal_health (
  id            SERIAL PRIMARY KEY,
  livestock_id  INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id), -- Legacy support
  date          DATE NOT NULL,
  event         VARCHAR(100),
  treatment     TEXT,
  vet           VARCHAR(200),
  cost          DECIMAL(10,2) DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4.15 crop_cycles
CREATE TABLE IF NOT EXISTS crop_cycles (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id),
  user_id       UUID REFERENCES auth.users(id), -- Legacy support
  crop          VARCHAR(100),
  variety       VARCHAR(200),
  area          VARCHAR(50),
  sowing_date   DATE,
  harvest_date  DATE,
  status        VARCHAR(20),
  exp_yield     VARCHAR(100),
  act_yield     VARCHAR(100),
  revenue       DECIMAL(15,2) DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4.16 crop_expenses
CREATE TABLE IF NOT EXISTS crop_expenses (
  id              SERIAL PRIMARY KEY,
  crop_cycle_id   INTEGER REFERENCES crop_cycles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id), -- Legacy support
  label           VARCHAR(200),
  amount          DECIMAL(15,2) NOT NULL
);

-- 4.17 vendors_buyers
CREATE TABLE IF NOT EXISTS vendors_buyers (
  id                SERIAL PRIMARY KEY,
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id), -- Legacy support
  type              VARCHAR(10),
  name              VARCHAR(200) NOT NULL,
  contact           VARCHAR(50),
  address           TEXT,
  total_business    DECIMAL(15,2) DEFAULT 0,
  total_settled     DECIMAL(15,2) DEFAULT 0,
  note              TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- 4.18 mandi_prices
CREATE TABLE IF NOT EXISTS mandi_prices (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  commodity   VARCHAR(100) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  unit        VARCHAR(50),
  market      VARCHAR(200),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.19 irrigation_log
CREATE TABLE IF NOT EXISTS irrigation_log (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  date        DATE NOT NULL,
  field       VARCHAR(200),
  source      VARCHAR(100),
  hours       DECIMAL(8,2) DEFAULT 0,
  cost        DECIMAL(10,2) DEFAULT 0,
  crop        VARCHAR(100),
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.20 spray_log
CREATE TABLE IF NOT EXISTS spray_log (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
  user_id     UUID REFERENCES auth.users(id), -- Legacy support
  date        DATE NOT NULL,
  field       VARCHAR(200),
  chemical    VARCHAR(300),
  qty         VARCHAR(100),
  crop        VARCHAR(100),
  purpose     VARCHAR(200),
  cost        DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.21 categories
CREATE TABLE IF NOT EXISTS categories (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  module      VARCHAR(50) NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_farm_access(_farm_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = _farm_id AND public.is_org_member(org_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Enablement
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandi_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own organizations" ON organizations FOR SELECT USING (id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can view fellow members" ON organization_members FOR SELECT USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can access farms in their organization" ON farms FOR ALL USING (public.is_org_member(org_id));
CREATE POLICY "Org members can access revenue" ON revenue FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access expenses" ON expenses FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access credit_entries" ON credit_entries FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access credit_payments" ON credit_payments FOR ALL USING (EXISTS (SELECT 1 FROM credit_entries WHERE id = credit_entry_id AND public.has_farm_access(farm_id)));
CREATE POLICY "Org members can access loans" ON loans FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access loan_payments" ON loan_payments FOR ALL USING (EXISTS (SELECT 1 FROM loans WHERE id = loan_id AND public.has_farm_access(farm_id)));
CREATE POLICY "Org members can access inventory" ON inventory FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access workers" ON workers FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access attendance" ON attendance FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access machinery" ON machinery FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access machine_usage" ON machine_usage FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access livestock" ON livestock FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access animal_health" ON animal_health FOR ALL USING (EXISTS (SELECT 1 FROM livestock WHERE id = livestock_id AND public.has_farm_access(farm_id)));
CREATE POLICY "Org members can access crop_cycles" ON crop_cycles FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access crop_expenses" ON crop_expenses FOR ALL USING (EXISTS (SELECT 1 FROM crop_cycles WHERE id = crop_cycle_id AND public.has_farm_access(farm_id)));
CREATE POLICY "Org members can access vendors_buyers" ON vendors_buyers FOR ALL USING (public.is_org_member(org_id));
CREATE POLICY "Everyone can view mandi prices" ON mandi_prices FOR SELECT USING (true);
CREATE POLICY "Auth users can add mandi prices" ON mandi_prices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Org members can access irrigation_log" ON irrigation_log FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Org members can access spray_log" ON spray_log FOR ALL USING (public.has_farm_access(farm_id));
CREATE POLICY "Users can view org and default categories" ON categories FOR SELECT USING (public.is_org_member(org_id) OR user_id IS NULL);
CREATE POLICY "Users can insert their own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Auto-org Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  org_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Org';
  INSERT INTO public.organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;
  INSERT INTO public.organization_members (org_id, user_id, role) VALUES (new_org_id, new.id, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Default Categories (Seed)
INSERT INTO categories (name, module) VALUES
('Crop Sale', 'revenue'), ('Livestock Sale', 'revenue'), ('Milk Sale', 'revenue'), ('Equipment Rental', 'revenue'), ('Subsidy', 'revenue'), ('Other', 'revenue'),
('Fertilizer', 'expense'), ('Seed', 'expense'), ('Pesticide', 'expense'), ('Fuel', 'expense'), ('Labor', 'expense'), ('Feed', 'expense'), ('Maintenance', 'expense'), ('Veterinary', 'expense'), ('Rent', 'expense'), ('Other', 'expense'),
('Tractor', 'machinery'), ('Harvester', 'machinery'), ('Cultivator', 'machinery'), ('Seeder', 'machinery'), ('Sprayer', 'machinery'), ('Trailer', 'machinery'), ('Water Pump', 'machinery'),
('Cow', 'livestock'), ('Buffalo', 'livestock'), ('Goat', 'livestock'), ('Sheep', 'livestock'), ('Camel', 'livestock'), ('Poultry', 'livestock'),
('Fertilizer', 'inventory'), ('Seed', 'inventory'), ('Pesticide', 'inventory'), ('Feed', 'inventory'), ('Tools', 'inventory'), ('Fuel', 'inventory');
