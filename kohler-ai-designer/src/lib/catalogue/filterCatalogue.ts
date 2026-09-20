import type { CatalogueFilterOptions, CatalogueProduct, CatalogueQueryResult } from "./types";

export function filterAndSortCatalogue(
  allProducts: CatalogueProduct[],
  filters: CatalogueFilterOptions,
  page = 1,
  pageSize = 16,
): Omit<CatalogueQueryResult, "metadata"> {
  const query = filters.searchQuery.trim().toLowerCase();
  const cat = filters.selectedCategory?.trim();
  const subcat = filters.selectedSubcategory?.trim();
  const finish = filters.selectedFinish?.trim();
  const priceMin = filters.priceRange ? filters.priceRange[0] : undefined;
  const priceMax = filters.priceRange ? filters.priceRange[1] : undefined;

  // 1. Filtering
  const filtered = allProducts.filter((product) => {
    // 3D availability filter
    if (filters.only3D && !product.has3d) {
      return false;
    }

    // Category filter
    if (cat && cat !== "all" && cat.toLowerCase() !== "all categories") {
      if (product.category.toLowerCase() !== cat.toLowerCase()) {
        return false;
      }
    }

    // Subcategory filter
    if (subcat && subcat !== "all" && subcat.toLowerCase() !== "all subcategories") {
      if (product.subcategory?.toLowerCase() !== subcat.toLowerCase()) {
        return false;
      }
    }

    // Finish filter
    if (finish && finish !== "all" && finish.toLowerCase() !== "all finishes") {
      if (product.finish?.toLowerCase() !== finish.toLowerCase()) {
        return false;
      }
    }

    // Price range filter
    const effectivePrice = product.currentPrice ?? product.listPrice;
    if (priceMin !== undefined && effectivePrice !== undefined && effectivePrice < priceMin) {
      return false;
    }
    if (priceMax !== undefined && effectivePrice !== undefined && effectivePrice > priceMax) {
      return false;
    }

    // Text search filter
    if (query) {
      const codeMatch = product.productCode.toLowerCase().includes(query);
      const nameMatch = product.productName.toLowerCase().includes(query);
      const collectionMatch = product.collection?.toLowerCase().includes(query) ?? false;
      const finishMatch = product.finish?.toLowerCase().includes(query) ?? false;
      const subcatMatch = product.subcategory?.toLowerCase().includes(query) ?? false;
      const featuresMatch = product.features?.toLowerCase().includes(query) ?? false;

      if (!codeMatch && !nameMatch && !collectionMatch && !finishMatch && !subcatMatch && !featuresMatch) {
        return false;
      }
    }

    return true;
  });

  // 2. Deterministic Sorting
  const sorted = [...filtered].sort((a, b) => {
    const priceA = a.currentPrice ?? a.listPrice;
    const priceB = b.currentPrice ?? b.listPrice;

    switch (filters.sortBy) {
      case "price-asc": {
        const valA = priceA ?? Number.POSITIVE_INFINITY;
        const valB = priceB ?? Number.POSITIVE_INFINITY;
        if (valA !== valB) return valA - valB;
        return a.productCode.localeCompare(b.productCode);
      }
      case "price-desc": {
        const valA = priceA ?? Number.NEGATIVE_INFINITY;
        const valB = priceB ?? Number.NEGATIVE_INFINITY;
        if (valA !== valB) return valB - valA;
        return a.productCode.localeCompare(b.productCode);
      }
      case "name-asc": {
        const nameComp = a.productName.localeCompare(b.productName);
        if (nameComp !== 0) return nameComp;
        return a.productCode.localeCompare(b.productCode);
      }
      case "relevance":
      default: {
        if (query) {
          // Weight exact code match highest, then code prefix, then name prefix, then general
          const scoreA = getMatchScore(a, query);
          const scoreB = getMatchScore(b, query);
          if (scoreA !== scoreB) return scoreB - scoreA;
        }
        // Default deterministic priority: 3D models first, then alphabetical by name
        if (a.has3d !== b.has3d) {
          return a.has3d ? -1 : 1;
        }
        const nameComp = a.productName.localeCompare(b.productName);
        if (nameComp !== 0) return nameComp;
        return a.productCode.localeCompare(b.productCode);
      }
    }
  });

  // 3. Pagination
  const totalMatching = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const validPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (validPage - 1) * pageSize;
  const paginatedProducts = sorted.slice(startIndex, startIndex + pageSize);

  return {
    products: paginatedProducts,
    totalMatching,
    page: validPage,
    pageSize,
    totalPages,
  };
}

function getMatchScore(product: CatalogueProduct, query: string): number {
  const code = product.productCode.toLowerCase();
  const name = product.productName.toLowerCase();
  const collection = product.collection?.toLowerCase() ?? "";

  if (code === query) return 100;
  if (code.startsWith(query)) return 80;
  if (name.startsWith(query)) return 60;
  if (code.includes(query)) return 50;
  if (name.includes(query)) return 40;
  if (collection.includes(query)) return 30;
  return 10;
}
