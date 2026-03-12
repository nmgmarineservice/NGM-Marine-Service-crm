from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.schemas import *
from app.database import user_service, ship_service, pms_service, worklog_service, invoice_service
from app.auth import get_current_user, require_master

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def get_user_ship_filter(current_user: UserResponse) -> Optional[str]:
    """Get ship_id filter based on user role. Returns None for master (all ships)."""
    if current_user.role == UserRole.MASTER:
        return None  # Master sees all
    return current_user.ship_id  # Staff and Crew see only assigned vessel

@router.get("/fleet-summary/")
async def get_fleet_summary(current_user: UserResponse = Depends(get_current_user)):
    """Get fleet overview summary - filtered by role"""
    try:
        ship_filter = get_user_ship_filter(current_user)
        
        # Get ships based on role
        if ship_filter:
            # Staff/Crew: Get only assigned ship
            ship = await ship_service.get_ship_by_id(ship_filter)
            ships = [ship] if ship else []
        else:
            # Master: Get all ships
            ships = await ship_service.get_all_ships()
        
        all_users = await user_service.get_all_users()
        
        total_ships = len(ships)
        active_ships = len([ship for ship in ships if ship.status == ShipStatus.ACTIVE])
        
        # Filter crew count based on role
        if ship_filter:
            total_crew = len([user for user in all_users if user.role == UserRole.CREW and user.ship_id == ship_filter])
        else:
            total_crew = len([user for user in all_users if user.role == UserRole.CREW])
        
        # Calculate statistics
        ships_stats = []
        total_pending_pms = 0
        total_pending_approvals = 0
        monthly_expenses = 0.0
        
        for ship in ships:
            # Get PMS tasks for this ship
            ship_tasks = await pms_service.get_tasks_by_ship(ship.id)
            
            pending_pms = len([t for t in ship_tasks if t.status == TaskStatus.PENDING])
            overdue_pms = len([t for t in ship_tasks if t.status == TaskStatus.OVERDUE])
            pending_approvals = len([t for t in ship_tasks if t.status == TaskStatus.COMPLETED])
            
            total_pending_pms += pending_pms + overdue_pms
            total_pending_approvals += pending_approvals
            
            ship_stat = ShipStats(
                ship_id=ship.id,
                ship_name=ship.name,
                crew_count=ship.crew_count,
                pending_pms_tasks=pending_pms,
                overdue_pms_tasks=overdue_pms,
                pending_crew_logs=0,
                pending_invoices=0,
                total_invoice_amount=0.0
            )
            ships_stats.append(ship_stat)
        
        return FleetSummary(
            total_ships=total_ships,
            active_ships=active_ships,
            total_crew=total_crew,
            pending_pms_tasks=total_pending_pms,
            pending_approvals=total_pending_approvals,
            monthly_expenses=monthly_expenses,
            ships_stats=ships_stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-tasks/")
async def get_my_tasks(current_user: UserResponse = Depends(get_current_user)):
    """Get current user's tasks and assignments"""
    if current_user.role == UserRole.CREW:
        if not current_user.ship_id:
            return {"tasks": [], "ship_name": None}
        
        # Get crew's assigned PMS tasks
        ship_tasks = await pms_service.get_tasks_by_ship(current_user.ship_id)
        my_tasks = [task for task in ship_tasks if task.assigned_to == current_user.id]
        
        # Get ship info
        ship = await ship_service.get_ship_by_id(current_user.ship_id)
        ship_name = ship.name if ship else "Unknown Ship"
        
        return {
            "tasks": my_tasks,
            "ship_name": ship_name,
            "total_tasks": len(my_tasks),
            "pending_tasks": len([t for t in my_tasks if t.status == TaskStatus.PENDING]),
            "in_progress_tasks": len([t for t in my_tasks if t.status == TaskStatus.IN_PROGRESS]),
            "completed_tasks": len([t for t in my_tasks if t.status == TaskStatus.COMPLETED]),
            "overdue_tasks": len([t for t in my_tasks if t.status == TaskStatus.OVERDUE])
        }
    
    elif current_user.role == UserRole.STAFF:
        # Staff dashboard - only assigned vessel data
        if not current_user.ship_id:
            return {"tasks": [], "ship_name": None, "message": "No vessel assigned"}
        
        ship = await ship_service.get_ship_by_id(current_user.ship_id)
        ship_name = ship.name if ship else "Unknown Ship"
        all_users = await user_service.get_all_users()
        ship_tasks = await pms_service.get_tasks_by_ship(current_user.ship_id)
        
        return {
            "ship_id": current_user.ship_id,
            "ship_name": ship_name,
            "total_crew": len([u for u in all_users if u.role == UserRole.CREW and u.ship_id == current_user.ship_id]),
            "pending_tasks": len([t for t in ship_tasks if t.status == TaskStatus.PENDING]),
            "in_progress_tasks": len([t for t in ship_tasks if t.status == TaskStatus.IN_PROGRESS]),
            "completed_tasks": len([t for t in ship_tasks if t.status == TaskStatus.COMPLETED]),
            "overdue_tasks": len([t for t in ship_tasks if t.status == TaskStatus.OVERDUE])
        }
    
    elif current_user.role == UserRole.MASTER:
        # Master gets fleet summary
        return await get_fleet_summary(current_user)

@router.get("/notifications/")
async def get_user_notifications(current_user: UserResponse = Depends(get_current_user)):
    """Get notifications for current user"""
    # Mock notifications for now
    notifications = []
    
    if current_user.role == UserRole.CREW:
        # Check for overdue tasks
        if current_user.ship_id:
            ship_tasks = await pms_service.get_tasks_by_ship(current_user.ship_id)
            my_overdue = [t for t in ship_tasks 
                         if t.assigned_to == current_user.id and t.status == TaskStatus.OVERDUE]
            
            for task in my_overdue:
                notifications.append({
                    "id": f"overdue_{task.id}",
                    "type": "pms_overdue",
                    "title": "Overdue Task",
                    "message": f"Task '{task.task_description}' is overdue",
                    "created_at": task.due_date,
                    "read": False
                })
    
    elif current_user.role == UserRole.MASTER:
        # Check for tasks awaiting approval
        ships = await ship_service.get_all_ships()
        for ship in ships:
            tasks = await pms_service.get_tasks_by_ship(ship.id)
            awaiting_approval = [t for t in tasks if t.status == TaskStatus.COMPLETED]
            
            for task in awaiting_approval:
                notifications.append({
                    "id": f"approval_{task.id}",
                    "type": "pms_approval",
                    "title": "Task Awaiting Approval",
                    "message": f"Task '{task.task_description}' on {ship.name} needs approval",
                    "created_at": task.updated_at,
                    "read": False
                })
    
    return {"notifications": notifications}
