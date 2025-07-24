// Inspection Analysis Types - Production-ready data models
// Zero tech debt implementation with comprehensive type safety

export interface InspectionIssue {
  id: string;
  category: InspectionCategory;
  severity: IssueSeverity;
  urgency: IssueUrgency;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  location: string;
  recommendations: string[];
  estimatedCost: CostEstimate;
  negotiationValue: number;
  safetyImplications?: string;
  photosReferenced?: string[];
  pageReference?: number;
  sectionReference?: string;
}

export interface CostEstimate {
  low: number;
  high: number;
  mostLikely: number;
  laborHours?: number;
  materialCost?: number;
  permitRequired?: boolean;
  professionalRequired: boolean;
  urgencyMultiplier?: number;
}

export interface InspectionAnalysisResult {
  reportId: string;
  reportType: InspectionReportType;
  processingTimeMs: number;
  extractedText: string;
  sections: InspectionSection[];
  issues: InspectionIssue[];
  summary: InspectionSummary;
  qualityScore: number; // 0-100, how well we could analyze the report
  warnings: string[];
  metadata: {
    pages: number;
    wordCount: number;
    inspector?: string;
    inspectionDate?: string;
    propertyAddress?: string;
  };
}

export interface InspectionSection {
  title: string;
  content: string;
  pageNumber?: number;
  issuesFound: number;
  analysisConfidence: number; // 0-100
}

export interface InspectionSummary {
  totalIssues: number;
  safetyIssues: number;
  majorIssues: number;
  minorIssues: number;
  cosmeticIssues: number;
  totalEstimatedCost: CostRange;
  totalNegotiationValue: number;
  priorityIssues: InspectionIssue[];
  recommendedNegotiationStrategy: NegotiationStrategy;
}

export interface CostRange {
  minimum: number;
  maximum: number;
  mostLikely: number;
}

export interface NegotiationStrategy {
  recommendedAsk: number;
  fallbackPosition: number;
  walkAwayPoint: number;
  keyTalkingPoints: string[];
  marketContext: string;
  leverage: 'high' | 'moderate' | 'low';
}

// Enums for type safety
export enum InspectionCategory {
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  HVAC = 'HVAC',
  STRUCTURAL = 'STRUCTURAL',
  ROOFING = 'ROOFING',
  EXTERIOR = 'EXTERIOR',
  INTERIOR = 'INTERIOR',
  INSULATION = 'INSULATION',
  WINDOWS_DOORS = 'WINDOWS_DOORS',
  FOUNDATION = 'FOUNDATION',
  ATTIC = 'ATTIC',
  BASEMENT = 'BASEMENT',
  GARAGE = 'GARAGE',
  DECK_PATIO = 'DECK_PATIO',
  DRIVEWAY = 'DRIVEWAY',
  LANDSCAPING = 'LANDSCAPING',
  POOL_SPA = 'POOL_SPA',
  FIREPLACE = 'FIREPLACE',
  SEPTIC = 'SEPTIC',
  WELL_WATER = 'WELL_WATER',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER'
}

export enum IssueSeverity {
  SAFETY = 'safety',      // Immediate safety hazard
  MAJOR = 'major',        // Significant functional issue
  MINOR = 'minor',        // Functional but not critical
  COSMETIC = 'cosmetic'   // Aesthetic only
}

export enum IssueUrgency {
  IMMEDIATE = 'immediate',     // Fix before closing/occupancy
  SHORT_TERM = '1-6-months',   // Address within 6 months
  MEDIUM_TERM = '6-24-months', // Address within 2 years
  LONG_TERM = '2-5-years',     // Can defer 2-5 years
  MONITORING = 'monitoring'     // Monitor but no immediate action
}

export enum RiskLevel {
  HIGH = 'high',       // High liability/cost risk
  MEDIUM = 'medium',   // Moderate risk
  LOW = 'low'          // Low risk
}

export enum InspectionReportType {
  HOME_GENERAL = 'home_general',
  POOL_SPA = 'pool_spa',
  CHIMNEY = 'chimney',
  SEWER_SCOPE = 'sewer_scope',
  PEST_WDO = 'pest_wdo',
  ENVIRONMENTAL = 'environmental',
  SPECIALTY = 'specialty',
  OTHER = 'other'
}

// Analysis confidence thresholds
export const ANALYSIS_CONFIDENCE = {
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50
} as const;

// Cost estimation defaults (in USD)
export const COST_DEFAULTS = {
  MINIMUM_LABOR_RATE: 75,
  MAXIMUM_LABOR_RATE: 150,
  PERMIT_COST_AVERAGE: 250,
  EMERGENCY_MULTIPLIER: 1.5,
  LOCATION_MULTIPLIERS: {
    HIGH_COST: 1.4,  // SF Bay Area, NYC, etc.
    MEDIUM_COST: 1.2, // Most urban areas
    LOW_COST: 1.0     // Rural/lower cost areas
  }
} as const;