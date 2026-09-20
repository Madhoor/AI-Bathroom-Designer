import type { RecommendationAssembly, RecommendationCatalog, RecommendationProduct } from "./types";

export interface ResolvedSelection {
  products: RecommendationProduct[];
  assemblies: RecommendationAssembly[];
  warnings: string[];
  complete: boolean;
}

function assemblyFor(product: RecommendationProduct, catalog: RecommendationCatalog): RecommendationAssembly | undefined {
  return catalog.assemblies?.find((assembly) => assembly.productCode === product.productCode);
}

export function isHostDependent(product: RecommendationProduct, catalog: RecommendationCatalog): boolean {
  const assembly = assemblyFor(product, catalog);
  return product.metadata?.requiresHostProduct === true
    || ["counter", "basin", "vanity"].includes(assembly?.installationSurface ?? "");
}

export function hasAvailableHost(product: RecommendationProduct, catalog: RecommendationCatalog): boolean {
  const hostRoles = product.metadata?.hostRoles ?? [];
  if (hostRoles.length > 0 && catalog.products.some((candidate) => candidate.productCode !== product.productCode
    && hostRoles.some((role) => candidate.metadata?.role.includes(role)))) return true;

  return catalog.relations?.some((relation) => relation.sourceProductCode === product.productCode
    && relation.relationType === "requires"
    && relation.resolutionStatus === "resolved"
    && Boolean(relation.targetProductCode)
    && catalog.products.some((candidate) => candidate.productCode === relation.targetProductCode)) ?? false;
}

export function hasCompleteAssembly(product: RecommendationProduct, catalog: RecommendationCatalog): boolean {
  const assembly = assemblyFor(product, catalog);
  if (!assembly) return false;
  return assembly.components
    .filter((component) => component.required)
    .every((component) => component.referenceResolved
      && Boolean(component.productCode)
      && catalog.products.some((candidate) => candidate.productCode === component.productCode));
}

export function resolveSelection(selection: RecommendationProduct[], catalog: RecommendationCatalog): ResolvedSelection {
  const selected = new Map(selection.map((product) => [product.productCode, product]));
  const assemblies: RecommendationAssembly[] = [];
  const warnings: string[] = [];
  let complete = true;

  selection.forEach((product) => {
    const assembly = assemblyFor(product, catalog);
    if (assembly) {
      assemblies.push(assembly);
      assembly.components.filter((component) => component.required).forEach((component) => {
        if (component.referenceResolved && component.productCode) {
          const requiredProduct = catalog.products.find((item) => item.productCode === component.productCode);
          if (requiredProduct) selected.set(requiredProduct.productCode, requiredProduct);
          else {
            complete = false;
            warnings.push(`${product.productCode} requires missing catalogue component ${component.productCode}.`);
          }
        } else {
          complete = false;
          warnings.push(`${product.productCode} has an unresolved required component; it was not guessed.`);
        }
      });
    }
    catalog.relations?.filter((relation) => relation.sourceProductCode === product.productCode && relation.relationType === "requires")
      .forEach((relation) => {
        if (relation.resolutionStatus !== "resolved" || !relation.targetProductCode) {
          complete = false;
          warnings.push(`${product.productCode} has an unresolved required relation; compatibility was not assumed.`);
        }
      });
  });
  return { products: [...selected.values()].sort((a, b) => a.productCode.localeCompare(b.productCode)), assemblies, warnings, complete };
}
