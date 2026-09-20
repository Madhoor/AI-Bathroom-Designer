export interface CatalogueProduct {
  productCode: string;
  productName: string;
  collection?: string;
  model?: string;
  category: string;
  subcategory?: string;
  currentPrice?: number;
  listPrice?: number;
  currency: string;
  dimensionsText?: string;
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  finish?: string;
  finishCode?: string;
  material?: string;
  installationType?: string;
  roughIn?: string;
  specifications?: string;
  features?: string;
  requiredComponents?: string;
  compatibleProducts?: string;
  imageUrls: string[];
  productUrl?: string;
  specSheetUrl?: string;
  has3d: boolean;
  normalizedBoundsM?: [number, number, number];
  scaleFactor?: number;
}

export type CatalogueSortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export interface CatalogueFilterOptions {
  searchQuery: string;
  selectedCategory: string; // "all" or specific category
  selectedSubcategory?: string; // "all" or specific subcategory
  selectedFinish?: string; // "all" or specific finish
  priceRange?: [number, number]; // [min, max]
  only3D: boolean;
  sortBy: CatalogueSortOption;
}

export interface CatalogueMetadata {
  categories: string[];
  subcategoriesByCategory: Record<string, string[]>;
  finishes: string[];
  priceBounds: {
    min: number;
    max: number;
  };
  totalProducts: number;
  total3dProducts: number;
}

export interface CatalogueQueryResult {
  products: CatalogueProduct[];
  metadata: CatalogueMetadata;
  totalMatching: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
