-- =====================================================================================
-- AgriPro demo seed (~2,900 rows). See README.md.
-- Set v_user / v_org below, then run the whole file.
-- Dates are relative to current_date, so the dataset stays "recent" whenever it is run.
-- =====================================================================================

do $$
declare
  v_user uuid := 'da3f53cb-eecc-4b44-b99c-0028b59a12ad';  -- ch.abubakar998@gmail.com
  v_org  uuid := '0bbeb6dc-4195-4cc8-89fa-8a58881f567e';  -- Abu Bakar's Org
  f1 int; f2 int; f3 int; f4 int;
  pA int; pB int; pC int; pD int; pE int; pW int; pR int; pI int; pO1 int; pO2 int;
begin

-- ---------------------------------------------------------------- FARMS
insert into farms (name, location, area, ownership, land_value, status, created_at, user_id, org_id, area_acres, latitude, longitude, map_zoom, boundary)
values ('Chak 42 Farm','Chak 42 JB, Faisalabad','45 Acres','Owned',2800000,'Active', now() - interval '20 months', v_user, v_org, 45, 31.4187, 73.0791, 15,
  '{"type":"Polygon","coordinates":[[[73.0741,31.4237],[73.0861,31.4237],[73.0861,31.4137],[73.0741,31.4137],[73.0741,31.4237]]]}'::jsonb)
returning id into f1;
insert into farms (name, location, area, ownership, land_value, status, created_at, user_id, org_id, area_acres, latitude, longitude, map_zoom, boundary)
values ('Sahiwal Riverside','Mauza Noorpur, Sahiwal','30 Acres','Owned',2200000,'Active', now() - interval '17 months', v_user, v_org, 30, 30.6682, 73.1114, 15,
  '{"type":"Polygon","coordinates":[[[73.1064,30.6722],[73.1164,30.6722],[73.1164,30.6642],[73.1064,30.6642],[73.1064,30.6722]]]}'::jsonb)
returning id into f2;
insert into farms (name, location, area, ownership, land_value, status, created_at, user_id, org_id, area_acres, latitude, longitude, map_zoom, boundary)
values ('Jhang Road Block','Jhang Road, Faisalabad','22 Acres','Leased',1500000,'Active', now() - interval '11 months', v_user, v_org, 22, 31.3540, 72.9880, 16,
  '{"type":"Polygon","coordinates":[[[72.9840,31.3575],[72.9920,31.3575],[72.9920,31.3505],[72.9840,31.3505],[72.9840,31.3575]]]}'::jsonb)
returning id into f3;
insert into farms (name, location, area, ownership, land_value, status, created_at, user_id, org_id, area_acres, latitude, longitude, map_zoom, boundary)
values ('Renala Orchard','Renala Khurd, Okara','12 Acres','Leased',1900000,'Active', now() - interval '5 months', v_user, v_org, 12, 30.8790, 73.6050, 16,
  '{"type":"Polygon","coordinates":[[[73.6020,30.8815],[73.6080,30.8815],[73.6080,30.8765],[73.6020,30.8765],[73.6020,30.8815]]]}'::jsonb)
returning id into f4;

-- ---------------------------------------------------------------- PLOTS
insert into farm_plots (farm_id, name, area_acres, boundary, color, soil_type, soil_quality, drainage, water_source, status, created_at, user_id, notes) values
 (f1,'Block A - North',12.5,'{"type":"Polygon","coordinates":[[[73.0741,31.4237],[73.0801,31.4237],[73.0801,31.4192],[73.0741,31.4192],[73.0741,31.4237]]]}'::jsonb,'#22C55E','Loam','Excellent','Good','Tubewell','Active',now() - interval '20 months',v_user,'Best performing block, deep loam.'),
 (f1,'Block B - South',15.0,'{"type":"Polygon","coordinates":[[[73.0801,31.4237],[73.0861,31.4237],[73.0861,31.4192],[73.0801,31.4192],[73.0801,31.4237]]]}'::jsonb,'#3B82F6','Clay Loam','Good','Moderate','Canal','Active',now() - interval '20 months',v_user,null),
 (f1,'Block C - Canal Side',10.0,'{"type":"Polygon","coordinates":[[[73.0741,31.4192],[73.0801,31.4192],[73.0801,31.4137],[73.0741,31.4137],[73.0741,31.4192]]]}'::jsonb,'#EAB308','Sandy Loam','Fair','Good','Canal','Active',now() - interval '19 months',v_user,'Needs gypsum treatment.'),
 (f1,'Block D - Back',7.5,'{"type":"Polygon","coordinates":[[[73.0801,31.4192],[73.0861,31.4192],[73.0861,31.4137],[73.0801,31.4137],[73.0801,31.4192]]]}'::jsonb,'#F97316','Sandy','Poor','Poor','Tubewell','Active',now() - interval '19 months',v_user,'Waterlogging in monsoon.'),
 (f2,'Riverside East',16.0,'{"type":"Polygon","coordinates":[[[73.1064,30.6722],[73.1114,30.6722],[73.1114,30.6642],[73.1064,30.6642],[73.1064,30.6722]]]}'::jsonb,'#22C55E','Loam','Excellent','Good','Canal','Active',now() - interval '17 months',v_user,null),
 (f2,'Riverside West',14.0,'{"type":"Polygon","coordinates":[[[73.1114,30.6722],[73.1164,30.6722],[73.1164,30.6642],[73.1114,30.6642],[73.1114,30.6722]]]}'::jsonb,'#3B82F6','Clay','Good','Moderate','Canal','Active',now() - interval '17 months',v_user,null),
 (f3,'Roadside Strip',9.0,'{"type":"Polygon","coordinates":[[[72.9840,31.3575],[72.9880,31.3575],[72.9880,31.3505],[72.9840,31.3505],[72.9840,31.3575]]]}'::jsonb,'#EAB308','Sandy Loam','Fair','Good','Tubewell','Active',now() - interval '11 months',v_user,null),
 (f3,'Inner Field',13.0,'{"type":"Polygon","coordinates":[[[72.9880,31.3575],[72.9920,31.3575],[72.9920,31.3505],[72.9880,31.3505],[72.9880,31.3575]]]}'::jsonb,'#8B5CF6','Loam','Good','Good','Tubewell','Active',now() - interval '11 months',v_user,null),
 (f4,'Citrus Rows 1-8',7.0,'{"type":"Polygon","coordinates":[[[73.6020,30.8815],[73.6050,30.8815],[73.6050,30.8765],[73.6020,30.8765],[73.6020,30.8815]]]}'::jsonb,'#22C55E','Loam','Excellent','Good','Drip','Active',now() - interval '5 months',v_user,'Kinnow, 6 year old trees.'),
 (f4,'Citrus Rows 9-14',5.0,'{"type":"Polygon","coordinates":[[[73.6050,30.8815],[73.6080,30.8815],[73.6080,30.8765],[73.6050,30.8765],[73.6050,30.8815]]]}'::jsonb,'#3B82F6','Loam','Good','Good','Drip','Active',now() - interval '5 months',v_user,null);

select id into pA  from farm_plots where farm_id=f1 and name='Block A - North';
select id into pB  from farm_plots where farm_id=f1 and name='Block B - South';
select id into pC  from farm_plots where farm_id=f1 and name='Block C - Canal Side';
select id into pD  from farm_plots where farm_id=f1 and name='Block D - Back';
select id into pE  from farm_plots where farm_id=f2 and name='Riverside East';
select id into pW  from farm_plots where farm_id=f2 and name='Riverside West';
select id into pR  from farm_plots where farm_id=f3 and name='Roadside Strip';
select id into pI  from farm_plots where farm_id=f3 and name='Inner Field';
select id into pO1 from farm_plots where farm_id=f4 and name='Citrus Rows 1-8';
select id into pO2 from farm_plots where farm_id=f4 and name='Citrus Rows 9-14';

-- ---------------------------------------------------------------- CROP CYCLES
insert into crop_cycles (farm_id, plot_id, plot_ids, crop, variety, area, area_acres, sowing_date, harvest_date, status, exp_yield, act_yield, exp_yield_qty, act_yield_qty, yield_unit, revenue, note, created_at, user_id) values
 (f1,pA,array[pA],'Wheat','Faisalabad-2008','12.5 Acres',12.5, current_date-500, current_date-380,'Harvested','45 maund/acre','48 maund/acre',562.5,600,'maund',2100000,'Excellent season, good rains.', now() - interval '17 months', v_user),
 (f1,pB,array[pB],'Cotton','BT-886','15 Acres',15.0, current_date-470, current_date-320,'Harvested','28 maund/acre','24 maund/acre',420,360,'maund',1980000,'Pink bollworm pressure reduced yield.', now() - interval '16 months', v_user),
 (f2,pE,array[pE],'Rice','Super Basmati','16 Acres',16.0, current_date-455, current_date-330,'Harvested','40 maund/acre','43 maund/acre',640,688,'maund',2460000,null, now() - interval '15 months', v_user),
 (f1,pC,array[pC],'Sugarcane','CPF-247','10 Acres',10.0, current_date-430, current_date-100,'Harvested','700 maund/acre','680 maund/acre',7000,6800,'maund',2720000,'Sold to Shakarganj Mill.', now() - interval '14 months', v_user),
 (f2,pW,array[pW],'Maize','Pioneer 30Y87','14 Acres',14.0, current_date-300, current_date-190,'Harvested','65 maund/acre','70 maund/acre',910,980,'maund',1890000,null, now() - interval '10 months', v_user),
 (f1,pA,array[pA],'Wheat','Akbar-2019','12.5 Acres',12.5, current_date-260, current_date-140,'Harvested','48 maund/acre','46 maund/acre',600,575,'maund',2150000,null, now() - interval '9 months', v_user),
 (f3,pI,array[pI],'Wheat','Faisalabad-2008','13 Acres',13.0, current_date-255, current_date-135,'Harvested','44 maund/acre','41 maund/acre',572,533,'maund',1920000,'Late sowing hurt the yield.', now() - interval '8 months', v_user),
 (f1,pB,array[pB],'Cotton','BT-886','15 Acres',15.0, current_date-120, current_date+30,'Growing','30 maund/acre',null,450,null,'maund',0,'Flowering stage, looking strong.', now() - interval '4 months', v_user),
 (f2,pE,array[pE],'Rice','Super Basmati','16 Acres',16.0, current_date-95, current_date+25,'Growing','42 maund/acre',null,672,null,'maund',0,null, now() - interval '3 months', v_user),
 (f3,pR,array[pR],'Maize','Pioneer 30Y87','9 Acres',9.0, current_date-70, current_date+40,'Growing','68 maund/acre',null,612,null,'maund',0,null, now() - interval '2 months', v_user),
 (f1,pD,array[pD],'Fodder (Jowar)','Local','7.5 Acres',7.5, current_date-55, current_date+15,'Growing','300 maund/acre',null,2250,null,'maund',0,'For the dairy herd.', now() - interval '2 months', v_user),
 (f4,pO1,array[pO1],'Kinnow','Local Seedless','7 Acres',7.0, current_date-150, current_date+60,'Growing','250 crate/acre',null,1750,null,'crate',0,'Sixth bearing year.', now() - interval '5 months', v_user),
 (f4,pO2,array[pO2],'Kinnow','Local Seedless','5 Acres',5.0, current_date-150, current_date+60,'Growing','230 crate/acre',null,1150,null,'crate',0,null, now() - interval '5 months', v_user),
 (f2,pW,array[pW],'Sugarcane','CPF-247','14 Acres',14.0, current_date-40, current_date+290,'Growing','720 maund/acre',null,10080,null,'maund',0,'Spring planting.', now() - interval '1 month', v_user),
 (f3,pI,array[pI],'Potato','Cardinal','13 Acres',13.0, current_date-20, current_date+85,'Growing','120 maund/acre',null,1560,null,'maund',0,null, now() - interval '20 days', v_user);

-- ---------------------------------------------------------------- WORKERS / MACHINERY / LIVESTOCK / INVENTORY
-- Deliberately backdated up to 19 months: proves point-in-time data survives the date filter.
insert into workers (farm_id, name, role, daily_rate, phone, status, created_at, user_id) values
 (f1,'Muhammad Aslam','Foreman',2200,'0300-4412876','Active', now() - interval '19 months', v_user),
 (f1,'Ghulam Rasool','Tractor Operator',1800,'0301-2298431','Active', now() - interval '18 months', v_user),
 (f1,'Allah Ditta','Field Labour',1400,'0333-7781204','Active', now() - interval '18 months', v_user),
 (f1,'Nazir Ahmad','Field Labour',1400,'0345-1120987','Active', now() - interval '14 months', v_user),
 (f1,'Shahid Iqbal','Irrigation',1600,'0321-9087654','Active', now() - interval '9 months', v_user),
 (f2,'Muhammad Younas','Foreman',2100,'0302-4433221','Active', now() - interval '16 months', v_user),
 (f2,'Riaz Hussain','Field Labour',1400,'0313-5566778','Active', now() - interval '15 months', v_user),
 (f2,'Abdul Sattar','Field Labour',1350,'0344-1239876','Active', now() - interval '7 months', v_user),
 (f2,'Zulfiqar Ali','Tractor Operator',1750,'0308-6677889','Inactive', now() - interval '13 months', v_user),
 (f3,'Muhammad Ramzan','Field Labour',1400,'0332-4455661','Active', now() - interval '10 months', v_user),
 (f3,'Imran Khan','Irrigation',1550,'0300-8899776','Active', now() - interval '6 months', v_user),
 (f4,'Sajid Mehmood','Orchard Keeper',1900,'0311-2020303','Active', now() - interval '5 months', v_user),
 (f4,'Waqar Ahmed','Field Labour',1400,'0322-4041505','Active', now() - interval '2 months', v_user),
 (f1,'Bilal Hanif','Field Labour',1450,'0301-1112223','Active', now() - interval '12 days', v_user);

insert into machinery (farm_id, name, type, year, reg_no, purchase_price, current_value, status, created_at, user_id) values
 (f1,'Massey Ferguson 385','Tractor',2018,'FSD-4412',3850000,2900000,'Active', now() - interval '19 months', v_user),
 (f1,'New Holland 640','Tractor',2021,'FSD-7788',4900000,4200000,'Active', now() - interval '14 months', v_user),
 (f1,'Rotavator 7ft','Implement',2019,null,385000,260000,'Active', now() - interval '18 months', v_user),
 (f1,'Disc Harrow 20 Blade','Implement',2018,null,220000,140000,'Active', now() - interval '18 months', v_user),
 (f1,'Laser Land Leveller','Implement',2020,null,640000,480000,'Active', now() - interval '13 months', v_user),
 (f2,'Massey Ferguson 260','Tractor',2015,'SWL-2231',2600000,1700000,'Active', now() - interval '16 months', v_user),
 (f2,'Wheat Thresher','Harvester',2017,null,850000,520000,'Active', now() - interval '15 months', v_user),
 (f2,'Boom Sprayer 500L','Implement',2022,null,310000,250000,'Active', now() - interval '8 months', v_user),
 (f3,'Kubota Power Tiller','Tractor',2020,null,480000,360000,'Active', now() - interval '10 months', v_user),
 (f3,'Seed Drill 11 Tyne','Implement',2021,null,295000,230000,'Under Maintenance', now() - interval '9 months', v_user),
 (f4,'Orchard Sprayer','Implement',2023,null,420000,385000,'Active', now() - interval '5 months', v_user),
 (f4,'Mini Loader','Implement',2024,null,1250000,1180000,'Active', now() - interval '20 days', v_user);

insert into livestock (farm_id, type, tag, name, gender, dob, purchase_price, current_value, milk_avg_litres, status, created_at, user_id) values
 (f1,'Buffalo','BF-101','Kali','Female', current_date-1900, 320000, 385000, 14.5,'Active', now() - interval '18 months', v_user),
 (f1,'Buffalo','BF-102','Noori','Female', current_date-1750, 310000, 370000, 13.0,'Active', now() - interval '18 months', v_user),
 (f1,'Buffalo','BF-103','Chandni','Female', current_date-1500, 295000, 355000, 12.2,'Active', now() - interval '16 months', v_user),
 (f1,'Buffalo','BF-104','Sohni','Female', current_date-980, 240000, 300000, 9.5,'Active', now() - interval '11 months', v_user),
 (f1,'Cow','CW-201','Gori','Female', current_date-1650, 210000, 265000, 18.0,'Active', now() - interval '17 months', v_user),
 (f1,'Cow','CW-202','Laali','Female', current_date-1320, 205000, 250000, 16.5,'Active', now() - interval '14 months', v_user),
 (f1,'Cow','CW-203','Sheeba','Female', current_date-700, 180000, 225000, 11.0,'Active', now() - interval '8 months', v_user),
 (f2,'Buffalo','BF-105','Rani','Female', current_date-1450, 300000, 360000, 12.8,'Active', now() - interval '15 months', v_user),
 (f2,'Buffalo','BF-106','Heera','Male', current_date-620, 150000, 195000, 0,'Active', now() - interval '7 months', v_user),
 (f2,'Cow','CW-204','Moti','Female', current_date-1100, 195000, 240000, 15.0,'Active', now() - interval '12 months', v_user),
 (f2,'Goat','GT-301','Bakri 1','Female', current_date-540, 38000, 52000, 1.5,'Active', now() - interval '6 months', v_user),
 (f2,'Goat','GT-302','Bakri 2','Female', current_date-500, 36000, 50000, 1.2,'Active', now() - interval '6 months', v_user),
 (f2,'Goat','GT-303','Bakra 1','Male', current_date-330, 42000, 68000, 0,'Active', now() - interval '4 months', v_user),
 (f3,'Cow','CW-205','Pari','Female', current_date-880, 190000, 235000, 13.5,'Active', now() - interval '9 months', v_user),
 (f3,'Goat','GT-304','Bakri 3','Female', current_date-260, 35000, 46000, 1.0,'Active', now() - interval '3 months', v_user),
 (f1,'Buffalo','BF-107','Naya Katta','Male', current_date-90, 95000, 115000, 0,'Active', now() - interval '15 days', v_user),
 (f1,'Cow','CW-206','Sold Cow','Female', current_date-1900, 200000, 0, 0,'Sold', now() - interval '13 months', v_user);

-- Eight of these sit at or below reorder level, which fires the low-stock alert.
insert into inventory (farm_id, item, category, qty, unit, reorder_level, value, created_at, user_id) values
 (f1,'Urea (Sona)','Fertilizer',42,'bag',20,462000, now() - interval '15 months', v_user),
 (f1,'DAP (Engro)','Fertilizer',8,'bag',15,152000, now() - interval '15 months', v_user),
 (f1,'SOP Potash','Fertilizer',12,'bag',10,186000, now() - interval '12 months', v_user),
 (f1,'Wheat Seed - Akbar 2019','Seed',30,'bag',10,165000, now() - interval '10 months', v_user),
 (f1,'Cotton Seed - BT 886','Seed',4,'bag',8,38000, now() - interval '8 months', v_user),
 (f1,'Diesel','Fuel',180,'litre',200,55800, now() - interval '18 months', v_user),
 (f1,'Engine Oil 15W40','Fuel',14,'litre',10,21000, now() - interval '14 months', v_user),
 (f1,'Confidor (Imidacloprid)','Pesticide',3,'litre',5,27000, now() - interval '9 months', v_user),
 (f1,'Wanda (Cattle Feed)','Feed',26,'bag',15,130000, now() - interval '6 months', v_user),
 (f2,'Urea (Sona)','Fertilizer',35,'bag',20,385000, now() - interval '14 months', v_user),
 (f2,'DAP (Engro)','Fertilizer',22,'bag',15,418000, now() - interval '13 months', v_user),
 (f2,'Rice Seed - Super Basmati','Seed',18,'bag',8,144000, now() - interval '11 months', v_user),
 (f2,'Diesel','Fuel',95,'litre',150,29450, now() - interval '16 months', v_user),
 (f2,'Round Up (Glyphosate)','Pesticide',9,'litre',6,58500, now() - interval '7 months', v_user),
 (f2,'Wanda (Cattle Feed)','Feed',9,'bag',12,45000, now() - interval '5 months', v_user),
 (f3,'Urea (Sona)','Fertilizer',16,'bag',15,176000, now() - interval '9 months', v_user),
 (f3,'Maize Seed - Pioneer','Seed',6,'bag',5,96000, now() - interval '6 months', v_user),
 (f3,'Diesel','Fuel',60,'litre',100,18600, now() - interval '10 months', v_user),
 (f3,'Gypsum','Fertilizer',40,'bag',20,60000, now() - interval '4 months', v_user),
 (f4,'Micronutrient Mix (Zinc/Boron)','Fertilizer',11,'kg',8,44000, now() - interval '5 months', v_user),
 (f4,'Fruit Crates','Packaging',320,'piece',200,96000, now() - interval '4 months', v_user),
 (f4,'Copper Oxychloride','Pesticide',2,'kg',5,9000, now() - interval '3 months', v_user),
 (f4,'Drip Filters','Spare Parts',5,'piece',4,25000, now() - interval '18 days', v_user);

end $$;

-- ---------------------------------------------------------------- REVENUE / EXPENSES (bulk)
do $$
declare v_user uuid := 'da3f53cb-eecc-4b44-b99c-0028b59a12ad';
        fa int[];
begin
  select array_agg(id order by id) into fa from farms where name in ('Chak 42 Farm','Sahiwal Riverside','Jhang Road Block','Renala Orchard');

  insert into revenue (farm_id, date, category, description, party, amount, plot_id, crop_cycle_id, area_acres, created_at, user_id)
  select c.farm_id, c.harvest_date + (i*3),
         case when c.crop='Kinnow' then 'Fruit Sale' else 'Crop Sale' end,
         c.crop || ' (' || c.variety || ') - lot ' || i,
         (array['Ali Traders','Faisalabad Grain Market','Shakarganj Mill','Hafiz Commission Shop','Punjab Food Dept','Chaudhry Rice Mills'])[1+((c.id+i)%6)],
         round((c.revenue/3.0)::numeric,-2), c.plot_id, c.id, c.area_acres,
         (c.harvest_date + (i*3))::timestamp, v_user
  from crop_cycles c cross join generate_series(0,2) i
  where c.status='Harvested' and c.revenue > 0 and c.farm_id = any(fa);

  insert into revenue (farm_id, date, category, description, party, amount, created_at, user_id)
  select fid, d, 'Milk Sale', 'Milk supply - ' || to_char(d,'DD Mon'),
         case when fid=fa[1] then 'Chak 42 Milk Collector' else 'Noorpur Dairy Point' end,
         case when fid=fa[1] then 26000 + ((extract(day from d)::int*137)%7000)
                             else 15000 + ((extract(day from d)::int*91)%4500) end,
         d::timestamp, v_user
  from (select fa[1] as fid union all select fa[2]) f
  cross join generate_series(current_date-540, current_date-1, interval '5 day') d;

  insert into revenue (farm_id, date, category, description, party, amount, created_at, user_id)
  select fa[1+(n%4)], current_date - ((n*11)%520),
         (array['Machinery Rent','Livestock Sale','Fodder Sale','Misc Income','Government Subsidy'])[1+(n%5)],
         (array['Tractor rental to neighbour','Sold a young bull','Surplus jowar fodder','Sale of empty fertilizer bags','Kissan card subsidy'])[1+(n%5)],
         (array['Neighbour - Rana Sahib','Local Mandi','Village Buyer','Scrap Dealer','Agri Dept Punjab'])[1+(n%5)],
         (array[45000,165000,32000,8500,60000])[1+(n%5)],
         (current_date - ((n*11)%520))::timestamp, v_user
  from generate_series(1,45) n;

  insert into expenses (farm_id, date, category, description, party, amount, plot_id, crop_cycle_id, area_acres, created_at, user_id)
  select c.farm_id, c.sowing_date + (i*14),
         (array['Seed','Fertilizer','Pesticide','Labour','Machinery','Irrigation'])[1+i],
         (array['Seed purchase','Urea + DAP application','Spray - pest control','Sowing and weeding labour','Tractor + rotavator','Canal + tubewell water'])[1+i] || ' for ' || c.crop,
         (array['Kissan Beej Store','Engro Dealer','Syngenta Dealer','Labour Contractor','Own Machinery','Canal Dept'])[1+i],
         round((c.area_acres * (array[3800,11500,4200,6500,5200,2600])[1+i])::numeric,-2),
         c.plot_id, c.id, c.area_acres, (c.sowing_date + (i*14))::timestamp, v_user
  from crop_cycles c cross join generate_series(0,5) i
  where c.farm_id = any(fa);

  insert into expenses (farm_id, date, category, description, party, amount, created_at, user_id)
  select fid, d, 'Feed', 'Wanda + silage - week of ' || to_char(d,'DD Mon'), 'Al Noor Feed Mill',
         case when fid=fa[1] then 18000 + ((extract(day from d)::int*113)%5000)
                             else 11000 + ((extract(day from d)::int*71)%3200) end,
         d::timestamp, v_user
  from (select fa[1] as fid union all select fa[2]) f
  cross join generate_series(current_date-540, current_date-1, interval '7 day') d;

  insert into expenses (farm_id, date, category, description, party, amount, created_at, user_id)
  select fa[1+(n%4)], current_date - ((n*7)%535),
         (array['Fuel','Repairs','Utilities','Labour','Transport','Misc Expense'])[1+(n%6)],
         (array['Diesel top-up','Tractor servicing / parts','Tubewell electricity bill','Daily wage settlement','Crop transport to mandi','Sundry farm expense'])[1+(n%6)],
         (array['PSO Pump','Faisalabad Tractor Workshop','FESCO','Labour Contractor','Malik Goods Transport','Local Market'])[1+(n%6)],
         (array[34000,22000,47000,58000,26000,7500])[1+(n%6)] + ((n*313)%6000),
         (current_date - ((n*7)%535))::timestamp, v_user
  from generate_series(1,160) n;

  -- Input costs for still-growing cycles land in the future; pull them back.
  update expenses set date = current_date - ((id%21)+1),
                      created_at = (current_date - ((id%21)+1))::timestamp
  where date > current_date;
end $$;

-- ---------------------------------------------------------------- CREDIT & LOANS
-- Covers every payment state: overdue, part-paid, fully settled, Sale vs Purchase,
-- Borrowed vs Lent. Several are deliberately older than 30 days.
do $$
declare v_user uuid := 'da3f53cb-eecc-4b44-b99c-0028b59a12ad';
        ce int; ln int; fa int[];
begin
  select array_agg(id order by id) into fa from farms
   where name in ('Chak 42 Farm','Sahiwal Riverside','Jhang Road Block','Renala Orchard');

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[1],current_date-210,'Credit Sale','Ali Traders','Wheat 200 maund on credit',760000,100000,current_date-150,'Chasing since last season.',(current_date-210)::timestamp,v_user) returning id into ce;
  insert into credit_payments (credit_entry_id,date,amount,note,user_id) values (ce,current_date-180,150000,'Part payment by cheque',v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[2],current_date-160,'Credit Sale','Chaudhry Rice Mills','Basmati 300 maund',1180000,200000,current_date-100,'Mill promised payment after Eid.',(current_date-160)::timestamp,v_user) returning id into ce;
  insert into credit_payments (credit_entry_id,date,amount,note,user_id) values
    (ce,current_date-130,250000,'Instalment 1',v_user),(ce,current_date-95,200000,'Instalment 2',v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[3],current_date-95,'Credit Sale','Hafiz Commission Shop','Maize 180 maund',540000,0,current_date-20,'Overdue, follow up.',(current_date-95)::timestamp,v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[1],current_date-22,'Credit Sale','Faisalabad Grain Market','Cotton 90 maund advance sale',690000,150000,current_date+25,null,(current_date-22)::timestamp,v_user) returning id into ce;
  insert into credit_payments (credit_entry_id,date,amount,note,user_id) values (ce,current_date-8,140000,'Part payment cash',v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[4],current_date-12,'Credit Sale','Okara Fruit Mandi','Kinnow 400 crates',480000,80000,current_date+40,'First picking.',(current_date-12)::timestamp,v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[1],current_date-300,'Credit Sale','Punjab Food Dept','Wheat procurement 250 maund',900000,300000,current_date-250,'Cleared in full.',(current_date-300)::timestamp,v_user) returning id into ce;
  insert into credit_payments (credit_entry_id,date,amount,note,user_id) values
    (ce,current_date-280,300000,'Instalment 1',v_user),(ce,current_date-265,300000,'Final settlement',v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[1],current_date-140,'Credit Purchase','Engro Dealer','DAP 60 bags on udhaar',1140000,200000,current_date-60,'Dealer wants clearing before next season.',(current_date-140)::timestamp,v_user) returning id into ce;
  insert into credit_payments (credit_entry_id,date,amount,note,user_id) values (ce,current_date-110,340000,'Part payment',v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[2],current_date-45,'Credit Purchase','Kissan Beej Store','Rice seed + micronutrients',320000,50000,current_date+15,null,(current_date-45)::timestamp,v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[3],current_date-190,'Credit Purchase','PSO Pump','Diesel account (quarterly)',410000,0,current_date-120,'Overdue fuel account.',(current_date-190)::timestamp,v_user) returning id into ce;
  insert into credit_payments (credit_entry_id,date,amount,note,user_id) values (ce,current_date-150,160000,'Partial clearing',v_user);

  insert into credit_entries (farm_id,date,type,party,item,total_amount,advance,due_date,note,created_at,user_id)
  values (fa[4],current_date-30,'Credit Purchase','Syngenta Dealer','Copper oxychloride + spray oil',145000,45000,current_date+20,null,(current_date-30)::timestamp,v_user);

  -- There is no loans.paid column; loan_payments is the source of truth.
  insert into loans (farm_id,date,type,party,purpose,principal,interest_rate,tenure_months,monthly_install,due_date,status,note,created_at,user_id)
  values (fa[1],current_date-400,'Borrowed','ZTBL (Zarai Taraqiati Bank)','Tractor purchase - New Holland 640',3200000,14.5,60,75000,current_date+400,'Active','Kissan loan against land.',(current_date-400)::timestamp,v_user) returning id into ln;
  insert into loan_payments (loan_id,date,amount,note,user_id) select ln,current_date-400+(n*30),75000,'Monthly instalment '||n,v_user from generate_series(1,12) n;

  insert into loans (farm_id,date,type,party,purpose,principal,interest_rate,tenure_months,monthly_install,due_date,status,note,created_at,user_id)
  values (fa[2],current_date-240,'Borrowed','HBL Agri Finance','Seasonal input finance',1500000,16.0,24,72000,current_date+180,'Active',null,(current_date-240)::timestamp,v_user) returning id into ln;
  insert into loan_payments (loan_id,date,amount,note,user_id) select ln,current_date-240+(n*30),72000,'Instalment '||n,v_user from generate_series(1,7) n;

  insert into loans (farm_id,date,type,party,purpose,principal,interest_rate,tenure_months,monthly_install,due_date,status,note,created_at,user_id)
  values (fa[3],current_date-75,'Borrowed','Arthi - Malik Sahib','Working capital for maize sowing',600000,0,6,100000,current_date+105,'Active','Informal, no interest but repay at harvest.',(current_date-75)::timestamp,v_user) returning id into ln;
  insert into loan_payments (loan_id,date,amount,note,user_id) values (ln,current_date-40,100000,'First repayment',v_user);

  insert into loans (farm_id,date,type,party,purpose,principal,interest_rate,tenure_months,monthly_install,due_date,status,note,created_at,user_id)
  values (fa[1],current_date-500,'Borrowed','Village Committee','Tubewell boring',400000,0,10,40000,current_date-200,'Closed','Cleared in full.',(current_date-500)::timestamp,v_user) returning id into ln;
  insert into loan_payments (loan_id,date,amount,note,user_id) select ln,current_date-500+(n*30),40000,'Instalment '||n,v_user from generate_series(1,10) n;

  insert into loans (farm_id,date,type,party,purpose,principal,interest_rate,tenure_months,monthly_install,due_date,status,note,created_at,user_id)
  values (fa[1],current_date-180,'Lent','Neighbour - Rana Sahib','Lent for his wheat inputs',350000,0,12,30000,current_date+185,'Active','Verbal agreement.',(current_date-180)::timestamp,v_user) returning id into ln;
  insert into loan_payments (loan_id,date,amount,note,user_id) select ln,current_date-180+(n*40),30000,'Received '||n,v_user from generate_series(1,3) n;

  insert into loans (farm_id,date,type,party,purpose,principal,interest_rate,tenure_months,monthly_install,due_date,status,note,created_at,user_id)
  values (fa[2],current_date-60,'Lent','Cousin - Zulfiqar','Emergency medical, to be returned',120000,0,6,20000,current_date+120,'Active',null,(current_date-60)::timestamp,v_user);
end $$;

-- ---------------------------------------------------------------- OPERATIONAL LOGS
do $$
declare v_user uuid := 'da3f53cb-eecc-4b44-b99c-0028b59a12ad';
        fa int[];
begin
  select array_agg(id order by id) into fa from farms
   where name in ('Chak 42 Farm','Sahiwal Riverside','Jhang Road Block','Renala Orchard');

  -- 90 days including today, so the "Today's Attendance" KPI is non-zero.
  insert into attendance (worker_id, farm_id, date, present, user_id)
  select w.id, w.farm_id, d,
         case when extract(dow from d)=0 then false
              when ((w.id*17 + extract(doy from d)::int*7)%100) < 85 then true else false end, v_user
  from workers w cross join generate_series(current_date-89, current_date, interval '1 day') d
  where w.status='Active' and w.farm_id = any(fa)
  on conflict (worker_id, date) do nothing;

  insert into machine_usage (machine_id, farm_id, date, hours, fuel_litres, operator, activity, notes, created_at, user_id)
  select m.id, m.farm_id, current_date-((m.id*13+n*9)%400), 4+((m.id+n*3)%7), 18+((m.id*5+n*7)%40),
         (array['Ghulam Rasool','Zulfiqar Ali','Muhammad Aslam','Imran Khan'])[1+((m.id+n)%4)],
         (array['Ploughing','Rotavation','Sowing','Spraying','Harvest transport','Land levelling','Fodder cutting'])[1+((m.id+n)%7)],
         null, (current_date-((m.id*13+n*9)%400))::timestamp, v_user
  from machinery m cross join generate_series(1,10) n
  where m.type in ('Tractor','Harvester','Implement') and m.farm_id = any(fa);

  insert into irrigation_log (farm_id, plot_id, crop_cycle_id, date, field, source, hours, cost, crop, area_acres, note, created_at, user_id)
  select p.farm_id, p.id, (select c.id from crop_cycles c where c.plot_id=p.id order by c.sowing_date desc limit 1),
         current_date-((p.id*7+n*11)%300), p.name,
         (array['Canal','Tubewell','Canal','Tubewell','Drip'])[1+((p.id+n)%5)],
         3+((p.id+n*2)%8), (3+((p.id+n*2)%8))*950,
         coalesce((select c.crop from crop_cycles c where c.plot_id=p.id order by c.sowing_date desc limit 1),'Fallow'),
         p.area_acres, null, (current_date-((p.id*7+n*11)%300))::timestamp, v_user
  from farm_plots p cross join generate_series(1,14) n where p.farm_id = any(fa);

  insert into spray_log (farm_id, plot_id, crop_cycle_id, date, field, chemical, qty, qty_value, qty_unit, crop, purpose, cost, area_acres, created_at, user_id)
  select p.farm_id, p.id, (select c.id from crop_cycles c where c.plot_id=p.id order by c.sowing_date desc limit 1),
         current_date-((p.id*19+n*23)%280), p.name,
         (array['Confidor (Imidacloprid)','Round Up (Glyphosate)','Karate (Lambda)','Copper Oxychloride','Bio Power','Topsin-M'])[1+((p.id+n)%6)],
         ((1+((p.id+n)%3))::text||' litre'), 1+((p.id+n)%3), 'litre',
         coalesce((select c.crop from crop_cycles c where c.plot_id=p.id order by c.sowing_date desc limit 1),'Fallow'),
         (array['Sucking pest','Weed control','Bollworm','Fungal spot','Growth tonic','Blight'])[1+((p.id+n)%6)],
         (1+((p.id+n)%3))*4200 + (p.area_acres*350), p.area_acres,
         (current_date-((p.id*19+n*23)%280))::timestamp, v_user
  from farm_plots p cross join generate_series(1,8) n where p.farm_id = any(fa);

  insert into animal_health (livestock_id, date, event, treatment, vet, cost, note, created_at, user_id)
  select l.id, current_date-((l.id*29+n*37)%330),
         (array['Vaccination','Deworming','Mastitis','Routine Checkup','Pregnancy Check','Foot Treatment'])[1+((l.id+n)%6)],
         (array['FMD vaccine','Albendazole bolus','Antibiotic course','General exam','Ultrasound','Hoof trimming + spray'])[1+((l.id+n)%6)],
         (array['Dr. Tanveer (Govt Vet)','Dr. Shahzad','Dr. Tanveer (Govt Vet)','Dr. Aqib'])[1+((l.id+n)%4)],
         (array[1500,900,4500,700,2500,1800])[1+((l.id+n)%6)], null,
         (current_date-((l.id*29+n*37)%330))::timestamp, v_user
  from livestock l cross join generate_series(1,4) n where l.status='Active' and l.farm_id = any(fa);
end $$;

-- ---------------------------------------------------------------- PARTIES / PRICES / CATEGORIES
do $$
declare v_user uuid := 'da3f53cb-eecc-4b44-b99c-0028b59a12ad';
        v_org  uuid := '0bbeb6dc-4195-4cc8-89fa-8a58881f567e';
begin
  insert into vendors_buyers (type,name,contact,address,total_business,total_settled,note,created_at,user_id,org_id) values
   ('Buyer','Ali Traders','0300-4455667','Ghalla Mandi, Faisalabad',3450000,2690000,'Reliable but slow payer.', now()-interval '18 months',v_user,v_org),
   ('Buyer','Chaudhry Rice Mills','0321-7788990','Sahiwal Bypass',2960000,2450000,'Best basmati rates in the area.', now()-interval '16 months',v_user,v_org),
   ('Buyer','Shakarganj Mill','041-2334455','Jhang Road, Faisalabad',2720000,2720000,'Sugarcane, pays on CPR.', now()-interval '14 months',v_user,v_org),
   ('Buyer','Faisalabad Grain Market','0333-1122334','Ghalla Mandi, Faisalabad',1880000,1190000,null, now()-interval '12 months',v_user,v_org),
   ('Buyer','Hafiz Commission Shop','0345-9988776','Jhang Sadar',1240000,700000,'Commission 2%.', now()-interval '10 months',v_user,v_org),
   ('Buyer','Punjab Food Dept','041-9200111','Wheat Procurement Centre',900000,900000,'Government procurement, bardana needed.', now()-interval '11 months',v_user,v_org),
   ('Buyer','Okara Fruit Mandi','0301-5566778','Fruit Mandi, Okara',480000,80000,'Kinnow buyer.', now()-interval '4 months',v_user,v_org),
   ('Buyer','Chak 42 Milk Collector','0308-1234567','Chak 42 JB',1650000,1650000,'Daily milk pickup, pays weekly.', now()-interval '17 months',v_user,v_org),
   ('Buyer','Noorpur Dairy Point','0309-2345678','Mauza Noorpur, Sahiwal',890000,890000,'Milk buyer for Sahiwal farm.', now()-interval '15 months',v_user,v_org),
   ('Vendor','Engro Dealer','0302-3344556','Satiana Road, Faisalabad',2180000,1240000,'DAP and urea on credit.', now()-interval '17 months',v_user,v_org),
   ('Vendor','Kissan Beej Store','0311-4455667','Jhang Road, Faisalabad',980000,710000,'Seed supplier.', now()-interval '15 months',v_user,v_org),
   ('Vendor','Syngenta Dealer','0322-5566778','Satiana Road, Faisalabad',745000,600000,'Pesticides.', now()-interval '13 months',v_user,v_org),
   ('Vendor','PSO Pump','0344-6677889','Sargodha Road, Faisalabad',1310000,1060000,'Diesel on monthly account.', now()-interval '18 months',v_user,v_org),
   ('Vendor','Al Noor Feed Mill','0300-7788991','Sahiwal Road',1560000,1560000,'Wanda supplier for the dairy.', now()-interval '16 months',v_user,v_org),
   ('Vendor','Faisalabad Tractor Workshop','041-2556677','Jhang Road, Faisalabad',620000,560000,'Repairs and parts.', now()-interval '14 months',v_user,v_org),
   ('Vendor','Malik Goods Transport','0333-8899001','Truck Stand, Faisalabad',430000,430000,'Mandi transport.', now()-interval '12 months',v_user,v_org),
   ('Vendor','Canal Dept','041-9201234','Irrigation Sub-Division, Faisalabad',280000,280000,'Abiana / canal water charges.', now()-interval '17 months',v_user,v_org),
   ('Vendor','FESCO','041-9220000','WAPDA House, Faisalabad',690000,690000,'Tubewell electricity.', now()-interval '17 months',v_user,v_org),
   ('Vendor','Dr. Tanveer (Govt Vet)','0345-1010202','Veterinary Hospital, Chak 42',96000,96000,'Livestock vet.', now()-interval '15 months',v_user,v_org),
   ('Vendor','Labour Contractor','0332-1213141','Chak 42 JB',1120000,1050000,'Supplies seasonal labour gangs.', now()-interval '16 months',v_user,v_org);

  insert into mandi_prices (date, commodity, price, unit, market, created_at, user_id)
  select d, c.commodity, c.base + ((extract(doy from d)::int*c.swing)%c.spread) - (c.spread/2), 'maund', m.market, d::timestamp, v_user
  from generate_series(current_date-89, current_date, interval '3 day') d
  cross join (values ('Wheat',3900,17,320),('Rice (Super Basmati)',5600,23,700),('Cotton (Phutti)',7400,29,900),
                     ('Maize',2350,13,260),('Sugarcane',425,7,60),('Potato',1750,31,500)) c(commodity,base,swing,spread)
  cross join (values ('Faisalabad Ghalla Mandi'),('Sahiwal Mandi')) m(market);

  -- Only adds what is missing; never disturbs the app-wide defaults (user_id IS NULL)
  -- or categories the account owner created by hand.
  insert into categories (name, module, org_id, user_id, created_at)
  select name, module, v_org, v_user, now() from (values
   ('Crop Sale','revenue'),('Fruit Sale','revenue'),('Milk Sale','revenue'),('Livestock Sale','revenue'),
   ('Machinery Rent','revenue'),('Fodder Sale','revenue'),('Government Subsidy','revenue'),('Misc Income','revenue'),
   ('Seed','expense'),('Fertilizer','expense'),('Pesticide','expense'),('Labour','expense'),
   ('Machinery','expense'),('Irrigation','expense'),('Fuel','expense'),('Repairs','expense'),
   ('Utilities','expense'),('Transport','expense'),('Feed','expense'),('Veterinary','expense'),('Misc Expense','expense'),
   ('Fertilizer','inventory'),('Seed','inventory'),('Pesticide','inventory'),('Fuel','inventory'),
   ('Feed','inventory'),('Packaging','inventory'),('Spare Parts','inventory'),
   ('Tractor','machinery'),('Implement','machinery'),('Harvester','machinery'),
   ('Buffalo','livestock'),('Cow','livestock'),('Goat','livestock'),('Sheep','livestock'),('Poultry','livestock')
  ) t(name, module)
  on conflict (user_id, name, module) do nothing;
end $$;
