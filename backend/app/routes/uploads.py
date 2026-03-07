from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
import os
import shutil
from pathlib import Path
from app.auth import get_current_user
from app.schemas import UserResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Get the project root directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = ROOT_DIR / "files"

@router.post("")
@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    category: str = "LAYER_1_MANUALS",
    subcategory: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Upload a file to the server"""
    try:
        # Validate category to prevent directory traversal
        allowed_categories = ["LAYER_1_MANUALS", "LAYER_2_FORM_TEMPLATES", "LAYER_3_FORM_SUBMISSIONS"]
        if category not in allowed_categories:
            raise HTTPException(status_code=400, detail="Invalid category")

        # Ensure directory exists
        target_dir = UPLOAD_DIR / category
        if subcategory:
            # Basic validation for subcategory name
            subcategory = "".join(c for c in subcategory if c.isalnum() or c in (' ', '_', '-')).strip()
            target_dir = target_dir / subcategory
            
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate safe filename
        file_path = target_dir / file.filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return the public URL (assumes files are served at /files)
        url = f"/files/{category}/{subcategory}/{file.filename}" if subcategory else f"/files/{category}/{file.filename}"
        return {
            "filename": file.filename,
            "url": url
        }
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
