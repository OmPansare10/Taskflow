#!/usr/bin/env python3
"""
TaskFlow - Local MongoDB Backup Script
Safely exports all collections from local MongoDB to BSON-compatible JSON files.
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from pymongo import MongoClient
from bson import json_util

def backup_local_mongodb(source_uri=None, db_name=None, output_dir=None):
    source_uri = source_uri or os.getenv("SOURCE_MONGO_URI", "mongodb://localhost:27017")
    db_name = db_name or os.getenv("SOURCE_DB_NAME", "taskflow_db")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not output_dir:
        base_dir = Path(__file__).resolve().parent.parent / "data" / "backups"
        output_dir = base_dir / f"backup_{db_name}_{timestamp}"
    else:
        output_dir = Path(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Connecting to local MongoDB: {source_uri}")
    client = MongoClient(source_uri, serverSelectionTimeoutMS=3000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"[!] Error: Could not connect to local MongoDB: {e}")
        sys.exit(1)

    db = client[db_name]
    collections = sorted(db.list_collection_names())

    if not collections:
        print(f"[!] Warning: No collections found in database '{db_name}'.")
        return output_dir, {}

    print(f"[*] Backing up database '{db_name}' to: {output_dir}")
    counts = {}
    for col_name in collections:
        col = db[col_name]
        docs = list(col.find({}))
        counts[col_name] = len(docs)
        file_path = output_dir / f"{col_name}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(json_util.dumps(docs, indent=2))
        print(f"    [OK] {col_name}: {len(docs)} documents exported to {file_path.name}")

    print(f"[SUCCESS] Backup complete! Total {sum(counts.values())} documents backed up across {len(counts)} collections.")
    return output_dir, counts

if __name__ == "__main__":
    backup_local_mongodb()
