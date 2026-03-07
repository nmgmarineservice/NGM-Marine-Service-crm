from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Import all routes
from app.routes.users import router as users_router
from app.routes.ships import router as ships_router
from app.routes.pms import router as pms_router
from app.routes.admin import router as admin_router
from app.routes.incidents import router as incidents_router
from app.routes.audits import router as audits_router
from app.routes.cargo import router as cargo_router
from app.routes.worklogs import router as worklogs_router
from app.routes.bunkering import router as bunkering_router
from app.routes.recruitment import router as recruitment_router
from app.routes.dg_communications import router as dg_communications_router
from app.routes.invoices import router as invoices_router
from app.routes.clients import router as clients_router
from app.routes.dashboard import router as dashboard_router
from app.routes.documents import router as documents_router
from app.routes.uploads import router as uploads_router
from app.routes.parser import router as parser_router
from app.routes.onboarding import router as onboarding_router
from app.database import ship_service, user_service
from app.schemas import *
from fastapi.staticfiles import StaticFiles
from pathlib import Path

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    print("🚀 NMG Marine Management System starting up...")
    
    # Verify Firebase configuration
    from app.firebase import firebase_config
    if not firebase_config.get("private_key") or not firebase_config.get("project_id"):
        print("⚠️ WARNING: Firebase configuration is incomplete! Check environment variables.")
        print(f"   Project ID: {'PRESENT' if firebase_config.get('project_id') else 'MISSING'}")
        print(f"   Private Key: {'PRESENT' if firebase_config.get('private_key') else 'MISSING'}")
    
    # Initialize default data
    try:
        await initialize_default_data()
    except Exception as e:
        print(f"❌ Error during data initialization: {str(e)}")
    
    yield
    
    print("🔄 NMG Marine Management System shutting down...")

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "NMG Marine Management System"),
    description="Complete Role-Based PMS & CRM System for Marine Fleet Management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
backend_cors_origins = os.getenv("BACKEND_CORS_ORIGINS")
if backend_cors_origins:
    try:
        import json
        origins = json.loads(backend_cors_origins)
    except Exception:
        origins = [origin.strip() for origin in backend_cors_origins.split(",")]
else:
    # Default for production/Railway: Allow all or specific railway domains
    origins = ["*"]

# In production, check for Railway environment
is_railway = os.getenv("RAILWAY_STATIC_URL") or os.getenv("RAILWAY_PUBLIC_DOMAIN")
if is_railway:
    print(f"🌐 Running on Railway, allowing origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Browsers block "*" origins if allow_credentials is True
    # If we need credentials (like Firebase tokens in some flows), origins cannot be "*"
    # But for Bearer tokens in headers, "*" is usually fine if allow_credentials is False.
    # To be safe for auth, we'll allow credentials and handle the origin properly.
    allow_credentials=True if origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NMG Marine Management System",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
def root():
    return {
        "message": "NMG Marine Management System API",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

# Include all routers
app.include_router(users_router, prefix="/api/v1")
app.include_router(ships_router, prefix="/api/v1") 
app.include_router(pms_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(incidents_router, prefix="/api/v1")
app.include_router(audits_router, prefix="/api/v1")
app.include_router(cargo_router, prefix="/api/v1")
app.include_router(worklogs_router, prefix="/api/v1")
app.include_router(bunkering_router, prefix="/api/v1")
app.include_router(recruitment_router, prefix="/api/v1")
app.include_router(dg_communications_router, prefix="/api/v1")
app.include_router(invoices_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(parser_router, prefix="/api/v1")
app.include_router(clients_router, prefix="/api/v1")
app.include_router(onboarding_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

# Mount files directory to serve documents
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FILES_DIR = ROOT_DIR / "files"
FILES_DIR.mkdir(exist_ok=True)
app.mount("/files", StaticFiles(directory=str(FILES_DIR)), name="files")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Initialize default data function
async def initialize_default_data():
    """Initialize default ships and demo users"""
    try:
        # Check if ships already exist
        existing_ships = await ship_service.get_all_ships()
        if len(existing_ships) > 0:
            print("📊 Default data already exists")
            return
        
        print("🔄 Initializing default fleet data...")
        
        # Create the 7 ships from the system overview
        default_ships = [
            {
                "name": "MV Ocean Star",
                "type": "bulk_carrier",
                "imo_number": "IMO9001001",
                "flag_state": "Panama",
                "status": "active",
                "call_sign": "H3RC",
                "gross_tonnage": 35000.0,
                "built_year": 2018,
                "owner": "NMG Marine Corp",
                "operator": "NMG Operations"
            },
            {
                "name": "MT Pacific Wave", 
                "type": "oil_tanker",
                "imo_number": "IMO9001002",
                "flag_state": "Liberia",
                "status": "active",
                "call_sign": "A8TC",
                "gross_tonnage": 45000.0,
                "built_year": 2020,
                "owner": "NMG Marine Corp",
                "operator": "NMG Operations"
            },
            {
                "name": "MV Atlantic Trader",
                "type": "container_ship",
                "imo_number": "IMO9001003", 
                "flag_state": "Marshall Islands",
                "status": "active",
                "call_sign": "V7AA",
                "gross_tonnage": 85000.0,
                "built_year": 2019,
                "owner": "NMG Marine Corp",
                "operator": "NMG Operations"
            },
            {
                "name": "MT Indian Star",
                "type": "chemical_tanker",
                "imo_number": "IMO9001004",
                "flag_state": "Singapore",
                "status": "maintenance",
                "call_sign": "9VXY",
                "gross_tonnage": 25000.0,
                "built_year": 2017,
                "owner": "NMG Marine Corp",
                "operator": "NMG Operations"
            },
            {
                "name": "MV Arctic Explorer",
                "type": "bulk_carrier",
                "imo_number": "IMO9001005",
                "flag_state": "Norway",
                "status": "active",
                "call_sign": "LABC",
                "gross_tonnage": 40000.0,
                "built_year": 2021,
                "owner": "NMG Marine Corp",
                "operator": "NMG Operations"
            },
            {
                "name": "MT Mediterranean",
                "type": "oil_tanker",
                "imo_number": "IMO9001006",
                "flag_state": "Malta",
                "status": "docked",
                "call_sign": "9HXY",
                "gross_tonnage": 55000.0,
                "built_year": 2016,
                "owner": "NMG Marine Corp",
                "operator": "NMG Operations"
            },
            {
                "name": "MV Global Trader",
                "type": "container_ship",
                "imo_number": "IMO9001007",
                "flag_state": "Hong Kong",
                "status": "active",
                "call_sign": "VRXY",
                "gross_tonnage": 95000.0,
                "built_year": 2022,
                "owner": "NMG Marine Corp", 
                "operator": "NMG Operations"
            }
        ]
        
        # Create ships
        for ship_data in default_ships:
            try:
                ship_create = ShipCreate(**ship_data)
                created_ship = await ship_service.create_ship(ship_create)
                print(f"✅ Created ship: {created_ship.name}")
            except Exception as ship_error:
                print(f"❌ Error creating ship {ship_data.get('name', 'Unknown')}: {str(ship_error)}")
                print(f"   Ship data: {ship_data}")
                continue
        
        print("🎉 Default fleet data initialized successfully!")
        
    except Exception as e:
        print(f"❌ Error initializing default data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
