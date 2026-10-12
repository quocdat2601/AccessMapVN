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
    FeatureStatus,
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


def _normalize_val(val: any) -> str:
    if val is True or val == "present":
        return FeatureStatus.present.value
    if val is False or val == "absent":
        return FeatureStatus.absent.value
    return FeatureStatus.unknown.value


def _build_feature_result(
    feature_key: str,
    cv_data: dict,
    nlp_mentions: dict[str, dict],
) -> FeatureResult | StepFeatureResult:
    """
    Build a typed ``FeatureResult`` by fusing CV detection with any NLP mention.
    """
    cv_conf = cv_data.get("confidence", 0.0)
    cv_val  = cv_data.get("value", False)

    # If NLP has a mention, check for contradiction or boost/temper confidence
    nlp_m   = nlp_mentions.get(feature_key)
    nlp_conf = nlp_m.get("confidence", 0.0) if nlp_m else 0.0
    has_conflict = False

    if nlp_m is not None:
        cv_is_present = cv_val in (True, "present")
        nlp_is_absent = nlp_m.get("value") in (False, "absent")
        cv_is_absent  = cv_val in (False, "absent")
        nlp_is_present = nlp_m.get("value") in (True, "present")

        if (cv_is_present and nlp_is_absent) or (cv_is_absent and nlp_is_present):
            has_conflict = True
            fused_conf = round(max(0.20, abs(cv_conf - nlp_conf) * 0.5), 4)
            value = FeatureStatus.unknown.value
        else:
            fused_conf = _fuse_confidence(cv_conf, nlp_conf)
            if cv_val in (False, "unknown") and nlp_conf > 0.65:
                value = nlp_m["value"]
            else:
                value = cv_val
    else:
        fused_conf = cv_conf
        value = cv_val

    val_str = _normalize_val(value)

    if feature_key == "steps_present":
        reason_step = "Phát hiện mâu thuẫn giữa phân tích hình ảnh và mô tả văn bản" if has_conflict else (
            "Phát hiện bậc thang" if val_str == "present" else None
        )
        return StepFeatureResult(
            value=val_str,
            confidence=fused_conf,
            method="detector",
            reason=reason_step,
            step_count_estimate=cv_data.get("step_count_estimate"),
        )

    reason = None
    if has_conflict:
        reason = "Phát hiện mâu thuẫn giữa phân tích hình ảnh và mô tả văn bản"
    elif val_str == "present":
        reason = f"Phát hiện đặc tính {feature_key}"
    elif val_str == "unknown":
        reason = "Chưa đủ dữ liệu để kết luận"

    return FeatureResult(
        value=val_str,
        confidence=fused_conf,
        method="detector",
        reason=reason,
    )


def _map_mentions(nlp_result: dict | None) -> dict[str, dict]:
    """Convert the NLP mentions list into a dict keyed by feature name."""
    if not nlp_result:
        return {}
    return {m["feature"]: m for m in nlp_result.get("mentions", [])}


def _compute_overall_score(features: FeaturesDict) -> float:
    """Compute the overall confidence score from key features (kept for legacy client compatibility)."""
    feature_map = {
        "exterior_ramp_present": features.exterior_ramp_present,
        "steps_present":         features.steps_present,
        "door_detected":         features.door_detected,
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
    if features.exterior_ramp_present.value == "present":
        parts.append("có ram dốc tiếp cận")
    if features.steps_present.value == "present":
        parts.append("có bậc thang")
    if features.elevator_present.value == "present":
        parts.append("có thang máy")
    if features.door_detected.value == "present":
        parts.append("có cửa ra vào")
    if features.tactile_paving_present.value == "present":
        parts.append("có gạch xúc giác")
    if features.accessible_restroom_sign.value == "present":
        parts.append("có nhà vệ sinh tiếp cận")

    if not parts:
        return "Chưa phát hiện tiện ích tiếp cận nào trong ảnh."
    return "Địa điểm " + ", ".join(parts) + ". Cần đo đạc thực địa để xác nhận đạt chuẩn QCVN 10:2014."


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
            ramp_slope_compliant     = FeatureResult(
                value=FeatureStatus.unknown,
                confidence=0.0,
                method="unmeasured",
                reason="Cần đo đạc thực địa hoặc nhập kích thước chiều cao/chiều dài dốc"
            ),
            steps_present           = _build_feature_result("steps_present",            cv_result["steps_present"],            nlp_mentions),
            elevator_present        = _build_feature_result("elevator_present",         cv_result["elevator_present"],         nlp_mentions),
            door_detected           = _build_feature_result("door_detected",           cv_result.get("door_detected", {"value": "unknown", "confidence": 0.0}), nlp_mentions),
            door_width_compliant    = FeatureResult(
                value=FeatureStatus.unknown,
                confidence=0.0,
                method="unmeasured",
                reason="Không thể đo chiều rộng chính xác từ ảnh 2D đơn lẻ"
            ),
            door_width_ok           = FeatureResult(
                value=FeatureStatus.unknown,
                confidence=0.0,
                method="unmeasured",
                reason="Legacy field: chỉ suy ra từ số đo đã xác minh"
            ),
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
