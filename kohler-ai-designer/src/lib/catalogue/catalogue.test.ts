import { describe, expect, it } from "vitest";
import { filterAndSortCatalogue } from "./filterCatalogue";
import { loadCatalogueData } from "./loadCatalogue";
import type { CatalogueFilterOptions, CatalogueProduct } from "./types";

describe("KOHLER Catalogue Data Layer", () => {
  it("loads authentic catalogue data from normalized CSV and 3D asset manifest", () => {
    const { products, metadata } = loadCatalogueData();

    expect(products.length).toBeGreaterThanOrEqual(280);
    expect(metadata.totalProducts).toBe(products.length);
    expect(metadata.total3dProducts).toBeGreaterThanOrEqual(220);

    // Verify factual categories exist
    expect(metadata.categories).toContain("Basin Area");
    expect(metadata.categories).toContain("Wellness");
    expect(metadata.categories.length).toBeGreaterThan(0);

    // Verify real prices exist
    expect(metadata.priceBounds.min).toBeGreaterThan(0);
    expect(metadata.priceBounds.max).toBeGreaterThan(metadata.priceBounds.min);

    // Verify real finishes exist
    expect(metadata.finishes.length).toBeGreaterThan(0);
    expect(metadata.finishes).toContain("Polished Chrome");
  });

  it("identifies 3D availability honestly without hallucination", () => {
    const { products } = loadCatalogueData();

    // Verify products marked as has3d have valid normalized bounds
    const products3d = products.filter((p) => p.has3d);
    expect(products3d.length).toBeGreaterThanOrEqual(220);
    products3d.forEach((product) => {
      expect(product.has3d).toBe(true);
      expect(product.normalizedBoundsM).toBeDefined();
      expect(product.normalizedBoundsM?.length).toBe(3);
    });

    // Verify products without 3D exist and are flagged has3d: false
    const productsWithout3d = products.filter((p) => !p.has3d);
    expect(productsWithout3d.length).toBeGreaterThan(0);
    productsWithout3d.forEach((product) => {
      expect(product.has3d).toBe(false);
      expect(product.normalizedBoundsM).toBeUndefined();
    });
  });

  it("searches products by product code, name, and collection deterministically", () => {
    const { products } = loadCatalogueData();

    const defaultFilters: CatalogueFilterOptions = {
      searchQuery: "",
      selectedCategory: "all",
      only3D: false,
      sortBy: "relevance",
    };

    // Search by product code
    const codeQuery = filterAndSortCatalogue(products, {
      ...defaultFilters,
      searchQuery: "10385IN-CP",
    });
    expect(codeQuery.totalMatching).toBeGreaterThanOrEqual(1);
    expect(codeQuery.products[0].productCode).toBe("10385IN-CP");

    // Search by collection name
    const collectionQuery = filterAndSortCatalogue(products, {
      ...defaultFilters,
      searchQuery: "Purist",
    });
    expect(collectionQuery.totalMatching).toBeGreaterThanOrEqual(1);
    expect(
      collectionQuery.products.some(
        (p) =>
          p.productName.toLowerCase().includes("purist") ||
          p.collection?.toLowerCase().includes("purist"),
      ),
    ).toBe(true);
  });

  it("filters products by category and subcategory", () => {
    const { products } = loadCatalogueData();

    const defaultFilters: CatalogueFilterOptions = {
      searchQuery: "",
      selectedCategory: "Wellness",
      only3D: false,
      sortBy: "relevance",
    };

    const wellnessResults = filterAndSortCatalogue(products, defaultFilters);
    expect(wellnessResults.totalMatching).toBeGreaterThan(0);
    expect(wellnessResults.products.every((p) => p.category === "Wellness")).toBe(true);

    // Subcategory filter
    const subcatResults = filterAndSortCatalogue(products, {
      ...defaultFilters,
      selectedSubcategory: "Drop-in Bathtubs",
    });
    expect(subcatResults.totalMatching).toBeGreaterThan(0);
    expect(
      subcatResults.products.every(
        (p) => p.category === "Wellness" && p.subcategory === "Drop-in Bathtubs",
      ),
    ).toBe(true);
  });

  it("filters products by 3D model availability", () => {
    const { products } = loadCatalogueData();

    const resultsOnly3D = filterAndSortCatalogue(products, {
      searchQuery: "",
      selectedCategory: "all",
      only3D: true,
      sortBy: "relevance",
    });

    expect(resultsOnly3D.totalMatching).toBeGreaterThan(0);
    expect(resultsOnly3D.products.every((p) => p.has3d)).toBe(true);
  });

  it("filters products by price range accurately", () => {
    const { products } = loadCatalogueData();

    const priceResults = filterAndSortCatalogue(products, {
      searchQuery: "",
      selectedCategory: "all",
      priceRange: [10000, 50000],
      only3D: false,
      sortBy: "relevance",
    });

    expect(priceResults.totalMatching).toBeGreaterThan(0);
    priceResults.products.forEach((p) => {
      const price = p.currentPrice ?? p.listPrice;
      if (price !== undefined) {
        expect(price).toBeGreaterThanOrEqual(10000);
        expect(price).toBeLessThanOrEqual(50000);
      }
    });
  });

  it("sorts products deterministically by price and name", () => {
    const { products } = loadCatalogueData();

    const defaultFilters: CatalogueFilterOptions = {
      searchQuery: "",
      selectedCategory: "all",
      only3D: false,
      sortBy: "price-asc",
    };

    // Ascending price
    const ascResults = filterAndSortCatalogue(products, defaultFilters, 1, 50);
    for (let i = 1; i < ascResults.products.length; i += 1) {
      const prevPrice = ascResults.products[i - 1].currentPrice ?? ascResults.products[i - 1].listPrice ?? Infinity;
      const currPrice = ascResults.products[i].currentPrice ?? ascResults.products[i].listPrice ?? Infinity;
      expect(currPrice).toBeGreaterThanOrEqual(prevPrice);
    }

    // Descending price
    const descResults = filterAndSortCatalogue(
      products,
      { ...defaultFilters, sortBy: "price-desc" },
      1,
      50,
    );
    for (let i = 1; i < descResults.products.length; i += 1) {
      const prevPrice = descResults.products[i - 1].currentPrice ?? descResults.products[i - 1].listPrice ?? -1;
      const currPrice = descResults.products[i].currentPrice ?? descResults.products[i].listPrice ?? -1;
      expect(currPrice).toBeLessThanOrEqual(prevPrice);
    }

    // Name ascending
    const nameResults = filterAndSortCatalogue(
      products,
      { ...defaultFilters, sortBy: "name-asc" },
      1,
      50,
    );
    for (let i = 1; i < nameResults.products.length; i += 1) {
      const prevName = nameResults.products[i - 1].productName;
      const currName = nameResults.products[i].productName;
      expect(currName.localeCompare(prevName)).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles products with missing fields gracefully without fabricating data", () => {
    const mockSparseProducts: CatalogueProduct[] = [
      {
        productCode: "TEST-01",
        productName: "Basic Test Product",
        category: "Test Category",
        currency: "INR",
        imageUrls: [],
        has3d: false,
      },
      {
        productCode: "TEST-02",
        productName: "Full Test Product",
        category: "Test Category",
        currency: "INR",
        currentPrice: 15000,
        finish: "Chrome",
        imageUrls: ["https://example.com/image.jpg"],
        has3d: true,
        normalizedBoundsM: [0.5, 0.4, 0.6],
      },
    ];

    const results = filterAndSortCatalogue(mockSparseProducts, {
      searchQuery: "",
      selectedCategory: "all",
      only3D: false,
      sortBy: "relevance",
    });

    expect(results.totalMatching).toBe(2);
    // 3D product prioritized in relevance default
    expect(results.products[0].productCode).toBe("TEST-02");
    expect(results.products[1].productCode).toBe("TEST-01");
    expect(results.products[1].finish).toBeUndefined();
    expect(results.products[1].currentPrice).toBeUndefined();
  });
});
