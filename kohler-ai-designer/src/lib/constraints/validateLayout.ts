import { distanceBetweenFootprints, footprintInsideRoom, footprintsIntersect, getDoorOpeningBounds, getDoorSwingBounds, getAxisAlignedBounds, boundsIntersect, getRotatedFootprint } from "./geometry";
import { findClearanceRule, GENERIC_DESIGN_CLEARANCE_RULES, getRequiredClearance } from "./clearance";
import type { BathroomRoom, ConstraintEngineOptions, ConstraintViolation, LayoutValidationResult, PlacedProduct } from "./types";

function violation(type: ConstraintViolation["type"], severity: ConstraintViolation["severity"], productCodes: string[], message: string): ConstraintViolation {
  return { type, severity, productCodes, message };
}

function effectiveMetadata(product: PlacedProduct, options: ConstraintEngineOptions) {
  const metadata = options.spatialMetadata?.find((item) => item.productCode === product.productCode);
  const attachmentRoles = options.attachmentRules
    ?.filter((rule) => rule.productCode === product.productCode)
    .map((rule) => rule.attachesToRole) ?? [];
  return {
    requiresHostProduct: product.requiresHostProduct ?? metadata?.requiresHostProduct ?? attachmentRoles.length > 0,
    hostRoles: product.hostRoles ?? metadata?.hostRoles ?? attachmentRoles,
  };
}

export function validateBathroomLayout(
  room: BathroomRoom,
  products: PlacedProduct[],
  options: ConstraintEngineOptions = {},
): LayoutValidationResult {
  const errors: ConstraintViolation[] = [];
  const warnings: ConstraintViolation[] = [];
  const rules = options.clearanceRules ?? GENERIC_DESIGN_CLEARANCE_RULES;
  const footprints = products.map((product) => getRotatedFootprint(product));

  products.forEach((product, index) => {
    const verticalBoundsValid = product.zM >= 0 && product.zM + product.heightM <= room.heightM;
    if (!footprintInsideRoom(footprints[index], room) || !verticalBoundsValid) {
      errors.push(violation("ROOM_BOUNDARY", "error", [product.productCode], `${product.productCode} extends outside the room boundary.`));
    }
  });

  for (let firstIndex = 0; firstIndex < products.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < products.length; secondIndex += 1) {
      const firstAllowsCollision = products[firstIndex].allowCollisionWithProductCodes?.includes(products[secondIndex].productCode);
      const secondAllowsCollision = products[secondIndex].allowCollisionWithProductCodes?.includes(products[firstIndex].productCode);
      if (firstAllowsCollision || secondAllowsCollision) continue;
      if (footprintsIntersect(footprints[firstIndex], footprints[secondIndex])) {
        errors.push(violation("PRODUCT_COLLISION", "error", [products[firstIndex].productCode, products[secondIndex].productCode], "Product footprints overlap."));
        continue;
      }
      const firstClearance = getRequiredClearance(findClearanceRule(products[firstIndex], rules));
      const secondClearance = getRequiredClearance(findClearanceRule(products[secondIndex], rules));
      const requiredClearance = Math.max(firstClearance, secondClearance);
      if (requiredClearance > 0 && distanceBetweenFootprints(footprints[firstIndex], footprints[secondIndex]) < requiredClearance) {
        warnings.push(violation("MINIMUM_CLEARANCE", "warning", [products[firstIndex].productCode, products[secondIndex].productCode], `Products are closer than the generic design clearance of ${requiredClearance.toFixed(2)} m.`));
      }
    }
  }

  room.doors.forEach((door) => {
    const opening = getDoorOpeningBounds(door, room);
    products.forEach((product, index) => {
      if (boundsIntersect(getAxisAlignedBounds(footprints[index]), opening)) {
        errors.push(violation("DOOR_CLEARANCE", "error", [product.productCode], `${product.productCode} blocks a usable door opening.`));
      }
      const swing = getDoorSwingBounds(door, room);
      if (swing && boundsIntersect(getAxisAlignedBounds(footprints[index]), swing)) {
        errors.push(violation("DOOR_CLEARANCE", "error", [product.productCode], `${product.productCode} blocks the inward door swing.`));
      }
    });
  });

  products.forEach((product, index) => {
    const metadata = effectiveMetadata(product, options);
    if (metadata.requiresHostProduct) {
      const hasHost = products.some((host) => host.productCode !== product.productCode
        && metadata.hostRoles.includes(host.role)
        && (!product.assemblyId || !host.assemblyId || product.assemblyId === host.assemblyId));
      if (!hasHost) {
        errors.push(violation("HOST_REQUIREMENT", "error", [product.productCode], `${product.productCode} requires a placed host product with role ${metadata.hostRoles.join(" or ") || "specified by catalogue metadata"}.`));
      }
    }
    const rule = findClearanceRule(product, rules);
    if (rule && getRequiredClearance(rule) === 0 && index >= 0) {
      warnings.push(violation("MINIMUM_CLEARANCE", "warning", [product.productCode], "A clearance rule exists but has no positive distance configured."));
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}
