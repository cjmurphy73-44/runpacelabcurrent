#!/usr/bin/env python3
"""SQLite-backed D1 correction batch simulation; no cloud access or secrets."""
import concurrent.futures
import pathlib
import sqlite3
import tempfile
import unittest
import uuid

SCHEMA = pathlib.Path(__file__).with_name("schema.sql").read_text()

class CorrectionBatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(pathlib.Path(self.temp.name) / "test.db")
        db = self.connect()
        db.executescript(SCHEMA)
        db.execute("""INSERT INTO race_results
            (id,owner_id,race_identity,race_date,sport,distance_m,elapsed_seconds)
            VALUES ('race-1','athlete-a','original','2026-11-01','running',5000,1200)""")
        db.close()

    def tearDown(self):
        self.temp.cleanup()

    def connect(self):
        db = sqlite3.connect(self.path, isolation_level=None, timeout=15)
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=15000")
        return db

    def correct(self, key, expected=1, identity="corrected", fail=False):
        db = self.connect()
        try:
            db.execute("BEGIN IMMEDIATE")
            db.execute("""INSERT INTO race_correction_requests
                (owner_id,request_key,request_fingerprint,race_id,response_json)
                VALUES (?,?,?,?,?)""", ("athlete-a", key, identity, "race-1", '{"revision":2}'))
            db.execute("""UPDATE race_results SET race_identity=?,revision=revision+1
                WHERE id='race-1' AND owner_id='athlete-a' AND revision=?""", (identity, expected))
            db.execute("""INSERT INTO race_correction_assertions(assertion_id,affected)
                VALUES (?,changes())""", (key,))
            if fail:
                raise RuntimeError("synthetic_failure")
            db.execute("DELETE FROM race_correction_assertions WHERE assertion_id=?", (key,))
            db.execute("COMMIT")
            return True
        except Exception:
            db.execute("ROLLBACK")
            raise
        finally:
            db.close()

    def test_concurrent_cas_one_winner_and_one_audit(self):
        def attempt(i):
            try:
                self.correct("request-" + str(i), identity="new-" + str(i))
                return True
            except sqlite3.IntegrityError:
                return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(attempt, range(12)))
        self.assertEqual(sum(results), 1)
        db = self.connect()
        self.assertEqual(db.execute("SELECT revision FROM race_results").fetchone()[0], 2)
        self.assertEqual(db.execute("SELECT count(*) FROM race_correction_requests").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit WHERE action='corrected'").fetchone()[0], 1)
        db.close()

    def test_stale_revision_rolls_back_request_and_audit(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.correct("request-stale", expected=9)
        db = self.connect()
        self.assertEqual(db.execute("SELECT count(*) FROM race_correction_requests").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit WHERE action='corrected'").fetchone()[0], 0)
        db.close()

    def test_forced_failure_rolls_back_all(self):
        with self.assertRaises(RuntimeError):
            self.correct("request-fail", fail=True)
        db = self.connect()
        self.assertEqual(db.execute("SELECT revision FROM race_results").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT count(*) FROM race_correction_requests").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit WHERE action='corrected'").fetchone()[0], 0)
        db.close()

    def test_duplicate_request_key_cannot_create_second_correction(self):
        self.correct("request-one")
        with self.assertRaises(sqlite3.IntegrityError):
            self.correct("request-one", expected=2, identity="another")
        db = self.connect()
        self.assertEqual(db.execute("SELECT revision FROM race_results").fetchone()[0], 2)
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit WHERE action='corrected'").fetchone()[0], 1)
        db.close()

    def test_replay_snapshot_survives_later_correction(self):
        self.correct("request-first", identity="corrected-once")
        db = self.connect()
        before = db.execute("""SELECT response_json FROM race_correction_requests
            WHERE owner_id=? AND request_key=?""", ("athlete-a", "request-first")).fetchone()[0]
        db.close()
        self.correct("request-second", expected=2, identity="corrected-twice")
        db = self.connect()
        after = db.execute("""SELECT response_json FROM race_correction_requests
            WHERE owner_id=? AND request_key=?""", ("athlete-a", "request-first")).fetchone()[0]
        self.assertEqual(before, after)
        self.assertEqual(db.execute("SELECT revision FROM race_results").fetchone()[0], 3)
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit WHERE action='corrected'").fetchone()[0], 2)
        db.close()

    def test_audit_rows_are_immutable(self):
        self.correct("request-first")
        db = self.connect()
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("DELETE FROM race_audit WHERE action='corrected'")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("UPDATE race_audit SET action='created' WHERE action='corrected'")
        db.close()

    def test_foreign_owner_update_rejected_by_revision_assertion(self):
        db = self.connect()
        try:
            db.execute("BEGIN IMMEDIATE")
            db.execute("""UPDATE race_results SET race_identity='foreign',revision=revision+1
                WHERE id='race-1' AND owner_id='athlete-b' AND revision=1""")
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("INSERT INTO race_correction_assertions VALUES (?,changes())", ("foreign",))
            db.execute("ROLLBACK")
        finally:
            db.close()

if __name__ == "__main__":
    unittest.main()
