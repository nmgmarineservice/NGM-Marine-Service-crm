import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, User } from "firebase/auth";
import { auth } from "../firebase";
import { userApi, shipsApi, UserResponse, ShipResponse } from "../services/api";

type Role = "master" | "staff" | "crew";

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  ship_id?: string;
  ship_name?: string;
  phone?: string;
  position?: string;
  active: boolean;
}

interface AuthContextType {
  firebaseUser: User | null;
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Ships management
  ships: ShipResponse[];
  selectedShip: string | null;
  setSelectedShip: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ships, setShips] = useState<ShipResponse[]>([]);
  const [selectedShip, setSelectedShip] = useState<string | null>(null);

  const fetchUserFromBackend = async (fbUser: User) => {
    try {
      // 1. Fetch User Data
      const response = await userApi.getCurrentUser();
      let userData: AppUser | null = null;

      if (response.data) {
        const backendUser = response.data;
        userData = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          role: backendUser.role,
          ship_id: backendUser.ship_id,
          ship_name: backendUser.ship_name,
          phone: backendUser.phone,
          position: backendUser.position,
          active: backendUser.active,
        };
        setUser(userData);
      } else {
        console.error('Failed to fetch user data from backend:', response.error);
        // Fallback to basic user info from Firebase
        userData = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          role: 'crew', // Default role
          active: true,
        };
        setUser(userData);
      }

      // 2. Fetch Ships if user exists and has permission (or for simple setup)
      if (userData) {
        // Fetch all ships for reference in TopBar
        const shipsResponse = await shipsApi.getAllShips();
        if (shipsResponse.data) {
          setShips(shipsResponse.data);
          
          // Set default selected ship
          if (userData.ship_id) {
            setSelectedShip(userData.ship_id);
          } else if (shipsResponse.data.length > 0) {
            // If no ship assigned, maybe select the first one or leave null
             setSelectedShip(shipsResponse.data[0].id);
          }
        }
      }

    } catch (error) {
      console.error('Error fetching user from backend:', error);
      // Fallback to basic user info
      setUser({
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        role: 'crew', // Default role
        active: true,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(true);

      if (fbUser) {
        await fetchUserFromBackend(fbUser);
      } else {
        setUser(null);
        setShips([]);
        setSelectedShip(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User data will be fetched in the onAuthStateChanged callback
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setShips([]);
    setSelectedShip(null);
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserFromBackend(firebaseUser);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      firebaseUser, 
      user, 
      loading, 
      login, 
      logout, 
      refreshUser,
      ships,
      selectedShip,
      setSelectedShip
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
