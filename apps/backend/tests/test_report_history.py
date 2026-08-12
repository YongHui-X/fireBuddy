import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.evaluation.report_history import (
    list_report_versions,
    save_versioned_report,
)


class ReportHistoryTests(unittest.TestCase):
    def test_major_runs_create_separate_versions_and_update_latest(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            results_directory = Path(temporary_directory)
            latest_json = results_directory / "retrieval_latest.json"
            latest_markdown = results_directory / "retrieval_latest.md"

            first = save_versioned_report(
                suite="retrieval",
                report={
                    "generated_at": "2026-08-12T00:00:00+00:00",
                    "case_count": 1,
                    "metrics": {"recall@5": 0.8, "ndcg@5": 0.7},
                },
                markdown="# Retrieval\n",
                results_directory=results_directory,
                latest_json_path=latest_json,
                latest_markdown_path=latest_markdown,
                run_label="Baseline",
            )
            second = save_versioned_report(
                suite="retrieval",
                report={
                    "generated_at": "2026-08-13T00:00:00+00:00",
                    "case_count": 1,
                    "metrics": {"recall@5": 0.9, "ndcg@5": 0.8},
                },
                markdown="# Retrieval\n",
                results_directory=results_directory,
                latest_json_path=latest_json,
                latest_markdown_path=latest_markdown,
                run_label="Improved retrieval",
            )

            self.assertEqual((first.version, second.version), (1, 2))
            self.assertEqual(list_report_versions(results_directory, "retrieval"), (1, 2))
            self.assertEqual(json.loads(first.json_path.read_text())["metrics"]["recall@5"], 0.8)
            self.assertEqual(json.loads(latest_json.read_text())["report_version"], 2)

            history = (results_directory / "README.md").read_text(encoding="utf-8")
            self.assertIn("### Version 1: Baseline", history)
            self.assertIn("### Version 2: Improved retrieval", history)
            self.assertIn("| ndcg@5 | 0.8000 |", history)

    def test_existing_version_artifact_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            results_directory = Path(temporary_directory)
            versions_directory = results_directory / "answer" / "versions"
            versions_directory.mkdir(parents=True)
            existing_json = versions_directory / "v001.json"
            existing_json.write_text("existing", encoding="utf-8")

            with patch(
                "rag.evaluation.report_history.list_report_versions",
                return_value=(),
            ):
                with self.assertRaises(FileExistsError):
                    save_versioned_report(
                        suite="answer",
                        report={"generated_at": "now", "case_count": 0, "summary": {}},
                        markdown="# Answer\n",
                        results_directory=results_directory,
                        latest_json_path=results_directory / "answer_latest.json",
                        latest_markdown_path=results_directory / "answer_latest.md",
                        run_label="Should not overwrite",
                    )

            self.assertEqual(existing_json.read_text(encoding="utf-8"), "existing")


if __name__ == "__main__":
    unittest.main()
