import csv
import tempfile
import unittest
from pathlib import Path

from build_3d_catalogue import (
    INCHES_TO_METRES,
    choose_obj_assets,
    format_triplet,
    product_output_path,
    validation_status,
)


class ProductionCatalogueHelpersTests(unittest.TestCase):
    def test_inch_conversion_constant(self):
        self.assertAlmostEqual(12 * INCHES_TO_METRES, 0.3048)

    def test_deterministic_output_naming(self):
        with tempfile.TemporaryDirectory() as directory:
            path = product_output_path(Path(directory), "K/123")
            self.assertEqual(path.name, "K_123.glb")
            self.assertEqual(path.parent.name, "normalized_glb")

    def test_obj_selection_is_deterministic(self):
        rows = [
            {"product_code": "A", "asset_url": "https://example.test/z.obj", "file_format_normalized": "OBJ", "asset_id": "2"},
            {"product_code": "A", "asset_url": "https://example.test/a.obj", "file_format_normalized": "OBJ", "asset_id": "1"},
            {"product_code": "B", "asset_url": "https://example.test/b.skp", "file_format_normalized": "SKP", "asset_id": "3"},
        ]
        self.assertEqual(choose_obj_assets(rows)["A"]["asset_url"], "https://example.test/a.obj")
        self.assertNotIn("B", choose_obj_assets(rows))

    def test_suspicious_bounds_are_reported(self):
        self.assertEqual(validation_status((1.0, 2.0, 0.5)), "valid")
        self.assertEqual(validation_status((0.0, 2.0, 0.5)), "suspicious_geometry")

    def test_manifest_fields_can_be_written(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["product_code", "native_bounds"])
                writer.writeheader()
                writer.writerow({"product_code": "A", "native_bounds": format_triplet((1, 2, 3))})
            self.assertIn("1.000000", path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
