"""
services/cv/pipeline.py
------------------------
Orchestrates all CV detectors over a list of images and returns a unified
feature dict ready for scoring.

Design
------
* Each detector is instantiated once when ``CVPipeline`` is first created.
* For each image we run all detectors; results are aggregated by taking the
  **max confidence** observation across all images for each feature.
* The aggregated dict matches the ``FeaturesDict`` schema expected by the API.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.services.cv.door_estimator import DoorEstimator
from app.services.cv.elevator_detector import ElevatorDetector
from app.services.cv.ramp_detector import RampDetector
from app.services.cv.signage_detector import SignageDetector
from app.services.cv.step_detector import StepDetector
from app.services.cv.tactile_detector import TactileDetector

logger = get_logger(__name__)

# Sentinel to represent "not seen yet"
_NOT_SEEN: dict = {"value": False, "confidence": 0.0}


def _merge(current: dict, new: dict) -> dict:
    """
    Keep the detection with the higher confidence between *current* and *new*.
    Handles optional extra keys (step_count_estimate, etc.).
    """
    if new.get("confidence", 0.0) > current.get("confidence", 0.0):
        return new
    return current


class CVPipeline:
    """
    Runs all CV detectors on a batch of images and aggregates results.

    Usage::

        pipeline = CVPipeline()
        results = pipeline.run([img_bytes_1, img_bytes_2])
    """

    def __init__(self) -> None:
        logger.info("Initialising CV pipeline detectors …")
        self._ramp     = RampDetector()
        self._step     = StepDetector()
        self._elevator = ElevatorDetector()
        self._door     = DoorEstimator()
        self._signage  = SignageDetector()
        self._tactile  = TactileDetector()
        logger.info("CV pipeline ready.")

    def run(self, images: list[bytes]) -> dict:
        """
        Run all detectors on every image and return aggregated features.

        Parameters
        ----------
        images:
            List of raw image byte strings (JPEG/PNG).

        Returns
        -------
        dict
            Keys match ``FeaturesDict`` field names:
            - exterior_ramp_present
            - steps_present        (also has step_count_estimate)
            - elevator_present
            - door_width_ok
            - accessible_restroom_sign
            - tactile_paving_present
        """
        # Initialise accumulators
        agg: dict[str, dict] = {
            "exterior_ramp_present":   dict(_NOT_SEEN),
            "steps_present":           {**_NOT_SEEN, "step_count_estimate": None},
            "elevator_present":        dict(_NOT_SEEN),
            "door_width_ok":           {"value": "unknown", "confidence": 0.0},
            "accessible_restroom_sign": dict(_NOT_SEEN),
            "tactile_paving_present":  dict(_NOT_SEEN),
        }

        for idx, img_bytes in enumerate(images):
            logger.debug("CV pipeline processing image %d/%d", idx + 1, len(images))
            try:
                ramp_r   = self._ramp.detect_ramp(img_bytes)
                step_r   = self._step.detect_steps(img_bytes)
                elev_r   = self._elevator.detect_elevator(img_bytes)
                door_r   = self._door.detect_door(img_bytes)
                sign_r   = self._signage.detect_signage(img_bytes)
                tact_r   = self._tactile.detect_tactile(img_bytes)

                agg["exterior_ramp_present"]    = _merge(agg["exterior_ramp_present"], ramp_r)
                agg["steps_present"]            = _merge(agg["steps_present"], step_r)
                agg["elevator_present"]         = _merge(agg["elevator_present"], elev_r)
                agg["door_width_ok"]            = _merge(agg["door_width_ok"], door_r)
                agg["accessible_restroom_sign"] = _merge(agg["accessible_restroom_sign"], sign_r)
                agg["tactile_paving_present"]   = _merge(agg["tactile_paving_present"], tact_r)

            except Exception as exc:
                logger.exception("CV pipeline error on image %d: %s", idx, exc)

        logger.debug("CV pipeline aggregated results: %s", agg)
        return agg
