"""Creates the standard admin accounts if missing. Needs ADMIN_BOOTSTRAP_PASSWORD
in the environment; see utils/admin_bootstrap.py. Never resets existing passwords."""
from utils.admin_bootstrap import ensure_default_admins

if __name__ == "__main__":
    n = ensure_default_admins()
    print(f"Admin synchronization complete. {n} new admin(s) added.")
