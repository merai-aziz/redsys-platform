/**
 * Client TypeScript pour appeler le microservice de recommandation
 * depuis vos routes API Next.js (redsys-platform).
 *
 * NE JAMAIS importer ce fichier depuis un composant 'use client' :
 * il lit process.env côté serveur (API key). Utilisez-le uniquement
 * depuis app/api/recommendations/route.ts.
 *
 * Variables d'environnement dans .env de redsys-platform :
 *   RECOMMENDATION_SERVICE_URL=http://localhost:8001
 *   RECOMMENDATION_SERVICE_API_KEY=<la même valeur que API_KEY côté FastAPI>
 */

export type ApplicationType = "ERP" | "WEB" | "DATABASE" | "VIRTUALIZATION" | "AI_WORKLOAD";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ProductDomain = "SERVER" | "NETWORK" | "STORAGE";

export interface SimulationInput {
  applicationType: ApplicationType;
  riskLevel: RiskLevel;
  numberOfUsers: number;
  cpuUsagePct: number;
  ramUsagePct: number;
  storageUsagePct: number;
  networkUsagePct: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  targetCo2ReductionKg?: number | null;
  availabilityTargetPct?: number | null;
}

export interface RecommendRequest {
  simulation: SimulationInput;
  domain: ProductDomain;
  category_id?: number;
  family_id?: number;
  limit?: number;
  include_configurable?: boolean;
}

export interface SelectedOption {
  configurationOptionName: string;
  configurationValueId: number;
  standardProductId: number;
  standardProductName: string;
  price: number;
}

export interface ProductScore {
  productId: number;
  name: string;
  base_price: number;
  fitScore: number;
  performanceScore: number;
  costScore: number;
  reliabilityScore: number;
  sustainabilityScore: number;
  explanation: string;
  kind: "standard" | "configurable_bundle";
  selectedOptions: SelectedOption[];
}

export interface RecommendResponse {
  modelVersion: string;
  domain: ProductDomain;
  items: ProductScore[];
}

export async function getRecommendations(
  payload: RecommendRequest
): Promise<RecommendResponse> {
  const baseUrl = process.env.RECOMMENDATION_SERVICE_URL;
  const apiKey = process.env.RECOMMENDATION_SERVICE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "RECOMMENDATION_SERVICE_URL ou RECOMMENDATION_SERVICE_API_KEY manquant dans .env"
    );
  }

  const response = await fetch(`${baseUrl}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur du service de recommandation (${response.status}): ${errorText}`);
  }

  return response.json();
}
