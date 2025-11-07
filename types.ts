// types.ts

export interface Client {
  id: string;
  name: string;
  contacts: {
    name: string;
    email?: string;
    phone?: string;
  }[];
}

export interface Property {
  id: string;
  clientId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  lidarUrl?: string;
}

export interface Section {
    id: string;
    propertyId: string;
    name: string;
    // GeoJSON Polygon coordinates are optional for custom/virtual sections
    coords?: { lat: number, lng: number }[];
}


export interface Tree {
  id: string;
  propertyId: string;
  species: string;
  dbh: number; // Diameter at Breast Height in inches
  height?: number; // Height in feet
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  location: {
    lat: number;
    lng: number;
  } | null;
  images?: {
    url: string;
    caption?: string;
  }[];
  tags?: string[];
  recommendations?: Recommendation[]; // To hold temp recs for new trees
  sectionId?: string;
  isLandmark?: boolean;
  isKeystone?: boolean;
  lidarScans?: {
    id: string;
    url: string;
    date: string; // YYYY-MM-DD
    notes?: string;
  }[];
}

export interface Recommendation {
  id:string;
  propertyId: string;
  treeIds?: string[];
  programId: string;
  kind: string;
  perVisitPrice: number;
  status: 'recommended' | 'proposed' | 'approved' | 'declined' | 'draft';
  serviceCode: string;
  notes?: string;
  tags?: string[];
  inputs?: {
      estHours?: number;
      dbhInches?: number;
      sqft?: number;
      heightFt?: number;
      maxCutInches?: number; // for pruning
  };
  proposedYear?: number;
  proposedQuarter?: 1 | 2 | 3 | 4;
}


export interface RecTemplate {
    id: string;
    serviceCode: string;
    name: string;
    descriptionShort: string;
    category: 'PHC' | 'Pruning' | 'Removal' | 'General';
    pricingRuleId: string;
    unitBasis?: 'time' | 'dbh' | 'sqft' | 'height' | 'budget';
    defaultInputs?: {
        estHours?: number;
        dbhInches?: number;
        sqft?: number;
        heightFt?: number;
        maxCutInches?: number;
    };
    visitsPerYear?: number;
}


export interface TargetSet {
    id: string;
    propertyId: string;
    name: string;
    treeIds: string[];
}

export interface Plan {
    id: string;
    propertyId: string;
    name: string;
    horizonYears: number;
    budgetOverrides?: { [programKey: string]: number }; // e.g., { '2024-PHC': 5500 }
}

export interface PlanItem {
    id:string;
    planId: string;
    propertyId: string;
    targetSetId?: string; // Can be from a recommendation with no initial target
    serviceCode: string;
    recommendationId?: string; // Link back to original rec if created from one
    schedule: {
        type: 'oneOff' | 'rsa';
        year: number;
        quarter?: 1 | 2 | 3 | 4;
    };
    status: 'draft' | 'proposed' | 'approved' | 'scheduled' | 'done' | 'skipped';
    budget?: {
        perVisitPrice: number;
        visits: number;
        annualEstimate: number;
        contractAnnualEstimate?: number;
        isOverridden?: boolean;
        priceOverrides?: { [treeId: string]: number };
    };
    groupId?: string; // For multi-visit RSAs
    visitNumber?: number; // e.g., 1 of 3
    isBudgetProgram?: boolean;
    isRsaProgram?: boolean;
    totalBudget?: number;
    containedItemIds?: string[];
    containerId?: string; // ID of the budget program PlanItem containing this item
    color?: string; // For budget programs
    isRenewal?: boolean;
}

export interface WorkOrder {
  id: string;
  propertyId: string;
  programId: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export type DndItem = PlanItem | Recommendation | RecTemplate;

export interface ActiveDndItem {
    item: DndItem;
    type: 'planItem' | 'recommendation' | 'recTemplate';
}

export interface RsaProgram {
    id: string; // Composite key like `${serviceCode}-${targetSetId}`
    name: string;
    propertyId: string;
    serviceCode: string;
    targetSetId: string;
    planItemIds: string[];
}

export interface BulkAssigningToBudgetContext {
  recommendations: Recommendation[];
  year: number;
  category: string;
}

export interface ProgramService {
    template: RecTemplate;
    targetSet: TargetSet;
    perVisitPrice: number;
    visits: number;
    annualCost: number;
}

export interface DisplayProgram {
    key: string; // e.g., 2024-PHC
    year: number;
    category: 'PHC' | 'Pruning' | 'Removal' | 'General';
    totalBudget: number;
    isOverridden: boolean;
    services: ProgramService[];
    recTemplateIds: string[]; // Kept for compatibility with RsaBuilderTab logic, refers to RecTemplate.id
}

export interface ScoutReport {
  id: string;
  propertyId: string;
  name: string;
  year: number;
  status: 'draft' | 'published';
  executiveSummary?: string;
  showGranularPricing: boolean;
}

export interface ScoutImage {
  id: string;
  url: string; // Original image
  markupUrl?: string; // Image with drawings
  notes?: string;
}

export interface ScoutItem {
  id: string;
  scoutReportId: string;
  sectionId: string;
  title: string;
  category: 'PHC' | 'Pruning' | 'Removal' | 'General';
  notes?: string;
  estimatedBudget: number;
  images?: ScoutImage[];
  isDraft?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  priority?: 'Critical' | 'Maintenance' | 'Lower Priority';
}

export interface PortalMessage {
  id: string;
  reportId: string;
  location?: {
    lat: number;
    lng: number;
  };
  text: string;
  author: string;
  createdAt: string; // ISO date string
}

export interface UserSettings {
  arboristName: string;
  companyName: string;
  email: string;
  phone: string;
  digitalCardUrl: string;
}