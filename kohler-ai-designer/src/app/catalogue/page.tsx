import type { Metadata } from "next";
import CataloguePageClient from "@/components/catalogue/CataloguePageClient";

export const metadata: Metadata = {
  title: "KOHLER 3D Product Catalogue | Authentic Architectural Bathroom Fixtures",
  description:
    "Explore authentic KOHLER India bathroom products with certified dimensions, real list pricing, and 229 normalized 3D models for spatial bathroom architecture.",
};

export default function CataloguePage() {
  return <CataloguePageClient />;
}
