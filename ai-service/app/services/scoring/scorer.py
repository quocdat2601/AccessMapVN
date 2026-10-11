"""
services/scoring/scorer.py
---------------------------
Fuses CV and NLP pipeline results into:
  1. A ``FeaturesDict`` (ready for API serialisation).
  2. An ``overall_confidence_score`` (float 0–1).
  3. A ``recommendation`` (auto_verify | pending_moderation | awaiting_more_info).

Fusion formula (per feature)
-----------------------------
    fused_confidence = cv_weight * cv_conf + nlp_weight * nlp_conf

Where ``nlp_conf`` defaults to ``0.0`` when NLP has no mention for the feature.
CV always dominates (60 % by default) per the requirements.

Overall score
-------------
Weighted mean of the three most important features:
    exterior_ramp_present, steps_present, door_width_ok  (equal weight)

Thresholds
----------
    ≥ 0.80 → auto_verify
    0.60 – 0.79 → pending_moderation
    < 0.60 → awaiting_more_info
"""
from __future__ import annotations

from app.config import settings
from app.core.logging import get_logger
from app.schemas import (
    FeatureResult,
    FeaturesDict,
    Recommendation,
    StepFeatureResult,
)

logger = get_logger(__name__)

# Features considered for the overall score (equal weight among them)
_KEY_FEATURES = ["exterior_ramp_present", "steps_present", "door_width_ok"]


def _fuse_confidence(cv_conf: float, nlp_conf: float) -> float:
    """Weighted fusion of CV and NLP confidence values."""
    w_cv  = settings.cv_weight
    w_nlp = settings.nlp_weight
    return round(w_cv * cv_conf + w_nlp * nlp_conf, 4)


def _build_feature_result(
    feature_key: str,
    cv_data: dict,
    nlp_mentions: dict[str, dict],
) -> FeatureResult | StepFeatureResult:
    """
    Build a typed ``FeatureResult`` by fusing CV detection with any NLP mention.

    Parameters
    ----------
    feature_key:
        Canonical feature name.
    cv_data:
        Dict from the CV pipeline for this feature.
    nlp_mentions:
        Mapping of feature_key → NLP mention dict (may be absent).
    """
    cv_conf = cv_data.get("confidence", 0.0)
    cv_val  = cv_data.get("value", False)

    # If NLP has a mention, use it to boost/temper confidence
    nlp_m   = nlp_mentions.get(feature_key)
    nlp_conf = nlp_m.get("confidence", 0.0) if nlp_m else 0.0
    if nlp_m is not None:
        fused_conf = _fuse_confidence(cv_conf, nlp_conf)
    else:
        fused_conf = cv_conf

    # Value: CV wins; only override with NLP if CV has no detection and NLP is confident
    if cv_val in (False, "unknown") and nlp_m is not None and nlp_conf > 0.65:
        value = nlp_m["value"]
    else:
        value = cv_val

    if feature_key == "steps_present":
        return StepFeatureResult(
            value=value,
            confidence=fused_conf,
            step_count_estimate=cv_data.get("step_count_estimate"),
        )

    return FeatureResult(value=value, confidence=fused_conf)


def _map_mentions(nlp_result: dict | None) -> dict[str, dict]:
    """Convert the NLP mentions list into a dict keyed by feature name."""
    if not nlp_result:
        return {}
    return {m["feature"]: m for m in nlp_result.get("mentions", [])}


def _compute_overall_score(features: FeaturesDict) -> float:
    """Compute the overall confidence score from the three key features."""
    feature_map = {
        "exterior_ramp_present": features.exterior_ramp_present,
        "steps_present":         features.steps_present,
        "door_width_ok":         features.door_width_ok,
    }
    scores = [f.confidence for f in feature_map.values()]
    return round(sum(scores) / len(scores), 4) if scores else 0.0


def _to_recommendation(score: float) -> Recommendation:
    """Map a numeric score to a recommendation label."""
    if score >= settings.score_auto_verify:
        return Recommendation.auto_verify
    if score >= settings.score_pending:
        return Recommendation.pending_moderation
    return Recommendation.awaiting_more_info


def _build_summary(features: FeaturesDict, nlp_result: dict | None) -> str:
    """Build a Vietnamese summary sentence from fused features."""
    if nlp_result and nlp_result.get("summary"):
        return nlp_result["summary"]

    parts: list[str] = []
    if features.exterior_ramp_present.value is True:
        parts.append("có ram dốc tiếp cận")
    if features.steps_present.value is True:
        parts.append("có bậc thang")
    if features.elevator_present.value is True:
        parts.append("có thang máy")
    if features.door_width_ok.value is True:
        parts.append("cửa rộng thuận tiện")
    elif features.door_width_ok.value is False:
        parts.append("cửa hẹp")
    if features.tactile_paving_present.value is True:
        parts.append("có gạch xúc giác")
    if features.accessible_restroom_sign.value is True:
        parts.append("có nhà vệ sinh tiếp cận")

    if not parts:
        return "Chưa phát hiện tiện ích tiếp cận nào trong ảnh."
    return "Địa điểm " + ", ".join(parts) + "."


class Scorer:
    """
    Fuses CV and NLP results into features and a verification recommendation.
    """

    def fuse_pre_scan(
        self, cv_result: dict, nlp_result: dict | None
    ) -> tuple[FeaturesDict, str]:
        """
        Build fused features and a summary for the pre-scan endpoint.

        Returns
        -------
        tuple[FeaturesDict, str]
            (features_dict, vietnamese_summary)
        """
        nlp_mentions = _map_mentions(nlp_result)

        features = FeaturesDict(
            exterior_ramp_present   = _build_feature_result("exterior_ramp_present",    cv_result["exterior_ramp_present"],    nlp_mentions),
            steps_present           = _build_feature_result("steps_present",            cv_result["steps_present"],            nlp_mentions),
            elevator_present        = _build_feature_result("elevator_present",         cv_result["elevator_present"],         nlp_mentions),
            door_width_ok           = _build_feature_result("door_width_ok",            cv_result["door_width_ok"],            nlp_mentions),
            accessible_restroom_sign= _build_feature_result("accessible_restroom_sign", cv_result["accessible_restroom_sign"], nlp_mentions),
            tactile_paving_present  = _build_feature_result("tactile_paving_present",   cv_result["tactile_paving_present"],   nlp_mentions),
        )

        summary = _build_summary(features, nlp_result)
        return features, summary

    def compute_verify(
        self, cv_result: dict, nlp_result: dict | None
    ) -> tuple[FeaturesDict, float, Recommendation]:
        """
        Compute fused features, overall confidence score, and recommendation
        for the verify endpoint.

        Returns
        -------
        tuple[FeaturesDict, float, Recommendation]
        """
        features, _ = self.fuse_pre_scan(cv_result, nlp_result)
        overall     = _compute_overall_score(features)
        rec         = _to_recommendation(overall)

        logger.info("Scorer: overall=%.4f recommendation=%s", overall, rec.value)
        return features, overall, rec
