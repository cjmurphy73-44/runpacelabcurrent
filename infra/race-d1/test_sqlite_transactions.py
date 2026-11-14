#!/usr/bin/env python3
"""Real SQLite constraint/transaction tests for the D1 candidate schema.
Run: python3 -m unittest discover -s infra/race-d1 -p 'test_*.py' -v
Does not test the Cloudflare D1 API, Worker authentication or network races.
"""
import concurrent.futures
import pathlib
import sqlite3
import tempfile
import threading
import unittest
import uuid

SCHEMA = pathlib.Path(__file__).with_name("schema.sql").read_text()
RACE = ("2026-11-01", "running", 5000, 1200)


def connect(path):
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=15000")
    return db


class SQLiteRaceTransactions(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = str(pathlib.Path(self.tmp.name) / "race.sqlite")
        db = connect(self.path)
        db.executescript(SCHEMA)
        db.close()

    def tearDown(self):
        self.tmp.cleanup()

    def create(self, owner, key, identity="race-1", fail=False):
        db = connect(self.path)
        try:
            db.execute("BEGIN IMMEDIATE")
            db.execute("INSERT INTO race_requests(owner_id,request_key,request_fingerprint) VALUES (?,?,?)",
                       (owner, key, identity))
            race_id = str(uuid.uuid4())
            db.execute("""INSERT INTO race_results
               (id,owner_id,race_identity,race_date,sport,distance_m,elapsed_seconds)
               VALUES (?,?,?,?,?,?,?)""", (race_id, owner, identity, *RACE))
            if fail:
                raise RuntimeError("simulate lost transaction")
            db.execute("UPDATE race_requests SET race_id=? WHERE owner_id=? AND request_key=?",
                       (race_id, owner, key))
            db.execute("COMMIT")
            return race_id
        except Exception:
            db.execute("ROLLBACK")
            raise
        finally:
            db.close()

    def test_duplicate_identity_unique_under_concurrent_writers(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda i: self._try_create(i), range(16)))
        self.assertEqual(sum(results), 1)
        db = connect(self.path)
        self.assertEqual(db.execute("SELECT count(*) FROM race_results").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT count(*) FROM race_requests").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit").fetchone()[0], 1)
        db.close()

    def _try_create(self, i):
        try:
            self.create("athlete-a", f"request-{i}")
            return 1
        except sqlite3.IntegrityError:
            return 0

    def test_idempotency_request_key_unique(self):
        self.create("athlete-a", "request-one")
        with self.assertRaises(sqlite3.IntegrityError):
            self.create("athlete-a", "request-one", "race-2")

    def test_owner_scoped_identity(self):
        self.create("athlete-a", "request-one")
        self.create("athlete-b", "request-one")
        db = connect(self.path)
        self.assertEqual(db.execute("SELECT count(*) FROM race_results").fetchone()[0], 2)
        db.close()

    def test_rollback_restores_request_and_audit(self):
        with self.assertRaises(RuntimeError):
            self.create("athlete-a", "request-one", fail=True)
        db = connect(self.path)
        for table in ("race_requests", "race_results", "race_audit"):
            self.assertEqual(db.execute(f"SELECT count(*) FROM {table}").fetchone()[0], 0)
        db.close()

    def test_atomic_correction_and_audit(self):
        race_id = self.create("athlete-a", "request-one")
        def correction(seconds):
            db = connect(self.path)
            try:
                row = db.execute("""UPDATE race_results SET race_identity=?, elapsed_seconds=?,
                  revision=revision+1 WHERE id=? AND owner_id=? AND revision=1
                  RETURNING revision""", (f"race-{seconds}", seconds, race_id, "athlete-a")).fetchone()
                return bool(row)
            finally:
                db.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(correction, [1201, 1202]))
        self.assertEqual(sum(results), 1)
        db = connect(self.path)
        self.assertEqual(db.execute("SELECT revision FROM race_results").fetchone()[0], 2)
        self.assertEqual(db.execute("SELECT action FROM race_audit ORDER BY audit_id").fetchall(),
                         [("created",), ("corrected",)])
        self.assertEqual(db.execute("UPDATE race_results SET revision=3 WHERE id=? AND owner_id=? AND revision=1",
                                    (race_id, "athlete-b")).rowcount, 0)
        db.close()

    def test_duplicate_correction_rolls_back_without_audit(self):
        first = self.create("athlete-a", "request-one", "race-1")
        self.create("athlete-a", "request-two", "race-2")
        db = connect(self.path)
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("""UPDATE race_results SET race_identity='race-2',revision=revision+1
                       WHERE id=? AND owner_id=? AND revision=1""", (first, "athlete-a"))
        self.assertEqual(db.execute("SELECT count(*) FROM race_audit").fetchone()[0], 2)
        self.assertEqual(db.execute("SELECT revision FROM race_results WHERE id=?", (first,)).fetchone()[0], 1)
        db.close()


if __name__ == "__main__":
    unittest.main()
