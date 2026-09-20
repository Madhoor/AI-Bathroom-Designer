import unittest
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from crawl_kohler_api import merge_product_frames, parse_dimensions


class ParseDimensionsTests(unittest.TestCase):
    def test_complete_centimetre_fields(self):
        self.assertEqual(
            parse_dimensions({
                "ProductOverallLengthCm_d": 100,
                "ProductOverallWidthCm_d": 50,
                "ProductOverallHeightCm_d": 25,
            }),
            "100 cm x 50 cm x 25 cm",
        )

    def test_complete_inch_fields_are_converted(self):
        self.assertEqual(
            parse_dimensions({
                "ProductOverallLengthInches_s": '28-1/2"',
                "ProductOverallWidthInches_s": '14-3/8"',
                "ProductOverallHeightInches_s": '28-7/16"',
            }),
            "72.39 cm x 36.5125 cm x 72.2313 cm",
        )

    def test_centimetre_fields_take_precedence(self):
        self.assertEqual(
            parse_dimensions({
                "ProductOverallLengthCm_d": 100,
                "ProductOverallWidthCm_d": 50,
                "ProductOverallHeightCm_d": 25,
                "ProductOverallLengthInches_s": "80",
                "ProductOverallWidthInches_s": "40",
                "ProductOverallHeightInches_s": "20",
            }),
            "100 cm x 50 cm x 25 cm",
        )

    def test_partial_inch_dimensions_fall_back_without_shipping_values(self):
        self.assertEqual(
            parse_dimensions({
                "ProductOverallLengthInches_s": "20",
                "ProductOverallWidthInches_s": "10",
                "SKUShippingHeight_s": "99",
                "ProductDescriptionProductShort_s": "Unknown product",
            }),
            "Unknown product",
        )

    def test_malformed_freeform_dimensions_are_preserved_not_parsed(self):
        self.assertEqual(
            parse_dimensions({
                "ProductDescriptionProductShort_s": "Dimensions: 560*45.4 cm",
            }),
            "Dimensions: 560*45.4 cm",
        )

    def test_missing_dimensions_return_none(self):
        self.assertIsNone(parse_dimensions({}))

    def test_shipping_dimensions_are_excluded(self):
        self.assertIsNone(parse_dimensions({
            "SKUShippingLength_s": "100",
            "SKUShippingWidth_s": "50",
            "SKUShippingHeight_s": "25",
        }))

    def test_exact_inch_to_cm_conversion(self):
        self.assertEqual(
            parse_dimensions({
                "ProductOverallLengthInches_s": "1",
                "ProductOverallWidthInches_s": "1",
                "ProductOverallHeightInches_s": "1",
            }),
            "2.54 cm x 2.54 cm x 2.54 cm",
        )

    def test_product_merge_preserves_complete_dimensions(self):
        merged = merge_product_frames([
            pd.DataFrame([{
                "product_code": "2211IN-0",
                "dimensions": "53.6575 cm x 43.815 cm x 18.8912 cm",
            }]),
            pd.DataFrame([{
                "product_code": "2211IN-0",
                "dimensions": "54 cm undercounter lavatory",
            }]),
        ])
        self.assertEqual(
            merged.iloc[0]["dimensions"],
            "53.6575 cm x 43.815 cm x 18.8912 cm",
        )


if __name__ == "__main__":
    unittest.main()
