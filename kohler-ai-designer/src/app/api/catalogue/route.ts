import { NextResponse } from "next/server";
import { filterAndSortCatalogue, type CatalogueFilterOptions, type CatalogueSortOption } from "@/lib/catalogue";
import { loadCatalogueData } from "@/lib/catalogue/loadCatalogue";

export async function GET(request: Request) {
  try {
    const { products, metadata } = loadCatalogueData();
    const { searchParams } = new URL(request.url);

    // If client specifically requests raw catalogue data
    const raw = searchParams.get("raw");
    if (raw === "true") {
      return NextResponse.json(
        { products, metadata },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        },
      );
    }

    const searchQuery = searchParams.get("q") ?? "";
    const selectedCategory = searchParams.get("category") ?? "all";
    const selectedSubcategory = searchParams.get("subcategory") ?? "all";
    const selectedFinish = searchParams.get("finish") ?? "all";
    const only3D = searchParams.get("only3d") === "true";
    const sortBy = (searchParams.get("sort") as CatalogueSortOption) ?? "relevance";

    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const priceRange: [number, number] | undefined =
      minPriceParam !== null && maxPriceParam !== null
        ? [Number(minPriceParam), Number(maxPriceParam)]
        : undefined;

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSizeParam = searchParams.get("pageSize");
    const pageSize = pageSizeParam === "all" ? products.length : Math.max(1, Number(pageSizeParam) || 16);

    const filters: CatalogueFilterOptions = {
      searchQuery,
      selectedCategory,
      selectedSubcategory,
      selectedFinish,
      priceRange,
      only3D,
      sortBy,
    };

    const queryResult = filterAndSortCatalogue(products, filters, page, pageSize);

    return NextResponse.json(
      {
        ...queryResult,
        metadata,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Error loading catalogue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load catalogue" },
      { status: 500 },
    );
  }
}
