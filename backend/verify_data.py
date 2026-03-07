from app.firebase import db

def verify_data():
    print("--- Candidates ---")
    candidates = list(db.collection("candidates").stream())
    accepted_count = 0
    for cand in candidates:
        d = cand.to_dict()
        status = d.get('stage')
        if status == 'accepted':
            accepted_count += 1
            print(f"Accepted Candidate: {d.get('name')} (ID: {cand.id})")
        else:
            # print(f"Candidate: {d.get('name')} - {status}")
            pass
    print(f"Total Candidates: {len(candidates)}, Accepted: {accepted_count}")

    print("\n--- Users (potential Crew) ---")
    users = list(db.collection("users").stream())
    crew_count = 0
    for u in users:
        d = u.to_dict()
        role = d.get('role')
        if role == 'crew':
            crew_count += 1
            print(f"Crew User: {d.get('name')} (ID: {u.id}, Email: {d.get('email')})")
    print(f"Total Users: {len(users)}, Crew: {crew_count}")

    print("\n--- Onboarding Applications ---")
    apps = list(db.collection("onboarding_applications").stream())
    print(f"Total Applications: {len(apps)}")

if __name__ == "__main__":
    verify_data()
