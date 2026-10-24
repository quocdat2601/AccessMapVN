import shutil
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

ai_service_root = Path(__file__).resolve().parent.parent
if str(ai_service_root) not in sys.path:
    sys.path.insert(0, str(ai_service_root))

from starlette.testclient import TestClient

from app.main import app
from app.services.media import video_pipeline as vp
from app.services.media.video_pipeline import Frame

HAS_FFMPEG = bool(shutil.which("ffprobe") and shutil.which("ffmpeg"))


def make_frame(idx: int, pattern: int, sharpness=500.0, brightness=120.0) -> Frame:
    rng = np.random.default_rng(pattern)
    return Frame(
        frame_id=f"frame_{idx:03d}",
        timestamp_seconds=float(idx),
        jpeg=b"jpeg",
        sharpness=sharpness,
        brightness=brightness,
        dhash=rng.random(64) > 0.5,
    )


class FakeCv:
    def __init__(self, ramp_on: set[bytes]):
        self.ramp_on = ramp_on

    def run(self, images):
        present = images[0] in self.ramp_on
        absent = {"value": False, "confidence": 0.0}
        return {
            "exterior_ramp_present": {"value": present, "confidence": 0.8 if present else 0.0},
            "steps_present": absent,
            "elevator_present": absent,
            "door_detected": {"value": "unknown", "confidence": 0.1},
            "accessible_restroom_sign": absent,
            "tactile_paving_present": absent,
        }


class TestFrameSelection(unittest.TestCase):
    def test_all_frames_poor_quality_returns_insufficient(self):
        frames = [make_frame(i, i, sharpness=1.0) for i in range(5)]
        result = vp.select_frames(frames)
        self.assertEqual(result.selected, [])
        self.assertIn("insufficient_visual_quality", result.warnings)

    def test_near_duplicates_collapse_to_one_frame(self):
        frames = [make_frame(i, pattern=7) for i in range(8)]
        result = vp.select_frames(frames)
        self.assertEqual(len(result.selected), 1)
        self.assertIn("mostly_static_footage", result.warnings)

    def test_selection_capped_and_spread_over_time(self):
        frames = [make_frame(i, pattern=i) for i in range(10)]
        result = vp.select_frames(frames)
        self.assertEqual(len(result.selected), 4)
        times = [f.timestamp_seconds for f in result.selected]
        self.assertEqual(times, sorted(times))
        self.assertLess(times[0], 3)
        self.assertGreater(times[-1], 6)


class TestAggregation(unittest.TestCase):
    def test_absent_everywhere_is_unknown_not_absent(self):
        frames = [make_frame(i, i) for i in range(2)]
        results = [(f, FakeCv(set()).run([f.jpeg])) for f in frames]
        suggestions = vp.aggregate_visual_observations(results)
        self.assertEqual(suggestions["ramp_present"]["value"], "unknown")
        self.assertEqual(suggestions["ramp_present"]["evidence"], [])

    def test_detection_keeps_frame_reference(self):
        frames = [make_frame(1, 1), make_frame(3, 2)]
        cv = FakeCv({b"jpeg"})
        results = [(f, cv.run([f.jpeg])) for f in frames]
        suggestions = vp.aggregate_visual_observations(results)
        self.assertEqual(suggestions["ramp_present"]["value"], "suggested_present")
        self.assertEqual(
            [e["frame_id"] for e in suggestions["ramp_present"]["evidence"]],
            ["frame_001", "frame_003"],
        )

    def test_analyze_video_never_reports_measurements_or_compliance(self):
        selection = vp.FrameSelection(8, [make_frame(1, 1)], [])
        with patch.object(vp, "select_video_frames", return_value=selection):
            out = vp.analyze_video(b"x", FakeCv({b"jpeg"}))
        self.assertEqual(out["measurements"]["ramp_slope"]["status"], "unmeasured")
        self.assertEqual(out["compliance"]["door_width_compliant"], "unknown")
        self.assertTrue(out["requires_user_confirmation"])
        self.assertEqual(out["frames_analyzed"], 1)


class TestVideoEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_missing_file_returns_422(self):
        self.assertEqual(self.client.post("/api/v1/ai/pre-scan/video").status_code, 422)

    def test_oversized_upload_rejected_before_processing(self):
        with patch("app.api.video_pre_scan.settings.video_max_bytes", 10):
            res = self.client.post(
                "/api/v1/ai/pre-scan/video",
                files={"video": ("clip.mp4", b"x" * 64, "video/mp4")},
            )
        self.assertEqual(res.status_code, 413)

    @unittest.skipUnless(HAS_FFMPEG, "ffmpeg/ffprobe not installed")
    def test_garbage_bytes_return_controlled_422(self):
        res = self.client.post(
            "/api/v1/ai/pre-scan/video",
            files={"video": ("clip.mp4", b"not a video", "video/mp4")},
        )
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["detail"]["code"], "not_a_video")

    def test_missing_ffmpeg_returns_503(self):
        with patch.object(vp, "_run", side_effect=vp.FfmpegUnavailableError("ffprobe not found")):
            res = self.client.post(
                "/api/v1/ai/pre-scan/video",
                files={"video": ("clip.mp4", b"x" * 64, "video/mp4")},
            )
        self.assertEqual(res.status_code, 503)


if __name__ == "__main__":
    unittest.main()
