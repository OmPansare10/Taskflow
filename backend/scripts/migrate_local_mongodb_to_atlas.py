#!/usr/bin/env python3
"""
TaskFlow - Local MongoDB to MongoDB Atlas Migration Script

Features:
1. Automatically backs up local MongoDB prior to migration.
2. Connects to Source (local) and Target (Atlas) databases.
3. Preserves all ObjectIds, data types, timestamps, relationships, and password hashes intact.
4. Uses idempotent bulk upsert (ReplaceOne with upsert=True) - safe to rerun at any time without duplicates.
5. Replicates collection indexes.
6. Verifies source vs destination document counts and data integrity.
7. Never logs sensitive credentials.
"""

import os
import sys
import argparse
from datetime import datetime
from pathlib import Path
from pymongo import MongoClient, ReplaceOne
from pymongo.errors import PyMongoError

# Import backup utility
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from backup_local_mongodb import backup_local_mongodb
except ImportError:
    backup_local_mongodb = None

def mask_connection_string(uri):
    if not uri:
        return "(empty)"
    import re
    if "mongodb+srv" in uri or "@" in uri:
        return re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', uri)
    return uri

def run_migration(source_uri=None, source_db_name=None, target_uri=None, target_db_name=None, skip_backup=False):
    source_uri = source_uri or os.getenv("SOURCE_MONGO_URI", "mongodb://localhost:27017")
    source_db_name = source_db_name or os.getenv("SOURCE_DB_NAME", "taskflow_db")
    
    target_uri = (
        target_uri 
        or os.getenv("TARGET_MONGO_URI") 
        or os.getenv("MONGO_URI") 
        or os.getenv("MONGODB_URI")
    )
    target_db_name = target_db_name or os.getenv("TARGET_DB_NAME") or os.getenv("DATABASE_NAME", "taskflow")

    print("=" * 65)
    print(" TASKFLOW: MONGODB LOCAL -> MONGODB ATLAS MIGRATION")
    print("=" * 65)
    print(f" Source Mongo URI : {mask_connection_string(source_uri)}")
    print(f" Source Database  : {source_db_name}")
    print(f" Target Mongo URI : {mask_connection_string(target_uri)}")
    print(f" Target Database  : {target_db_name}")
    print("-" * 65)

    if not target_uri or target_uri.strip() == "mongodb://localhost:27017":
        print("[!] ERROR: Target MongoDB Atlas connection string is required.")
        print("    Please provide it via TARGET_MONGO_URI or MONGO_URI, e.g.:")
        print('    $env:TARGET_MONGO_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"')
        print("    python scripts/migrate_local_mongodb_to_atlas.py")
        print("    or pass --target-uri <URI>")
        return False

    # 1. Automated Local Backup
    if not skip_backup and backup_local_mongodb:
        print("[1/5] Performing automated local MongoDB backup...")
        try:
            backup_dir, counts = backup_local_mongodb(source_uri, source_db_name)
            print(f"      [OK] Verified backup saved to: {backup_dir.name}\n")
        except Exception as e:
            print(f"[!] Warning: Backup encountered an issue: {e}")
            choice = input("    Do you want to proceed with migration without backup? (y/N): ").strip().lower()
            if choice != 'y':
                print("Aborting migration.")
                return False

    # 2. Connect to Source
    print("[2/5] Connecting to local MongoDB source...")
    try:
        source_client = MongoClient(source_uri, serverSelectionTimeoutMS=5000)
        source_client.admin.command('ping')
        source_db = source_client[source_db_name]
        print("      [OK] Connected to source database successfully.")
    except Exception as e:
        print(f"[!] FAILED to connect to source MongoDB: {e}")
        return False

    # 3. Connect to Target (Atlas)
    print("[3/5] Connecting to target MongoDB Atlas...")
    try:
        target_client = MongoClient(target_uri, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
        target_client.admin.command('ping')
        target_db = target_client[target_db_name]
        print("      [OK] Connected to target MongoDB Atlas successfully.")
    except Exception as e:
        print(f"[!] FAILED to connect to target MongoDB Atlas: {e}")
        print("    Please check that:")
        print("    1. Your Atlas connection string, username, and password are correct.")
        print("    2. Atlas Network Access (IP Access List) allows access from 0.0.0.0/0.")
        return False

    # 4. Migrate Collections
    print("\n[4/5] Migrating collections and documents...")
    all_collections = sorted(source_db.list_collection_names())
    # Exclude system collections
    collections_to_migrate = [c for c in all_collections if not c.startswith("system.")]

    results = []
    total_migrated = 0

    for col_name in collections_to_migrate:
        src_col = source_db[col_name]
        dst_col = target_db[col_name]
        
        src_count = src_col.count_documents({})
        if src_count == 0:
            results.append((col_name, 0, dst_col.count_documents({}), "EMPTY (Skipped)"))
            continue

        print(f"      --> Migrating '{col_name}' ({src_count} documents)...")
        
        # Batch migration using ReplaceOne with upsert=True
        # This preserves IDs, exact schemas, and prevents duplicate records
        cursor = src_col.find({})
        batch = []
        batch_size = 100
        upserted_count = 0

        for doc in cursor:
            batch.append(ReplaceOne({"_id": doc["_id"]}, doc, upsert=True))
            if len(batch) >= batch_size:
                res = dst_col.bulk_write(batch, ordered=False)
                upserted_count += (res.upserted_count + res.modified_count + res.matched_count)
                batch = []

        if batch:
            res = dst_col.bulk_write(batch, ordered=False)
            upserted_count += (res.upserted_count + res.modified_count + res.matched_count)

        # Copy indexes (excluding _id_ which is automatic)
        try:
            indexes = src_col.index_information()
            for idx_name, idx_info in indexes.items():
                if idx_name == "_id_":
                    continue
                keys = idx_info["key"]
                options = {k: v for k, v in idx_info.items() if k not in ("key", "v", "ns")}
                dst_col.create_index(keys, name=idx_name, **options)
        except Exception as idx_err:
            print(f"          [Note: Index recreation note on {col_name}: {idx_err}]")

        dst_count = dst_col.count_documents({})
        status_str = "MATCHED [OK]" if dst_count >= src_count else "COUNT MISMATCH"
        results.append((col_name, src_count, dst_count, status_str))
        total_migrated += src_count

    # 5. Post-migration Verification
    print("\n[5/5] Migration Verification Report:")
    print("+" + "-" * 26 + "+" + "-" * 15 + "+" + "-" * 15 + "+" + "-" * 18 + "+")
    print(f"| {'Collection':<24} | {'Source Docs':<13} | {'Target Docs':<13} | {'Status':<16} |")
    print("+" + "-" * 26 + "+" + "-" * 15 + "+" + "-" * 15 + "+" + "-" * 18 + "+")
    
    all_matched = True
    for col_name, src_cnt, dst_cnt, status in results:
        print(f"| {col_name:<24} | {src_cnt:<13} | {dst_cnt:<13} | {status:<16} |")
        if "MISMATCH" in status:
            all_matched = False
    print("+" + "-" * 26 + "+" + "-" * 15 + "+" + "-" * 15 + "+" + "-" * 18 + "+")

    # Verify user passwords integrity
    print("\n[*] Verifying Authentication & Password Hash Integrity...")
    src_users = {u["email"]: (u.get("password_hash") or u.get("password")) for u in source_db.users.find({}, {"email": 1, "password_hash": 1, "password": 1})}
    dst_users = {u["email"]: (u.get("password_hash") or u.get("password")) for u in target_db.users.find({}, {"email": 1, "password_hash": 1, "password": 1})}
    
    passwords_intact = True
    for email, src_hash in src_users.items():
        dst_hash = dst_users.get(email)
        if not dst_hash:
            print(f"    [!] User '{email}' missing in destination!")
            passwords_intact = False
        elif src_hash != dst_hash:
            print(f"    [!] Password hash mismatch for user '{email}'!")
            passwords_intact = False
        else:
            print(f"    [OK] User '{email}' password hash verified and intact.")

    print("\n" + "=" * 65)
    if all_matched and passwords_intact:
        print(" [SUCCESS] ALL LOCAL DATA SUCCESSFULLY MIGRATED TO ATLAS!")
        print("           Source database remains 100% untouched for local dev.")
        print("=" * 65)
        return True
    else:
        print(" [!] MIGRATION FINISHED WITH WARNINGS. Please inspect log above.")
        print("=" * 65)
        return False

def main():
    parser = argparse.ArgumentParser(description="Migrate local MongoDB data to MongoDB Atlas for TaskFlow.")
    parser.add_argument("--source-uri", default=os.getenv("SOURCE_MONGO_URI", "mongodb://localhost:27017"), help="Source MongoDB URI")
    parser.add_argument("--source-db", default=os.getenv("SOURCE_DB_NAME", "taskflow_db"), help="Source database name")
    parser.add_argument("--target-uri", default=os.getenv("TARGET_MONGO_URI") or os.getenv("MONGO_URI"), help="Target MongoDB Atlas URI")
    parser.add_argument("--target-db", default=os.getenv("TARGET_DB_NAME") or os.getenv("DATABASE_NAME", "taskflow"), help="Target database name")
    parser.add_argument("--skip-backup", action="store_true", help="Skip pre-migration local backup")

    args = parser.parse_args()
    success = run_migration(
        source_uri=args.source_uri,
        source_db_name=args.source_db,
        target_uri=args.target_uri,
        target_db_name=args.target_db,
        skip_backup=args.skip_backup
    )
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
