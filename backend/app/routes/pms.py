from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.schemas import *
from app.database import pms_service
from app.auth import get_current_user, require_master, require_staff_or_master

router = APIRouter(prefix="/pms", tags=["pms"])

@router.post("/", response_model=PMSTaskResponse)
async def create_pms_task(
    task_data: PMSTaskCreate,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Create a new PMS task (Staff/Master only)"""
    try:
        # For staff users, ensure they can only create tasks for their assigned vessel
        if current_user.role == UserRole.STAFF:
            if not current_user.ship_id:
                raise HTTPException(status_code=403, detail="Staff must be assigned to a vessel to create tasks")
            # Override ship_id with staff's assigned vessel
            task_data.ship_id = current_user.ship_id
            print(f"📋 Staff {current_user.name} creating task for vessel {current_user.ship_id}")
        
        # If assigned_to is provided and it's a crew member, ensure task is on crew's vessel
        if task_data.assigned_to:
            from app.database import user_service
            assigned_user = await user_service.get_user_by_id(task_data.assigned_to)
            if assigned_user and assigned_user.role == UserRole.CREW and assigned_user.ship_id:
                # For consistency, set task ship_id to match crew's vessel
                task_data.ship_id = assigned_user.ship_id
                print(f"📋 Task ship_id set to match crew member's vessel: {assigned_user.ship_id}")
        
        return await pms_service.create_task(task_data, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/fix-task", include_in_schema=False)
async def fix_specific_task(current_user: UserResponse = Depends(require_master)):
    """Fix a specific PMS task's ship_id to match crew member's vessel"""
    # Task and crew IDs from the request
    task_id = "dJtBTj8yJLLENXzxvYsX"
    crew_id = "HQLrbb4RyrkGP66o9NbH"
    
    # Get the crew member to find their ship_id
    from app.database import user_service
    crew = await user_service.get_user_by_id(crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Get the crew's ship_id
    crew_ship_id = crew.ship_id
    if not crew_ship_id:
        raise HTTPException(status_code=400, detail="Crew member has no ship assigned")
    
    # Get the task
    task = await pms_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update the task's ship_id
    update_data = {"ship_id": crew_ship_id}
    updated_task = await pms_service.update_task(task_id, update_data)
    
    return {
        "message": "Task ship_id updated successfully",
        "task_id": task_id,
        "previous_ship_id": task.ship_id,
        "new_ship_id": crew_ship_id,
        "crew_name": crew.name,
        "ship_name": updated_task.ship_name
    }

@router.get("/", response_model=List[PMSTaskResponse])
async def get_pms_tasks(
    ship_id: Optional[str] = Query(None),
    status: Optional[TaskStatus] = Query(None),
    assigned_to: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get PMS tasks with filtering"""
    
    # Crew can only see tasks assigned to them on their ship
    if current_user.role == UserRole.CREW:
        if not current_user.ship_id:
            return []  # No vessel assigned - return empty list
        
        tasks = await pms_service.get_tasks_by_ship(current_user.ship_id, status)
        # Filter to only tasks assigned to this crew member
        return [task for task in tasks if task.assigned_to == current_user.id]
    
    # Staff can only see tasks for their assigned vessel
    if current_user.role == UserRole.STAFF:
        if not current_user.ship_id:
            print(f"[DEBUG] Staff {current_user.name} has no ship_id assigned")
            return []  # No vessel assigned
        
        print(f"[DEBUG] Staff {current_user.name} fetching tasks for ship_id: {current_user.ship_id}")
        tasks = await pms_service.get_tasks_by_ship(current_user.ship_id, status)
        print(f"[DEBUG] Found {len(tasks)} tasks for staff's vessel")
        if assigned_to:
            tasks = [task for task in tasks if task.assigned_to == assigned_to]
        return tasks
    
    # Master can see all tasks
    if ship_id:
        tasks = await pms_service.get_tasks_by_ship(ship_id, status)
    else:
        # Get all tasks across all ships
        tasks = await pms_service.get_all_tasks(status)
    
    # Apply additional filters
    if assigned_to:
        tasks = [task for task in tasks if task.assigned_to == assigned_to]
    
    return tasks

@router.get("/{task_id}", response_model=PMSTaskResponse)
async def get_pms_task(
    task_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get specific PMS task"""
    task = await pms_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Crew can only access tasks on their ship and assigned to them
    if current_user.role == UserRole.CREW:
        if task.ship_id != current_user.ship_id or task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this task")
    
    return task

@router.put("/{task_id}", response_model=PMSTaskResponse)
async def update_pms_task(
    task_id: str,
    task_data: PMSTaskUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update PMS task"""
    print(f"📝 Update task request: task_id={task_id}, data={task_data.dict()}")
    
    task = await pms_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # If assigned_to is changed, get the crew's ship_id and update the task ship_id
    if task_data.assigned_to and task_data.assigned_to != task.assigned_to:
        # Get the assigned crew member's ship_id
        from app.database import user_service
        crew_user = await user_service.get_user_by_id(task_data.assigned_to)
        if crew_user and crew_user.ship_id and crew_user.role == UserRole.CREW:
            # Update task's ship_id to match the crew's vessel
            task_data.ship_id = crew_user.ship_id
            print(f"📋 Updating task ship_id to match crew's vessel: {crew_user.ship_id}")
    
    # Crew can only update tasks assigned to them
    if current_user.role == UserRole.CREW:
        if task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Can only update assigned tasks")
        
        # Crew can only update certain fields
        allowed_updates = {"status", "completion_notes", "actual_hours", "photos"}
        update_data = {k: v for k, v in task_data.dict(exclude_unset=True).items() 
                      if k in allowed_updates and v is not None}
        
        if task_data.status == TaskStatus.COMPLETED:
            update_data["completed_date"] = datetime.now()
    else:
        # Staff/Master can update all fields
        update_data = {k: v for k, v in task_data.dict(exclude_unset=True).items() if v is not None}
    
    # Convert enum values to strings for Firestore
    for key, value in update_data.items():
        if hasattr(value, 'value'):
            update_data[key] = value.value
        # Handle datetime objects
        elif isinstance(value, datetime):
            update_data[key] = value.isoformat()
    
    print(f"📝 Final update_data: {update_data}")
    
    # Update the task in database
    try:
        updated_task = await pms_service.update_task(task_id, update_data)
        if not updated_task:
            raise HTTPException(status_code=500, detail="Failed to update task")
        print(f"✅ Task updated successfully: {updated_task.id}")
        return updated_task
    except Exception as e:
        print(f"❌ Error updating task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")

@router.post("/{task_id}/approve/", response_model=PMSTaskResponse)
async def approve_pms_task(
    task_id: str,
    current_user: UserResponse = Depends(require_master)
):
    """Approve completed PMS task (Master only)"""
    task = await pms_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task must be completed before approval")
    
    # Update task status to approved and set approved_by
    update_data = {
        "status": "approved",
        "approved_by": current_user.id
    }
    
    updated_task = await pms_service.update_task(task_id, update_data)
    if not updated_task:
        raise HTTPException(status_code=500, detail="Failed to approve task")
    
    return updated_task

@router.post("/{task_id}/reject/", response_model=PMSTaskResponse)
async def reject_pms_task(
    task_id: str,
    current_user: UserResponse = Depends(require_master)
):
    """Reject completed PMS task (Master only)"""
    task = await pms_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task status back to in_progress (rejected)
    update_data = {
        "status": "in_progress",
        "approved_by": None
    }
    
    updated_task = await pms_service.update_task(task_id, update_data)
    if not updated_task:
        raise HTTPException(status_code=500, detail="Failed to reject task")
    
    return updated_task

@router.delete("/{task_id}")
async def delete_pms_task(
    task_id: str,
    current_user: UserResponse = Depends(require_staff_or_master)
):
    """Delete a PMS task (Staff/Master only)"""
    task = await pms_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Staff can only delete tasks for their assigned vessel
    if current_user.role == UserRole.STAFF:
        if task.ship_id != current_user.ship_id:
            raise HTTPException(status_code=403, detail="Can only delete tasks for your assigned vessel")
    
    success = await pms_service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete task")
    
    return {"message": "Task deleted successfully"}

@router.get("/ship/{ship_id}/stats/")
async def get_ship_pms_stats(
    ship_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get PMS statistics for a ship"""
    # Check ship access permissions
    if current_user.role == UserRole.CREW and current_user.ship_id != ship_id:
        raise HTTPException(status_code=403, detail="Access denied to this ship")
    
    # Get all tasks for ship
    all_tasks = await pms_service.get_tasks_by_ship(ship_id)
    
    # Calculate statistics
    total_tasks = len(all_tasks)
    pending_tasks = len([t for t in all_tasks if t.status == TaskStatus.PENDING])
    in_progress_tasks = len([t for t in all_tasks if t.status == TaskStatus.IN_PROGRESS])
    completed_tasks = len([t for t in all_tasks if t.status == TaskStatus.COMPLETED])
    overdue_tasks = len([t for t in all_tasks if t.status == TaskStatus.OVERDUE])
    approved_tasks = len([t for t in all_tasks if t.status == TaskStatus.APPROVED])
    
    return {
        "ship_id": ship_id,
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "approved_tasks": approved_tasks,
        "awaiting_approval": completed_tasks  # Tasks completed but not yet approved
    }
