"""Chronological Configuration Progression & State Evolution Engine (Phase 2).

Provides pure deterministic derivation of configuration progression from append-only
audit ledger entries using run-length compression.

Key Invariants:
1. Chronological run-length compression: Consecutive audits of the same configuration
   file hash are grouped into a single version node (V1, V2, ...).
2. Non-deduplication of rollbacks: A configuration returning after another configuration
   state (e.g. A -> B -> A) creates a new chronological version occurrence (V1 -> V2 -> V3).
3. Preservation: Every audit run remains preserved with full metadata, timestamps, and hashes.
4. Genuine 0% vs Unevaluated:
   - Evaluated controls > 0 and Pass == 0 -> is_evaluated=True, score=0.0%
   - Evaluated controls == 0 -> is_evaluated=False, score=None
5. Deterministic multi-run scoring:
   - For versions with multiple audit executions, latest_compliance_score is derived from
     the latest valid/evaluated audit in that version.
   - If the most recent audit is unevaluated while an earlier audit is evaluated,
     latest_compliance_score preserves the latest valid evaluation while
     latest_audit_is_evaluated reflects current execution status.
6. Cryptographic immutability: Does NOT mutate, insert, or delete any audit ledger records.
"""

import json
from typing import Any, Dict, List, Optional, Tuple


def compute_audit_entry_metrics(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Computes control counts, pass rate, and evaluation status for a single audit entry.

    Args:
        entry: Audit entry dictionary containing 'audit_results' (dict or JSON string).

    Returns:
        Enriched dictionary with pass_count, fail_count, unknown_count, total_controls,
        is_evaluated, and compliance_score.
    """
    results = entry.get("audit_results")
    if isinstance(results, str):
        try:
            results = json.loads(results) if results.strip() else {}
        except Exception:
            results = {}
    elif not isinstance(results, dict):
        results = {}

    pass_count = 0
    fail_count = 0
    unknown_count = 0

    for _, status in results.items():
        if isinstance(status, dict):
            status_val = str(status.get("status", "")).strip().lower()
        else:
            status_val = str(status).strip().lower()

        if status_val == "pass":
            pass_count += 1
        elif status_val == "fail":
            fail_count += 1
        else:
            unknown_count += 1

    total_controls = pass_count + fail_count + unknown_count

    if total_controls == 0:
        is_evaluated = False
        compliance_score = None
    else:
        is_evaluated = True
        compliance_score = round((pass_count / total_controls) * 100.0, 2)

    return {
        "pass_count": pass_count,
        "fail_count": fail_count,
        "unknown_count": unknown_count,
        "total_controls": total_controls,
        "is_evaluated": is_evaluated,
        "compliance_score": compliance_score,
        "parsed_results": results,
    }


def compute_version_delta(v_prev: Dict[str, Any], v_curr: Dict[str, Any]) -> Dict[str, Any]:
    """Compares two consecutive configuration versions and produces authentic rule-level deltas.

    Classifies matching controls:
    - improved: previous non-pass -> current pass
    - regressed: previous pass -> current non-pass
    - unchanged: status identical
    - newly_evaluated: present in current but absent in previous
    - retired: present in previous but absent in current

    If either version lacks evaluated controls, returns status 'no_comparable_baseline'.
    """
    if not v_prev.get("is_evaluated") or not v_curr.get("is_evaluated"):
        return {
            "status": "no_comparable_baseline",
            "reason": "One or both configuration versions lack evaluated controls.",
            "delta_score": None,
            "improved_count": 0,
            "regressed_count": 0,
            "unchanged_count": 0,
            "newly_evaluated_count": 0,
            "retired_count": 0,
            "improved_rules": [],
            "regressed_rules": [],
            "unchanged_rules": [],
            "newly_evaluated_rules": [],
            "retired_rules": [],
        }

    # Extract parsed results from latest evaluated entry of each version
    prev_entries = [e for e in v_prev.get("audit_entries", []) if e.get("is_evaluated")]
    curr_entries = [e for e in v_curr.get("audit_entries", []) if e.get("is_evaluated")]

    prev_res = prev_entries[-1].get("audit_results", {}) if prev_entries else {}
    curr_res = curr_entries[-1].get("audit_results", {}) if curr_entries else {}

    if isinstance(prev_res, str):
        try:
            prev_res = json.loads(prev_res)
        except Exception:
            prev_res = {}
    if isinstance(curr_res, str):
        try:
            curr_res = json.loads(curr_res)
        except Exception:
            curr_res = {}

    improved_rules: List[str] = []
    regressed_rules: List[str] = []
    unchanged_rules: List[str] = []
    newly_evaluated_rules: List[str] = []
    retired_rules: List[str] = []

    def _normalize_status(val: Any) -> str:
        if isinstance(val, dict):
            return str(val.get("status", "")).strip().lower()
        return str(val).strip().lower()

    for rid, c_stat in curr_res.items():
        norm_c = _normalize_status(c_stat)
        if rid in prev_res:
            norm_p = _normalize_status(prev_res[rid])
            if norm_p != "pass" and norm_c == "pass":
                improved_rules.append(rid)
            elif norm_p == "pass" and norm_c != "pass":
                regressed_rules.append(rid)
            else:
                unchanged_rules.append(rid)
        else:
            newly_evaluated_rules.append(rid)

    for rid in prev_res:
        if rid not in curr_res:
            retired_rules.append(rid)

    curr_score = v_curr.get("latest_compliance_score")
    prev_score = v_prev.get("latest_compliance_score")
    delta_score = round(curr_score - prev_score, 2) if (curr_score is not None and prev_score is not None) else None

    return {
        "status": "comparable",
        "delta_score": delta_score,
        "improved_count": len(improved_rules),
        "regressed_count": len(regressed_rules),
        "unchanged_count": len(unchanged_rules),
        "newly_evaluated_count": len(newly_evaluated_rules),
        "retired_count": len(retired_rules),
        "improved_rules": sorted(improved_rules),
        "regressed_rules": sorted(regressed_rules),
        "unchanged_rules": sorted(unchanged_rules),
        "newly_evaluated_rules": sorted(newly_evaluated_rules),
        "retired_rules": sorted(retired_rules),
    }


def derive_configuration_progression(
    entries: List[Dict[str, Any]],
    device_hostname: Optional[str] = None,
    include_deltas: bool = True,
) -> List[Dict[str, Any]]:
    """Derives chronological configuration evolution from audit ledger records.

    Uses run-length compression:
    Consecutive entries with identical (device_hostname, config_file_hash) are aggregated
    into a single version node V1, V2, ...
    Rollbacks to a prior configuration hash create a new chronological version node.

    Args:
        entries: Chronologically ordered list of audit ledger entries.
        device_hostname: Optional filter to derive progression for a specific device.
        include_deltas: If True, computes delta comparisons between consecutive versions.

    Returns:
        List of configuration version dictionaries V1, V2, ...
    """
    if not entries:
        return []

    # Optional device filtering
    filtered_entries = [
        e for e in entries
        if device_hostname is None or e.get("device_hostname") == device_hostname
    ]
    if not filtered_entries:
        return []

    # 1. Run-Length Grouping
    grouped_runs: List[List[Dict[str, Any]]] = []
    current_run: List[Dict[str, Any]] = []

    for entry in filtered_entries:
        # Precompute per-entry metrics without modifying original entry
        metrics = compute_audit_entry_metrics(entry)
        enriched_entry = dict(entry)
        enriched_entry["pass_count"] = metrics["pass_count"]
        enriched_entry["fail_count"] = metrics["fail_count"]
        enriched_entry["unknown_count"] = metrics["unknown_count"]
        enriched_entry["total_controls"] = metrics["total_controls"]
        enriched_entry["is_evaluated"] = metrics["is_evaluated"]
        enriched_entry["compliance_score"] = metrics["compliance_score"]

        if not current_run:
            current_run.append(enriched_entry)
        else:
            prev_entry = current_run[-1]
            same_hash = enriched_entry.get("config_file_hash") == prev_entry.get("config_file_hash")
            same_host = enriched_entry.get("device_hostname") == prev_entry.get("device_hostname")

            if same_hash and same_host:
                current_run.append(enriched_entry)
            else:
                grouped_runs.append(current_run)
                current_run = [enriched_entry]

    if current_run:
        grouped_runs.append(current_run)

    # 2. Build Version Nodes
    versions: List[Dict[str, Any]] = []

    for v_idx, run in enumerate(grouped_runs, start=1):
        version_id = f"V{v_idx}"
        first_entry = run[0]
        latest_entry = run[-1]

        config_hash = first_entry.get("config_file_hash", "")
        host = first_entry.get("device_hostname", "unknown")
        first_audited = first_entry.get("timestamp", "")
        latest_audited = latest_entry.get("timestamp", "")
        audit_count = len(run)

        # Multi-run evaluation resolution
        evaluated_audits = [e for e in run if e.get("is_evaluated")]

        if evaluated_audits:
            is_evaluated = True
            latest_eval = evaluated_audits[-1]
            latest_compliance_score = latest_eval["compliance_score"]
            pass_count = latest_eval["pass_count"]
            fail_count = latest_eval["fail_count"]
            unknown_count = latest_eval["unknown_count"]
            total_controls = latest_eval["total_controls"]
            latest_audit_is_evaluated = bool(latest_entry.get("is_evaluated"))
            latest_evaluated_entry_id = latest_eval.get("entry_id")
        else:
            is_evaluated = False
            latest_compliance_score = None
            pass_count = 0
            fail_count = 0
            unknown_count = 0
            total_controls = 0
            latest_audit_is_evaluated = False
            latest_evaluated_entry_id = None

        version_node = {
            "version_id": version_id,
            "config_hash": config_hash,
            "device_hostname": host,
            "first_audited": first_audited,
            "latest_audited": latest_audited,
            "audit_count": audit_count,
            "latest_compliance_score": latest_compliance_score,
            "pass_count": pass_count,
            "fail_count": fail_count,
            "unknown_count": unknown_count,
            "total_controls": total_controls,
            "is_evaluated": is_evaluated,
            "latest_audit_is_evaluated": latest_audit_is_evaluated,
            "latest_evaluated_entry_id": latest_evaluated_entry_id,
            "audit_entries": run,
            "delta_from_previous": None,
        }
        versions.append(version_node)

    # 3. Compute Consecutive Version Deltas
    if include_deltas:
        for i in range(1, len(versions)):
            versions[i]["delta_from_previous"] = compute_version_delta(versions[i - 1], versions[i])

    return versions
