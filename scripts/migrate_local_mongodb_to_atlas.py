#!/usr/bin/env python3
"""
Root-level wrapper to run the TaskFlow MongoDB Atlas migration script.
"""
import sys
from pathlib import Path

backend_scripts = Path(__file__).resolve().parent.parent / "backend" / "scripts"
sys.path.insert(0, str(backend_scripts))

from migrate_local_mongodb_to_atlas import main

if __name__ == "__main__":
    main()
