from app.firebase import db

def list_onboarding_apps():
    print("Fetching onboarding applications...")
    try:
        query = db.collection("onboarding_applications")
        docs = list(query.stream())
        print(f"Found {len(docs)} applications")
        for doc in docs:
            data = doc.to_dict()
            print(f"ID: {doc.id}")
            print(f"  Candidate ID: {data.get('candidate_id')}")
            print(f"  Crew ID: {data.get('crew_id')}")
            print(f"  Status: {data.get('status')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_onboarding_apps()
