import io
import sys
import unittest
from pathlib import Path
from uuid import uuid4
from PIL import Image

# Ensure ai-service root is in sys.path
ai_service_root = Path(__file__).resolve().parent.parent
if str(ai_service_root) not in sys.path:
    sys.path.insert(0, str(ai_service_root))

from starlette.testclient import TestClient

from app.main import app
from app.schemas import FeatureStatus
from app.services.scoring.scorer import Scorer


def create_dummy_image_bytes(format="JPEG", color=(200, 200, 200), size=(300, 300)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()


class TestAiServiceEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.scorer = Scorer()

    def test_pre_scan_missing_image_returns_422(self):
        """Request without image payload must return HTTP 422."""
        res = self.client.post("/api/v1/ai/pre-scan", data={"text_description": "Có lối đi"})
        self.assertEqual(res.status_code, 422)

    def test_pre_scan_corrupted_image_returns_422(self):
        """Corrupted/un-decodable image bytes must be rejected with HTTP 422, not unhandled 500."""
        corrupt_bytes = b"CORRUPTED_NOT_AN_IMAGE_PAYLOAD_987654321"
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("corrupted.jpg", corrupt_bytes, "image/jpeg"))],
            data={"text_description": "Có lối đi"}
        )
        self.assertEqual(res.status_code, 422)

    def test_pre_scan_blank_image_unmeasured_compliance(self):
        """Blank image should yield absent/unknown features, and QCVN standards must remain unmeasured."""
        valid_img = create_dummy_image_bytes()
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("photo.jpg", valid_img, "image/jpeg"))],
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        features = data["features"]
        self.assertIn(features["exterior_ramp_present"]["value"], ("absent", "unknown"))
        self.assertEqual(features["ramp_slope_compliant"]["value"], "unknown")
        self.assertEqual(features["ramp_slope_compliant"]["method"], "unmeasured")
        self.assertEqual(features["door_width_compliant"]["value"], "unknown")
        self.assertEqual(features["door_width_compliant"]["method"], "unmeasured")
        self.assertEqual(features["door_width_ok"]["value"], "unknown")

    def test_pre_scan_vietnamese_negation_parsed_as_absent(self):
        """Phrases like 'không có dốc' must extract exterior_ramp_present as absent."""
        valid_img = create_dummy_image_bytes()
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("photo.jpg", valid_img, "image/jpeg"))],
            data={"text_description": "Lối vào bậc tam cấp cao, không có dốc cho xe lăn"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        features = data["features"]
        self.assertEqual(features["exterior_ramp_present"]["value"], "absent")
        self.assertGreater(features["exterior_ramp_present"]["confidence"], 0)

    def test_scoring_cv_nlp_contradiction_yields_unknown_and_penalty(self):
        """When CV detects ramp but user notes state 'không có dốc', result must be unknown with penalized confidence."""
        cv_mock = {
            "exterior_ramp_present": {"value": True, "confidence": 0.85},
            "steps_present": {"value": False, "confidence": 0.10, "step_count_estimate": None},
            "elevator_present": {"value": False, "confidence": 0.10},
            "door_detected": {"value": True, "confidence": 0.75},
            "accessible_restroom_sign": {"value": False, "confidence": 0.10},
            "tactile_paving_present": {"value": False, "confidence": 0.10},
        }
        nlp_conflict = {
            "mentions": [
                {"feature": "exterior_ramp_present", "value": False, "confidence": 0.80, "snippet": "không có dốc"}
            ]
        }
        fused_features, summary = self.scorer.fuse_pre_scan(cv_mock, nlp_conflict)
        ramp_res = fused_features.exterior_ramp_present
        self.assertEqual(ramp_res.value, "unknown")
        self.assertIn("mâu thuẫn", ramp_res.reason or "")
        self.assertLessEqual(ramp_res.confidence, 0.25)

    def test_verify_unreachable_media_returns_422(self):
        """Verify endpoint must return HTTP 422 if media URLs cannot be downloaded."""
        verify_payload = {
            "submission_id": str(uuid4()),
            "location_id": str(uuid4()),
            "media_urls": ["https://invalid-host-for-testing-mock.com/photo.jpg"],
            "text_description": "Khảo sát thực địa"
        }
        res = self.client.post("/api/v1/ai/verify", json=verify_payload)
        self.assertEqual(res.status_code, 422)

    def test_verify_3_state_schema_and_unmeasured_compliance(self):
        """Verify output must adhere to 3-state schema with unmeasured compliance standards."""
        cv_verify_mock = {
            "exterior_ramp_present": {"value": True, "confidence": 0.82},
            "steps_present": {"value": False, "confidence": 0.15, "step_count_estimate": None},
            "elevator_present": {"value": True, "confidence": 0.88},
            "door_detected": {"value": True, "confidence": 0.85},
            "accessible_restroom_sign": {"value": False, "confidence": 0.10},
            "tactile_paving_present": {"value": False, "confidence": 0.10},
        }
        v_features, overall_score, recommendation = self.scorer.compute_verify(cv_verify_mock, None)
        self.assertEqual(v_features.door_detected.value, "present")
        self.assertEqual(v_features.door_width_compliant.value, "unknown")
        self.assertEqual(v_features.door_width_ok.value, "unknown")
        self.assertTrue(0.0 <= overall_score <= 1.0)


if __name__ == "__main__":
    unittest.main()
