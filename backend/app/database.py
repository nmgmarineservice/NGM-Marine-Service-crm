from typing import List, Optional, Dict, Any
from datetime import datetime
from google.cloud.firestore import Query
from firebase_admin import auth as firebase_auth
from app.firebase import db
from app.models import User, Ship, PMSTask, CrewLog, Invoice, Notification, WorkLog, Bunkering, Candidate, DGCommunication, Client
from app.schemas import *
import hashlib

class DatabaseService:
    def __init__(self):
        self.db = db

class UserService(DatabaseService):
    collection_name = "users"
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user in Firebase Auth and Firestore"""
        try:
            # Create user in Firebase Auth
            firebase_user = firebase_auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.name
            )
            
            # Create user document in Firestore
            user_doc = User(
                email=user_data.email,
                name=user_data.name,
                role=user_data.role,
                ship_id=user_data.ship_id,
                phone=user_data.phone,
                position=user_data.position,
                firebase_uid=firebase_user.uid,
                active=True
            )
            
            doc_ref = self.db.collection(self.collection_name).document()
            user_doc.id = doc_ref.id
            doc_ref.set(user_doc.to_dict())
            
            # Get ship name if ship_id provided
            ship_name = None
            if user_data.ship_id:
                ship_doc = self.db.collection("ships").document(user_data.ship_id).get()
                if ship_doc.exists:
                    ship_name = ship_doc.to_dict().get('name')
            
            return UserResponse(
                id=user_doc.id,
                email=user_doc.email,
                name=user_doc.name,
                role=user_doc.role,
                ship_id=user_doc.ship_id,
                ship_name=ship_name,
                phone=user_doc.phone,
                position=user_doc.position,
                active=user_doc.active,
                created_at=user_doc.created_at,
                updated_at=user_doc.updated_at
            )
        except Exception as e:
            raise Exception(f"Failed to create user: {str(e)}")

    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by document ID"""
        doc = self.db.collection(self.collection_name).document(user_id).get()
        if not doc.exists:
            return None
        
        user_data = doc.to_dict()
        user = User.from_dict(user_data, doc.id)
        
        # Get ship name if ship_id exists
        ship_name = None
        if user.ship_id:
            ship_doc = self.db.collection("ships").document(user.ship_id).get()
            if ship_doc.exists:
                ship_name = ship_doc.to_dict().get('name')
        
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            ship_id=user.ship_id,
            ship_name=ship_name,
            phone=user.phone,
            position=user.position,
            active=user.active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )

    async def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[UserResponse]:
        """Get user by Firebase UID"""
        query = self.db.collection(self.collection_name).where("firebase_uid", "==", firebase_uid).limit(1)
        docs = query.stream()
        
        for doc in docs:
            user_data = doc.to_dict()
            user = User.from_dict(user_data, doc.id)
            
            ship_name = None
            if user.ship_id:
                ship_doc = self.db.collection("ships").document(user.ship_id).get()
                if ship_doc.exists:
                    ship_name = ship_doc.to_dict().get('name')
            
            return UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                ship_id=user.ship_id,
                ship_name=ship_name,
                phone=user.phone,
                position=user.position,
                active=user.active,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        return None

    async def get_all_users(self, skip: int = 0, limit: int = 100) -> List[UserResponse]:
        """Get all users with pagination"""
        query = self.db.collection(self.collection_name).offset(skip).limit(limit)
        docs = query.stream()
        
        users = []
        for doc in docs:
            user_data = doc.to_dict()
            user = User.from_dict(user_data, doc.id)
            
            ship_name = None
            if user.ship_id:
                ship_doc = self.db.collection("ships").document(user.ship_id).get()
                if ship_doc.exists:
                    ship_name = ship_doc.to_dict().get('name')
            
            users.append(UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                ship_id=user.ship_id,
                ship_name=ship_name,
                phone=user.phone,
                position=user.position,
                active=user.active,
                created_at=user.created_at,
                updated_at=user.updated_at
            ))
        
        return users

    async def get_users_by_ship(self, ship_id: str) -> List[UserResponse]:
        """Get all users for a specific ship using Firestore query"""
        query = self.db.collection(self.collection_name).where("ship_id", "==", ship_id)
        docs = query.stream()
        
        users = []
        for doc in docs:
            user_data = doc.to_dict()
            user = User.from_dict(user_data, doc.id)
            
            # Since we are filtering by ship_id, we can potentially optimize ship_name lookup
            # but for now let's keep it simple and consistent.
            ship_name = None
            ship_doc = self.db.collection("ships").document(ship_id).get()
            if ship_doc.exists:
                ship_name = ship_doc.to_dict().get('name')
            
            users.append(UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                ship_id=user.ship_id,
                ship_name=ship_name,
                phone=user.phone,
                position=user.position,
                active=user.active,
                created_at=user.created_at,
                updated_at=user.updated_at
            ))
        return users

    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[UserResponse]:
        """Update user information"""
        doc_ref = self.db.collection(self.collection_name).document(user_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        update_data = {k: v for k, v in user_data.dict(exclude_unset=True).items()}
        update_data['updated_at'] = datetime.now()
        
        # If ship_id is being set to None or null, also clear ship_name
        if 'ship_id' in update_data and (update_data['ship_id'] is None or update_data['ship_id'] == 'null'):
            update_data['ship_name'] = None
        
        doc_ref.update(update_data)
        
        return await self.get_user_by_id(user_id)

    async def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        doc_ref = self.db.collection(self.collection_name).document(user_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        
        doc_ref.delete()
        return True

class ShipService(DatabaseService):
    collection_name = "ships"
    
    async def create_ship(self, ship_data: ShipCreate) -> ShipResponse:
        """Create a new ship"""
        ship_doc = Ship(
            name=ship_data.name,
            type=ship_data.type,
            imo_number=ship_data.imo_number,
            flag_state=ship_data.flag_state,
            call_sign=ship_data.call_sign,
            gross_tonnage=ship_data.gross_tonnage,
            built_year=ship_data.built_year,
            status=ship_data.status,
            owner=ship_data.owner,
            operator=ship_data.operator
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        ship_doc.id = doc_ref.id
        doc_ref.set(ship_doc.to_dict())
        
        return ShipResponse(
            id=ship_doc.id,
            name=ship_doc.name,
            type=ship_doc.type,
            imo_number=ship_doc.imo_number,
            flag_state=ship_doc.flag_state,
            call_sign=ship_doc.call_sign,
            gross_tonnage=ship_doc.gross_tonnage,
            built_year=ship_doc.built_year,
            status=ship_doc.status,
            owner=ship_doc.owner,
            operator=ship_doc.operator,
            crew_count=0,
            created_at=ship_doc.created_at,
            updated_at=ship_doc.updated_at
        )

    async def get_all_ships(self) -> List[ShipResponse]:
        """Get all ships"""
        docs = self.db.collection(self.collection_name).stream()
        
        ships = []
        for doc in docs:
            ship_data = doc.to_dict()
            ship = Ship.from_dict(ship_data, doc.id)
            
            # Count crew members for this ship
            crew_count = len(list(self.db.collection("users").where("ship_id", "==", ship.id).stream()))
            
            ships.append(ShipResponse(
                id=ship.id,
                name=ship.name,
                type=ship.type,
                imo_number=ship.imo_number,
                flag_state=ship.flag_state,
                call_sign=ship.call_sign,
                gross_tonnage=ship.gross_tonnage,
                built_year=ship.built_year,
                status=ship.status,
                owner=ship.owner,
                operator=ship.operator,
                crew_count=crew_count,
                created_at=ship.created_at,
                updated_at=ship.updated_at
            ))
        
        return ships

    async def get_ship_by_id(self, ship_id: str) -> Optional[ShipResponse]:
        """Get ship by ID"""
        doc = self.db.collection(self.collection_name).document(ship_id).get()
        if not doc.exists:
            return None
        
        ship_data = doc.to_dict()
        ship = Ship.from_dict(ship_data, doc.id)
        
        crew_count = len(list(self.db.collection("users").where("ship_id", "==", ship.id).stream()))
        
        return ShipResponse(
            id=ship.id,
            name=ship.name,
            type=ship.type,
            imo_number=ship.imo_number,
            flag_state=ship.flag_state,
            call_sign=ship.call_sign,
            gross_tonnage=ship.gross_tonnage,
            built_year=ship.built_year,
            status=ship.status,
            owner=ship.owner,
            operator=ship.operator,
            crew_count=crew_count,
            created_at=ship.created_at,
            updated_at=ship.updated_at
        )

    async def update_ship(self, ship_id: str, update_data: dict) -> Optional[ShipResponse]:
        """Update a ship"""
        doc_ref = self.db.collection(self.collection_name).document(ship_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updated_at"] = datetime.now()
        doc_ref.update(update_data)
        
        return await self.get_ship_by_id(ship_id)

    async def delete_ship(self, ship_id: str) -> bool:
        """Delete a ship"""
        doc_ref = self.db.collection(self.collection_name).document(ship_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        
        doc_ref.delete()
        return True

class PMSService(DatabaseService):
    collection_name = "pms_tasks"
    
    async def create_task(self, task_data: PMSTaskCreate, created_by: str) -> PMSTaskResponse:
        """Create a new PMS task"""
        task_doc = PMSTask(
            ship_id=task_data.ship_id,
            equipment_name=task_data.equipment_name,
            task_description=task_data.task_description,
            frequency=task_data.frequency,
            priority=task_data.priority,
            assigned_to=task_data.assigned_to,
            due_date=task_data.due_date,
            estimated_hours=task_data.estimated_hours,
            instructions=task_data.instructions,
            safety_notes=task_data.safety_notes,
            created_by=created_by
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        task_doc.id = doc_ref.id
        doc_ref.set(task_doc.to_dict())
        
        return await self.get_task_by_id(task_doc.id)

    async def get_task_by_id(self, task_id: str) -> Optional[PMSTaskResponse]:
        """Get PMS task by ID with related data"""
        doc = self.db.collection(self.collection_name).document(task_id).get()
        if not doc.exists:
            return None
        
        task_data = doc.to_dict()
        task = PMSTask.from_dict(task_data, doc.id)
        
        # Get ship name
        ship_doc = self.db.collection("ships").document(task.ship_id).get()
        ship_name = ship_doc.to_dict().get('name', '') if ship_doc.exists else ''
        
        # Get assigned user name
        assigned_to_name = None
        if task.assigned_to:
            user_doc = self.db.collection("users").document(task.assigned_to).get()
            if user_doc.exists:
                assigned_to_name = user_doc.to_dict().get('name')
        
        return PMSTaskResponse(
            id=task.id,
            ship_id=task.ship_id,
            ship_name=ship_name,
            equipment_name=task.equipment_name,
            task_description=task.task_description,
            frequency=task.frequency,
            priority=task.priority,
            status=task.status,
            assigned_to=task.assigned_to,
            assigned_to_name=assigned_to_name,
            due_date=task.due_date,
            completed_date=task.completed_date,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            instructions=task.instructions,
            safety_notes=task.safety_notes,
            completion_notes=task.completion_notes,
            photos=task.photos,
            created_by=task.created_by,
            approved_by=task.approved_by,
            created_at=task.created_at,
            updated_at=task.updated_at
        )

    async def update_task(self, task_id: str, update_data: dict) -> Optional[PMSTaskResponse]:
        """Update a PMS task"""
        doc_ref = self.db.collection(self.collection_name).document(task_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now()
        
        # Update the document
        doc_ref.update(update_data)
        
        return await self.get_task_by_id(task_id)

    async def get_tasks_by_ship(self, ship_id: str, status: Optional[TaskStatus] = None) -> List[PMSTaskResponse]:
        """Get all PMS tasks for a ship, optionally filtered by status"""
        query = self.db.collection(self.collection_name).where("ship_id", "==", ship_id)
        
        if status:
            query = query.where("status", "==", status.value)
        
        docs = query.stream()
        
        tasks = []
        for doc in docs:
            task_data = doc.to_dict()
            task = PMSTask.from_dict(task_data, doc.id)
            
            ship_doc = self.db.collection("ships").document(task.ship_id).get()
            ship_name = ship_doc.to_dict().get('name', '') if ship_doc.exists else ''
            
            assigned_to_name = None
            if task.assigned_to:
                user_doc = self.db.collection("users").document(task.assigned_to).get()
                if user_doc.exists:
                    assigned_to_name = user_doc.to_dict().get('name')
            
            tasks.append(PMSTaskResponse(
                id=task.id,
                ship_id=task.ship_id,
                ship_name=ship_name,
                equipment_name=task.equipment_name,
                task_description=task.task_description,
                frequency=task.frequency,
                priority=task.priority,
                status=task.status,
                assigned_to=task.assigned_to,
                assigned_to_name=assigned_to_name,
                due_date=task.due_date,
                completed_date=task.completed_date,
                estimated_hours=task.estimated_hours,
                actual_hours=task.actual_hours,
                instructions=task.instructions,
                safety_notes=task.safety_notes,
                completion_notes=task.completion_notes,
                photos=task.photos,
                created_by=task.created_by,
                approved_by=task.approved_by,
                created_at=task.created_at,
                updated_at=task.updated_at
            ))
        
        return tasks

    async def delete_task(self, task_id: str) -> bool:
        """Delete a PMS task"""
        doc_ref = self.db.collection(self.collection_name).document(task_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        doc_ref.delete()
        return True

    async def get_all_tasks(self, status: Optional[TaskStatus] = None) -> List[PMSTaskResponse]:
        """Get all PMS tasks across all ships, optionally filtered by status"""
        query = self.db.collection(self.collection_name)
        
        if status:
            query = query.where("status", "==", status.value)
        
        docs = query.stream()
        
        tasks = []
        for doc in docs:
            task_data = doc.to_dict()
            task = PMSTask.from_dict(task_data, doc.id)
            
            ship_doc = self.db.collection("ships").document(task.ship_id).get()
            ship_name = ship_doc.to_dict().get('name', '') if ship_doc.exists else ''
            
            assigned_to_name = None
            if task.assigned_to:
                user_doc = self.db.collection("users").document(task.assigned_to).get()
                if user_doc.exists:
                    assigned_to_name = user_doc.to_dict().get('name')
            
            tasks.append(PMSTaskResponse(
                id=task.id,
                ship_id=task.ship_id,
                ship_name=ship_name,
                equipment_name=task.equipment_name,
                task_description=task.task_description,
                frequency=task.frequency,
                priority=task.priority,
                status=task.status,
                assigned_to=task.assigned_to,
                assigned_to_name=assigned_to_name,
                due_date=task.due_date,
                completed_date=task.completed_date,
                estimated_hours=task.estimated_hours,
                actual_hours=task.actual_hours,
                instructions=task.instructions,
                safety_notes=task.safety_notes,
                completion_notes=task.completion_notes,
                photos=task.photos,
                created_by=task.created_by,
                approved_by=task.approved_by,
                created_at=task.created_at,
                updated_at=task.updated_at
            ))
        
        return tasks

class WorkLogService(DatabaseService):
    collection_name = "work_logs"
    
    async def create_log(self, log_data: WorkLogCreate, crew_id: str) -> WorkLogResponse:
        """Create a new work log"""
        log_doc = WorkLog(
            ship_id=log_data.ship_id,
            crew_id=crew_id,
            date=datetime.combine(log_data.date, datetime.min.time()),
            task_type=log_data.task_type,
            description=log_data.description,
            hours_worked=log_data.hours_worked,
            photo_url=log_data.photo_url,
            status=WorkLogStatus.PENDING
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        log_doc.id = doc_ref.id
        doc_ref.set(log_doc.to_dict())
        
        return await self.get_log_by_id(log_doc.id)

    async def get_log_by_id(self, log_id: str) -> Optional[WorkLogResponse]:
        """Get work log by ID with related data"""
        doc = self.db.collection(self.collection_name).document(log_id).get()
        if not doc.exists:
            return None
        
        log_data = doc.to_dict()
        log = WorkLog.from_dict(log_data, doc.id)
        
        # Get ship name
        ship_doc = self.db.collection("ships").document(log.ship_id).get()
        ship_name = ship_doc.to_dict().get('name', '') if ship_doc.exists else ''
        
        # Get crew name
        crew_doc = self.db.collection("users").document(log.crew_id).get()
        crew_name = crew_doc.to_dict().get('name', '') if crew_doc.exists else ''
        
        # Get approver name
        approved_by_name = None
        if log.approved_by:
            approver_doc = self.db.collection("users").document(log.approved_by).get()
            if approver_doc.exists:
                approved_by_name = approver_doc.to_dict().get('name')
        
        return WorkLogResponse(
            id=log.id,
            ship_id=log.ship_id,
            ship_name=ship_name,
            crew_id=log.crew_id,
            crew_name=crew_name,
            date=log.date.date() if isinstance(log.date, datetime) else log.date,
            task_type=log.task_type,
            description=log.description,
            hours_worked=log.hours_worked,
            status=log.status,
            photo_url=log.photo_url,
            remarks=log.remarks,
            approved_by=log.approved_by,
            approved_by_name=approved_by_name,
            approved_at=log.approved_at,
            created_at=log.created_at,
            updated_at=log.updated_at
        )

    async def get_logs_by_ship(self, ship_id: str, status: Optional[WorkLogStatus] = None) -> List[WorkLogResponse]:
        """Get all work logs for a ship"""
        try:
            query = self.db.collection(self.collection_name).where("ship_id", "==", ship_id)
            docs = list(query.stream())
            
            logs = []
            for doc in docs:
                log_response = await self.get_log_by_id(doc.id)
                if log_response:
                    # Apply status filter in Python to avoid composite index
                    if status and log_response.status != status.value:
                        continue
                    logs.append(log_response)
            
            # Sort by date descending in Python
            logs.sort(key=lambda x: str(x.date) if x.date else '', reverse=True)
            return logs
        except Exception as e:
            print(f"Error in get_logs_by_ship: {str(e)}")
            return []

    async def get_logs_by_crew(self, crew_id: str) -> List[WorkLogResponse]:
        """Get all work logs for a crew member"""
        try:
            query = self.db.collection(self.collection_name).where("crew_id", "==", crew_id)
            docs = list(query.stream())
            
            logs = []
            for doc in docs:
                log_response = await self.get_log_by_id(doc.id)
                if log_response:
                    logs.append(log_response)
            
            # Sort by date descending in Python
            logs.sort(key=lambda x: str(x.date) if x.date else '', reverse=True)
            return logs
        except Exception as e:
            print(f"Error in get_logs_by_crew: {str(e)}")
            return []

    async def get_all_logs(self, status: Optional[WorkLogStatus] = None) -> List[WorkLogResponse]:
        """Get all work logs, optionally filtered by status"""
        try:
            query = self.db.collection(self.collection_name)
            docs = list(query.stream())
            
            logs = []
            for doc in docs:
                log_response = await self.get_log_by_id(doc.id)
                if log_response:
                    # Apply status filter in Python to avoid composite index
                    if status and log_response.status != status.value:
                        continue
                    logs.append(log_response)
            
            # Sort by date descending in Python
            logs.sort(key=lambda x: str(x.date) if x.date else '', reverse=True)
            return logs
        except Exception as e:
            print(f"Error in get_all_logs: {str(e)}")
            return []

    async def update_log(self, log_id: str, update_data: dict) -> Optional[WorkLogResponse]:
        """Update a work log"""
        doc_ref = self.db.collection(self.collection_name).document(log_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updated_at"] = datetime.now()
        doc_ref.update(update_data)
        
        return await self.get_log_by_id(log_id)

    async def approve_log(self, log_id: str, approved_by: str) -> Optional[WorkLogResponse]:
        """Approve a work log"""
        update_data = {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": datetime.now()
        }
        return await self.update_log(log_id, update_data)

    async def reject_log(self, log_id: str, approved_by: str, remarks: str = None) -> Optional[WorkLogResponse]:
        """Reject a work log"""
        update_data = {
            "status": "rejected",
            "approved_by": approved_by,
            "approved_at": datetime.now()
        }
        if remarks:
            update_data["remarks"] = remarks
        return await self.update_log(log_id, update_data)

    async def delete_log(self, log_id: str) -> bool:
        """Delete a work log"""
        doc_ref = self.db.collection(self.collection_name).document(log_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        doc_ref.delete()
        return True

class BunkeringService(DatabaseService):
    collection_name = "bunkering"
    
    async def create_operation(self, data: BunkeringCreate, created_by: str) -> BunkeringResponse:
        """Create a new bunkering operation"""
        bunkering_doc = Bunkering(
            ship_id=data.ship_id,
            port=data.port,
            supplier=data.supplier,
            fuel_type=data.fuel_type,
            quantity=data.quantity,
            scheduled_date=data.scheduled_date,
            cost_per_mt=data.cost_per_mt,
            officer_in_charge=data.officer_in_charge,
            remarks=data.remarks,
            status=BunkeringStatus.SCHEDULED,
            created_by=created_by
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        bunkering_doc.id = doc_ref.id
        doc_ref.set(bunkering_doc.to_dict())
        
        return await self.get_operation_by_id(bunkering_doc.id)

    async def get_operation_by_id(self, operation_id: str) -> Optional[BunkeringResponse]:
        """Get bunkering operation by ID"""
        try:
            doc = self.db.collection(self.collection_name).document(operation_id).get()
            if not doc.exists:
                return None
            
            data = doc.to_dict()
            bunkering = Bunkering.from_dict(data, doc.id)
            
            # Get ship name (with error handling)
            ship_name = ''
            try:
                if bunkering.ship_id:
                    ship_doc = self.db.collection("ships").document(bunkering.ship_id).get()
                    if ship_doc.exists:
                        ship_name = ship_doc.to_dict().get('name', '')
            except Exception as e:
                print(f"[ERROR] Failed to get ship name for {operation_id}: {str(e)}")
            
            # Get creator name (with error handling)
            created_by_name = ''
            try:
                if bunkering.created_by:
                    creator_doc = self.db.collection("users").document(bunkering.created_by).get()
                    if creator_doc.exists:
                        created_by_name = creator_doc.to_dict().get('name', '')
            except Exception as e:
                print(f"[ERROR] Failed to get creator name for {operation_id}: {str(e)}")
            
            try:
                return BunkeringResponse(
                    id=bunkering.id,
                    ship_id=bunkering.ship_id,
                    ship_name=ship_name,
                    port=bunkering.port,
                    supplier=bunkering.supplier,
                    fuel_type=bunkering.fuel_type,
                    quantity=bunkering.quantity,
                    scheduled_date=bunkering.scheduled_date,
                    completed_date=bunkering.completed_date,
                    status=bunkering.status,
                    cost_per_mt=bunkering.cost_per_mt,
                    total_cost=bunkering.quantity * bunkering.cost_per_mt,
                    officer_in_charge=bunkering.officer_in_charge,
                    checklist_completed=bunkering.checklist_completed,
                    sample_taken=bunkering.sample_taken,
                    remarks=bunkering.remarks,
                    created_by=bunkering.created_by,
                    created_by_name=created_by_name,
                    created_at=bunkering.created_at,
                    updated_at=bunkering.updated_at
                )
            except Exception as e:
                print(f"[ERROR] Failed to create BunkeringResponse for {operation_id}: {str(e)}")
                return None
        except Exception as e:
            print(f"[ERROR] Get operation by ID {operation_id} failed: {str(e)}")
            return None

    async def get_all_operations(self, ship_id: Optional[str] = None, status: Optional[BunkeringStatus] = None) -> List[BunkeringResponse]:
        """Get all bunkering operations"""
        try:
            print(f"[DEBUG] Getting bunkering operations. ship_id={ship_id}, status={status}")
            query = self.db.collection(self.collection_name)
            
            if ship_id:
                query = query.where("ship_id", "==", ship_id)
            if status:
                query = query.where("status", "==", status.value)
            
            docs = query.order_by("scheduled_date", direction=Query.DESCENDING).stream()
            
            operations = []
            for doc in docs:
                try:
                    op = await self.get_operation_by_id(doc.id)
                    if op:
                        operations.append(op)
                except Exception as e:
                    print(f"[ERROR] Processing bunkering operation {doc.id}: {str(e)}")
                    # Continue with other operations even if one fails
                    continue
            
            print(f"[DEBUG] Found {len(operations)} bunkering operations")
            return operations
        except Exception as e:
            print(f"[ERROR] in get_all_operations: {str(e)}")
            return []  # Return empty list instead of letting error propagate

    async def update_operation(self, operation_id: str, update_data: dict) -> Optional[BunkeringResponse]:
        """Update a bunkering operation"""
        doc_ref = self.db.collection(self.collection_name).document(operation_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updated_at"] = datetime.now()
        
        # If status is completed, set completed_date
        if update_data.get("status") == "completed":
            update_data["completed_date"] = datetime.now()
        
        doc_ref.update(update_data)
        return await self.get_operation_by_id(operation_id)

class CandidateService(DatabaseService):
    collection_name = "candidates"
    
    async def create_candidate(self, candidate_data: CandidateCreate) -> CandidateResponse:
        """Create a new candidate"""
        candidate = Candidate(
            name=candidate_data.name,
            email=candidate_data.email,
            phone=candidate_data.phone,
            rank=candidate_data.rank,
            experience=candidate_data.experience,
            vessel_id=candidate_data.vessel_id,
            source=candidate_data.source,
            stage=candidate_data.stage,
            notes=candidate_data.notes
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        candidate.id = doc_ref.id
        doc_ref.set(candidate.to_dict())
        
        # Get vessel name if provided
        vessel_name = None
        if candidate_data.vessel_id:
            ship_doc = self.db.collection("ships").document(candidate_data.vessel_id).get()
            if ship_doc.exists:
                vessel_name = ship_doc.to_dict().get('name')
        
        # Generate initials
        initials = ''.join([n[0].upper() for n in candidate.name.split()[:2]])
        
        return CandidateResponse(
            id=candidate.id,
            name=candidate.name,
            email=candidate.email,
            phone=candidate.phone,
            rank=candidate.rank,
            experience=candidate.experience,
            vessel_id=candidate.vessel_id,
            vessel_name=vessel_name,
            source=candidate.source,
            stage=candidate.stage,
            notes=candidate.notes,
            initials=initials,
            created_at=candidate.created_at,
            updated_at=candidate.updated_at
        )
    
    async def get_all_candidates(self) -> List[CandidateResponse]:
        """Get all candidates"""
        docs = self.db.collection(self.collection_name).stream()
        
        candidates = []
        for doc in docs:
            data = doc.to_dict()
            candidate = Candidate.from_dict(data, doc.id)
            
            # Get vessel name if provided
            vessel_name = None
            if candidate.vessel_id:
                ship_doc = self.db.collection("ships").document(candidate.vessel_id).get()
                if ship_doc.exists:
                    vessel_name = ship_doc.to_dict().get('name')
            
            # Generate initials
            initials = ''.join([n[0].upper() for n in candidate.name.split()[:2]])
            
            candidates.append(CandidateResponse(
                id=candidate.id,
                name=candidate.name,
                email=candidate.email,
                phone=candidate.phone,
                rank=candidate.rank,
                experience=candidate.experience,
                vessel_id=candidate.vessel_id,
                vessel_name=vessel_name,
                source=candidate.source,
                stage=candidate.stage,
                notes=candidate.notes,
                initials=initials,
                created_at=candidate.created_at,
                updated_at=candidate.updated_at
            ))
        
        return candidates
    
    async def get_candidate_by_id(self, candidate_id: str) -> Optional[CandidateResponse]:
        """Get candidate by ID"""
        doc = self.db.collection(self.collection_name).document(candidate_id).get()
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        candidate = Candidate.from_dict(data, doc.id)
        
        vessel_name = None
        if candidate.vessel_id:
            ship_doc = self.db.collection("ships").document(candidate.vessel_id).get()
            if ship_doc.exists:
                vessel_name = ship_doc.to_dict().get('name')
        
        initials = ''.join([n[0].upper() for n in candidate.name.split()[:2]])
        
        return CandidateResponse(
            id=candidate.id,
            name=candidate.name,
            email=candidate.email,
            phone=candidate.phone,
            rank=candidate.rank,
            experience=candidate.experience,
            vessel_id=candidate.vessel_id,
            vessel_name=vessel_name,
            source=candidate.source,
            stage=candidate.stage,
            notes=candidate.notes,
            initials=initials,
            created_at=candidate.created_at,
            updated_at=candidate.updated_at
        )
    
    async def update_candidate(self, candidate_id: str, candidate_data: CandidateUpdate) -> Optional[CandidateResponse]:
        """Update candidate"""
        doc_ref = self.db.collection(self.collection_name).document(candidate_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        update_data = {k: v for k, v in candidate_data.dict(exclude_unset=True).items() if v is not None}
        update_data['updated_at'] = datetime.now()
        
        doc_ref.update(update_data)
        return await self.get_candidate_by_id(candidate_id)
    
    async def delete_candidate(self, candidate_id: str) -> bool:
        """Delete candidate"""
        doc_ref = self.db.collection(self.collection_name).document(candidate_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        
        doc_ref.delete()
        return True
    
    async def move_candidate_stage(self, candidate_id: str, new_stage: RecruitmentStage) -> Optional[CandidateResponse]:
        """Move candidate to a new stage"""
        doc_ref = self.db.collection(self.collection_name).document(candidate_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        doc_ref.update({
            'stage': new_stage.value,
            'updated_at': datetime.now()
        })
        
        return await self.get_candidate_by_id(candidate_id)

class DGCommunicationService(DatabaseService):
    collection_name = "dg_communications"
    
    def _generate_ref_no(self, comm_type: DGCommunicationType) -> str:
        """Generate a unique reference number"""
        year = datetime.now().year
        prefix = "DGS-IN" if comm_type == DGCommunicationType.INCOMING else "DGS-OUT"
        
        # Get count of communications this year
        docs = self.db.collection(self.collection_name).where("ref_no", ">=", f"{prefix}-{year}").stream()
        count = sum(1 for _ in docs) + 1
        
        return f"{prefix}-{year}-{count:03d}"
    
    async def create_communication(self, data: DGCommunicationCreate, created_by: str) -> DGCommunicationResponse:
        """Create a new DG communication"""
        ref_no = self._generate_ref_no(data.comm_type)
        
        comm_doc = DGCommunication(
            ref_no=ref_no,
            comm_type=data.comm_type,
            subject=data.subject,
            content=data.content,
            category=data.category,
            status=DGCommunicationStatus.PENDING,
            dg_office=data.dg_office,
            ship_id=data.ship_id,
            crew_id=data.crew_id,
            priority=data.priority or "normal",
            due_date=data.due_date,
            attachments=data.attachments or [],
            created_by=created_by
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        comm_doc.id = doc_ref.id
        doc_ref.set(comm_doc.to_dict())
        
        return await self.get_communication_by_id(comm_doc.id)
    
    async def get_communication_by_id(self, comm_id: str) -> Optional[DGCommunicationResponse]:
        """Get DG communication by ID"""
        doc = self.db.collection(self.collection_name).document(comm_id).get()
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        comm = DGCommunication.from_dict(data, doc.id)
        
        # Get ship name
        ship_name = None
        if comm.ship_id:
            ship_doc = self.db.collection("ships").document(comm.ship_id).get()
            if ship_doc.exists:
                ship_name = ship_doc.to_dict().get('name')
        
        # Get crew name
        crew_name = None
        if comm.crew_id:
            crew_doc = self.db.collection("users").document(comm.crew_id).get()
            if crew_doc.exists:
                crew_name = crew_doc.to_dict().get('name')
        
        # Get creator name
        creator_doc = self.db.collection("users").document(comm.created_by).get()
        created_by_name = creator_doc.to_dict().get('name', '') if creator_doc.exists else ''
        
        return DGCommunicationResponse(
            id=comm.id,
            ref_no=comm.ref_no,
            comm_type=comm.comm_type,
            subject=comm.subject,
            content=comm.content,
            category=comm.category,
            status=comm.status,
            dg_office=comm.dg_office,
            ship_id=comm.ship_id,
            ship_name=ship_name,
            crew_id=comm.crew_id,
            crew_name=crew_name,
            priority=comm.priority,
            due_date=comm.due_date,
            response=comm.response,
            response_date=comm.response_date,
            attachments=comm.attachments,
            created_by=comm.created_by,
            created_by_name=created_by_name,
            created_at=comm.created_at,
            updated_at=comm.updated_at
        )
    
    async def get_all_communications(
        self, 
        comm_type: Optional[DGCommunicationType] = None,
        status: Optional[DGCommunicationStatus] = None,
        category: Optional[DGCommunicationCategory] = None,
        ship_id: Optional[str] = None
    ) -> List[DGCommunicationResponse]:
        """Get all DG communications with optional filters"""
        # Get all documents first, then filter in Python to avoid composite index requirements
        docs = self.db.collection(self.collection_name).stream()
        
        communications = []
        for doc in docs:
            data = doc.to_dict()
            
            # Apply filters in Python
            if comm_type and data.get("comm_type") != comm_type.value:
                continue
            if status and data.get("status") != status.value:
                continue
            if category and data.get("category") != category.value:
                continue
            if ship_id and data.get("ship_id") != ship_id:
                continue
            
            comm = await self.get_communication_by_id(doc.id)
            if comm:
                communications.append(comm)
        
        # Sort by created_at descending
        communications.sort(key=lambda x: x.created_at, reverse=True)
        
        return communications
    
    async def update_communication(self, comm_id: str, update_data: dict) -> Optional[DGCommunicationResponse]:
        """Update a DG communication"""
        doc_ref = self.db.collection(self.collection_name).document(comm_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updated_at"] = datetime.now()
        doc_ref.update(update_data)
        return await self.get_communication_by_id(comm_id)
    
    async def add_response(self, comm_id: str, response: str, mark_completed: bool = False) -> Optional[DGCommunicationResponse]:
        """Add a response to a DG communication"""
        doc_ref = self.db.collection(self.collection_name).document(comm_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data = {
            "response": response,
            "response_date": datetime.now(),
            "updated_at": datetime.now()
        }
        
        if mark_completed:
            update_data["status"] = DGCommunicationStatus.COMPLETED.value
        
        doc_ref.update(update_data)
        return await self.get_communication_by_id(comm_id)
    
    async def delete_communication(self, comm_id: str) -> bool:
        """Delete a DG communication"""
        doc_ref = self.db.collection(self.collection_name).document(comm_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        
        doc_ref.delete()
        return True
    
    async def get_stats(self, ship_id: Optional[str] = None) -> dict:
        """Get DG communication statistics, optionally filtered by ship"""
        if ship_id:
            docs = list(self.db.collection(self.collection_name).where("ship_id", "==", ship_id).stream())
        else:
            docs = list(self.db.collection(self.collection_name).stream())
        
        total = len(docs)
        pending = 0
        action_required = 0
        completed = 0
        incoming = 0
        outgoing = 0
        
        for doc in docs:
            data = doc.to_dict()
            status = data.get('status', '')
            comm_type = data.get('comm_type', '')
            
            if status == 'pending':
                pending += 1
            elif status == 'action_required':
                action_required += 1
            elif status == 'completed':
                completed += 1
            
            if comm_type == 'incoming':
                incoming += 1
            elif comm_type == 'outgoing':
                outgoing += 1
        
        return {
            "total": total,
            "pending": pending,
            "action_required": action_required,
            "completed": completed,
            "incoming": incoming,
            "outgoing": outgoing
        }

class InvoiceService(DatabaseService):
    collection_name = "invoices"
    
    def _generate_invoice_number(self) -> str:
        """Generate a unique invoice number"""
        year = datetime.now().year
        month = datetime.now().month
        
        # Get count of invoices this month
        prefix = f"INV-{year}{month:02d}"
        docs = self.db.collection(self.collection_name).stream()
        count = sum(1 for d in docs if d.to_dict().get('invoice_number', '').startswith(prefix)) + 1
        
        return f"{prefix}-{count:04d}"
    
    async def create_invoice(self, data: InvoiceCreate, created_by: str) -> InvoiceResponse:
        """Create a new invoice"""
        invoice_doc = Invoice(
            ship_id=data.ship_id,
            invoice_number=data.invoice_number or self._generate_invoice_number(),
            vendor_name=data.vendor_name,
            category=data.category,
            amount=data.amount,
            currency=data.currency,
            description=data.description,
            status=InvoiceStatus.DRAFT,
            due_date=data.due_date,
            attachments=data.attachments or [],
            remarks=data.remarks,
            created_by=created_by
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        invoice_doc.id = doc_ref.id
        doc_ref.set(invoice_doc.to_dict())
        
        return await self.get_invoice_by_id(invoice_doc.id)
    
    async def get_invoice_by_id(self, invoice_id: str) -> Optional[InvoiceResponse]:
        """Get invoice by ID"""
        doc = self.db.collection(self.collection_name).document(invoice_id).get()
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        invoice = Invoice.from_dict(data, doc.id)
        
        # Get ship name
        ship_name = ""
        if invoice.ship_id:
            ship_doc = self.db.collection("ships").document(invoice.ship_id).get()
            if ship_doc.exists:
                ship_name = ship_doc.to_dict().get('name', '')
        
        # Get creator name
        created_by_name = ""
        if invoice.created_by:
            creator_doc = self.db.collection("users").document(invoice.created_by).get()
            if creator_doc.exists:
                created_by_name = creator_doc.to_dict().get('name', '')
        
        return InvoiceResponse(
            id=invoice.id,
            ship_id=invoice.ship_id,
            ship_name=ship_name,
            invoice_number=invoice.invoice_number,
            vendor_name=invoice.vendor_name,
            category=invoice.category,
            amount=invoice.amount,
            currency=invoice.currency,
            description=invoice.description,
            status=invoice.status,
            due_date=invoice.due_date,
            paid_date=invoice.paid_date,
            attachments=invoice.attachments,
            remarks=invoice.remarks,
            created_by=invoice.created_by,
            created_by_name=created_by_name,
            approved_by=invoice.approved_by,
            approval_notes=invoice.approval_notes,
            created_at=invoice.created_at,
            updated_at=invoice.updated_at
        )
    
    async def get_all_invoices(
        self, 
        ship_id: Optional[str] = None,
        status: Optional[InvoiceStatus] = None
    ) -> List[InvoiceResponse]:
        """Get all invoices with optional filters"""
        docs = self.db.collection(self.collection_name).stream()
        
        invoices = []
        for doc in docs:
            data = doc.to_dict()
            
            # Apply filters in Python
            if ship_id and data.get("ship_id") != ship_id:
                continue
            if status and data.get("status") != status.value:
                continue
            
            invoice = await self.get_invoice_by_id(doc.id)
            if invoice:
                invoices.append(invoice)
        
        # Sort by created_at descending (handle timezone-aware and naive datetimes)
        def get_sort_key(inv):
            dt = inv.created_at
            if dt is None:
                return datetime.min
            # Convert to naive datetime for comparison if needed
            if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
                return dt.replace(tzinfo=None)
            return dt
        
        invoices.sort(key=get_sort_key, reverse=True)
        
        return invoices
    
    async def update_invoice(self, invoice_id: str, update_data: dict) -> Optional[InvoiceResponse]:
        """Update an invoice"""
        doc_ref = self.db.collection(self.collection_name).document(invoice_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updated_at"] = datetime.now()
        doc_ref.update(update_data)
        return await self.get_invoice_by_id(invoice_id)
    
    async def submit_invoice(self, invoice_id: str) -> Optional[InvoiceResponse]:
        """Submit an invoice for approval"""
        return await self.update_invoice(invoice_id, {"status": InvoiceStatus.SUBMITTED.value})
    
    async def approve_invoice(self, invoice_id: str, approved_by: str, notes: Optional[str] = None) -> Optional[InvoiceResponse]:
        """Approve an invoice"""
        update_data = {
            "status": InvoiceStatus.APPROVED.value,
            "approved_by": approved_by
        }
        if notes:
            update_data["approval_notes"] = notes
        return await self.update_invoice(invoice_id, update_data)
    
    async def reject_invoice(self, invoice_id: str, approved_by: str, notes: Optional[str] = None) -> Optional[InvoiceResponse]:
        """Reject an invoice"""
        update_data = {
            "status": InvoiceStatus.REJECTED.value,
            "approved_by": approved_by
        }
        if notes:
            update_data["approval_notes"] = notes
        return await self.update_invoice(invoice_id, update_data)
    
    async def mark_paid(self, invoice_id: str) -> Optional[InvoiceResponse]:
        """Mark an invoice as paid"""
        return await self.update_invoice(invoice_id, {
            "status": InvoiceStatus.PAID.value,
            "paid_date": datetime.now()
        })
    
    async def delete_invoice(self, invoice_id: str) -> bool:
        """Delete an invoice"""
        doc_ref = self.db.collection(self.collection_name).document(invoice_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        
        doc_ref.delete()
        return True
    
    async def get_stats(self, ship_id: Optional[str] = None) -> dict:
        """Get invoice statistics"""
        invoices = await self.get_all_invoices(ship_id=ship_id)
        
        total_amount = sum(inv.amount for inv in invoices)
        pending_amount = sum(inv.amount for inv in invoices if inv.status in [InvoiceStatus.SUBMITTED, InvoiceStatus.APPROVED])
        paid_amount = sum(inv.amount for inv in invoices if inv.status == InvoiceStatus.PAID)
        
        return {
            "total_count": len(invoices),
            "total_amount": total_amount,
            "pending_amount": pending_amount,
            "paid_amount": paid_amount,
            "draft_count": sum(1 for inv in invoices if inv.status == InvoiceStatus.DRAFT),
            "submitted_count": sum(1 for inv in invoices if inv.status == InvoiceStatus.SUBMITTED),
            "approved_count": sum(1 for inv in invoices if inv.status == InvoiceStatus.APPROVED),
            "paid_count": sum(1 for inv in invoices if inv.status == InvoiceStatus.PAID),
            "rejected_count": sum(1 for inv in invoices if inv.status == InvoiceStatus.REJECTED),
        }


class ClientService(DatabaseService):
    collection_name = "clients"
    
    async def create_client(self, data: ClientCreate, created_by: str) -> ClientResponse:
        """Create a new client"""
        client_doc = Client(
            name=data.name,
            company=data.company,
            contact_person=data.contact_person,
            email=data.email,
            phone=data.phone,
            address=data.address,
            country=data.country,
            contract_start=data.contract_start,
            contract_end=data.contract_end,
            status=ClientStatus.ACTIVE,
            notes=data.notes,
            created_by=created_by
        )
        
        doc_ref = self.db.collection(self.collection_name).document()
        client_doc.id = doc_ref.id
        doc_ref.set(client_doc.to_dict())
        
        return await self.get_client_by_id(client_doc.id)
    
    async def get_client_by_id(self, client_id: str) -> Optional[ClientResponse]:
        """Get client by ID"""
        doc = self.db.collection(self.collection_name).document(client_id).get()
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        client = Client.from_dict(data, doc.id)
        
        # Count vessels assigned to this client
        vessels_count = 0
        ships_docs = self.db.collection("ships").where("client_id", "==", client_id).stream()
        vessels_count = sum(1 for _ in ships_docs)
        
        return ClientResponse(
            id=client.id,
            name=client.name,
            company=client.company,
            contact_person=client.contact_person,
            email=client.email,
            phone=client.phone,
            address=client.address,
            country=client.country,
            contract_start=client.contract_start,
            contract_end=client.contract_end,
            status=client.status,
            vessels_count=vessels_count,
            notes=client.notes,
            created_by=client.created_by,
            created_at=client.created_at,
            updated_at=client.updated_at
        )
    
    async def get_all_clients(
        self, 
        status: Optional[ClientStatus] = None,
        country: Optional[str] = None
    ) -> List[ClientResponse]:
        """Get all clients with optional filters"""
        docs = self.db.collection(self.collection_name).stream()
        
        clients = []
        for doc in docs:
            data = doc.to_dict()
            
            # Apply filters in Python
            if status and data.get("status") != status.value:
                continue
            if country and data.get("country") != country:
                continue
            
            client = await self.get_client_by_id(doc.id)
            if client:
                clients.append(client)
        
        # Sort by created_at descending
        def get_sort_key(c):
            dt = c.created_at
            if dt is None:
                return datetime.min
            if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
                return dt.replace(tzinfo=None)
            return dt
        
        clients.sort(key=get_sort_key, reverse=True)
        
        return clients
    
    async def update_client(self, client_id: str, update_data: dict) -> Optional[ClientResponse]:
        """Update a client"""
        doc_ref = self.db.collection(self.collection_name).document(client_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        update_data["updated_at"] = datetime.now()
        doc_ref.update(update_data)
        return await self.get_client_by_id(client_id)
    
    async def delete_client(self, client_id: str) -> bool:
        """Delete a client"""
        doc_ref = self.db.collection(self.collection_name).document(client_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        
        doc_ref.delete()
        return True
    
    async def get_stats(self) -> dict:
        """Get client statistics"""
        clients = await self.get_all_clients()
        
        active_count = sum(1 for c in clients if c.status == ClientStatus.ACTIVE)
        inactive_count = sum(1 for c in clients if c.status == ClientStatus.INACTIVE)
        total_vessels = sum(c.vessels_count for c in clients)
        
        return {
            "total_count": len(clients),
            "active_count": active_count,
            "inactive_count": inactive_count,
            "total_vessels": total_vessels
        }


# Initialize services
user_service = UserService()
ship_service = ShipService()
pms_service = PMSService()
worklog_service = WorkLogService()
bunkering_service = BunkeringService()
candidate_service = CandidateService()
dg_communication_service = DGCommunicationService()
invoice_service = InvoiceService()
client_service = ClientService()
