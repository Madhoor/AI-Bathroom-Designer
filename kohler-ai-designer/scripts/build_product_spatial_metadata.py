"""Build factual spatial and installation metadata from the normalized catalogue."""

from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "data" / "master"
PRODUCTS = MASTER / "kohler_products_normalized.csv"
SPATIAL = MASTER / "kohler_product_spatial_metadata.csv"
ATTACHMENTS = MASTER / "kohler_attachment_rules.csv"
VALIDATION = MASTER / "kohler_spatial_validation.csv"

SPATIAL_FIELDS = [
    "product_code",
    "roles",
    "bathroom_zones",
    "mount_surfaces",
    "installation_type",
    "requires_host_product",
    "host_roles",
    "floor_contact",
    "wall_contact",
    "overhead",
    "source",
    "confidence",
    "notes",
]
ATTACHMENT_FIELDS = [
    "product_code",
    "attaches_to_role",
    "attaches_to_surface",
    "relation",
    "source",
    "confidence",
    "notes",
]

NONE_VALUES = {"", "none", "null", "nan", "n/a"}


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def add_unique(items: list[str], value: str) -> None:
    if value and value not in items:
        items.append(value)


def classify(row: dict[str, str]) -> tuple[list[str], list[str]]:
    category = clean(row.get("category")).lower()
    subcategory = clean(row.get("subcategory")).lower()
    name = clean(row.get("product_name")).lower()
    text = f"{subcategory}; {name}"
    roles: list[str] = []
    zones: list[str] = []

    if "toilet" in category or "toilet" in text:
        add_unique(zones, "toilet")
        if "bidet" in text:
            add_unique(roles, "bidet_seat")
        elif "seat" in text:
            add_unique(roles, "toilet_seat")
        elif "tank" in text:
            add_unique(roles, "toilet_tank")
        elif "bowl" in text:
            add_unique(roles, "toilet_bowl")
        else:
            add_unique(roles, "toilet")
    elif "shower" in category or "shower" in text or "rainhead" in text:
        add_unique(zones, "shower")
        if "door" in text:
            add_unique(roles, "shower_door")
        elif "hand shower" in text:
            add_unique(roles, "hand_shower")
        elif "rainhead" in text or "rain head" in text:
            add_unique(roles, "rainhead")
        elif "showerhead" in text or "shower head" in text:
            add_unique(roles, "showerhead")
        elif "diverter" in text:
            add_unique(roles, "diverter")
        elif "valve" in text:
            add_unique(roles, "shower_valve")
        else:
            add_unique(roles, "showerhead")
    elif "wellness" in category or "bath" in text:
        add_unique(zones, "bathtub")
        if "faucet" in text or "filler" in text:
            add_unique(roles, "bath_filler")
        elif "drain" in text:
            add_unique(roles, "bath_drain")
        else:
            add_unique(roles, "bath")
    elif "basin" in category or "sink" in text or "washbasin" in text:
        add_unique(zones, "basin")
        if "faucet" in text or "tap" in text:
            add_unique(roles, "basin_faucet")
            add_unique(roles, "faucet")
        elif "drain" in text:
            add_unique(roles, "accessory")
        else:
            add_unique(roles, "basin")
    elif "vanity" in text:
        add_unique(zones, "vanity")
        add_unique(roles, "vanity")
    elif "mirror" in text:
        add_unique(zones, "vanity")
        add_unique(roles, "mirror")

    if not zones:
        add_unique(zones, "general")
    if not roles:
        add_unique(roles, "accessory")
    return roles, zones


def explicit_surfaces(row: dict[str, str], roles: list[str]) -> tuple[list[str], list[str]]:
    installation = clean(row.get("installation_type"))
    text = f"{installation}; {clean(row.get('product_name'))}".lower()
    surfaces: list[str] = []
    notes: list[str] = []
    if "wall-mount" in text or "wall mount" in text:
        add_unique(surfaces, "wall")
        notes.append("Explicit wall-mount wording.")
    if "floor-mount" in text or "floor mount" in text:
        add_unique(surfaces, "floor")
        notes.append("Explicit floor-mount wording.")
    if "deck-mount" in text or "deck mount" in text:
        add_unique(surfaces, "deck_mount")
        notes.append("Explicit deck-mount wording.")
    if "single-hole" in text or "countertop" in text:
        add_unique(surfaces, "counter")
        notes.append("Explicit counter/single-hole mounting wording.")
    if "ceiling" in text:
        add_unique(surfaces, "ceiling")
        notes.append("Explicit ceiling wording.")
    if "freestanding" in text:
        add_unique(surfaces, "freestanding")
        notes.append("Explicit freestanding wording.")
    if not surfaces and "drop-in" in text:
        add_unique(surfaces, "floor")
        notes.append("Drop-in installation is recorded as floor-contact; no host product is asserted.")
    return surfaces, notes


def build_metadata(row: dict[str, str]) -> tuple[dict[str, str], list[dict[str, str]]]:
    roles, zones = classify(row)
    surfaces, surface_notes = explicit_surfaces(row, roles)
    installation = clean(row.get("installation_type"))
    host_roles: list[str] = []
    if "basin_faucet" in roles and (
        "deck_mount" in surfaces or "single-hole" in installation.lower()
    ):
        host_roles = ["basin", "vanity"]
    elif "bath_filler" in roles and "deck_mount" in surfaces:
        host_roles = ["bath"]
    requires_host = bool(host_roles)
    floor_contact = any(surface in {"floor", "freestanding"} for surface in surfaces)
    wall_contact = "wall" in surfaces
    overhead = any(role in {"rainhead", "showerhead"} for role in roles) and "ceiling" in surfaces
    notes = surface_notes + [
        "Role and zone are category/subcategory metadata mappings; no product compatibility is inferred."
    ]
    confidence = "0.95" if surface_notes else "0.85"
    metadata = {
        "product_code": clean(row.get("product_code")),
        "roles": ";".join(roles),
        "bathroom_zones": ";".join(zones),
        "mount_surfaces": ";".join(surfaces),
        "installation_type": installation,
        "requires_host_product": str(requires_host).lower(),
        "host_roles": ";".join(host_roles),
        "floor_contact": str(floor_contact).lower(),
        "wall_contact": str(wall_contact).lower(),
        "overhead": str(overhead).lower(),
        "source": "catalogue_metadata",
        "confidence": confidence,
        "notes": " ".join(notes),
    }
    attachments: list[dict[str, str]] = []
    if requires_host:
        for host_role in host_roles:
            surface = "basin" if host_role == "basin" else "vanity" if host_role == "vanity" else "deck_mount"
            relation = "installed_into" if surface in {"basin", "vanity"} else "mounts_to"
            attachments.append(
                {
                    "product_code": metadata["product_code"],
                    "attaches_to_role": host_role,
                    "attaches_to_surface": surface,
                    "relation": relation,
                    "source": "catalogue_metadata",
                    "confidence": confidence,
                    "notes": "Host role derived from explicit installation wording and controlled product role.",
                }
            )
    return metadata, attachments


def main() -> None:
    with PRODUCTS.open(newline="", encoding="utf-8-sig") as handle:
        products = list(csv.DictReader(handle))
    metadata_rows: list[dict[str, str]] = []
    attachment_rows: list[dict[str, str]] = []
    for product in products:
        metadata, attachments = build_metadata(product)
        metadata_rows.append(metadata)
        attachment_rows.extend(attachments)

    def write(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

    write(SPATIAL, SPATIAL_FIELDS, metadata_rows)
    write(ATTACHMENTS, ATTACHMENT_FIELDS, attachment_rows)

    role_counts = Counter(role for row in metadata_rows for role in row["roles"].split(";") if role)
    zone_counts = Counter(zone for row in metadata_rows for zone in row["bathroom_zones"].split(";") if zone)
    surface_counts = Counter(surface for row in metadata_rows for surface in row["mount_surfaces"].split(";") if surface)
    validation = [
        ("total_products", len(metadata_rows), "INFO", ""),
        ("products_with_role", sum(bool(row["roles"]) for row in metadata_rows), "INFO", ""),
        ("products_with_bathroom_zone", sum(bool(row["bathroom_zones"]) for row in metadata_rows), "INFO", ""),
        ("products_with_mounting_surface", sum(bool(row["mount_surfaces"]) for row in metadata_rows), "INFO", ""),
        ("products_requiring_host_product", sum(row["requires_host_product"] == "true" for row in metadata_rows), "INFO", ""),
        ("products_with_unknown_installation", sum(not clean(row["installation_type"]) for row in metadata_rows), "WARNING", "Installation type is absent in normalized catalogue."),
        ("products_with_low_confidence_mapping", sum(float(row["confidence"]) < 1 for row in metadata_rows), "WARNING", "Role/zone mapping comes from category metadata or lacks explicit installation wording."),
        ("attachment_rules", len(attachment_rows), "INFO", "No coordinates or compatibility claims are included."),
    ]
    validation.extend(("role:" + key, count, "INFO", "") for key, count in sorted(role_counts.items()))
    validation.extend(("zone:" + key, count, "INFO", "") for key, count in sorted(zone_counts.items()))
    validation.extend(("mount_surface:" + key, count, "INFO", "") for key, count in sorted(surface_counts.items()))
    write(
        VALIDATION,
        ["check", "count", "severity", "notes"],
        [
            {"check": check, "count": str(count), "severity": severity, "notes": notes}
            for check, count, severity, notes in validation
        ],
    )
    print(f"products={len(metadata_rows)}")
    print(f"attachment_rules={len(attachment_rows)}")
    print(f"low_confidence={sum(float(row['confidence']) < 1 for row in metadata_rows)}")
    print(f"unknown_installation={sum(not clean(row['installation_type']) for row in metadata_rows)}")


if __name__ == "__main__":
    main()
