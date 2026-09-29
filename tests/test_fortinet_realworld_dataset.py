"""NTRO PS26155 — Fortinet Real-World Public Dataset Validation Tests.

Validates the Fortinet implementation against the real-world dataset archive:
SIH26155_Fortinet_FortiGate_RealWorld_PublicDataset_v1.zip
1. Dataset Archive Integrity & Discovery (source_registry.json, SHA256SUMS.json)
2. Real-World Configuration Parsing & CSM Normalization (Azure, IBM, GCP HA)
3. Management Interface & IP Address Extraction
4. Deterministic Baseline Rules Evaluation (10 FORTINET-* rules, 5 identical runs)
5. Extensible Vendor Registry Auto-Detection & Explicit Resolution
6. Negative Cross-Vendor Protection
7. End-to-End API Ingestion (/api/audit/upload with temporary DB)
8. Production Database Immutability (zero mutations to data/auditor.db)
"""

import copy
import hashlib
import json
import pathlib
import zipfile
import pytest
from fastapi.testclient import TestClient

import src.ast_safety as ast_safety
import src.auth as auth
import src.database as database
import src.fortinet_auditor as fortinet_auditor
from src.vendor_adapter import (
    AristaVendorAdapter,
    CiscoVendorAdapter,
    FortinetVendorAdapter,
    JuniperVendorAdapter,
    PaloAltoVendorAdapter,
    VendorAdapter,
)
from src.vendor_registry import (
    VendorRegistry,
    get_default_vendor_registry,
    ingest_configuration,
    UndeterminedVendorError,
    UnsupportedVendorError,
)
from src.compliance_framework import (
    ComplianceStatus,
    FrameworkRegistry,
    get_default_registry,
)
from src.main import app

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
FORTINET_ZIP = BASE_DIR / "datasets" / "SIH26155_Fortinet_FortiGate_RealWorld_PublicDataset_v1.zip"
if not FORTINET_ZIP.exists():
    FORTINET_ZIP = BASE_DIR / "SIH26155_Fortinet_FortiGate_RealWorld_PublicDataset_v1.zip"


# --- Fixtures ---

@pytest.fixture(scope="session")
def fortinet_real_configs():
    """Extracts and returns the 3 real-world Fortinet configuration samples from the dataset zip."""
    assert FORTINET_ZIP.exists(), f"Fortinet dataset archive missing at {FORTINET_ZIP}"
    configs = {}
    with zipfile.ZipFile(FORTINET_ZIP, "r") as z:
        for name in [
            "configs/fortigate_azure_reference.conf",
            "configs/fortigate_ibm_user_data.conf",
            "configs/fortigate_gcp_ha_reference.conf",
        ]:
            configs[pathlib.Path(name).name] = z.read(name).decode("utf-8", errors="ignore")
    return configs


@pytest.fixture
def clean_vendor_registry():
    """Returns a fresh VendorRegistry with all adapters registered."""
    reg = VendorRegistry()
    reg.register(CiscoVendorAdapter())
    reg.register(JuniperVendorAdapter())
    reg.register(FortinetVendorAdapter())
    reg.register(AristaVendorAdapter())
    reg.register(PaloAltoVendorAdapter())
    return reg


# ==============================================================================
# 1. DATASET INTEGRITY & DISCOVERY
# ==============================================================================

class TestFortinetDatasetDiscovery:
    """Verifies presence, manifest integrity, and structure of the real-world Fortinet dataset."""

    def test_zip_archive_exists(self):
        """Asserts that SIH26155_Fortinet_FortiGate_RealWorld_PublicDataset_v1.zip exists."""
        assert FORTINET_ZIP.exists()
        assert FORTINET_ZIP.stat().st_size > 0

    def test_expected_files_in_zip(self, fortinet_real_configs):
        """Validates all 3 expected configuration files exist in the zip."""
        assert "fortigate_azure_reference.conf" in fortinet_real_configs
        assert "fortigate_ibm_user_data.conf" in fortinet_real_configs
        assert "fortigate_gcp_ha_reference.conf" in fortinet_real_configs

        for name, text in fortinet_real_configs.items():
            assert len(text.strip()) > 50, f"Configuration {name} is unexpectedly empty"

    def test_manifest_checksums(self):
        """Verifies files match SHA256SUMS.json inside the archive."""
        with zipfile.ZipFile(FORTINET_ZIP, "r") as z:
            manifest_data = json.loads(z.read("SHA256SUMS.json").decode("utf-8"))
            for rel_path, expected_hash in manifest_data.items():
                content = z.read(rel_path)
                actual_hash = hashlib.sha256(content).hexdigest()
                assert actual_hash == expected_hash, f"Hash mismatch for {rel_path}"


# ==============================================================================
# 2. CANONICAL PARSER & CSM NORMALIZATION
# ==============================================================================

class TestFortinetRealWorldCSM:
    """Verifies parsing and CSM normalization on the 3 real-world Fortinet configs."""

    def test_azure_reference_csm(self, fortinet_real_configs):
        """Validates CSM normalization of the Azure reference template."""
        raw = fortinet_real_configs["fortigate_azure_reference.conf"]
        csm = fortinet_auditor.parse_fortinet(raw, filename="fortigate_azure_reference.conf")

        assert csm["device"]["hostname"] == "<FORTIGATE_VM_NAME>"
        assert csm["device"]["vendor"] == "fortinet"
        assert csm["device"]["platform"] == "FortiOS"
        assert csm["device"]["management_ip"] == "<EXTERNAL_IP>/<EXTERNAL_CIDR>"

        # Interfaces
        ifaces = csm["interfaces"]
        assert len(ifaces) == 2
        port1 = next(i for i in ifaces if i["name"] == "port1")
        assert port1["ip_address"] == "<EXTERNAL_IP>/<EXTERNAL_CIDR>"
        assert "ssh" in port1["allowaccess"]
        assert "https" in port1["allowaccess"]
        assert "ping" in port1["allowaccess"]

    def test_ibm_user_data_csm(self, fortinet_real_configs):
        """Validates CSM normalization of the IBM user_data configuration."""
        raw = fortinet_real_configs["fortigate_ibm_user_data.conf"]
        csm = fortinet_auditor.parse_fortinet(raw, filename="fortigate_ibm_user_data.conf")

        assert csm["device"]["hostname"] == "FGT-IBM"
        assert csm["device"]["vendor"] == "fortinet"
        assert csm["device"]["platform"] == "FortiOS"
        assert len(csm["interfaces"]) == 2

    def test_gcp_ha_reference_csm(self, fortinet_real_configs):
        """Validates CSM normalization of the GCP HA reference configuration."""
        raw = fortinet_real_configs["fortigate_gcp_ha_reference.conf"]
        csm = fortinet_auditor.parse_fortinet(raw, filename="fortigate_gcp_ha_reference.conf")

        assert csm["device"]["hostname"] == "fgt-vm-<ZONE1_LABEL>"
        assert csm["device"]["vendor"] == "fortinet"
        assert csm["device"]["platform"] == "FortiOS"
        assert len(csm["interfaces"]) == 4

        port3 = next(i for i in csm["interfaces"] if i["name"] == "port3")
        assert port3["ip_address"] == "<HA_SYNC_IP>/32"

    def test_robustness_on_unmapped_sections(self, fortinet_real_configs):
        """Verifies that non-management sections (sdn-connector, router static, system ha) do not crash parser."""
        for name, raw in fortinet_real_configs.items():
            csm = fortinet_auditor.parse_fortinet(raw, filename=name)
            assert isinstance(csm, dict)
            assert csm["schema_version"] == "1.0"
            assert isinstance(csm["unmapped_lines"], list)


# ==============================================================================
# 3. DETERMINISTIC BASELINE RULES EVALUATION
# ==============================================================================

class TestFortinetRealWorldBaselineRules:
    """Verifies evaluation of the 10 baseline rules on real-world configurations."""

    def test_evaluation_completeness(self, fortinet_real_configs):
        """Verifies all 10 baseline rules evaluate to Pass, Fail, or Unknown (never crash)."""
        evaluator = fortinet_auditor.FortinetBaselineEvaluator()
        for name, raw in fortinet_real_configs.items():
            csm = fortinet_auditor.parse_fortinet(raw, filename=name)
            results = evaluator.evaluate(csm)
            assert len(results) == 10
            for r in results:
                assert r.status in (ComplianceStatus.PASS, ComplianceStatus.FAIL, ComplianceStatus.UNKNOWN)
                assert r.evidence is not None

    def test_evaluation_determinism_5_runs(self, fortinet_real_configs):
        """Verifies identical inputs produce identical hashes across 5 evaluation runs."""
        raw = fortinet_real_configs["fortigate_gcp_ha_reference.conf"]
        csm = fortinet_auditor.parse_fortinet(raw)
        evaluator = fortinet_auditor.FortinetBaselineEvaluator()

        hashes = []
        for _ in range(5):
            results = evaluator.evaluate(csm)
            serial = json.dumps([{k: v for k, v in r.to_dict().items() if k != "timestamp"} for r in results], sort_keys=True)
            hashes.append(hashlib.sha256(serial.encode("utf-8")).hexdigest())

        assert len(set(hashes)) == 1, "Non-deterministic evaluation detected across 5 runs"


# ==============================================================================
# 4. ADAPTER DETECTION & NEGATIVE PROTECTION
# ==============================================================================

class TestFortinetRealWorldAdapter:
    """Verifies vendor adapter detection and cross-vendor protection with the real-world dataset."""

    def test_auto_detection_on_all_real_samples(self, clean_vendor_registry, fortinet_real_configs):
        """Verifies clean_vendor_registry.detect() correctly identifies all 3 real-world samples."""
        for name, raw in fortinet_real_configs.items():
            adapter = clean_vendor_registry.detect(raw)
            assert adapter is not None, f"Failed to detect vendor for {name}"
            assert adapter.vendor_id == "fortinet"

    def test_cross_vendor_isolation(self, clean_vendor_registry, fortinet_real_configs):
        """Verifies Cisco, Juniper, Arista, and Palo Alto adapters reject Fortinet configs."""
        for name, raw in fortinet_real_configs.items():
            assert clean_vendor_registry.get("cisco").detect_confidence(raw) == 0.0
            assert clean_vendor_registry.get("juniper").detect_confidence(raw) == 0.0
            assert clean_vendor_registry.get("arista").detect_confidence(raw) == 0.0
            assert clean_vendor_registry.get("paloalto").detect_confidence(raw) == 0.0


# ==============================================================================
# 5. END-TO-END API INGESTION
# ==============================================================================

class TestFortinetRealWorldApiIngestion:
    """Verifies end-to-end API upload with real-world Fortinet configurations."""

    def test_api_upload_fortinet_explicit(self, tmp_path, monkeypatch, fortinet_real_configs):
        """POST /api/audit/upload with explicit vendor='fortinet' succeeds."""
        test_db = tmp_path / "test_forti_api.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin", "admin", "uploader", False)
        client = TestClient(app)

        raw = fortinet_real_configs["fortigate_azure_reference.conf"]
        resp = client.post(
            "/api/audit/upload",
            data={"raw_config": raw, "vendor": "fortinet", "filename": "azure.conf"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["vendor"] == "fortinet"
        assert data["summary"]["total"] == 10

    def test_api_upload_fortinet_auto(self, tmp_path, monkeypatch, fortinet_real_configs):
        """POST /api/audit/upload with vendor='auto' correctly detects Fortinet."""
        test_db = tmp_path / "test_forti_auto.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin", "admin", "uploader", False)
        client = TestClient(app)

        raw = fortinet_real_configs["fortigate_gcp_ha_reference.conf"]
        resp = client.post(
            "/api/audit/upload",
            data={"raw_config": raw, "vendor": "auto", "filename": "gcp_ha.conf"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["vendor"] == "fortinet"
        assert data["summary"]["total"] == 10


# ==============================================================================
# 6. PRODUCTION DATABASE IMMUTABILITY
# ==============================================================================

class TestFortinetProductionDbImmutability:
    """Verifies production database data/auditor.db is never touched by real-world Fortinet testing."""

    def test_production_db_remains_untouched(self, fortinet_real_configs):
        prod_db = pathlib.Path("data/auditor.db")
        if prod_db.exists():
            stat_before = prod_db.stat()
            csm = fortinet_auditor.parse_fortinet(fortinet_real_configs["fortigate_azure_reference.conf"])
            evaluator = fortinet_auditor.FortinetBaselineEvaluator()
            _ = evaluator.evaluate(csm)
            stat_after = prod_db.stat()
            assert stat_before.st_mtime == stat_after.st_mtime
            assert stat_before.st_size == stat_after.st_size
