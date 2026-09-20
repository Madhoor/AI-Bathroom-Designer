import type { UserDesignInput } from "../design/generateDesign";
import type { DesignState } from "../design/types";
import type { DesignChangeDelta, DesignChangeProductSummary, DesignCommand } from "./types";

export function computeModifiedBrief(
  command: DesignCommand,
  currentInput: UserDesignInput,
): UserDesignInput {
  // 1. Compute modified budget
  let newBudget = currentInput.budget;
  if (command.modifications.budgetAbsolute) {
    newBudget = command.modifications.budgetAbsolute;
  } else if (command.modifications.budgetDelta) {
    newBudget = Math.max(200000, currentInput.budget + command.modifications.budgetDelta);
  }

  // 2. Compute modified dimensions
  let newWidthM = currentInput.room.widthM;
  let newDepthM = currentInput.room.depthM;
  let newHeightM = currentInput.room.heightM;

  if (command.modifications.roomDimensionsFt) {
    if (command.modifications.roomDimensionsFt.widthFt) {
      newWidthM = command.modifications.roomDimensionsFt.widthFt * 0.3048;
    }
    if (command.modifications.roomDimensionsFt.depthFt) {
      newDepthM = command.modifications.roomDimensionsFt.depthFt * 0.3048;
    }
    if (command.modifications.roomDimensionsFt.heightFt) {
      newHeightM = command.modifications.roomDimensionsFt.heightFt * 0.3048;
    }
  }

  // 3. Compute modified style
  const newStyle = command.modifications.style ?? currentInput.desiredStyle;

  // 4. Compute modified roles
  const currentRoles = currentInput.requiredRoles ?? ["toilet", "basin", "rainhead"];
  let updatedRoles = [...currentRoles];

  if (command.modifications.addZones) {
    for (const z of command.modifications.addZones) {
      if (!updatedRoles.includes(z)) updatedRoles.push(z);
    }
  }
  if (command.modifications.removeZones) {
    updatedRoles = updatedRoles.filter((z) => !command.modifications.removeZones?.includes(z));
  }

  return {
    room: {
      widthM: Number(newWidthM.toFixed(4)),
      depthM: Number(newDepthM.toFixed(4)),
      heightM: Number(newHeightM.toFixed(4)),
      doors: currentInput.room.doors ?? [],
      windows: currentInput.room.windows ?? [],
    },
    budget: newBudget,
    currency: currentInput.currency ?? "INR",
    desiredStyle: newStyle,
    requiredRoles: updatedRoles,
    optionalRoles: currentInput.optionalRoles,
  };
}

export function computeDesignDelta(
  previousState: DesignState,
  newState: DesignState,
  commandText: string,
): DesignChangeDelta {
  const previousCodes = new Set(previousState.selectedProducts.map((p) => p.productCode));
  const newCodes = new Set(newState.selectedProducts.map((p) => p.productCode));

  const addedProducts: DesignChangeProductSummary[] = newState.selectedProducts
    .filter((p) => !previousCodes.has(p.productCode))
    .map((p) => ({ productCode: p.productCode, productName: p.productName, price: p.currentPrice ?? p.listPrice }));

  const removedProducts: DesignChangeProductSummary[] = previousState.selectedProducts
    .filter((p) => !newCodes.has(p.productCode))
    .map((p) => ({ productCode: p.productCode, productName: p.productName, price: p.currentPrice ?? p.listPrice }));

  const retainedProducts: DesignChangeProductSummary[] = newState.selectedProducts
    .filter((p) => previousCodes.has(p.productCode))
    .map((p) => ({ productCode: p.productCode, productName: p.productName, price: p.currentPrice ?? p.listPrice }));

  const costDifference = newState.totalProductCost - previousState.totalProductCost;

  let summary = `Modified design according to "${commandText}". `;
  if (costDifference !== 0) {
    const diffFormatted = Math.abs(costDifference).toLocaleString("en-IN");
    summary += costDifference < 0
      ? `Reduced total investment by ₹${diffFormatted}. `
      : `Increased total investment by ₹${diffFormatted}. `;
  }
  if (addedProducts.length > 0) {
    summary += `Added: ${addedProducts.map((p) => p.productCode).join(", ")}. `;
  }
  if (removedProducts.length > 0) {
    summary += `Replaced: ${removedProducts.map((p) => p.productCode).join(", ")}. `;
  }

  return {
    previousCost: previousState.totalProductCost,
    newCost: newState.totalProductCost,
    costDifference,
    addedProducts,
    removedProducts,
    retainedProducts,
    newWarnings: newState.warnings,
    summary,
  };
}
