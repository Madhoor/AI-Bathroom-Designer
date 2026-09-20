"""Build factual KOHLER product relations and assembly records.

Only explicit relationship fields are emitted as product relations. Component
references that are not normalized product codes remain visible as unresolved
references; they are never guessed or silently mapped.
"""

from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "data" / "master"
PRODUCTS = MASTER / "kohler_products_normalized.csv"
RELATIONS = MASTER / "kohler_product_relations.csv"
ASSEMBLIES = MASTER / "kohler_assemblies.csv"
VALIDATION = MASTER / "kohler_relation_validation.csv"

RELATION_FIELDS = [
    "source_product_code",
    "target_product_code",
    "relation_type",
    "source",
    "confidence",
    "target_resolved",
    "notes",
]
ASSEMBLY_FIELDS = [
    "assembly_id",
    "assembly_type",
    "role",
    "product_code",
    "required",
    "relation_source",
    "confidence",
    "installation_surface",
    "reference_resolved",
    "notes",
]
VALIDATION_FIELDS = ["check", "count", "severity", "notes"]

NONE_VALUES = {"", "none", "null", "nan", "n/a"}
CODE_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9-]*$", re.I)


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def split_references(value: str | None) -> list[str]:
    text = clean(value)
    if text.lower() in NONE_VALUES:
        return []
    return [part for part in re.split(r"\s*;\s*|\s*\|\s*|\s*,\s*", text) if part]


def classify(row: dict[str, str]) -> tuple[str | None, str | None]:
    category = clean(row.get("category")).lower()
    subcategory = clean(row.get("subcategory")).lower()
    name = clean(row.get("product_name")).lower()
    text = f"{subcategory}; {name}"

    if "toilet" in category or "toilet" in text:
        if "seat" in text or "bidet" in text:
            return "TOILET", "bidet_seat" if "bidet" in text else "toilet_seat"
        return "TOILET", "toilet_bowl"
    if "shower" in category or "shower" in text or "rainhead" in text:
        if "door" in text:
            return "SHOWER_DOOR", "shower_door"
        if "hand shower" in text:
            return "SHOWER", "hand_shower"
        if "rainhead" in text or "rain head" in text:
            return "SHOWER", "rainhead"
        if "showerhead" in text or "shower head" in text:
            return "SHOWER", "showerhead"
        if "arm" in text:
            return "SHOWER", "shower_arm"
        if "valve" in text or "diverter" in text:
            return "SHOWER", "diverter" if "diverter" in text else "shower_valve"
        return "SHOWER", "showerhead"
    if "wellness" in category or "bath" in text:
        if "faucet" in text or "filler" in text:
            return "FAUCET", "bath_filler"
        if "drain" in text:
            return "BATHTUB", "bath_drain"
        return "BATHTUB", "bathtub"
    if "basin" in category or "sink" in text or "washbasin" in text:
        if "faucet" in text or "tap" in text:
            return "FAUCET", "basin_faucet"
        if "drain" in text:
            return "BASIN", "basin_drain"
        return "BASIN", "basin"
    if "vanity" in text:
        return "VANITY", "vanity"
    if "mirror" in text:
        return "MIRROR", "mirror"
    return None, None


def installation_surface(row: dict[str, str]) -> str:
    text = f"{clean(row.get('installation_type'))}; {clean(row.get('product_name'))}".lower()
    if "ceiling" in text:
        return "ceiling"
    if "wall-mount" in text or "wall mount" in text:
        return "wall_mount"
    if "deck-mount" in text or "deck mount" in text:
        return "deck_mount"
    if "floor-mount" in text or "floor mount" in text:
        return "floor"
    if "counter" in text:
        return "counter"
    if "freestanding" in text:
        return "freestanding"
    if "inside shower" in text:
        return "inside_shower"
    return ""


def main() -> None:
    with PRODUCTS.open(newline="", encoding="utf-8-sig") as handle:
        products = list(csv.DictReader(handle))
    product_codes = {clean(row.get("product_code")) for row in products if clean(row.get("product_code"))}

    relations: list[dict[str, str]] = []
    seen_relations: set[tuple[str, str, str]] = set()
    explicit_required_products = 0
    unresolved_required = 0

    def add_relation(source_code: str, target: str, relation_type: str, notes: str) -> None:
        nonlocal unresolved_required
        key = (source_code, target, relation_type)
        if key in seen_relations:
            return
        resolved = target in product_codes
        if not resolved:
            unresolved_required += relation_type == "requires"
        seen_relations.add(key)
        relations.append(
            {
                "source_product_code": source_code,
                "target_product_code": target,
                "relation_type": relation_type,
                "source": "kohler_api",
                "confidence": "1.0",
                "target_resolved": str(resolved).lower(),
                "notes": notes,
            }
        )

    for row in products:
        source_code = clean(row.get("product_code"))
        required = split_references(row.get("required_components"))
        if required:
            explicit_required_products += 1
        for target in required:
            add_relation(
                source_code,
                target,
                "requires",
                f"Explicit normalized required_components reference: {clean(row.get('required_components'))}",
            )
        for target in split_references(row.get("compatible_products")):
            add_relation(
                source_code,
                target,
                "compatible_with",
                f"Explicit normalized compatible_products reference: {clean(row.get('compatible_products'))}",
            )

    assemblies: list[dict[str, str]] = []
    assembly_component_counts: Counter[str] = Counter()
    products_with_roles = 0
    for row in products:
        code = clean(row.get("product_code"))
        assembly_type, role = classify(row)
        if not assembly_type or not role:
            continue
        products_with_roles += 1
        assembly_id = f"{assembly_type.lower()}:{code}"
        surface = installation_surface(row)
        assemblies.append(
            {
                "assembly_id": assembly_id,
                "assembly_type": assembly_type,
                "role": role,
                "product_code": code,
                "required": "true",
                "relation_source": "explicit_catalogue",
                "confidence": "1.0",
                "installation_surface": surface,
                "reference_resolved": "true",
                "notes": f"Role supported by category={clean(row.get('category'))}; subcategory={clean(row.get('subcategory'))}.",
            }
        )
        assembly_component_counts[assembly_id] += 1
        for target in split_references(row.get("required_components")):
            assemblies.append(
                {
                    "assembly_id": assembly_id,
                    "assembly_type": assembly_type,
                    "role": "required_component",
                    "product_code": target,
                    "required": "true",
                    "relation_source": "kohler_api",
                    "confidence": "1.0",
                    "installation_surface": "",
                    "reference_resolved": str(target in product_codes).lower(),
                    "notes": "Explicit required_components reference; unresolved references are retained without product mapping.",
                }
            )
            assembly_component_counts[assembly_id] += 1

    duplicate_relations = len(relations) - len(seen_relations)
    orphan_targets = sum(1 for row in relations if row["target_resolved"] == "false")
    self_relations = sum(1 for row in relations if row["source_product_code"] == row["target_product_code"])
    incomplete_assemblies = sum(1 for count in assembly_component_counts.values() if count < 2)
    validation = [
        ("explicit_relations", len(relations), "INFO", "Relations extracted from normalized explicit catalogue fields."),
        ("inferred_relations", 0, "INFO", "No inferred relations were generated."),
        ("resolved_target_products", len(relations) - orphan_targets, "INFO", "Target reference matches a normalized product code."),
        ("orphan_target_references", orphan_targets, "WARNING", "References such as inRiver_* have no normalized product-code mapping."),
        ("self_relations", self_relations, "WARNING" if self_relations else "INFO", "Relations whose source and target are identical."),
        ("duplicate_relations_removed", duplicate_relations, "INFO", "Duplicate source/target/type rows suppressed."),
        ("products_without_assembly_role", len(products) - products_with_roles, "WARNING", "No supported category/subcategory role mapping was claimed."),
        ("products_with_required_components", explicit_required_products, "INFO", "Products with explicit required_components values."),
        ("assemblies_created", len(assembly_component_counts), "INFO", "One assembly record created per role-supported product."),
        ("assemblies_with_incomplete_components", incomplete_assemblies, "WARNING", "Assembly has only its base product or no resolved component mapping."),
        ("unresolved_required_component_references", unresolved_required, "WARNING", "Explicit required references retained without invented product links."),
    ]

    for path, fields, rows in (
        (RELATIONS, RELATION_FIELDS, relations),
        (ASSEMBLIES, ASSEMBLY_FIELDS, assemblies),
        (VALIDATION, VALIDATION_FIELDS, [
            {"check": check, "count": str(count), "severity": severity, "notes": notes}
            for check, count, severity, notes in validation
        ]),
    ):
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

    print(f"products={len(products)}")
    print(f"relations={len(relations)}")
    print(f"assemblies={len(assembly_component_counts)}")
    print(f"assembly_components={len(assemblies)}")
    print("inferred_relations=0")
    print(f"unresolved_target_references={orphan_targets}")


if __name__ == "__main__":
    main()
