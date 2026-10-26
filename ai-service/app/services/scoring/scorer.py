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
    ≥ 0.90 → auto_verify
    0.60 – 0.89 → pending_moderation
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
    UserClaimItem,
    VisualSuggestionItem,
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
    # Strict rule: unsupported features must unconditionally be unknown and unsupported
    is_unsupported = feature_key in ("elevator_present", "accessible_restroom_sign", "tactile_paving_present")
    if is_unsupported:
        return FeatureResult(
            value=FeatureStatus.unknown.value,
            confidence=0.0,
            method="unsupported",
            reason="Chưa hỗ trợ nhận diện đặc tính này trong ảnh",
        )

    cv_conf = cv_data.get("confidence", 0.0)
    cv_val  = cv_data.get("value", "unknown")

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

    if fused_conf < settings.yolo_conf_threshold and value in (True, "present"):
        value = FeatureStatus.unknown.value

    val_str = _normalize_val(value)
    method = cv_data.get("method", "detector")

    if feature_key == "steps_present":
        reason_step = "Phát hiện mâu thuẫn giữa phân tích hình ảnh và mô tả văn bản" if has_conflict else (
            "Phát hiện bậc thang trong ảnh" if val_str == "present" else "Chưa đủ dữ liệu để kết luận từ ảnh này"
        )
        return StepFeatureResult(
            value=val_str,
            confidence=fused_conf,
            method="detector",
            reason=reason_step,
            step_count_estimate=None,
        )

    reason = None
    if has_conflict:
        reason = "Phát hiện mâu thuẫn giữa phân tích hình ảnh và mô tả văn bản"
    elif val_str == "present":
        reason = f"Phát hiện đặc tính {feature_key} trong ảnh"
    elif val_str == "unknown":
        reason = cv_data.get("reason") or "Chưa đủ dữ liệu để kết luận từ ảnh này"
    elif val_str == "absent":
        reason = "Không phát hiện trong ảnh hoặc người dùng xác nhận không có"

    return FeatureResult(
        value=val_str,
        confidence=fused_conf,
        method=method,
        reason=reason,
    )


def _map_mentions(nlp_result: dict | None) -> dict[str, dict]:
    """Convert the NLP mentions list into a dict keyed by feature name."""
    if not nlp_result:
        return {}
    return {m["feature"]: m for m in nlp_result.get("mentions", [])}


def _compute_overall_score(features: FeaturesDict) -> float:
    """Compute overall confidence score across active detected features or fallback to max."""
    observable = [
        features.exterior_ramp_present,
        features.steps_present,
        features.elevator_present,
        features.door_detected,
        features.accessible_restroom_sign,
        features.tactile_paving_present,
    ]
    active_scores = [
        f.confidence
        for f in observable
        if f.value == FeatureStatus.present.value or f.confidence >= 0.50
    ]
    if active_scores:
        return round(sum(active_scores) / len(active_scores), 4)
    return round(max((f.confidence for f in observable), default=0.0), 4)


def _to_recommendation(score: float) -> Recommendation:
    """Map a numeric score to a recommendation label."""
    if score >= settings.score_auto_verify:
        return Recommendation.auto_verify
    if score >= settings.score_pending:
        return Recommendation.pending_moderation
    return Recommendation.awaiting_more_info


def _build_summary(features: FeaturesDict, nlp_result: dict | None) -> str:
    """Build a natural Vietnamese summary sentence clearly separating visual observations and user claims."""
    items: list[str] = []
    unmeasured: list[str] = []

    if features.exterior_ramp_present.value == "present":
        items.append("ram dốc")
        unmeasured.append("độ dốc")
    if features.steps_present.value == "present":
        items.append("bậc thang")
    if features.door_detected.value == "present":
        items.append("cửa ra vào")
        unmeasured.append("chiều rộng cửa")

    if items:
        joined_items = " và ".join(items) if len(items) <= 2 else (", ".join(items[:-1]) + f" và {items[-1]}")
        if unmeasured:
            unmeasured_str = " và ".join(unmeasured) if len(unmeasured) <= 2 else (", ".join(unmeasured[:-1]) + f" và {unmeasured[-1]}")
            measure_clause = f"; {unmeasured_str} chưa được đo"
        else:
            measure_clause = ""
        visual_summary = f"AI nhận diện khả năng có {joined_items}. Người khảo sát cần xác nhận thực tế{measure_clause}."
    else:
        visual_summary = "Không phát hiện tiện ích tiếp cận nào rõ ràng trong ảnh. Vui lòng quan sát và tự chọn bên dưới nếu có."

    # If contributor provided text description, append it as unverified user claim, never overwriting visual summary
    if nlp_result and nlp_result.get("summary"):
        contributor_text = nlp_result["summary"].strip()
        return f"{visual_summary}\n\nNgười đóng góp mô tả: \"{contributor_text}\" (lời khai chưa được kiểm chứng độc lập)."

    return visual_summary


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

    @staticmethod
    def extract_visual_suggestions(cv_result: dict) -> list[VisualSuggestionItem]:
        """
        Extract standardized visual suggestions for the 3 core MVP features:
        'ramp_present', 'door_detected', 'stairs_present'.

        Strict rule:
        - If detector passes threshold (>= settings.yolo_conf_threshold): suggested_present with score and optional bbox.
        - Otherwise: unknown with detector_score=None, bbox=None (never 'suggested_absent').
        """
        suggestions: list[VisualSuggestionItem] = []

        mapping = [
            ("ramp_present", cv_result.get("exterior_ramp_present", {})),
            ("door_detected", cv_result.get("door_detected", {})),
            ("stairs_present", cv_result.get("steps_present", {})),
        ]

        for feature_name, data in mapping:
            conf = data.get("confidence", 0.0)
            val = data.get("value")
            is_present = val in (True, "present") and conf >= settings.yolo_conf_threshold

            bbox = data.get("bbox_normalized")

            if is_present:
                suggestions.append(
                    VisualSuggestionItem(
                        feature=feature_name,
                        value="suggested_present",
                        detector_score=round(conf, 4),
                        bbox_format="xyxy" if bbox else None,
                        coordinate_space="normalized" if bbox else None,
                        bbox_normalized=bbox if bbox else None,
                    )
                )
            else:
                suggestions.append(
                    VisualSuggestionItem(
                        feature=feature_name,
                        value="unknown",
                        detector_score=None,
                        bbox_format=None,
                        coordinate_space=None,
                        bbox_normalized=None,
                    )
                )

        return suggestions

    @staticmethod
    def extract_user_claims(nlp_result: dict | None) -> list[UserClaimItem]:
        """
        Extract structured user claims from NLP mentions without conflating with visual detection.
        """
        claims: list[UserClaimItem] = []
        if not nlp_result:
            return claims

        for m in nlp_result.get("mentions", []):
            feat = m.get("feature", "")
            val = m.get("value")
            if val in (True, "present"):
                claim_type = "reported_present"
            elif val in (False, "absent"):
                claim_type = "reported_absent"
            else:
                claim_type = "unknown"

            claims.append(
                UserClaimItem(
                    feature=feat,
                    claim=claim_type,
                    snippet=m.get("snippet"),
                )
            )

        return claims
