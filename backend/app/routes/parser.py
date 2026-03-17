from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.services.smart_parser import SmartParser
from app.auth import get_current_user
from app.schemas import UserResponse, UserRole
from app.database import db
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path
import shutil
import os
from app.schemas.documents import FormCategory, ScheduleFrequency, AssignedRole

router = APIRouter(prefix="/parser", tags=["parser"])

# Use the same upload directory logic as uploads.py
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = ROOT_DIR / "files"

def save_upload_file(file: UploadFile, subcategory: str = None) -> str:
    category = "LAYER_2_FORM_TEMPLATES"
    target_dir = UPLOAD_DIR / category
    if subcategory:
        cleaned_sub = "".join(c for c in subcategory if c.isalnum() or c in (' ', '_', '-')).strip()
        target_dir = target_dir / cleaned_sub
    
    target_dir.mkdir(parents=True, exist_ok=True)
    file_path = target_dir / file.filename
    
    # We need to seek back to start if we read it before
    file.file.seek(0)
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"/files/{category}/{subcategory}/{file.filename}" if subcategory else f"/files/{category}/{file.filename}"
    return url

@router.post("/word-to-form")
@router.post("/word-to-form/")
async def parse_to_form(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Accepts a document and returns a structured JSON representing the form fields.
    Also saves the document and returns its URL.
    """
    try:
        # Read content for parsing
        content = await file.read()
        
        # Parse content
        result = SmartParser.parse_to_form(content, file.filename)
        
        # Save file for download
        file_url = save_upload_file(file)
        
        # Attach file info to result
        result["file_url"] = file_url
        result["file_name"] = file.filename
        
        return result
    except Exception as e:
        print(f"Parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

@router.post("/bulk-import")
async def bulk_import_to_templates(
    files: List[UploadFile] = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Accepts multiple documents, parses them, and automatically creates FormTemplates.
    Also links the original document.
    """
    if current_user.role not in [UserRole.STAFF, UserRole.MASTER]:
        raise HTTPException(status_code=403, detail="Only staff or master can bulk import templates")

    results = []
    now = datetime.utcnow()
    batch = db.batch()

    for file in files:
        try:
            print(f"📦 Processing bulk import for: {file.filename}")
            file.file.seek(0)
            content = await file.read()
            parsed = SmartParser.parse_to_form(content, file.filename)
            file_url = save_upload_file(file)
            
            # Create template data - use .value for enums so Firestore stores plain strings
            template_data = {
                "name": parsed["title"],
                "category": FormCategory.CHECKLIST.value,
                "description": f"Auto-imported from {file.filename}",
                "fields": parsed["fields"],
                "approval_required": True,
                "scheduled": ScheduleFrequency.WEEKLY.value,
                "role": AssignedRole.CREW.value,
                "document_data": {
                    "file_name": file.filename,
                    "file_url": file_url,
                    "is_file_tunnel": True
                },
                "spreadsheet_data": parsed.get("spreadsheet_data"),
                "created_by": current_user.id,
                "created_at": now,
                "updated_at": now
            }
            
            doc_ref = db.collection('form_templates').document()
            batch.set(doc_ref, template_data)
            
            print(f"✅ Success: Parsed {file.filename} -> ID: {doc_ref.id}")
            results.append({
                "filename": file.filename,
                "status": "success",
                "template_id": doc_ref.id,
                "name": parsed["title"]
            })
        except Exception as e:
            print(f"❌ Error: Bulk import failed for {file.filename}: {str(e)}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })

    try:
        batch.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save templates: {str(e)}")

    return {"results": results}
