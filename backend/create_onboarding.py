from app.database import user_service, candidate_service
from app.services.onboarding_service import onboarding_service, OnboardingStatus, CrewOnboarding
import asyncio
import asyncio

async def create_demo_onboarding():
    # Target candidate and crew
    # Candidate: Abdul Ashif (qvIim7iebxfK3HKX84D6)
    # Crew: Abdul Ashif (bhFRrOvIVNBpFGwryTdV)
    candidate_id = "qvIim7iebxfK3HKX84D6"
    crew_id = "bhFRrOvIVNBpFGwryTdV"

    print(f"Creating onboarding for Candidate {candidate_id} -> Crew {crew_id}")
    try:
        app = await onboarding_service.create_application(candidate_id, crew_id)
        print(f"Created Application ID: {app.id}")
        print(f"Status: {app.status}")
        
        # Verify it exists
        fetched = await onboarding_service.get_application_by_id(app.id)
        if fetched:
            print("Verified: Application exists in DB")
        else:
            print("Error: Application not found after creation")
            
    except Exception as e:
        print(f"Creation failed: {e}")

if __name__ == "__main__":
    asyncio.run(create_demo_onboarding())
