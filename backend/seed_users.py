import asyncio
from firebase_admin import auth, firestore
from app.firebase import db
from datetime import datetime

async def seed_users():
    print("Fetching users from Firebase Auth...")
    users = auth.list_users().iterate_all()
    
    for user in users:
        print(f"Checking user: {user.email} (UID: {user.uid})")
        
        # Check if user exists in Firestore
        user_ref = db.collection('users').document(user.uid)
        doc = user_ref.get()
        
        if not doc.exists:
            print(f"Creating Firestore record for {user.email}...")
            user_data = {
                "id": user.uid,
                "email": user.email,
                "name": user.display_name or user.email.split('@')[0],
                "role": "master",  # Default to master for initial users
                "active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            user_ref.set(user_data)
            print(f"✅ Created {user.email}")
        else:
            print(f"ℹ️ User {user.email} already exists in Firestore.")

if __name__ == "__main__":
    asyncio.run(seed_users())
