# Archived test scripts

One-off audit and validation scripts from earlier development phases
(Phase 1–3 audits, e-mail delivery check, early end-to-end and production
gates, WebM normalisation checks). They are kept for reference but are not
part of the maintained suite listed in the main README, and some assume data
or deployments that no longer exist.

Run one from the `backend/` folder, e.g.

    ../.venv311/Scripts/python.exe tests_archive/test_phase1_audit.py

Like every `test_*.py` script, they use the separate `mockai_test` database
(see `database.py`).
