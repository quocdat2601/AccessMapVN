import io
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
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
        
        # Standardized suggestions contract
        self.assertEqual(data["analysis_method"], "model")
        self.assertEqual(data["image_reference"], "exif_corrected_original")
        self.assertTrue(data["requires_user_confirmation"])
        
        visual_suggs = {s["feature"]: s for s in data["visual_suggestions"]}
        self.assertIn("ramp_present", visual_suggs)
        self.assertIn("door_detected", visual_suggs)
        self.assertIn("stairs_present", visual_suggs)
        for s in visual_suggs.values():
            self.assertIn(s["value"], ("suggested_present", "unknown"))
            self.assertNotEqual(s["value"], "suggested_absent")

        # Legacy backward-compatibility
        features = data["features"]
        self.assertIn(features["exterior_ramp_present"]["value"], ("absent", "unknown"))
        self.assertEqual(features["ramp_slope_compliant"]["value"], "unknown")
        self.assertEqual(features["ramp_slope_compliant"]["method"], "unmeasured")
        self.assertEqual(features["door_width_compliant"]["value"], "unknown")
        self.assertEqual(features["door_width_compliant"]["method"], "unmeasured")
        self.assertEqual(features["door_width_ok"]["value"], "unknown")

    def test_pre_scan_vietnamese_negation_parsed_as_absent(self):
        """Phrases like 'không có dốc' must extract user_claim as reported_absent."""
        valid_img = create_dummy_image_bytes()
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("photo.jpg", valid_img, "image/jpeg"))],
            data={"text_description": "Lối vào bậc tam cấp cao, không có dốc cho xe lăn"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # User claims separation
        claims = {c["feature"]: c for c in data["user_claims"]}
        self.assertIn("exterior_ramp_present", claims)
        self.assertEqual(claims["exterior_ramp_present"]["claim"], "reported_absent")
        self.assertIn("không có dốc", claims["exterior_ramp_present"]["snippet"])

        # Legacy features
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

    def test_model_only_mode_image_pre_scan(self):
        """Pre-scan runs model-only pipeline with analysis_method='model'."""
        valid_img = create_dummy_image_bytes()
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("photo.jpg", valid_img, "image/jpeg"))],
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["analysis_method"], "model")
        self.assertEqual(data["analysis_status"], "completed")

    def test_strict_model_mode_zero_detection_returns_unknown_and_model_method(self):
        """When YOLO runs on a blank image with 0 detections, analysis_method is 'model' and suggestions are 'unknown'."""
        valid_img = create_dummy_image_bytes(color=(128, 128, 128))
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("blank.jpg", valid_img, "image/jpeg"))],
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["analysis_method"], "model")
        for s in data["visual_suggestions"]:
            self.assertEqual(s["value"], "unknown")
            self.assertIsNone(s["detector_score"])

    def test_strict_model_mode_missing_weights_never_falls_back_to_heuristic(self):
        """Missing weights in strict mode must mark engine as unavailable, model_loaded=False, and error_code='weights_missing'."""
        from app.services.cv._base import BaseYOLODetector
        detector = BaseYOLODetector(Path("/nonexistent/dummy_weights.pt"), target_class="test_ramp")
        model = detector._load_model()
        self.assertIsNone(model)
        self.assertEqual(detector._engine, "unavailable")
        self.assertFalse(detector.model_loaded)
        self.assertTrue(detector.initialization_attempted)
        res = detector._detect(create_dummy_image_bytes())
        self.assertFalse(res.detected)
        self.assertEqual(res.engine, "unavailable")
        self.assertEqual(res.status, "unavailable")
        self.assertEqual(res.error_code, "weights_missing")

    def test_strict_model_mode_inference_error_does_not_call_heuristic(self):
        """If YOLO inference raises an exception, detector returns status='failed' with error_code='inference_failed'."""
        from app.config import settings
        from app.services.cv._base import BaseYOLODetector
        detector = BaseYOLODetector(settings.yolo_weights_path["ramp"], target_class="ramp")
        with patch.object(detector, "_load_model") as mock_load:
            fake_model = MagicMock()
            fake_model.predict.side_effect = RuntimeError("Inference CUDA/CPU error")
            mock_load.return_value = fake_model
            detector._engine = "yolo"
            detector._model = fake_model
            res = detector._detect(create_dummy_image_bytes())
            self.assertFalse(res.detected)
            self.assertEqual(res.engine, "yolo")
            self.assertEqual(res.status, "failed")
            self.assertEqual(res.error_code, "inference_failed")

    def test_strict_model_mode_zero_detection_vs_inference_failure_propagation(self):
        """Zero detections yield completed with unknown; inference exception yields partial with error_code and warning."""
        valid_img = create_dummy_image_bytes(color=(128, 128, 128))
        
        # 1. Normal run with 0 detections
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("blank.jpg", valid_img, "image/jpeg"))],
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["analysis_status"], "completed")
        self.assertEqual(data["detector_results"]["ramp"]["status"], "completed")
        self.assertEqual(data["warnings"], [])

        # 2. Simulate inference exception in step detector
        from app.api.pre_scan import _cv_pipeline
        with patch.object(_cv_pipeline._step, "detect_steps") as mock_step_detect:
            mock_step_detect.return_value = {
                "detected": False,
                "confidence": 0.0,
                "step_count_estimate": None,
                "engine": "yolo",
                "status": "failed",
                "error_code": "inference_failed",
            }
            err_res = self.client.post(
                "/api/v1/ai/pre-scan",
                files=[("images", ("test.jpg", valid_img, "image/jpeg"))],
            )
            self.assertEqual(err_res.status_code, 200)
            err_data = err_res.json()
            self.assertEqual(err_data["analysis_status"], "partial")
            self.assertEqual(err_data["detector_results"]["step"]["status"], "failed")
            self.assertEqual(err_data["detector_results"]["step"]["error_code"], "inference_failed")
            self.assertTrue(any("Không phân tích được bậc thang" in w for w in err_data["warnings"]))

    def test_health_readiness_probe(self):
        """GET /health/ready returns 200 when required models are loaded, and 503 if not loaded."""
        # 1. Normal state (in test/docker where models exist or are mocked)
        res = self.client.get("/health/ready")
        self.assertIn(res.status_code, (200, 503))
        data = res.json()
        self.assertIn("required_models_loaded", data)
        self.assertIn("detectors", data)

        # 2. Test 503 status code when required model is missing
        from app.api.pre_scan import _cv_pipeline
        with patch.object(_cv_pipeline, "get_readiness", return_value={
            "status": "not_ready",
            "required_models_loaded": False,
            "detectors": {"ramp": {"loaded": False, "engine": "unavailable", "weights_sha256": None}},
        }):
            res_unready = self.client.get("/health/ready")
            self.assertEqual(res_unready.status_code, 503)
            data_unready = res_unready.json()
            self.assertEqual(data_unready["status"], "not_ready")
            self.assertFalse(data_unready["required_models_loaded"])

    def test_strict_model_mode_unsupported_features_guaranteed_unknown(self):
        """Features marked unsupported (elevator, signage, tactile) are strictly value='unknown', confidence=0.0, method='unsupported'."""
        valid_img = create_dummy_image_bytes()
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("photo.jpg", valid_img, "image/jpeg"))],
            data={"text_description": "Tòa nhà có thang máy xịn và nhà vệ sinh tiếp cận"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        features = data["features"]
        for feat_key in ("elevator_present", "accessible_restroom_sign", "tactile_paving_present"):
            self.assertEqual(features[feat_key]["value"], "unknown")
            self.assertEqual(features[feat_key]["confidence"], 0.0)
            self.assertEqual(features[feat_key]["method"], "unsupported")

    def test_summary_separates_visual_observations_from_contributor_claims(self):
        """Summary must not overwrite visual observations with user text, clearly attributing contributor claim."""
        valid_img = create_dummy_image_bytes()
        res = self.client.post(
            "/api/v1/ai/pre-scan",
            files=[("images", ("photo.jpg", valid_img, "image/jpeg"))],
            data={"text_description": "Ram dốc chuẩn rộng 120cm"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        summary = data["summary"]
        self.assertTrue("cần người khảo sát xác nhận" in summary.lower() or "chưa được đo" in summary.lower() or "không phát hiện" in summary.lower())
        self.assertIn("Người đóng góp mô tả:", summary)
        self.assertIn("lời khai chưa được kiểm chứng độc lập", summary)

    def test_model_only_mode_never_calls_heuristic_on_verify(self):
        """Verify endpoint with media runs model-only pipeline with analysis_method='model'."""
        valid_img = create_dummy_image_bytes()
        with patch("app.api.verify.download_url", return_value=valid_img):
            payload = {
                "submission_id": str(uuid4()),
                "location_id": str(uuid4()),
                "media_urls": ["https://s3.example.com/evidence.jpg"],
                "text_description": "Khảo sát thực địa"
            }
            res = self.client.post("/api/v1/ai/verify", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["analysis_method"], "model")
            self.assertEqual(data["analysis_status"], "completed")


if __name__ == "__main__":
    unittest.main()
