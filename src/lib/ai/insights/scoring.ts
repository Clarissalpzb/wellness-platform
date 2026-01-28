export interface ScoredInsight {
  id: string;
  compositeScore: number;
  impactScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  freshnessBonus: number;
}

export function scoreInsight(insight: {
  impactScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  createdAt: Date;
}): number {
  const { impactScore, confidenceScore, actionabilityScore, createdAt } = insight;

  // Weights
  const IMPACT_WEIGHT = 0.4;
  const CONFIDENCE_WEIGHT = 0.25;
  const ACTIONABILITY_WEIGHT = 0.25;
  const FRESHNESS_WEIGHT = 0.1;

  // Freshness: newer insights get higher scores (decays over 7 days)
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, 10 - (ageHours / (7 * 24)) * 10);

  return (
    impactScore * IMPACT_WEIGHT +
    confidenceScore * CONFIDENCE_WEIGHT +
    actionabilityScore * ACTIONABILITY_WEIGHT +
    freshness * FRESHNESS_WEIGHT
  );
}

export function rankInsights(insights: Array<{
  id: string;
  impactScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  createdAt: Date;
}>): ScoredInsight[] {
  return insights
    .map((insight) => {
      const ageHours = (Date.now() - insight.createdAt.getTime()) / (1000 * 60 * 60);
      const freshnessBonus = Math.max(0, 10 - (ageHours / (7 * 24)) * 10);

      return {
        id: insight.id,
        compositeScore: scoreInsight(insight),
        impactScore: insight.impactScore,
        confidenceScore: insight.confidenceScore,
        actionabilityScore: insight.actionabilityScore,
        freshnessBonus,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
