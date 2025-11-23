export interface VehicleOwner {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface VehicleDocuments {
  rcStatus: 'Active' | 'Expired' | 'Suspended';
  rcExpiry: string;
  insuranceStatus: 'Active' | 'Expired';
  insuranceExpiry: string;
  pucStatus: 'Active' | 'Expired';
  pucExpiry: string;
}

export interface VehicleData {
  plateNumber: string;
  model: string;
  type: 'Two Wheeler' | 'Four Wheeler' | 'Heavy Vehicle';
  owner: VehicleOwner;
  documents: VehicleDocuments;
  isStolen: boolean;
}

export interface Violation {
  rule: string;
  fineAmount: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
}

export interface AIAnalysisResult {
  riskScore: number; // 0-100
  summary: string;
  violations: Violation[];
  totalFine: number;
  actionRecommended: string;
}

export interface ScanSession {
  id: string;
  type: 'image' | 'video'; // Added to distinguish scan types
  timestamp: string;
  plateNumber: string | null;
  imageUrl: string; // Used for thumbnail
  vehicleData: VehicleData | null;
  analysis: AIAnalysisResult | null;
  status: 'scanned' | 'processing' | 'verified' | 'challan_generated';
}

export interface User {
  id: string;
  name: string;
  badgeNumber: string;
  email: string;
  role: 'Officer' | 'Admin';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  groundingMetadata?: any; // For Google Maps/Search data
  timestamp: Date;
}