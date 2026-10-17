BEGIN;

-- Local-development data only. All UUIDs are deterministic so this script is safe to replay.
INSERT INTO app_users (
    id, display_name, role, is_active, reputation_score, reputation_tier,
    reputation_policy_version, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000401', 'Người dùng demo An', 1, true, 0, 'Provisional', 'wf02-provisional-v1', now() - interval '40 days', now()),
    ('70000000-0000-0000-0000-000000000402', 'Người dùng demo Bình', 1, true, 0, 'Provisional', 'wf02-provisional-v1', now() - interval '35 days', now()),
    ('70000000-0000-0000-0000-000000000403', 'Điều phối viên demo', 3, true, 0, 'Provisional', 'wf02-provisional-v1', now() - interval '60 days', now())
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    is_active = true,
    updated_at_utc = now();

INSERT INTO places (
    id, name, category, address, phone, website, opening_hours, geom, lng, lat,
    has_ramp, has_accessible_elevator, has_tactile_paving, has_accessible_restroom,
    door_width_ok, accessibility_score, accessibility_note, last_verified_at,
    status, merged_into_location_id, metadata_version, created_at_utc, updated_at_utc
) VALUES (
    '70000000-0000-0000-0000-000000000001',
    '[WF-02 DEMO] Trung tâm Phục vụ Cộng đồng',
    'other',
    'Dữ liệu minh hoạ tại trung tâm Quận 1 - không dùng làm thông tin thực tế',
    '028-0000-0000',
    'https://example.invalid/wf02-demo',
    '08:00-17:00',
    ST_SetSRID(ST_MakePoint(106.699018, 10.779783), 4326)::geography,
    106.699018, 10.779783,
    true, true, true, false, true,
    85,
    'Dữ liệu seed local để kiểm thử WF-02: vote, community status, timeline, report và comment.',
    now() - interval '5 days',
    1, NULL, 1, now() - interval '150 days', now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    address = EXCLUDED.address,
    geom = EXCLUDED.geom,
    lng = EXCLUDED.lng,
    lat = EXCLUDED.lat,
    has_ramp = EXCLUDED.has_ramp,
    has_accessible_elevator = EXCLUDED.has_accessible_elevator,
    has_tactile_paving = EXCLUDED.has_tactile_paving,
    has_accessible_restroom = EXCLUDED.has_accessible_restroom,
    door_width_ok = EXCLUDED.door_width_ok,
    accessibility_score = EXCLUDED.accessibility_score,
    accessibility_note = EXCLUDED.accessibility_note,
    last_verified_at = EXCLUDED.last_verified_at,
    status = 1,
    merged_into_location_id = NULL,
    updated_at_utc = now();

INSERT INTO location_features (
    id, location_id, scope_id, feature_type, current_status, version,
    source_submission_id, verified_at, is_published, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000101', '70000000-0000-0000-0000-000000000001', NULL, 1, 1, 1, NULL, now() - interval '5 days', true, now() - interval '5 days', now()),
    ('70000000-0000-0000-0000-000000000102', '70000000-0000-0000-0000-000000000001', NULL, 2, 2, 1, NULL, now() - interval '130 days', true, now() - interval '130 days', now()),
    ('70000000-0000-0000-0000-000000000103', '70000000-0000-0000-0000-000000000001', NULL, 3, 1, 1, NULL, now() - interval '12 days', true, now() - interval '12 days', now()),
    ('70000000-0000-0000-0000-000000000104', '70000000-0000-0000-0000-000000000001', NULL, 4, 3, 1, NULL, now() - interval '18 days', true, now() - interval '18 days', now()),
    ('70000000-0000-0000-0000-000000000105', '70000000-0000-0000-0000-000000000001', NULL, 5, 1, 1, NULL, now() - interval '20 days', true, now() - interval '20 days', now())
ON CONFLICT (id) DO UPDATE SET
    current_status = EXCLUDED.current_status,
    version = EXCLUDED.version,
    verified_at = EXCLUDED.verified_at,
    is_published = true,
    updated_at_utc = now();

INSERT INTO location_feature_history (
    id, location_feature_id, feature_version, status, source_submission_id,
    published_by_id, reason, effective_at, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000201', '70000000-0000-0000-0000-000000000101', 1, 1, NULL, '70000000-0000-0000-0000-000000000403', 'Seed local: dốc tiếp cận đã được xác minh.', now() - interval '5 days', now() - interval '5 days', now()),
    ('70000000-0000-0000-0000-000000000202', '70000000-0000-0000-0000-000000000102', 1, 2, NULL, '70000000-0000-0000-0000-000000000403', 'Seed local: cửa ra vào có giới hạn.', now() - interval '130 days', now() - interval '130 days', now()),
    ('70000000-0000-0000-0000-000000000203', '70000000-0000-0000-0000-000000000103', 1, 1, NULL, '70000000-0000-0000-0000-000000000403', 'Seed local: thang máy tiếp cận hoạt động.', now() - interval '12 days', now() - interval '12 days', now()),
    ('70000000-0000-0000-0000-000000000204', '70000000-0000-0000-0000-000000000104', 1, 3, NULL, '70000000-0000-0000-0000-000000000403', 'Seed local: chưa có nhà vệ sinh tiếp cận.', now() - interval '18 days', now() - interval '18 days', now()),
    ('70000000-0000-0000-0000-000000000205', '70000000-0000-0000-0000-000000000105', 1, 1, NULL, '70000000-0000-0000-0000-000000000403', 'Seed local: có lối đi xúc giác.', now() - interval '20 days', now() - interval '20 days', now())
ON CONFLICT (location_feature_id, feature_version) DO UPDATE SET
    status = EXCLUDED.status,
    published_by_id = EXCLUDED.published_by_id,
    reason = EXCLUDED.reason,
    effective_at = EXCLUDED.effective_at,
    updated_at_utc = now();

INSERT INTO community_votes (
    id, location_feature_id, voter_id, observed_feature_version, vote_type,
    proposed_status, comment, status, reputation_score_snapshot,
    reputation_tier_snapshot, tier_factor_snapshot, eligibility_reason,
    policy_version, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000801', '70000000-0000-0000-0000-000000000104', '70000000-0000-0000-0000-000000000401', 1, 2, 1, 'WC tiếp cận đã được bổ sung gần đây.', 3, 0, 'Provisional', 1, 'Eligible provisional vote', 'wf02-provisional-v1', now() - interval '2 days', now()),
    ('70000000-0000-0000-0000-000000000802', '70000000-0000-0000-0000-000000000104', '70000000-0000-0000-0000-000000000402', 1, 2, 1, 'Tôi cũng quan sát thấy biển WC tiếp cận.', 3, 0, 'Provisional', 1, 'Eligible provisional vote', 'wf02-provisional-v1', now() - interval '1 day', now())
ON CONFLICT (id) DO UPDATE SET
    comment = EXCLUDED.comment,
    status = EXCLUDED.status,
    updated_at_utc = now();

INSERT INTO dispute_cases (
    id, location_feature_id, feature_version, status, open_reason,
    opened_at, resolved_at, correction_submission_id, version, created_at_utc, updated_at_utc
) VALUES (
    '70000000-0000-0000-0000-000000000901',
    '70000000-0000-0000-0000-000000000104', 1, 1,
    'Hai quan sát độc lập mâu thuẫn với trạng thái nhà vệ sinh đã công bố.',
    now() - interval '1 day', NULL, NULL, 1, now() - interval '1 day', now()
)
ON CONFLICT (id) DO UPDATE SET
    status = 1,
    open_reason = EXCLUDED.open_reason,
    resolved_at = NULL,
    updated_at_utc = now();

INSERT INTO dispute_case_votes (id, dispute_case_id, community_vote_id, created_at_utc, updated_at_utc) VALUES
    ('70000000-0000-0000-0000-000000000911', '70000000-0000-0000-0000-000000000901', '70000000-0000-0000-0000-000000000801', now() - interval '1 day', now()),
    ('70000000-0000-0000-0000-000000000912', '70000000-0000-0000-0000-000000000901', '70000000-0000-0000-0000-000000000802', now() - interval '1 day', now())
ON CONFLICT (dispute_case_id, community_vote_id) DO NOTHING;

INSERT INTO feature_community_states (
    id, location_feature_id, feature_version, label, weighted_agreement,
    eligible_voter_count, contradicting_voter_count, last_trusted_reconfirmed_at,
    freshness_factor, active_dispute_case_id, computed_at, policy_version,
    version, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000301', '70000000-0000-0000-0000-000000000101', 1, 3, 0.92, 4, 0, now() - interval '2 days', 0.98, NULL, now(), 'wf02-provisional-v1', 1, now() - interval '5 days', now()),
    ('70000000-0000-0000-0000-000000000302', '70000000-0000-0000-0000-000000000102', 1, 4, 0.70, 2, 0, now() - interval '105 days', 0.55, NULL, now(), 'wf02-provisional-v1', 1, now() - interval '130 days', now()),
    ('70000000-0000-0000-0000-000000000303', '70000000-0000-0000-0000-000000000103', 1, 2, 1.00, 1, 0, now() - interval '3 days', 0.96, NULL, now(), 'wf02-provisional-v1', 1, now() - interval '12 days', now()),
    ('70000000-0000-0000-0000-000000000304', '70000000-0000-0000-0000-000000000104', 1, 6, 0.00, 2, 2, NULL, 0.94, '70000000-0000-0000-0000-000000000901', now(), 'wf02-provisional-v1', 1, now() - interval '18 days', now()),
    ('70000000-0000-0000-0000-000000000305', '70000000-0000-0000-0000-000000000105', 1, 1, NULL, 0, 0, NULL, 0.92, NULL, now(), 'wf02-provisional-v1', 1, now() - interval '20 days', now())
ON CONFLICT (location_feature_id) DO UPDATE SET
    feature_version = EXCLUDED.feature_version,
    label = EXCLUDED.label,
    weighted_agreement = EXCLUDED.weighted_agreement,
    eligible_voter_count = EXCLUDED.eligible_voter_count,
    contradicting_voter_count = EXCLUDED.contradicting_voter_count,
    last_trusted_reconfirmed_at = EXCLUDED.last_trusted_reconfirmed_at,
    freshness_factor = EXCLUDED.freshness_factor,
    active_dispute_case_id = EXCLUDED.active_dispute_case_id,
    computed_at = now(),
    policy_version = EXCLUDED.policy_version,
    updated_at_utc = now();

INSERT INTO community_comments (
    id, location_id, scope_id, author_id, body, status, moderated_by_id,
    moderated_at, moderation_reason, version, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000501', '70000000-0000-0000-0000-000000000001', NULL, '70000000-0000-0000-0000-000000000401', 'Dốc vào cửa chính khá thoải và có tay vịn.', 2, '70000000-0000-0000-0000-000000000403', now() - interval '2 days', 'Seed local approved comment', 2, now() - interval '3 days', now()),
    ('70000000-0000-0000-0000-000000000502', '70000000-0000-0000-0000-000000000001', NULL, '70000000-0000-0000-0000-000000000402', 'Thang máy dễ tìm, nhưng cửa ra vào hơi hẹp vào giờ đông.', 2, '70000000-0000-0000-0000-000000000403', now() - interval '1 day', 'Seed local approved comment', 2, now() - interval '2 days', now()),
    ('70000000-0000-0000-0000-000000000503', '70000000-0000-0000-0000-000000000001', NULL, '70000000-0000-0000-0000-000000000401', 'Nên kiểm tra lại thông tin nhà vệ sinh tiếp cận.', 2, '70000000-0000-0000-0000-000000000403', now() - interval '6 hours', 'Seed local approved comment', 2, now() - interval '8 hours', now())
ON CONFLICT (id) DO UPDATE SET
    body = EXCLUDED.body,
    status = 2,
    moderated_by_id = EXCLUDED.moderated_by_id,
    moderated_at = EXCLUDED.moderated_at,
    moderation_reason = EXCLUDED.moderation_reason,
    updated_at_utc = now();

INSERT INTO community_comment_status_history (
    id, community_comment_id, from_status, to_status, actor_id,
    reason, occurred_at, created_at_utc, updated_at_utc
) VALUES
    ('70000000-0000-0000-0000-000000000601', '70000000-0000-0000-0000-000000000501', 1, 2, '70000000-0000-0000-0000-000000000403', 'Seed local approval', now() - interval '2 days', now() - interval '2 days', now()),
    ('70000000-0000-0000-0000-000000000602', '70000000-0000-0000-0000-000000000502', 1, 2, '70000000-0000-0000-0000-000000000403', 'Seed local approval', now() - interval '1 day', now() - interval '1 day', now()),
    ('70000000-0000-0000-0000-000000000603', '70000000-0000-0000-0000-000000000503', 1, 2, '70000000-0000-0000-0000-000000000403', 'Seed local approval', now() - interval '6 hours', now() - interval '6 hours', now())
ON CONFLICT (id) DO UPDATE SET
    to_status = 2,
    reason = EXCLUDED.reason,
    occurred_at = EXCLUDED.occurred_at,
    updated_at_utc = now();

INSERT INTO inaccurate_information_reports (
    id, location_id, reporter_id, scope_id, feature_type,
    observed_feature_version, reason, description, status, is_stale_baseline,
    proposed_address, proposed_latitude, proposed_longitude, linked_dispute_case_id,
    linked_submission_id, resolution, public_resolution_note, reporter_action_note,
    version, created_at_utc, updated_at_utc
) VALUES (
    '70000000-0000-0000-0000-000000001001',
    '70000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000401',
    NULL, 2, 1, 3,
    'Dữ liệu demo: cửa ra vào nên được đo và xác minh lại.',
    1, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    1, now() - interval '4 hours', now() - interval '4 hours'
)
ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    status = 1,
    version = 1,
    updated_at_utc = now();

INSERT INTO report_status_history (
    id, report_id, from_status, to_status, actor_id, reason,
    outcome, public_note, occurred_at, created_at_utc, updated_at_utc
) VALUES (
    '70000000-0000-0000-0000-000000001101',
    '70000000-0000-0000-0000-000000001001',
    NULL, 1, '70000000-0000-0000-0000-000000000401',
    'Seed local submitted report', NULL, NULL,
    now() - interval '4 hours', now() - interval '4 hours', now()
)
ON CONFLICT (id) DO UPDATE SET
    reason = EXCLUDED.reason,
    occurred_at = EXCLUDED.occurred_at,
    updated_at_utc = now();

INSERT INTO location_metadata_history (
    id, location_id, metadata_version, source_report_id, changed_by_id,
    before_json, after_json, reason, effective_at, created_at_utc, updated_at_utc
) VALUES (
    '70000000-0000-0000-0000-000000000701',
    '70000000-0000-0000-0000-000000000001', 1, NULL,
    '70000000-0000-0000-0000-000000000403',
    '{}'::jsonb,
    '{"address":"Dữ liệu minh hoạ tại trung tâm Quận 1","metadataVersion":1}'::jsonb,
    'Khởi tạo metadata cho địa điểm demo WF-02.',
    now() - interval '150 days', now() - interval '150 days', now()
)
ON CONFLICT (location_id, metadata_version) DO UPDATE SET
    after_json = EXCLUDED.after_json,
    reason = EXCLUDED.reason,
    updated_at_utc = now();

COMMIT;
