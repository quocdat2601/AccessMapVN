import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
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
        self.assertIsNotNone(out["preview_frame_data_uri"])
        self.assertTrue(out["preview_frame_data_uri"].startswith("data:image/jpeg;base64,"))

    def test_single_frame_weak_flicker_suppressed_but_strong_or_multi_frame_kept(self):
        frames = [make_frame(1, 1), make_frame(2, 2), make_frame(3, 3)]
        absent = {"value": False, "confidence": 0.0}

        def make_obs(ramp_conf=0.0, door_conf=0.0, step_conf=0.0):
            return {
                "exterior_ramp_present": {"value": ramp_conf > 0, "confidence": ramp_conf},
                "door_detected": {"value": "present" if door_conf > 0 else "unknown", "confidence": door_conf},
                "steps_present": {"value": step_conf > 0, "confidence": step_conf},
                "elevator_present": absent,
                "accessible_restroom_sign": absent,
                "tactile_paving_present": absent,
            }

        results = [
            (frames[0], make_obs(ramp_conf=0.31, door_conf=0.55, step_conf=0.32)),
            (frames[1], make_obs(step_conf=0.33)),
            (frames[2], make_obs()),
        ]
        suggestions = vp.aggregate_visual_observations(results)
        self.assertEqual(suggestions["ramp_present"]["value"], "unknown")
        self.assertEqual(suggestions["ramp_present"]["evidence"], [])
        self.assertEqual(suggestions["door_detected"]["value"], "suggested_present")
        self.assertEqual(len(suggestions["door_detected"]["evidence"]), 1)
        self.assertEqual(suggestions["steps_present"]["value"], "suggested_present")
        self.assertEqual(len(suggestions["steps_present"]["evidence"]), 2)


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

    def test_model_only_mode_on_video(self):
        """Video analysis running through real CVPipeline runs model-only without heuristics."""
        from app.api.pre_scan import _cv_pipeline
        frame = make_frame(0, pattern=1)
        with patch("app.services.media.video_pipeline.select_video_frames") as mock_select:
            mock_select.return_value = vp.FrameSelection(frames_sampled=1, selected=[frame], warnings=[])
            result = vp.analyze_video(b"fake_video", _cv_pipeline)
            self.assertEqual(result["processing_status"], "completed")
            self.assertIn("ramp_present", result["suggestions"])


class TestProbeVideo(unittest.TestCase):
    def test_accepts_hevc_and_stream_level_duration_fallback(self):
        payload = {
            "streams": [{"codec_name": "hevc", "width": 720, "height": 1280, "duration": "4.0"}],
            "format": {},
        }
        fake_proc = type("Proc", (), {"stdout": vp.json.dumps(payload).encode()})()
        with patch.object(vp, "_run", return_value=fake_proc):
            meta = vp.probe_video("clip.mp4")
        self.assertEqual(meta["codec"], "hevc")
        self.assertAlmostEqual(meta["duration"], 4.0)

    def test_rejects_unsupported_codec_and_out_of_range_duration(self):
        bad_codec = type(
            "Proc",
            (),
            {"stdout": vp.json.dumps({"streams": [{"codec_name": "av1", "width": 720, "height": 1280}], "format": {"duration": "6.0"}}).encode()},
        )()
        with patch.object(vp, "_run", return_value=bad_codec):
            with self.assertRaises(vp.VideoValidationError) as ctx:
                vp.probe_video("clip.mp4")
        self.assertEqual(ctx.exception.code, "unsupported_codec")

        bad_dur = type(
            "Proc",
            (),
            {"stdout": vp.json.dumps({"streams": [{"codec_name": "h264", "width": 720, "height": 1280}], "format": {"duration": "2.5"}}).encode()},
        )()
        with patch.object(vp, "_run", return_value=bad_dur):
            with self.assertRaises(vp.VideoValidationError) as ctx:
                vp.probe_video("clip.mp4")
        self.assertEqual(ctx.exception.code, "invalid_duration")

    def test_opencv_fallback_extracts_frames_when_ffmpeg_cli_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = str(Path(tmpdir) / "sample.mp4")
            writer = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*"mp4v"), 5.0, (320, 240))
            if not writer.isOpened():
                self.skipTest("OpenCV VideoWriter mp4v encoder unavailable")
            try:
                for idx in range(25):
                    frame = np.full((240, 320, 3), 40 + (idx * 7) % 180, dtype=np.uint8)
                    cv2.putText(frame, f"F{idx}", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
                    writer.write(frame)
            finally:
                writer.release()

            raw_bytes = Path(video_path).read_bytes()

        with patch.object(vp, "_run", side_effect=vp.FfmpegUnavailableError("ffprobe not found")):
            selection = vp.select_video_frames(raw_bytes)
        self.assertGreater(selection.frames_sampled, 0)
        self.assertGreater(len(selection.selected), 0)
        self.assertLessEqual(len(selection.selected), 4)

    def test_extract_poster_frame_returns_jpeg_and_rejects_empty(self):
        with self.assertRaises(vp.VideoValidationError):
            vp.extract_poster_frame(b"")

        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = str(Path(tmpdir) / "poster_sample.mp4")
            writer = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*"mp4v"), 5.0, (180, 320))
            if not writer.isOpened():
                self.skipTest("OpenCV VideoWriter mp4v encoder unavailable")
            try:
                for idx in range(15):
                    frame = np.full((320, 180, 3), 60 + idx * 5, dtype=np.uint8)
                    cv2.putText(frame, f"P{idx}", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
                    writer.write(frame)
            finally:
                writer.release()
            raw_bytes = Path(video_path).read_bytes()

        poster = vp.extract_poster_frame(raw_bytes)
        self.assertTrue(poster.startswith(b"\xff\xd8"))
        self.assertGreater(len(poster), 500)


if __name__ == "__main__":
    unittest.main()
