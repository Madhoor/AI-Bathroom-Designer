"use client";

import React, { useMemo, useState } from "react";
import type { UserDesignInput } from "@/lib/design/generateDesign";
import { parseNaturalLanguageBrief } from "@/lib/templates/naturalLanguageParser";
import type { BathroomTemplate } from "@/lib/templates/types";
import { TemplateSelector } from "./TemplateSelector";

interface DesignBriefSectionProps {
  onSubmit: (brief: UserDesignInput, templateId: string) => void;
  isSubmitting?: boolean;
  initialTemplateId?: string;
  initialBudget?: number;
  initialDimensionsFt?: { widthFt: number; depthFt: number; heightFt: number };
  initialStyle?: string;
  initialZones?: string[];
  initialPrompt?: string;
}

const STYLES = [
  { id: "Luxury Modern", name: "Luxury Modern", desc: "Monolithic stone, fluted textures, integrated lighting" },
  { id: "Minimal", name: "Minimal", desc: "Pared-down lines, hidden drainage, pure architectural geometry" },
  { id: "Modern", name: "Modern", desc: "Clean surfaces, balanced contrast, ergonomic focus" },
  { id: "Classic", name: "Classic", desc: "Timeless proportions, rich chrome hardware, understated elegance" },
  { id: "Zen", name: "Zen", desc: "Organic warmth, matte finishes, calm spa-like atmosphere" },
];

const FIXTURES = [
  { id: "toilet", label: "Toilet", role: "toilet", required: true },
  { id: "vanity", label: "Vanity & Basin", role: "basin", required: true },
  { id: "shower", label: "Rain Shower", role: "rainhead", required: true },
  { id: "bath", label: "Bathtub", role: "bath", required: false },
];

const BUDGET_PRESETS = [
  { label: "₹3,50,000", value: 350000 },
  { label: "₹5,00,000", value: 500000 },
  { label: "₹7,50,000", value: 750000 },
  { label: "₹10,00,000", value: 1000000 },
  { label: "₹12,50,000", value: 1250000 },
];

export default function DesignBriefSection({
  onSubmit,
  isSubmitting = false,
  initialTemplateId = "compact-modern",
  initialBudget = 500000,
  initialDimensionsFt = { widthFt: 8, depthFt: 6, heightFt: 9 },
  initialStyle = "Luxury Modern",
  initialZones = ["toilet", "vanity", "shower"],
  initialPrompt = "8 x 6 ft bathroom, ₹5 lakh budget, luxury modern, toilet, vanity and shower",
}: DesignBriefSectionProps) {
  // Selected Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);

  // Unit mode: 'ft' | 'm'
  const [unit, setUnit] = useState<"ft" | "m">("ft");

  // Dimensions in feet
  const [widthFt, setWidthFt] = useState(initialDimensionsFt.widthFt);
  const [depthFt, setDepthFt] = useState(initialDimensionsFt.depthFt);
  const [heightFt, setHeightFt] = useState(initialDimensionsFt.heightFt);

  // Dimensions in metres
  const [widthM, setWidthM] = useState(Number((initialDimensionsFt.widthFt * 0.3048).toFixed(2)));
  const [depthM, setDepthM] = useState(Number((initialDimensionsFt.depthFt * 0.3048).toFixed(2)));
  const [heightM, setHeightM] = useState(Number((initialDimensionsFt.heightFt * 0.3048).toFixed(2)));

  // Budget
  const [budget, setBudget] = useState(initialBudget);

  // Style
  const [selectedStyle, setSelectedStyle] = useState(initialStyle);

  // Selected Fixtures
  const [selectedFixtures, setSelectedFixtures] = useState<string[]>(initialZones);

  // Natural Language brief
  const [naturalLanguage, setNaturalLanguage] = useState(initialPrompt);

  // Preferred Product from 3D Catalogue
  const [preferredFixture, setPreferredFixture] = useState<{
    productCode: string;
    productName: string;
    category: string;
    price?: number;
    finish?: string;
  } | null>(null);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryCode = params.get("preferredProduct");
      const stored = localStorage.getItem("kohler_preferred_product");
      if (stored) {
        let parsed: {
          productCode: string;
          productName: string;
          category: string;
          price?: number;
          finish?: string;
        } | null = null;
        try {
          parsed = JSON.parse(stored);
        } catch {
          parsed = {
            productCode: stored,
            productName: `KOHLER ${stored}`,
            category: "Sanitary Fixture",
          };
        }
        if (typeof parsed === "string") {
          parsed = {
            productCode: parsed,
            productName: `KOHLER ${parsed}`,
            category: "Sanitary Fixture",
          };
        }
        if (parsed && (!queryCode || queryCode === parsed.productCode)) {
          setPreferredFixture(parsed);
          if (parsed.category?.toLowerCase().includes("bath") || parsed.category?.toLowerCase().includes("tub")) {
            setSelectedFixtures((prev) => (prev.includes("bath") ? prev : [...prev, "bath"]));
          }
        }
      } else if (queryCode) {
        setPreferredFixture({
          productCode: queryCode,
          productName: `KOHLER ${queryCode}`,
          category: "Selected Fixture",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const handleClearPreferred = () => {
    try {
      localStorage.removeItem("kohler_preferred_product");
      setPreferredFixture(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("preferredProduct");
      window.history.replaceState({}, "", url.pathname + url.search);
    } catch {
      // ignore
    }
  };

  // Live NLP parsed inspection
  const parsedNlp = useMemo(() => {
    if (!naturalLanguage.trim()) return null;
    return parseNaturalLanguageBrief(naturalLanguage);
  }, [naturalLanguage]);

  const toggleUnit = (newUnit: "ft" | "m") => {
    if (newUnit === unit) return;
    if (newUnit === "m") {
      setWidthM(Number((widthFt * 0.3048).toFixed(2)));
      setDepthM(Number((depthFt * 0.3048).toFixed(2)));
      setHeightM(Number((heightFt * 0.3048).toFixed(2)));
    } else {
      setWidthFt(Number((widthM / 0.3048).toFixed(1)));
      setDepthFt(Number((depthM / 0.3048).toFixed(1)));
      setHeightFt(Number((heightM / 0.3048).toFixed(1)));
    }
    setUnit(newUnit);
  };

  const handleSelectTemplate = (template: BathroomTemplate) => {
    setSelectedTemplateId(template.id);
    if (template.id !== "scratch") {
      const w = template.roomDefaults.widthFt;
      const d = template.roomDefaults.depthFt;
      const h = template.roomDefaults.heightFt;
      setWidthFt(w);
      setDepthFt(d);
      setHeightFt(h);
      setWidthM(Number((w * 0.3048).toFixed(2)));
      setDepthM(Number((d * 0.3048).toFixed(2)));
      setHeightM(Number((h * 0.3048).toFixed(2)));

      const targetBudget = Math.round((template.budgetRange.min + template.budgetRange.max) / 2 / 25000) * 25000;
      setBudget(targetBudget);
      setSelectedStyle(template.style);

      const mappedFixtures = template.recommendedZones.map((z) => (z === "rainhead" ? "shower" : z));
      setSelectedFixtures(mappedFixtures);

      setNaturalLanguage(
        `${w} x ${d} ft ${template.style.toLowerCase()} bathroom based on ${template.name}, budget ₹${(targetBudget / 100000).toFixed(1)}L with ${mappedFixtures.join(", ")}`,
      );
    }
  };

  const handleApplyNlp = () => {
    if (!parsedNlp) return;
    if (parsedNlp.widthFt && parsedNlp.depthFt) {
      setWidthFt(parsedNlp.widthFt);
      setDepthFt(parsedNlp.depthFt);
      setWidthM(Number((parsedNlp.widthFt * 0.3048).toFixed(2)));
      setDepthM(Number((parsedNlp.depthFt * 0.3048).toFixed(2)));
    }
    if (parsedNlp.budget) {
      setBudget(parsedNlp.budget);
    }
    if (parsedNlp.style) {
      setSelectedStyle(parsedNlp.style);
    }
    if (parsedNlp.zones && parsedNlp.zones.length > 0) {
      const newFixtures: string[] = [];
      for (const z of parsedNlp.zones) {
        if (z === "toilet" && !newFixtures.includes("toilet")) newFixtures.push("toilet");
        if (z === "basin" && !newFixtures.includes("vanity")) newFixtures.push("vanity");
        if (z === "rainhead" && !newFixtures.includes("shower")) newFixtures.push("shower");
        if (z === "bath" && !newFixtures.includes("bath")) newFixtures.push("bath");
      }
      if (newFixtures.length > 0) {
        setSelectedFixtures(newFixtures);
      }
    }
  };

  const handleToggleFixture = (id: string) => {
    if (selectedFixtures.includes(id)) {
      if (selectedFixtures.length > 1) {
        setSelectedFixtures(selectedFixtures.filter((f) => f !== id));
      }
    } else {
      setSelectedFixtures([...selectedFixtures, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const actualWidthM = unit === "ft" ? widthFt * 0.3048 : widthM;
    const actualDepthM = unit === "ft" ? depthFt * 0.3048 : depthM;
    const actualHeightM = unit === "ft" ? heightFt * 0.3048 : heightM;

    const requiredRoles: string[] = [];
    const optionalRoles: string[] = [];

    for (const fixtureId of selectedFixtures) {
      const match = FIXTURES.find((f) => f.id === fixtureId);
      if (match) {
        requiredRoles.push(match.role);
        if (fixtureId === "vanity") {
          optionalRoles.push("vanity");
        }
      }
    }

    const payload: UserDesignInput = {
      room: {
        widthM: Number(actualWidthM.toFixed(4)),
        depthM: Number(actualDepthM.toFixed(4)),
        heightM: Number(actualHeightM.toFixed(4)),
        doors: [],
        windows: [],
      },
      budget,
      currency: "INR",
      desiredStyle: selectedStyle,
      requiredRoles,
      optionalRoles,
    };

    onSubmit(payload, selectedTemplateId);
  };

  const currentAreaSqFt = unit === "ft" ? (widthFt * depthFt).toFixed(1) : (widthM * depthM * 10.7639).toFixed(1);

  return (
    <section id="design-brief" className="w-full bg-neutral-900 px-6 py-20 text-white md:px-16 lg:px-24">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="mb-12 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
            Phase 1 • Spatial &amp; Architectural Brief
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl md:text-5xl text-stone-100">
            Tailor your architectural brief.
          </h2>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-stone-400 sm:text-base">
            Select a verified architectural foundation or define your custom envelope. Every combination is evaluated deterministically against real KOHLER dimensions and clearances.
          </p>
        </div>

        {/* Preferred Fixture Banner (from 3D Catalogue) */}
        {preferredFixture && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#c49a45]/40 bg-gradient-to-r from-[#c49a45]/15 via-stone-900/90 to-stone-900/60 p-5 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c49a45]/20 border border-[#c49a45]/40 text-[#c49a45]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#c49a45]">
                    Fixture Selected from 3D Catalogue
                  </span>
                  <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-stone-300">
                    {preferredFixture.productCode}
                  </span>
                </div>
                <h4 className="font-serif text-base text-white">
                  {preferredFixture.productName}
                </h4>
                <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                  <span>{preferredFixture.category}</span>
                  {preferredFixture.finish && <span>• {preferredFixture.finish}</span>}
                  {preferredFixture.price && (
                    <span className="text-amber-200 font-medium">₹{preferredFixture.price.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setNaturalLanguage((prev) => `${prev ? `${prev}, ` : ""}featuring ${preferredFixture.productName} (${preferredFixture.productCode})`);
                }}
                className="cursor-pointer rounded-lg bg-[#c49a45]/20 hover:bg-[#c49a45]/30 border border-[#c49a45]/40 px-3 py-1.5 text-xs text-[#f0d8a8] transition-colors"
              >
                + Add to Brief Prompt
              </button>
              <button
                type="button"
                onClick={handleClearPreferred}
                className="cursor-pointer text-xs text-stone-500 hover:text-stone-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* 1. Template Selector */}
          <div className="rounded-2xl border border-stone-800 bg-[#161412] p-6 shadow-xl">
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleSelectTemplate}
              disabled={isSubmitting}
            />
          </div>

          {/* 2. Natural Language Brief & Parser */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="natural-brief" className="text-xs font-medium uppercase tracking-[0.16em] text-stone-300">
                Natural Language Brief
              </label>
              <span className="text-[11px] text-stone-500">Deterministic extraction engine</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="natural-brief"
                type="text"
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                placeholder="e.g. 8 x 6 ft bathroom, ₹5 lakh budget, luxury modern, shower and vanity"
                className="flex-1 rounded-xl border border-white/10 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:border-[#c49a45] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleApplyNlp}
                className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 uppercase tracking-wider transition-colors border border-stone-700 shrink-0"
              >
                Apply to Controls
              </button>
            </div>

            {/* Extracted Entities Live Pills */}
            {parsedNlp && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] uppercase tracking-wider text-stone-500">Detected:</span>
                {parsedNlp.widthFt && parsedNlp.depthFt ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-amber-200 border border-amber-400/30 text-[11px] font-mono">
                    {parsedNlp.widthFt}&apos; × {parsedNlp.depthFt}&apos;
                  </span>
                ) : (
                  <span className="text-[11px] text-stone-500 italic">no dims</span>
                )}
                {parsedNlp.budget ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-emerald-200 border border-emerald-400/30 text-[11px] font-mono">
                    ₹{(parsedNlp.budget / 100000).toFixed(1)}L
                  </span>
                ) : null}
                {parsedNlp.style ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-purple-200 border border-purple-400/30 text-[11px]">
                    {parsedNlp.style}
                  </span>
                ) : null}
                {parsedNlp.zones && parsedNlp.zones.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-sky-200 border border-sky-400/30 text-[11px]">
                    {parsedNlp.zones.join(" + ")}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* 3. Room Dimensions */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-medium tracking-wide text-neutral-200">
                  Step 2: Calibrate Dimensions
                </h3>
                <p className="text-xs text-neutral-500">
                  Total Floor Area: <span className="font-medium text-white">{currentAreaSqFt} sq ft</span>
                </p>
              </div>

              {/* Unit Toggle */}
              <div className="inline-flex rounded-full border border-white/10 bg-neutral-950 p-1">
                <button
                  type="button"
                  onClick={() => toggleUnit("ft")}
                  className={`cursor-pointer rounded-full px-4 py-1 text-xs font-medium transition-all ${
                    unit === "ft" ? "bg-white text-neutral-950" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Feet (ft)
                </button>
                <button
                  type="button"
                  onClick={() => toggleUnit("m")}
                  className={`cursor-pointer rounded-full px-4 py-1 text-xs font-medium transition-all ${
                    unit === "m" ? "bg-white text-neutral-950" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Metres (m)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Width */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-5">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Width ({unit})
                </label>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-serif text-3xl font-light text-white">
                    {unit === "ft" ? widthFt.toFixed(1) : widthM.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-500">{unit === "ft" ? "ft" : "m"}</span>
                </div>
                <input
                  type="range"
                  min={unit === "ft" ? 5 : 1.5}
                  max={unit === "ft" ? 16 : 4.8}
                  step={unit === "ft" ? 0.5 : 0.1}
                  value={unit === "ft" ? widthFt : widthM}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (unit === "ft") {
                      setWidthFt(val);
                      setWidthM(Number((val * 0.3048).toFixed(2)));
                    } else {
                      setWidthM(val);
                      setWidthFt(Number((val / 0.3048).toFixed(1)));
                    }
                  }}
                  className="mt-4 w-full accent-[#c49a45]"
                />
              </div>

              {/* Depth */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-5">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Depth ({unit})
                </label>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-serif text-3xl font-light text-white">
                    {unit === "ft" ? depthFt.toFixed(1) : depthM.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-500">{unit === "ft" ? "ft" : "m"}</span>
                </div>
                <input
                  type="range"
                  min={unit === "ft" ? 4 : 1.2}
                  max={unit === "ft" ? 14 : 4.2}
                  step={unit === "ft" ? 0.5 : 0.1}
                  value={unit === "ft" ? depthFt : depthM}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (unit === "ft") {
                      setDepthFt(val);
                      setDepthM(Number((val * 0.3048).toFixed(2)));
                    } else {
                      setDepthM(val);
                      setDepthFt(Number((val / 0.3048).toFixed(1)));
                    }
                  }}
                  className="mt-4 w-full accent-[#c49a45]"
                />
              </div>

              {/* Height */}
              <div className="rounded-2xl border border-white/10 bg-neutral-950/50 p-5">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Ceiling Height ({unit})
                </label>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-serif text-3xl font-light text-white">
                    {unit === "ft" ? heightFt.toFixed(1) : heightM.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-500">{unit === "ft" ? "ft" : "m"}</span>
                </div>
                <input
                  type="range"
                  min={unit === "ft" ? 7 : 2.1}
                  max={unit === "ft" ? 12 : 3.6}
                  step={unit === "ft" ? 0.5 : 0.1}
                  value={unit === "ft" ? heightFt : heightM}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (unit === "ft") {
                      setHeightFt(val);
                      setHeightM(Number((val * 0.3048).toFixed(2)));
                    } else {
                      setHeightM(val);
                      setHeightFt(Number((val / 0.3048).toFixed(1)));
                    }
                  }}
                  className="mt-4 w-full accent-[#c49a45]"
                />
              </div>
            </div>
          </div>

          {/* 4. Fixture Budget */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-medium tracking-wide text-neutral-200">
                  Step 3: Fixture Budget
                </h3>
                <p className="text-xs text-neutral-500">Allocated for authentic KOHLER sanitaryware &amp; brassware</p>
              </div>
              <span className="font-serif text-2xl font-light text-[#c49a45]">
                ₹{budget.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-3">
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setBudget(preset.value)}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                    budget === preset.value
                      ? "border-[#c49a45] bg-[#c49a45]/15 text-[#f0d8a8]"
                      : "border-white/10 bg-neutral-950 text-neutral-400 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={200000}
              max={1500000}
              step={25000}
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value, 10))}
              className="w-full accent-[#c49a45]"
            />
          </div>

          {/* 5. Style Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium tracking-wide text-neutral-200">
                Step 4: Architectural Style
              </h3>
              <p className="text-xs text-neutral-500">Governs material continuity, fixture forms, and architectural lighting</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id)}
                  className={`cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                    selectedStyle === style.id
                      ? "border-[#c49a45] bg-[#c49a45]/10 shadow-lg shadow-black/40 ring-1 ring-[#c49a45]/30"
                      : "border-white/10 bg-neutral-950/60 hover:border-white/20 hover:bg-neutral-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg text-white">{style.name}</span>
                    {selectedStyle === style.id && (
                      <span className="h-2 w-2 rounded-full bg-[#c49a45]" />
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Required Fixtures */}
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium tracking-wide text-neutral-200">
                Step 5: Required Fixture Zones
              </h3>
              <p className="text-xs text-neutral-500">Select the necessary sanitary fixture zones</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {FIXTURES.map((fixture) => {
                const active = selectedFixtures.includes(fixture.id);
                return (
                  <button
                    key={fixture.id}
                    type="button"
                    onClick={() => handleToggleFixture(fixture.id)}
                    className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-[#c49a45]/80 bg-[#c49a45]/10 text-white"
                        : "border-white/10 bg-neutral-950/40 text-neutral-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{fixture.label}</span>
                      <span
                        className={`h-3.5 w-3.5 rounded-full border ${
                          active ? "border-[#c49a45] bg-[#c49a45]" : "border-white/20"
                        }`}
                      />
                    </div>
                    <span className="mt-4 text-[10px] uppercase tracking-wider text-neutral-500">
                      {fixture.required ? "Essential" : "Optional"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#c49a45] hover:bg-[#b0873a] px-8 py-5 text-xs font-semibold uppercase tracking-[0.24em] text-black shadow-2xl transition-all duration-300 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Validating CAD &amp; Generating Variants...</span>
              ) : (
                <>
                  <span>Generate Architectural Suite</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
