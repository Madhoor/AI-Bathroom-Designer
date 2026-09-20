"""Resolve KOHLER inRiver component IDs from captured India PDP/API evidence.

The resolver never uses product-name similarity. It only accepts an exact
internal-ID -> SKU relationship found in captured PDP JSON and an exact SKU
present in the normalized product or variant catalogue.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "data" / "master"
DEBUG = ROOT / "data" / "_debug"
CACHE = MASTER / "kohler_product_id_resolution_cache.json"

PRODUCTS = MASTER / "kohler_products_normalized.csv"
VARIANTS = MASTER / "kohler_variants_normalized.csv"
RELATIONS = MASTER / "kohler_product_relations.csv"
ASSEMBLIES = MASTER / "kohler_assemblies.csv"
ID_MAP = MASTER / "kohler_product_id_map.csv"
RESOLVED_RELATIONS = MASTER / "kohler_product_relations_resolved.csv"
RESOLVED_ASSEMBLIES = MASTER / "kohler_assemblies_resolved.csv"
REPORT = MASTER / "kohler_relation_resolution_report.csv"

ID_FIELDS = ("productInRiverId_s", "sourceId_s")
SKU_FIELDS = ("CustomerFacingSKU_s", "sku_s", "masterSKU_s", "ProductProductNo_s")
ID_PATTERN = re.compile(r"^inRiver_\d+$", re.I)


def clean(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [clean(item) for item in value if clean(item)]
    return [clean(value)] if clean(value) else []


def sku_forms(value: str) -> set[str]:
    value = clean(value)
    if not value:
        return set()
    forms = {value}
    if value.upper().startswith("K-"):
        forms.add(value[2:])
    return forms


def collect_evidence(debug_dir: Path, cache_path: Path = CACHE) -> dict[str, dict[str, Any]]:
    evidence: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"ids": set(), "skus": set(), "names": set(), "files": set()}
    )
    paths = sorted(debug_dir.glob("*.json"))
    if cache_path.exists():
        paths.append(cache_path)
    for path in paths:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        def walk(value: Any) -> None:
            if isinstance(value, dict):
                ids = []
                for field in ID_FIELDS:
                    ids.extend(item for item in values(value.get(field)) if ID_PATTERN.match(item))
                candidates = []
                for field in SKU_FIELDS:
                    candidates.extend(values(value.get(field)))
                if ids:
                    for internal_id in ids:
                        entry = evidence[internal_id]
                        entry["ids"].add(internal_id)
                        entry["skus"].update(candidate for raw in candidates for candidate in sku_forms(raw))
                        name = clean(value.get("productName_s") or value.get("title_s"))
                        if name:
                            entry["names"].add(name)
                        entry["files"].add(path.name)
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)

        walk(payload)
    return evidence


def read_codes(path: Path, field: str) -> set[str]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {clean(row.get(field)) for row in csv.DictReader(handle) if clean(row.get(field))}


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_rows(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def resolve(
    evidence: dict[str, dict[str, Any]],
    product_codes: set[str],
    variant_codes: set[str],
) -> dict[str, dict[str, Any]]:
    known_codes = product_codes | variant_codes
    resolved: dict[str, dict[str, Any]] = {}
    for internal_id, item in evidence.items():
        matches = sorted(item["skus"] & known_codes)
        if len(matches) == 1:
            status = "resolved"
            code = matches[0]
            confidence = "1.0"
            notes = "Exact internal ID and SKU evidence from captured KOHLER India PDP/API JSON."
        elif len(matches) > 1:
            status = "ambiguous"
            code = ""
            confidence = "0.0"
            notes = f"Multiple exact normalized SKU matches: {'; '.join(matches)}."
        else:
            status = "unresolved"
            code = ""
            confidence = "0.0"
            notes = "Captured internal ID has no exact SKU match in normalized products or variants."
        resolved[internal_id] = {
            "product_code": code,
            "status": status,
            "confidence": confidence,
            "notes": notes,
            "names": sorted(item["names"]),
            "files": sorted(item["files"]),
            "candidates": sorted(item["skus"]),
        }
    return resolved


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--debug-dir",
        type=Path,
        default=DEBUG,
        help="Captured India PDP/API JSON directory (default: data/_debug).",
    )
    args = parser.parse_args()

    evidence = collect_evidence(args.debug_dir)
    product_codes = read_codes(PRODUCTS, "product_code")
    variant_codes = read_codes(VARIANTS, "sku")
    resolved = resolve(evidence, product_codes, variant_codes)

    id_rows = []
    for internal_id in sorted(resolved):
        item = resolved[internal_id]
        id_rows.append(
            {
                "internal_id": internal_id,
                "product_code": item["product_code"],
                "product_name": " | ".join(item["names"]),
                "mapping_source": "captured_kohler_india_pdp_api",
                "confidence": item["confidence"],
                "status": item["status"],
                "notes": item["notes"],
            }
        )
    write_rows(
        ID_MAP,
        ["internal_id", "product_code", "product_name", "mapping_source", "confidence", "status", "notes"],
        id_rows,
    )

    relation_rows = []
    relation_fields = [
        "source_product_code",
        "target_reference",
        "target_product_code",
        "relation_type",
        "source",
        "confidence",
        "resolution_status",
        "notes",
    ]
    for row in read_rows(RELATIONS):
        target = clean(row.get("target_product_code"))
        item = resolved.get(target)
        status = item["status"] if item else "unresolved"
        code = item["product_code"] if item and status == "resolved" else ""
        relation_rows.append(
            {
                "source_product_code": clean(row.get("source_product_code")),
                "target_reference": target,
                "target_product_code": code,
                "relation_type": clean(row.get("relation_type")),
                "source": clean(row.get("source")),
                "confidence": item["confidence"] if item else "0.0",
                "resolution_status": status,
                "notes": item["notes"] if item else "Reference was not present in captured PDP/API evidence.",
            }
        )
    write_rows(RESOLVED_RELATIONS, relation_fields, relation_rows)

    assembly_rows = []
    assembly_fields = [
        "assembly_id",
        "assembly_type",
        "role",
        "product_code",
        "target_reference",
        "required",
        "relation_source",
        "confidence",
        "installation_surface",
        "reference_resolved",
        "resolution_status",
        "notes",
    ]
    for row in read_rows(ASSEMBLIES):
        target = clean(row.get("product_code")) if clean(row.get("role")) == "required_component" else ""
        item = resolved.get(target) if target else None
        status = item["status"] if item else ("resolved" if not target else "unresolved")
        code = item["product_code"] if item and status == "resolved" else ("" if target else clean(row.get("product_code")))
        assembly_rows.append(
            {
                "assembly_id": clean(row.get("assembly_id")),
                "assembly_type": clean(row.get("assembly_type")),
                "role": clean(row.get("role")),
                "product_code": code,
                "target_reference": target,
                "required": clean(row.get("required")),
                "relation_source": clean(row.get("relation_source")),
                "confidence": item["confidence"] if item else clean(row.get("confidence")),
                "installation_surface": clean(row.get("installation_surface")),
                "reference_resolved": str(status == "resolved").lower(),
                "resolution_status": status,
                "notes": item["notes"] if item else clean(row.get("notes")),
            }
        )
    write_rows(RESOLVED_ASSEMBLIES, assembly_fields, assembly_rows)

    total = len(relation_rows)
    relation_status = Counter(row["resolution_status"] for row in relation_rows)
    assembly_ids = {row["assembly_id"] for row in assembly_rows}
    incomplete = {
        assembly_id
        for assembly_id in assembly_ids
        if any(
            row["assembly_id"] == assembly_id and row["role"] == "required_component"
            and row["resolution_status"] != "resolved"
            for row in assembly_rows
        )
    }
    unresolved_ids = Counter(row["target_reference"] for row in relation_rows if row["resolution_status"] != "resolved")
    report_rows = [
        {"metric": "total_explicit_relations", "value": str(total), "details": ""},
        {"metric": "resolved_relations", "value": str(relation_status["resolved"]), "details": ""},
        {"metric": "unresolved_relations", "value": str(relation_status["unresolved"]), "details": ""},
        {"metric": "ambiguous_relations", "value": str(relation_status["ambiguous"]), "details": ""},
        {"metric": "resolution_rate", "value": f"{relation_status['resolved'] / total:.4f}" if total else "0.0000", "details": "resolved / total explicit relations"},
        {"metric": "assemblies_completed", "value": str(len(assembly_ids) - len(incomplete)), "details": "No unresolved or ambiguous required component references"},
        {"metric": "assemblies_still_incomplete", "value": str(len(incomplete)), "details": "At least one unresolved or ambiguous required component reference"},
        {"metric": "unique_internal_ids_in_evidence", "value": str(len(resolved)), "details": f"Evidence scanned from {args.debug_dir}"},
        {"metric": "resolved_internal_ids", "value": str(sum(item["status"] == "resolved" for item in resolved.values())), "details": ""},
        {"metric": "unresolved_internal_ids", "value": str(sum(item["status"] == "unresolved" for item in resolved.values())), "details": ""},
        {"metric": "ambiguous_internal_ids", "value": str(sum(item["status"] == "ambiguous" for item in resolved.values())), "details": ""},
    ]
    for internal_id, count in unresolved_ids.most_common():
        report_rows.append(
            {
                "metric": "unresolved_internal_id",
                "value": str(count),
                "details": internal_id,
            }
        )
    write_rows(REPORT, ["metric", "value", "details"], report_rows)

    print(f"evidence_internal_ids={len(resolved)}")
    print(f"resolved_internal_ids={sum(item['status'] == 'resolved' for item in resolved.values())}")
    print(f"unresolved_internal_ids={sum(item['status'] == 'unresolved' for item in resolved.values())}")
    print(f"ambiguous_internal_ids={sum(item['status'] == 'ambiguous' for item in resolved.values())}")
    print(f"relations={total}")
    print(f"resolved_relations={relation_status['resolved']}")
    print(f"assemblies_still_incomplete={len(incomplete)}")


if __name__ == "__main__":
    main()
