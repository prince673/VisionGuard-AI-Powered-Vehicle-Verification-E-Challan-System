import { VehicleData } from '../types';

// Mock database to simulate government RTO API
const MOCK_DB: Record<string, VehicleData> = {
  'MH12DE1433': {
    plateNumber: 'MH12DE1433',
    model: 'Honda City',
    type: 'Four Wheeler',
    isStolen: false,
    owner: {
      name: 'Rajesh Kumar',
      email: 'rajesh.k@example.com',
      phone: '+919876543210',
      address: 'Flat 402, Sunshine Apartments, Pune',
    },
    documents: {
      rcStatus: 'Active',
      rcExpiry: '2028-05-20',
      insuranceStatus: 'Expired', // VIOLATION
      insuranceExpiry: '2023-12-01',
      pucStatus: 'Active',
      pucExpiry: '2024-10-15',
    },
  },
  'DL3CA1234': {
    plateNumber: 'DL3CA1234',
    model: 'Maruti Swift',
    type: 'Four Wheeler',
    isStolen: true, // CRITICAL VIOLATION
    owner: {
      name: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      phone: '+919988776655',
      address: '12, Civil Lines, Delhi',
    },
    documents: {
      rcStatus: 'Active',
      rcExpiry: '2026-01-01',
      insuranceStatus: 'Active',
      insuranceExpiry: '2025-01-01',
      pucStatus: 'Active',
      pucExpiry: '2025-02-01',
    },
  },
  'KA05JA9999': {
    plateNumber: 'KA05JA9999',
    model: 'Royal Enfield Classic 350',
    type: 'Two Wheeler',
    isStolen: false,
    owner: {
      name: 'Sneha Reddy',
      email: 'sneha.r@example.com',
      phone: '+918877665544',
      address: 'HSR Layout, Bangalore',
    },
    documents: {
      rcStatus: 'Expired', // VIOLATION
      rcExpiry: '2023-01-01',
      insuranceStatus: 'Expired', // VIOLATION
      insuranceExpiry: '2023-06-15',
      pucStatus: 'Expired', // VIOLATION
      pucExpiry: '2022-12-30',
    },
  },
};

export const fetchVehicleDetails = async (plateNumber: string): Promise<VehicleData | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Clean the input plate number (remove spaces, special chars)
  const cleanPlate = plateNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Return specific mock data or generate a random one for unknown plates for demo purposes
  if (MOCK_DB[cleanPlate]) {
    return MOCK_DB[cleanPlate];
  }

  // Generate random data for demo continuity if plate not in hardcoded DB
  return {
    plateNumber: cleanPlate,
    model: 'Unknown Vehicle',
    type: 'Four Wheeler',
    isStolen: false,
    owner: {
      name: 'Unknown Owner',
      email: 'unknown@example.com',
      phone: '0000000000',
      address: 'Not Available',
    },
    documents: {
      rcStatus: Math.random() > 0.8 ? 'Expired' : 'Active',
      rcExpiry: '2025-01-01',
      insuranceStatus: Math.random() > 0.7 ? 'Expired' : 'Active',
      insuranceExpiry: '2025-06-01',
      pucStatus: Math.random() > 0.6 ? 'Expired' : 'Active',
      pucExpiry: '2024-12-01',
    }
  };
};
