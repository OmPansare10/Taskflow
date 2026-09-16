from pymongo import MongoClient
from dotenv import load_dotenv
import os


# Load .env
load_dotenv()


# Get MongoDB settings
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "taskflow")


# Check URI
if not MONGO_URI:
    raise ValueError("MONGO_URI is not set in .env")


# MongoDB connection
client = MongoClient(MONGO_URI)


# Database
db = client[DATABASE_NAME]