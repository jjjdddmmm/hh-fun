-- Safe Additive Migration: Add BatchData Intelligence Fields
-- This migration adds new fields WITHOUT touching existing data

-- === FINANCIAL INTELLIGENCE (Critical for Deal Analysis) ===
ALTER TABLE properties ADD COLUMN lastSalePrice BigInt;              -- Previous sale amount  
ALTER TABLE properties ADD COLUMN lastSaleDate DateTime;             -- When last sold
ALTER TABLE properties ADD COLUMN estimatedValue BigInt;             -- BatchData valuation
ALTER TABLE properties ADD COLUMN equityAmount BigInt;               -- Current equity position
ALTER TABLE properties ADD COLUMN equityPercent Decimal(5,2);        -- Equity as percentage
ALTER TABLE properties ADD COLUMN mortgageBalance BigInt;            -- Remaining loan amount

-- === MARKET & TIMING INTELLIGENCE ===
ALTER TABLE properties ADD COLUMN daysOnMarket Int;                  -- Current listing duration
ALTER TABLE properties ADD COLUMN marketTrend String(20);            -- "hot", "warm", "cold", "declining"
ALTER TABLE properties ADD COLUMN demandLevel String(20);            -- "high", "medium", "low"
ALTER TABLE properties ADD COLUMN pricePerSqft Int;                  -- For quick comparison

-- === OWNER INTELLIGENCE (Critical for Lead Generation) ===
ALTER TABLE properties ADD COLUMN ownerName String;                  -- Current owner name
ALTER TABLE properties ADD COLUMN ownerOccupied Boolean;             -- Owner lives in property
ALTER TABLE properties ADD COLUMN absenteeOwner Boolean;             -- Owner lives elsewhere (investment signal)
ALTER TABLE properties ADD COLUMN ownershipLength Int;               -- Years owned (motivation indicator)
ALTER TABLE properties ADD COLUMN ownerPhone String;                 -- Contact information
ALTER TABLE properties ADD COLUMN ownerEmail String;                 -- Contact information

-- === INVESTMENT SIGNALS (High-Value Targeting Flags) ===
ALTER TABLE properties ADD COLUMN highEquity Boolean;                -- Significant equity position
ALTER TABLE properties ADD COLUMN cashBuyer Boolean;                 -- Previous cash purchase
ALTER TABLE properties ADD COLUMN distressedProperty Boolean;        -- Any distress indicators
ALTER TABLE properties ADD COLUMN foreclosureStatus String(50);      -- "pre-foreclosure", "auction", "none"
ALTER TABLE properties ADD COLUMN fixAndFlipPotential Boolean;       -- Renovation opportunity

-- === RENTAL ANALYSIS ===
ALTER TABLE properties ADD COLUMN estimatedRent BigInt;              -- Monthly rental estimate
ALTER TABLE properties ADD COLUMN rentToValueRatio Decimal(5,4);     -- Rent as % of value (monthly)
ALTER TABLE properties ADD COLUMN capRate Decimal(5,2);              -- Capitalization rate

-- === JSON FIELDS (Flexible Nested Data) ===
ALTER TABLE properties ADD COLUMN quickLists Json;                   -- All BatchData flags
ALTER TABLE properties ADD COLUMN buildingFeatures Json;             -- Property features  
ALTER TABLE properties ADD COLUMN neighborhoodData Json;             -- Area demographics
ALTER TABLE properties ADD COLUMN priceHistory Json;                 -- Historical pricing
ALTER TABLE properties ADD COLUMN marketAnalytics Json;              -- Market context

-- === DATA FRESHNESS TRACKING ===
ALTER TABLE properties ADD COLUMN batchDataLastUpdated DateTime;     -- When BatchData was fetched
ALTER TABLE properties ADD COLUMN batchDataCost Decimal(8,2);        -- Cost of last API call

-- === INDEXES FOR PERFORMANCE (Query Optimization) ===
CREATE INDEX idx_properties_high_equity ON properties(highEquity) WHERE highEquity = true;
CREATE INDEX idx_properties_distressed ON properties(distressedProperty) WHERE distressedProperty = true;
CREATE INDEX idx_properties_absentee_owner ON properties(absenteeOwner) WHERE absenteeOwner = true;
CREATE INDEX idx_properties_last_sale_date ON properties(lastSaleDate);
CREATE INDEX idx_properties_days_on_market ON properties(daysOnMarket);
CREATE INDEX idx_properties_equity_percent ON properties(equityPercent);
CREATE INDEX idx_properties_ownership_length ON properties(ownershipLength);
CREATE INDEX idx_properties_foreclosure_status ON properties(foreclosureStatus) WHERE foreclosureStatus IS NOT NULL;

-- === QUERY EXAMPLES ENABLED BY THIS MIGRATION ===
/*
-- Find motivated sellers (high equity + long ownership)
SELECT * FROM properties 
WHERE highEquity = true AND ownershipLength >= 10;

-- Find absentee owner investment opportunities  
SELECT * FROM properties 
WHERE absenteeOwner = true AND cashBuyer = true;

-- Find distressed properties
SELECT * FROM properties 
WHERE distressedProperty = true OR foreclosureStatus IS NOT NULL;

-- Find properties with specific features
SELECT * FROM properties 
WHERE JSON_EXTRACT(buildingFeatures, '$.pool') = true 
  AND JSON_EXTRACT(buildingFeatures, '$.garageParkingSpaces') >= 2;

-- Find cash flow positive rentals
SELECT * FROM properties 
WHERE rentToValueRatio >= 0.01 AND capRate >= 5.0;
*/