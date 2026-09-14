export type ProductCategory =
  | "bath"
  | "faucet"
  | "shower"
  | "toilet"
  | "lavatory"
  | "vanity"
  | "accessory"
  | "lighting"
  | "other";

export type DimensionUnit = "mm" | "cm" | "in";

export interface ProductDimensions {
  width: number;
  depth: number;
  height: number;
  unit: DimensionUnit;
}

export interface ProductFinish {
  name: string;
  code?: string;
}

export interface ProductCompatibility {
  compatibleProductCodes?: string[];
  compatibleCategories?: ProductCategory[];
  notes?: string;
}

export interface RequiredComponent {
  code: string;
  quantity?: number;
  role?: string;
}

export interface Product {
  code: string;
  name: string;
  brand?: string;
  model?: string;
  collection?: string;
  category: ProductCategory;
  price: number;
  currency: string;

  // Optional because the Price Book does not provide dimensions
  // for every catalogue item.
  dimensions?: ProductDimensions;

  styles: string[];
  finishes: ProductFinish[];

  compatibility?: ProductCompatibility;
  requiredComponents?: RequiredComponent[];

  modelPath?: string;
  imagePath?: string;
  description: string;
}

export const products: Product[] = [
  // ─────────────────────────────────────────────
  // TOILETS
  // ─────────────────────────────────────────────

  {
    code: "K-5401IN-0",
    name: "Veil Smart one-piece toilet",
    brand: "KOHLER",
    model: "Veil Smart",
    collection: "Veil",
    category: "toilet",
    price: 850000,
    currency: "INR",
    styles: ["luxury", "modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-1549469",
        role: "External pre-filter",
      },
    ],
    description:
      "Veil smart one-piece toilet with remote and Quiet-Close seat cover in white.",
  },

  {
    code: "K-28529IN-0",
    name: "Leap smart one-piece toilet",
    brand: "KOHLER",
    model: "Leap",
    collection: "Leap",
    category: "toilet",
    price: 470000,
    currency: "INR",
    styles: ["luxury", "modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    description:
      "Smart one-piece elongated toilet with remote and Quiet-Close seat cover in white.",
  },

  {
    code: "K-26998IN-0",
    name: "Vive wall-hung toilet",
    brand: "KOHLER",
    model: "Vive",
    collection: "Vive",
    category: "toilet",
    price: 29000,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-1527926",
        role: "Plastic outlet connector",
      },
    ],
    description:
      "True rimless wall-hung toilet with Quiet-Close UF slim seat cover in white.",
  },

  {
    code: "K-27791IN-0",
    name: "ModernLife Edge wall-hung toilet",
    brand: "KOHLER",
    model: "ModernLife Edge",
    collection: "ModernLife Edge",
    category: "toilet",
    price: 47000,
    currency: "INR",
    styles: ["modern", "minimal", "luxury"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-1527926",
        role: "Plastic outlet connector",
      },
    ],
    description:
      "True rimless wall-hung toilet with Quiet-Close UF seat cover in white.",
  },

  {
    code: "K-32409IN-0",
    name: "APT Square wall-hung toilet",
    brand: "KOHLER",
    model: "APT",
    collection: "APT",
    category: "toilet",
    price: 16500,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-1527926",
        role: "Plastic outlet connector",
      },
    ],
    description:
      "True rimless square wall-hung toilet with Quiet-Close UF seat cover in white.",
  },

  // ─────────────────────────────────────────────
  // LAVATORIES
  // ─────────────────────────────────────────────

  {
    code: "K-2241IN-1-0",
    name: "Memoirs rectangular self-rimming basin",
    brand: "KOHLER",
    model: "Memoirs",
    collection: "Memoirs",
    category: "lavatory",
    price: 15000,
    currency: "INR",
    dimensions: {
      width: 578,
      depth: 460,
      height: 0,
      unit: "mm",
    },
    styles: ["classic", "luxury"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-45432IN-CP",
        role: "Grid drain",
      },
    ],
    description:
      "578mm x 460mm rectangular self-rimming basin in white.",
  },

  {
    code: "K-2075IN-1-0",
    name: "Serif oval self-rimming basin",
    brand: "KOHLER",
    model: "Serif",
    collection: "Serif",
    category: "lavatory",
    price: 5600,
    currency: "INR",
    dimensions: {
      width: 564,
      depth: 414,
      height: 0,
      unit: "mm",
    },
    styles: ["modern", "classic"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-45432IN-CP",
        role: "Grid drain",
      },
    ],
    description:
      "564mm x 414mm oval self-rimming basin in white.",
  },

  {
    code: "K-2215IN-2-7",
    name: "Ladena rectangular undercounter basin",
    brand: "KOHLER",
    model: "Ladena",
    collection: "Ladena",
    category: "lavatory",
    price: 12500,
    currency: "INR",
    dimensions: {
      width: 581,
      depth: 402,
      height: 0,
      unit: "mm",
    },
    styles: ["modern", "minimal"],
    finishes: [{ name: "Black", code: "7" }],
    requiredComponents: [
      {
        code: "K-45432IN-CP",
        role: "Grid drain",
      },
    ],
    description:
      "581mm x 402mm rectangular undercounter basin in black.",
  },

  {
    code: "K-2215IN-2-0",
    name: "Ladena rectangular undercounter basin",
    brand: "KOHLER",
    model: "Ladena",
    collection: "Ladena",
    category: "lavatory",
    price: 10000,
    currency: "INR",
    dimensions: {
      width: 581,
      depth: 402,
      height: 0,
      unit: "mm",
    },
    styles: ["modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-45432IN-CP",
        role: "Grid drain",
      },
    ],
    description:
      "581mm x 402mm rectangular undercounter basin in white.",
  },

  {
    code: "K-2214IN-0",
    name: "Ladena rectangular undercounter basin",
    brand: "KOHLER",
    model: "Ladena",
    collection: "Ladena",
    category: "lavatory",
    price: 9500,
    currency: "INR",
    dimensions: {
      width: 529,
      depth: 367,
      height: 0,
      unit: "mm",
    },
    styles: ["modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-45432IN-CP",
        role: "Grid drain",
      },
    ],
    description:
      "529mm x 367mm rectangular undercounter basin in white.",
  },

  {
    code: "K-2883IN-0",
    name: "Verticyl round undercounter basin",
    brand: "KOHLER",
    model: "Verticyl",
    collection: "Verticyl",
    category: "lavatory",
    price: 9000,
    currency: "INR",
    dimensions: {
      width: 400,
      depth: 400,
      height: 0,
      unit: "mm",
    },
    styles: ["modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-45432IN-CP",
        role: "Grid drain",
      },
    ],
    description:
      "400mm round undercounter basin in white.",
  },

  // ─────────────────────────────────────────────
  // FAUCETS
  // ─────────────────────────────────────────────

  {
    code: "K-28514IN-ND-CP",
    name: "Evoke touchless tall basin mixer",
    brand: "KOHLER",
    model: "Evoke",
    collection: "Evoke",
    category: "faucet",
    price: 27000,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    description:
      "Touchless single-control tall basin mixer faucet without drain in polished chrome.",
  },

  {
    code: "K-28513IN-ND-CP",
    name: "Evoke touchless basin mixer",
    brand: "KOHLER",
    model: "Evoke",
    collection: "Evoke",
    category: "faucet",
    price: 20600,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    description:
      "Touchless single-control basin mixer faucet without drain in polished chrome.",
  },

  {
    code: "K-29937IN-CP",
    name: "Avid Duo touchless basin faucet",
    brand: "KOHLER",
    model: "Avid Duo",
    collection: "Avid",
    category: "faucet",
    price: 84900,
    currency: "INR",
    styles: ["luxury", "modern"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    description:
      "Touchless basin faucet mixer in polished chrome.",
  },

  {
    code: "K-8399IN-CP",
    name: "Oblo touchless basin faucet",
    brand: "KOHLER",
    model: "Oblo",
    collection: "Oblo",
    category: "faucet",
    price: 37150,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    description:
      "Touchless basin faucet, cold-only, in polished chrome.",
  },

  {
    code: "K-24270IN-ND-CP",
    name: "Oblo Duo sensor basin faucet",
    brand: "KOHLER",
    model: "Oblo Duo",
    collection: "Oblo",
    category: "faucet",
    price: 22950,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    description:
      "Duo sensor basin faucet in polished chrome.",
  },

  // ─────────────────────────────────────────────
  // SHOWERING
  // ─────────────────────────────────────────────

  {
    code: "K-26297IN-CP",
    name: "Statement oblong rainhead",
    brand: "KOHLER",
    model: "Statement",
    collection: "Statement",
    category: "shower",
    price: 75800,
    currency: "INR",
    styles: ["luxury", "modern"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    requiredComponents: [
      {
        code: "K-26324IN-CP",
        role: "Wall mount dual-flow shower arm",
      },
      {
        code: "K-26326T-CP",
        role: "Ceiling mount dual-flow arm",
      },
    ],
    description:
      "Oblong 453mm two-function rainhead in polished chrome.",
  },

  {
    code: "K-9302IN-CL-CP",
    name: "ModernLife Edge square rainhead",
    brand: "KOHLER",
    model: "ModernLife Edge",
    collection: "ModernLife Edge",
    category: "shower",
    price: 65100,
    currency: "INR",
    styles: ["modern", "minimal", "luxury"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    requiredComponents: [
      {
        code: "K-16347IN-CP",
        role: "Ceiling-mount shower arm",
      },
      {
        code: "K-11623IN-CP",
        role: "Ceiling-mount shower arm",
      },
      {
        code: "K-20137IN-CP",
        role: "Square ceiling arm",
      },
    ],
    description:
      "Square 330mm single-function rainhead in polished chrome.",
  },

  {
    code: "K-24470IN-CP",
    name: "ModernLife rectangle rainhead",
    brand: "KOHLER",
    model: "ModernLife",
    collection: "ModernLife",
    category: "shower",
    price: 42000,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    requiredComponents: [
      {
        code: "K-22308IN-CP",
        role: "Wall-mount multifunction shower arm",
      },
      {
        code: "K-22310IN-CP",
        role: "Ceiling-mount multifunction shower arm",
      },
    ],
    description:
      "Rectangle 330mm x 230mm two-function rainhead in polished chrome.",
  },

  {
    code: "K-73039IN-CL-BL",
    name: "Rain Duet Edge round rainhead",
    brand: "KOHLER",
    model: "Rain Duet Edge",
    collection: "Rain Duet Edge",
    category: "shower",
    price: 18900,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "Matte Black", code: "BL" }],
    description:
      "Round 254mm single-function Katalyst rainhead in matte black.",
  },

  // ─────────────────────────────────────────────
  // BATHS
  // ─────────────────────────────────────────────

  {
    code: "K-25164T-0",
    name: "Evok 2.0 rectangular freestanding bathtub",
    brand: "KOHLER",
    model: "Evok 2.0",
    collection: "Evok 2.0",
    category: "bath",
    price: 200000,
    currency: "INR",
    styles: ["luxury", "modern"],
    finishes: [{ name: "White", code: "0" }],
    description:
      "1.7M seamless rectangular freestanding bathtub in white.",
  },

  {
    code: "K-25165T-0",
    name: "Evok 2.0 oval freestanding bathtub",
    brand: "KOHLER",
    model: "Evok 2.0",
    collection: "Evok 2.0",
    category: "bath",
    price: 200000,
    currency: "INR",
    styles: ["luxury", "modern"],
    finishes: [{ name: "White", code: "0" }],
    description:
      "1.7M seamless oval freestanding bathtub in white.",
  },

  {
    code: "K-15848T-0",
    name: "Reach 1700mm drop-in acrylic bathtub",
    brand: "KOHLER",
    model: "Reach",
    collection: "Reach",
    category: "bath",
    price: 34000,
    currency: "INR",
    styles: ["modern", "minimal"],
    finishes: [{ name: "White", code: "0" }],
    requiredComponents: [
      {
        code: "K-17295T-CP",
        role: "Bath drain",
      },
    ],
    description:
      "1700mm drop-in acrylic bathtub in white.",
  },

  // ─────────────────────────────────────────────
  // ACCESSORIES / COMPONENTS
  // ─────────────────────────────────────────────

  {
    code: "K-17295T-CP",
    name: "Bath drain",
    brand: "KOHLER",
    model: "Bath Drain",
    category: "accessory",
    price: 13000,
    currency: "INR",
    styles: ["modern", "minimal", "luxury"],
    finishes: [{ name: "Polished Chrome", code: "CP" }],
    description: "Bath drain in polished chrome.",
  },

  {
    code: "K-97904T-NA",
    name: "Avid floor-mount bath filler mounting base",
    brand: "KOHLER",
    model: "Avid",
    collection: "Avid",
    category: "accessory",
    price: 22000,
    currency: "INR",
    styles: ["luxury", "modern"],
    finishes: [{ name: "NA", code: "NA" }],
    description:
      "Floor-mount bath filler mounting base required for the Avid floor-mount bath filler.",
  },
];