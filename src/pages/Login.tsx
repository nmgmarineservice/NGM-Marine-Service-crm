import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"master" | "staff" | "crew">("crew");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // Sign up new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("✅ User created successfully:", userCredential.user.email);
        console.log("📝 Role assigned:", role);
        console.log("ℹ️  Note: User needs to be created in backend database with role:", role);
        alert(`Account created for ${email}!\n\nNote: For full functionality, this user needs to be added to the backend database with role: ${role}`);
        
        // Switch to sign in mode
        setIsSignUp(false);
      } else {
        // Sign in existing user
        await login(email, password);
      }
    } catch (err: any) {
      console.error("❌ Authentication error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <form onSubmit={submit} style={{ width: 400, padding: 32, background: "#111827", borderRadius: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src="/nmg-logo.jpeg" alt="NMG Marine" style={{ height: 80, marginBottom: 16 }} />
          <h2 style={{ color: "white", margin: "10px 0 5px 0" }}>
            {isSignUp ? t('Sign Up') : t('login_button')}
          </h2>
          <p style={{ color: "#9CA3AF", fontSize: "14px", margin: 0 }}>
            {t('login_title')}
          </p>
        </div>

        {isSignUp && (
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 12, marginBottom: 12, background: "#1F2937", border: "1px solid #374151", color: "white", borderRadius: 6 }}
            required
          />
        )}

        <input
          placeholder={t('email_label')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 12, background: "#1F2937", border: "1px solid #374151", color: "white", borderRadius: 6 }}
          required
        />

        <input
          placeholder={t('password_label')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 12, background: "#1F2937", border: "1px solid #374151", color: "white", borderRadius: 6 }}
          required
        />

        {isSignUp && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "master" | "staff" | "crew")}
            style={{ width: "100%", padding: 12, marginBottom: 12, background: "#1F2937", border: "1px solid #374151", color: "white", borderRadius: 6 }}
          >
            <option value="crew">Crew Member</option>
            <option value="staff">Staff</option>
            <option value="master">Master</option>
          </select>
        )}

        {error && (
          <div style={{ 
            color: "#DC2626", 
            fontSize: "14px", 
            marginBottom: 16, 
            padding: "12px 16px", 
            background: "#FEE2E2", 
            borderRadius: 6,
            border: "1px solid #FECACA",
            textAlign: "center"
          }}>
            <strong>⚠️ Login Failed</strong><br/>
            {error.includes("auth/invalid-credential") || error.includes("auth/wrong-password") || error.includes("auth/user-not-found") 
              ? "Invalid email or password. Please try again."
              : error}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          style={{ 
            width: "100%", 
            padding: 12, 
            background: loading ? "#6B7280" : "#1ABC9C", 
            border: 0, 
            borderRadius: 6,
            color: "white",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? t('Processing...') : (isSignUp ? t('Sign Up') : t('login_button'))}
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#1ABC9C", 
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </div>

        {!isSignUp && (
          <div style={{ marginTop: 20, padding: 12, background: "#1F2937", borderRadius: 6 }}>
            <p style={{ color: "#9CA3AF", fontSize: "12px", margin: 0, textAlign: "center" }}>
              <strong>Test Accounts:</strong><br/>
              • master@nmg-marine.com (Master)<br/>
              • staff@nmg-marine.com (Staff)<br/>
              • crew@nmg-marine.com (Crew)<br/>
              <small>Use any password for testing</small>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
