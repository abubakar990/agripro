export const SEED_FARMS = [
  { id: 1, name: "Main Farm", location: "Sardargarh, RYK", area: "45 Acres", ownership: "Owned", land_value: 9000000, status: "Active" },
  { id: 2, name: "North Field", location: "Rahim Yar Khan", area: "18 Acres", ownership: "Owned", land_value: 3600000, status: "Active" },
  { id: 3, name: "South Plot", location: "Bahawalpur", area: "12 Acres", ownership: "Leased", land_value: 0, status: "Active" },
];

export const SEED_REVENUE = [
  { id: 1, farm_id: 1, date: "2026-05-10", category: "Crop Sale", description: "Wheat harvest", party: "Al-Rehman Flour Mill", amount: 185000 },
  { id: 2, farm_id: 1, date: "2026-05-12", category: "Dairy / Milk", description: "April milk supply", party: "Local Dairy Co.", amount: 32000 },
  { id: 3, farm_id: 2, date: "2026-05-14", category: "Livestock Sale", description: "2 goats sold", party: "Local Market", amount: 55000 },
  { id: 4, farm_id: 1, date: "2026-05-15", category: "Machine Rental", description: "Tractor hire 3 days", party: "Bashir Ahmad", amount: 15000 },
  { id: 5, farm_id: 3, date: "2026-05-16", category: "Crop Sale", description: "Rice 960 maan", party: "Chaudhry Rice Mill", amount: 115200 },
  { id: 6, farm_id: 1, date: "2026-05-17", category: "Land Lease", description: "Winter lease Block C", party: "Neighbour Raza", amount: 28000 },
];

export const SEED_EXPENSES = [
  { id: 1, farm_id: 1, date: "2026-04-20", category: "Fertilizer", description: "DAP 24 bags", party: "Malik Agri Store", amount: 44400 },
  { id: 2, farm_id: 1, date: "2026-04-22", category: "Fuel", description: "Tractor diesel 300L", party: "PSO Pump", amount: 32400 },
  { id: 3, farm_id: 2, date: "2026-04-25", category: "Seeds", description: "Cotton seed BT 40kg", party: "National Seeds", amount: 28400 },
  { id: 4, farm_id: 1, date: "2026-04-28", category: "Irrigation", description: "Tubewell electricity", party: "MEPCO", amount: 7500 },
  { id: 5, farm_id: 1, date: "2026-05-01", category: "Pesticide", description: "Lambda 8L", party: "Malik Agri Store", amount: 4800 },
  { id: 6, farm_id: 3, date: "2026-05-03", category: "Land Rent", description: "Q1 lease payment", party: "Landlord", amount: 35000 },
  { id: 7, farm_id: 1, date: "2026-05-05", category: "Machine Repair", description: "Tractor engine svc", party: "Workshop Ali", amount: 18500 },
  { id: 8, farm_id: 1, date: "2026-05-08", category: "Labor / Wages", description: "Harvesting team April", party: "Daily Labour", amount: 42000 },
];

export const SEED_MACHINERY = [
  { id: 1, farm_id: 1, name: "John Deere Tractor 5310", type: "Tractor", year: 2019, reg_no: "RYK-123", purchase_price: 2500000, current_value: 2100000, status: "Active" },
  { id: 2, farm_id: 1, name: "Tubewell Pump 30HP", type: "Pump", year: 2021, reg_no: "TW-01", purchase_price: 450000, current_value: 380000, status: "Active" },
  { id: 3, farm_id: 2, name: "Thresher Machine", type: "Harvester", year: 2020, reg_no: "TH-05", purchase_price: 300000, current_value: 220000, status: "Active" },
];

export const SEED_LIVESTOCK = [
  { id: 1, farm_id: 1, type: "Buffalo", tag: "BUF-01", name: "Kaali", gender: "Female", dob: "2020-03-15", purchase_price: 180000, current_value: 200000, milk_avg_litres: 8, status: "Active" },
  { id: 2, farm_id: 1, type: "Buffalo", tag: "BUF-02", name: "Sufaid", gender: "Female", dob: "2019-08-20", purchase_price: 170000, current_value: 190000, milk_avg_litres: 7, status: "Active" },
  { id: 3, farm_id: 1, type: "Goat", tag: "GT-01", name: null, gender: "Female", dob: "2022-05-01", purchase_price: 35000, current_value: 45000, milk_avg_litres: 0, status: "Active" },
  { id: 4, farm_id: 2, type: "Goat", tag: "GT-02", name: null, gender: "Male", dob: "2022-06-15", purchase_price: 32000, current_value: 42000, milk_avg_litres: 0, status: "Active" },
];

export const SEED_WORKERS = [
  { id: 1, farm_id: 1, name: "Ahmad Khan", role: "Tractor Operator", daily_rate: 1200, phone: "0300-1234567", status: "Active" },
  { id: 2, farm_id: 1, name: "Zafar Ali", role: "Field Worker", daily_rate: 800, phone: "0300-2345678", status: "Active" },
  { id: 3, farm_id: 2, name: "Raheem Bux", role: "Field Worker", daily_rate: 800, phone: "0300-3456789", status: "Active" },
  { id: 4, farm_id: 1, name: "Gulzar Ahmad", role: "Irrigator", daily_rate: 900, phone: "0300-4567890", status: "Active" },
];

export const SEED_MANDI_PRICES = [
  { id: 1, date: "2026-05-14", commodity: "Wheat", price: 5850, unit: "per maan", market: "RYK Mandi" },
  { id: 2, date: "2026-05-14", commodity: "Cotton", price: 8600, unit: "per maan", market: "RYK Mandi" },
  { id: 3, date: "2026-05-14", commodity: "Rice Basmati", price: 4300, unit: "per maan", market: "RYK Mandi" },
  { id: 4, date: "2026-05-14", commodity: "Sugarcane", price: 450, unit: "per maan", market: "RYK Mandi" },
];
