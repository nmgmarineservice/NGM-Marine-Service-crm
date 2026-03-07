import asyncio
from app.firebase import db

async def list_users():
    users = db.collection('users').stream()
    print("Listing users in Firestore:")
    found = False
    for user in users:
        print(f"ID: {user.id} -> {user.to_dict()}")
        found = True
    if not found:
        print("No users found in Firestore 'users' collection.")

if __name__ == "__main__":
    asyncio.run(list_users())
