import { NextResponse } from "next/server";
import { getBaselineDesignState, type UserDesignInput } from "@/lib/design/generateDesign";
import { generateDesignVariants } from "@/lib/design/generateVariants";
import { createDesignPresentation } from "@/lib/design/presentation";

export async function GET() {
  const state = await getBaselineDesignState();
  const presentation = createDesignPresentation(state, {
    title: "Design A: Luxury Modern Suite",
    subtitle: "Baseline verified KOHLER layout",
    styleName: state.style ?? "Luxury Modern",
  });
  return NextResponse.json({
    success: true,
    state,
    presentation,
    variants: [
      {
        id: "design-a",
        label: "Design A",
        conceptTag: "Editor's Choice",
        state,
        presentation,
      },
    ],
    selectedIndex: 0,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<UserDesignInput>;

    const room = body.room ?? {
      widthM: 8 * 0.3048,
      depthM: 6 * 0.3048,
      heightM: 9 * 0.3048,
      doors: [],
      windows: [],
    };

    const input: UserDesignInput = {
      room,
      budget: Number(body.budget) || 500000,
      currency: body.currency ?? "INR",
      desiredStyle: body.desiredStyle ?? "Luxury Modern",
      requiredRoles: body.requiredRoles,
      optionalRoles: body.optionalRoles,
    };

    const result = await generateDesignVariants(input);

    if (result.success) {
      const activeVariant = result.variants[result.selectedIndex] ?? result.variants[0];
      return NextResponse.json({
        success: true,
        variants: result.variants,
        selectedIndex: result.selectedIndex,
        state: activeVariant.state,
        presentation: activeVariant.presentation,
      });
    }

    return NextResponse.json(
      {
        success: false,
        reason: result.reason,
        rejections: result.rejections,
        suggestions: result.suggestions,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        reason: error instanceof Error ? error.message : "Design generation failed",
        suggestions: ["Please try adjusting your budget or room dimensions."],
      },
      { status: 200 },
    );
  }
}
