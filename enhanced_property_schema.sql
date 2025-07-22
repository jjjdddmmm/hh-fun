-- Enhanced Property Schema for BatchData Integration
-- Strategic approach: Store high-value fields efficiently

model Property {
  id                     String             @id @default(cuid())
  userId                 String
  
  -- === CORE PROPERTY INFO (Hot Fields - Frequently Queried) ===
  -- Keep existing basic fields
  address                String
  city                   String
  state                  String
  zipCode                String
  price                  BigInt             -- Current listing price
  askingPrice            BigInt?
  squareFootage          Int?
  bedrooms               Int?
  bathrooms              Decimal?
  yearBuilt              Int?
  propertyType           String?
  lotSize                Decimal?
  
  -- === FINANCIAL INTELLIGENCE (Hot Fields) ===
  -- Critical for deal analysis and targeting
  lastSalePrice          BigInt?            -- Previous sale amount
  lastSaleDate           DateTime?          -- When last sold
  estimatedValue         BigInt?            -- BatchData valuation
  equityAmount           BigInt?            -- Current equity position
  equityPercent          Decimal?           -- Equity as percentage
  mortgageBalance        BigInt?            -- Remaining loan amount
  propertyTaxes          BigInt?
  hoaFees                BigInt?
  
  -- === MARKET & TIMING (Hot Fields) ===
  -- Essential for timing and pricing strategy
  daysOnMarket           Int?               -- Current listing duration
  marketTrend            String?            -- "hot", "warm", "cold", "declining"
  demandLevel            String?            -- "high", "medium", "low"
  pricePerSqft           Int?               -- For quick comparison
  
  -- === OWNER INTELLIGENCE (Hot Fields) ===
  -- Critical for lead generation and targeting
  ownerName              String?            -- Current owner name
  ownerOccupied          Boolean?           -- Owner lives in property
  absenteeOwner          Boolean?           -- Owner lives elsewhere (investment signal)
  ownershipLength        Int?               -- Years owned (motivation indicator)
  ownerPhone             String?            -- Contact information
  ownerEmail             String?            -- Contact information
  
  -- === INVESTMENT SIGNALS (Hot Fields) ===
  -- High-value targeting flags
  highEquity             Boolean?           -- Significant equity position
  cashBuyer              Boolean?           -- Previous cash purchase
  distressedProperty     Boolean?           -- Any distress indicators
  foreclosureStatus      String?            -- "pre-foreclosure", "auction", "none"
  fixAndFlipPotential    Boolean?           -- Renovation opportunity
  
  -- === RENTAL ANALYSIS (Hot Fields) ===
  -- For investment property analysis
  estimatedRent          BigInt?            -- Monthly rental estimate
  rentToValueRatio       Decimal?           -- Rent as % of value (monthly)
  capRate                Decimal?           -- Capitalization rate
  
  -- === WARM FIELDS (JSON Storage - Occasionally Accessed) ===
  -- Nested data that's valuable but accessed less frequently
  quickLists             Json?              -- All BatchData flags
  /*
  Example quickLists JSON:
  {
    "recentlySold": true,
    "newListing": false,
    "priceReduction": false,
    "expiredListing": false,
    "bankruptcyProperty": false,
    "divorceProperty": false,
    "inheritedProperty": true,
    "wholesaleOpportunity": false,
    "corporateOwned": false,
    "trustOwned": true
  }
  */
  
  buildingFeatures       Json?              -- Property features
  /*
  Example buildingFeatures JSON:
  {
    "pool": true,
    "fireplaceCount": 2,
    "garageParkingSpaces": 3,
    "centralAir": true,
    "hardwoodFloors": false,
    "updatedKitchen": false,
    "condition": "good",
    "lotSizeSquareFeet": 8500
  }
  */
  
  neighborhoodData       Json?              -- Area demographics and scores
  /*
  Example neighborhoodData JSON:
  {
    "medianIncome": 85000,
    "homeOwnershipRate": 0.68,
    "walkScore": 75,
    "transitScore": 45,
    "bikeScore": 60,
    "crimeScore": 8,
    "schoolRating": 9
  }
  */
  
  priceHistory           Json?              -- Historical pricing data
  /*
  Example priceHistory JSON:
  [
    {"date": "2023-01-15", "price": 3200000, "event": "listed"},
    {"date": "2023-02-20", "price": 3100000, "event": "price_reduction"},
    {"date": "2023-04-10", "price": 3495000, "event": "relisted"}
  ]
  */
  
  marketAnalytics        Json?              -- Market context and comparables summary
  /*
  Example marketAnalytics JSON:
  {
    "avgPricePerSqft": 890,
    "avgDaysOnMarket": 45,
    "inventoryLevel": "low",
    "priceAppreciation1yr": 0.08,
    "priceAppreciation5yr": 0.45,
    "comparableCount": 8
  }
  */
  
  -- === EXISTING FIELDS (Keep unchanged) ===
  zestimate              BigInt?
  zestimateRangeLow      BigInt?
  zestimateRangeHigh     BigInt?
  rentZestimate          BigInt?
  rentZestimateRangeLow  BigInt?
  rentZestimateRangeHigh BigInt?
  zestimateLastUpdated   DateTime?
  mlsNumber              String?
  mlsUrl                 String?
  images                 Json?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
  deletedAt              DateTime?
  
  -- === DATA FRESHNESS TRACKING ===
  batchDataLastUpdated   DateTime?          -- When BatchData was last fetched
  batchDataCost          Decimal?           -- Cost of last API call
  
  -- === RELATIONSHIPS (Keep unchanged) ===
  user                   User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  analyses               PropertyAnalysis[]
  timeline               Timeline?

  -- === INDEXES FOR PERFORMANCE ===
  -- Add strategic indexes for common queries
  @@index([userId])
  @@index([zipCode])
  @@index([highEquity])
  @@index([distressedProperty])
  @@index([absenteeOwner])
  @@index([lastSaleDate])
  @@index([daysOnMarket])
  @@index([equityPercent])
  
  @@map("properties")
}

-- === STORAGE ANALYSIS ===
/*
FIELD DISTRIBUTION:
- Hot Fields (Direct columns): ~35 fields (frequently queried)
- Warm Fields (JSON): ~5 JSON objects (occasionally accessed)
- Cold Fields (Not stored): ~660 fields (available via API when needed)

BENEFITS:
✅ Fast queries on investment criteria (equity, distress, owner type)
✅ Efficient storage - only valuable data saved
✅ Flexible JSON for complex nested data
✅ Easy to query common deal-making scenarios
✅ Future-proof - can add/remove JSON fields easily

QUERY EXAMPLES:
- Find high equity absentee owners: WHERE highEquity = true AND absenteeOwner = true
- Find distressed properties: WHERE distressedProperty = true OR foreclosureStatus IS NOT NULL
- Find cash buyers in area: WHERE cashBuyer = true AND zipCode = '90046'
- Find properties owned 10+ years: WHERE ownershipLength >= 10
*/