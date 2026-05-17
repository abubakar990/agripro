-- AgriPro Full Database Schema

-- 4.1 farms
CREATE TABLE IF NOT EXISTS farms (
  id            SERIAL PRIMARY KEY,
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
  date              DATE NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,
  note              TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- 4.6 loans
CREATE TABLE IF NOT EXISTS loans (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
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
  date        DATE NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4.8 inventory
CREATE TABLE IF NOT EXISTS inventory (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER REFERENCES farms(id),
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
  date        DATE NOT NULL,
  present     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(worker_id, date)
);

-- 4.11 machinery
CREATE TABLE IF NOT EXISTS machinery (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER REFERENCES farms(id),
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
  label           VARCHAR(200),
  amount          DECIMAL(15,2) NOT NULL
);

-- 4.17 vendors_buyers
CREATE TABLE IF NOT EXISTS vendors_buyers (
  id                SERIAL PRIMARY KEY,
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
  date        DATE NOT NULL,
  field       VARCHAR(200),
  chemical    VARCHAR(300),
  qty         VARCHAR(100),
  crop        VARCHAR(100),
  purpose     VARCHAR(200),
  cost        DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);
