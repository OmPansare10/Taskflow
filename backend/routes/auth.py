from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import APIRouter, HTTPException, Depends
from dependencies import get_current_user
from database import db
from bson import ObjectId
import re


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# JWT configuration
SECRET_KEY = "taskflow-secret-key-change-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# -----------------------------
# Request Models
# -----------------------------
class UpdateProfileRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "Developer"
    custom_role: str = ""

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


VALID_ROLES = [
    "Developer",
    "Reviewer",
    "Designer",
    "QA Engineer",
    "Product Manager",
    "Other",
]


@router.get("/users/search")
def search_user(
    identifier: str = Query(..., min_length=1),
    current_user=Depends(get_current_user)
):
    """Find a registered account by email, employee ID, or Mongo user ID."""
    search_value = identifier.strip()
    if not search_value:
        raise HTTPException(
            status_code=400,
            detail="Please enter an email or employee ID."
        )

    query_options = [
        {
            "email": {
                "$regex": f"^{re.escape(search_value)}$",
                "$options": "i"
            }
        },
        {"employee_id": search_value},
    ]

    if ObjectId.is_valid(search_value):
        query_options.append({"_id": ObjectId(search_value)})

    user = db.users.find_one({"$or": query_options})

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No registered account found."
        )

    return {
        "id": str(user["_id"]),
        "name": user.get("name", "User"),
        "email": user.get("email", ""),
        "employee_id": user.get("employee_id", ""),
        "role": user.get("role", "Developer"),
        "custom_role": user.get("custom_role", ""),
        "avatar": user.get("avatar", user.get("name", "U")[0].upper() if user.get("name") else "U")
    }


# -----------------------------
# Register
# -----------------------------

@router.post("/register")
def register_user(user: RegisterRequest):

    existing_user = db.users.find_one({
        "email": user.email
    })

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = pwd_context.hash(user.password)

    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "role": "Developer",
        "avatar": user.name[0].upper(),
        "created_at": datetime.now(timezone.utc)
    }

    result = db.users.insert_one(new_user)

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id),
        "name": user.name,
        "email": user.email
    }


# -----------------------------
# Login
# -----------------------------

@router.post("/login")
def login_user(user: LoginRequest):

    # Find user
    existing_user = db.users.find_one({
        "email": user.email
    })

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    password_correct = pwd_context.verify(
        user.password,
        existing_user["password"]
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create JWT token
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    token_data = {
        "sub": str(existing_user["_id"]),
        "email": existing_user["email"],
        "name": existing_user["name"],
        "exp": expire
    }

    access_token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(existing_user["_id"]),
            "name": existing_user["name"],
            "email": existing_user["email"],
            "avatar": existing_user["avatar"],
            "role": existing_user.get("role", "Developer"),
            "custom_role": existing_user.get("custom_role", "")
        }
    }
# -----------------------------
# Update Profile
# -----------------------------

@router.put("/profile")
def update_profile(
    profile: UpdateProfileRequest,
    current_user=Depends(get_current_user)
):

    # Check if another user already has this email
    existing_user = db.users.find_one({
        "email": profile.email,
        "_id": {
            "$ne": current_user["_id"]
        }
    })

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered by another user"
        )

    # Validate name
    if not profile.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty"
        )

    if profile.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )

    custom_role = profile.custom_role.strip()

    if profile.role == "Other" and not custom_role:
        raise HTTPException(
            status_code=400,
            detail="Enter a custom role"
        )

    if profile.role != "Other":
        custom_role = ""

    # Generate avatar from first letter
    avatar = profile.name.strip()[0].upper()

    # Update user
    db.users.update_one(
        {
            "_id": current_user["_id"]
        },
        {
            "$set": {
                "name": profile.name.strip(),
                "email": profile.email,
                "role": profile.role,
                "custom_role": custom_role,
                "avatar": avatar
            }
        }
    )

    # Get updated user
    updated_user = db.users.find_one({
        "_id": current_user["_id"]
    })

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": str(updated_user["_id"]),
            "name": updated_user["name"],
            "email": updated_user["email"],
            "avatar": updated_user["avatar"],
            "role": updated_user.get("role", "Developer"),
            "custom_role": updated_user.get("custom_role", "")
        }
    }