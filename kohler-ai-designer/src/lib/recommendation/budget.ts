import type { RecommendationProduct } from "./types";

export function productPrice(product: RecommendationProduct): number | undefined {
  return product.currentPrice ?? product.listPrice;
}

export function productTotal(products: RecommendationProduct[]): number | undefined {
  const prices = products.map(productPrice);
  const completePrices = prices.filter((price): price is number => price !== undefined);
  return completePrices.length === prices.length
    ? completePrices.reduce((sum, price) => sum + price, 0)
    : undefined;
}

export function withinBudget(products: RecommendationProduct[], budget: number | undefined): boolean {
  if (budget === undefined) return true;
  const total = productTotal(products);
  return total !== undefined && total <= budget;
}
