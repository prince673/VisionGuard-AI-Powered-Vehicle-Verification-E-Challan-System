import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, VehicleData } from "../types";

// NOTE: In a production app, never expose API keys on the client side.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// RTO RULES CONTEXT (Motor Vehicles Amendment Act, 2019)
const MVA_RULES_CONTEXT = `
  REFERENCE INDIA MOTOR VEHICLES ACT (MVA) 2019 FINES:
  1. General/First Offense (Sec 177): ₹500
  2. Disobedience of Orders (Sec 179): ₹2,000
  3. Driving without License (Sec 181): ₹5,000
  4. Overspeeding (Sec 183): ₹1,000 (LMV) / ₹2,000 (Medium/Heavy)
  5. Dangerous Driving / Mobile Use / Signal Jump (Sec 184): ₹1,000 - ₹5,000
  6. Drunk Driving (Sec 185): ₹10,000
  7. No PUC / Pollution (Sec 190(2)): ₹2,000
  8. Unregistered Vehicle / Expired RC (Sec 192): ₹5,000
  9. No Insurance (Sec 196): ₹2,000
  10. No Helmet (Sec 194D): ₹1,000
  11. No Seatbelt (Sec 194B): ₹1,000
  12. Triple Riding on Bike (Sec 128/194C): ₹1,000
  13. Obstruction of Traffic (Sec 201): ₹500
  14. Stolen Vehicle: Report to Police immediately (Severity: Critical).
`;

/**
 * FAST AI: Uses Gemini Flash Lite for low-latency ALPR.
 */
export const extractLicensePlate = async (base64Image: string): Promise<string | null> => {
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    // Using gemini-flash-lite-latest for speed as per requirements
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Extract the vehicle license plate number. Return ONLY the alphanumeric uppercase string (e.g. MH12DE1433). If unclear, return 'UNKNOWN'." }
        ]
      }
    });

    const text = response.text?.trim() || 'UNKNOWN';
    if (text === 'UNKNOWN') return null;
    return text.replace(/[^A-Z0-9]/g, '');
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
};

/**
 * LIVE HUD ANALYSIS: Ultra-fast analysis for camera overlay.
 */
export const getLiveTrafficAnalysis = async (base64Image: string): Promise<string> => {
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Analyze this traffic frame in 5 words or less. E.g., 'SUV detected, No Helmet'. Be concise." }
        ]
      }
    });
    return response.text?.trim() || "Scanning...";
  } catch (error) {
    return "Scanning...";
  }
};

/**
 * STANDARD AI: Uses Gemini Flash for structured compliance analysis (Document Checks).
 */
export const analyzeVehicleCompliance = async (vehicle: VehicleData): Promise<AIAnalysisResult> => {
  try {
    const prompt = `
      Analyze the following vehicle status for traffic violations based on official Indian RTO rules.
      
      ${MVA_RULES_CONTEXT}

      Vehicle Data: ${JSON.stringify(vehicle)}
      Current Date: ${new Date().toISOString().split('T')[0]}

      Instructions:
      1. Check RC, Insurance, and PUC expiry dates against Current Date.
      2. If expired, apply the specific MVA section fine.
      3. If Stolen, mark as Critical severity.
      4. Return a structured JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            violations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  fineAmount: { type: Type.NUMBER },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            totalFine: { type: Type.NUMBER },
            actionRecommended: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}") as AIAnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    return { riskScore: 0, summary: "Error", violations: [], totalFine: 0, actionRecommended: "Manual" };
  }
};

/**
 * IMAGE UNDERSTANDING: Uses Gemini 3 Pro for detailed scene analysis (Visual Violations).
 */
export const analyzeTrafficScene = async (base64Image: string): Promise<string> => {
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: `Analyze this traffic scene. Identify violations based on these rules:\n${MVA_RULES_CONTEXT}\nList violations, specific MVA sections, and fines.` }
        ]
      }
    });
    return response.text || "No analysis available.";
  } catch (error) {
    return "Failed to analyze scene.";
  }
};

/**
 * VIDEO UNDERSTANDING: Uses Gemini 3 Pro to analyze video frames.
 */
export const analyzeVideoFootage = async (frames: string[]): Promise<AIAnalysisResult> => {
  try {
    // Limit frames to avoid payload issues (take up to 10 evenly spaced frames)
    const step = Math.max(1, Math.floor(frames.length / 10));
    const selectedFrames = frames.filter((_, i) => i % step === 0).slice(0, 10);

    const parts = selectedFrames.map(frame => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame.split(',')[1] || frame
      }
    }));

    parts.push({
      text: `Analyze this video sequence of a vehicle.
      ${MVA_RULES_CONTEXT}
      
      Tasks:
      1. Identify the license plate if visible.
      2. Detect Visual Violations (No Helmet, Triple Riding, No Seatbelt, Mobile Use).
      3. Map violations to specific MVA Sections and Fines.
      4. Return JSON with riskScore (0-100), summary, violations array, totalFine.
      `
    } as any);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            violations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  fineAmount: { type: Type.NUMBER },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            totalFine: { type: Type.NUMBER },
            actionRecommended: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}") as AIAnalysisResult;
  } catch (error) {
    console.error("Video Analysis Error:", error);
    return { riskScore: 0, summary: "Video analysis failed", violations: [], totalFine: 0, actionRecommended: "Manual Review" };
  }
};

/**
 * THINKING MODE: Uses Gemini 3 Pro with Thinking Config for legal queries.
 */
export const askLegalAssistant = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context: You are an expert on the Indian Motor Vehicles Act 2019.
      ${MVA_RULES_CONTEXT}
      User Query: ${query}`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 } // Max budget for deep reasoning
      }
    });
    return response.text || "I could not process that query.";
  } catch (error) {
    return "Legal Assistant is currently unavailable.";
  }
};

/**
 * MAPS GROUNDING: Uses Gemini 2.5 Flash with Google Maps Tool.
 */
export const findNearbyServices = async (query: string, lat: number, lng: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      }
    });
    
    // Return both text and grounding metadata (for map links)
    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Maps Error:", error);
    return { text: "Could not access location services.", groundingChunks: null };
  }
};