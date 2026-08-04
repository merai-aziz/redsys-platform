import { NextRequest, NextResponse } from "next/server";
import { buildSimulationInput } from "@/lib/simulationNeedsMapper";
import { DomainCode, NeedsState } from "@/lib/domainNeeds";
import { getRecommendations, ProductDomain } from "@/lib/recommendationclient";

interface RequestBody {
  domain: ProductDomain;
  needs: NeedsState;
  budgetMin?: number | null;
  budgetMax?: number | null;
  category_id?: number;
  family_id?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.domain || !body.needs) {
      return NextResponse.json(
        { error: "domain et needs sont requis" },
        { status: 400 }
      );
    }

    const simulation = buildSimulationInput(body.domain as DomainCode, body.needs, {
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
    });

    const recommendations = await getRecommendations({
      simulation,
      domain: body.domain,
      category_id: body.category_id,
      family_id: body.family_id,
      limit: body.limit ?? 20,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Erreur recommandation:", error);
    return NextResponse.json(
      { error: "Impossible de générer les recommandations" },
      { status: 500 }
    );
  }
}
