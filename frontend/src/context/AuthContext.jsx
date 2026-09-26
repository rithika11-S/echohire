/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, updateProfileApi, fetchCurrentUserApi } from "../services/api";

const AuthContext = createContext();

const DEMO_USERS = [
  {
    id: "user-seeker-1",
    email: "seeker@echohire.com",
    password: "password123",
    name: "Rahul Sharma",
    role: "user",
    phone: "+91 98765 43210",
    location: "Chennai, Tamil Nadu",
    summary: "Passionate Frontend Developer dedicated to creating accessible web applications for everyone.",
    education: "B.Tech in Computer Science, Anna University (2020 - 2024)",
    experience: "Junior Web Developer at TechAccess (1 year)",
    skills: ["HTML", "CSS", "React", "JavaScript", "ARIA", "Accessibility"],
    accessNeed: "screen reader",
    resumeName: "Rahul_Sharma_Resume.pdf",
  },
  {
    id: "user-employer-1",
    email: "employer@techcorp.com",
    password: "password123",
    name: "TechCorp Solutions",
    role: "recruiter",
    company: "TechCorp Solutions",
    companyId: "company-techcorp",
    location: "Bangalore, Karnataka",
    phone: "+91 98123 45678",
    description: "Leading technology enterprise committed to inclusive hiring and accessible workspace environments.",
  },
];

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem("echohire_auth_token") || null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("echohire_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  // Restore authenticated session on mount
  useEffect(() => {
    async function restoreSession() {
      if (token) {
        try {
          const res = await fetchCurrentUserApi();
          if (res && res.success && res.user) {
            setCurrentUser(res.user);
            localStorage.setItem("echohire_current_user", JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn("Backend session restore offline fallback active:", err.message);
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, [token]);

  // Keep localStorage updated
  useEffect(() => {
    if (token) {
      localStorage.setItem("echohire_auth_token", token);
    } else {
      localStorage.removeItem("echohire_auth_token");
    }
  }, [token]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("echohire_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("echohire_current_user");
    }
  }, [currentUser]);

  const login = async (email, password) => {
    // 1. Try Backend REST API
    try {
      const res = await loginUser(email, password);
      if (res && res.success && res.user && res.token) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem("echohire_auth_token", res.token);
        localStorage.setItem("echohire_current_user", JSON.stringify(res.user));
        return { success: true, user: res.user, token: res.token };
      } else if (res && res.message && !res.message.includes("Unable to connect")) {
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.warn("Backend login API unavailable, using local authentication fallback:", err);
    }

    // 2. Fallback to local state / DEMO_USERS
    const savedUsersStr = localStorage.getItem("echohire_users");
    const localUsers = savedUsersStr ? JSON.parse(savedUsersStr) : DEMO_USERS;
    const cleanEmail = email.trim().toLowerCase();

    const found = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (found) {
      const fallbackToken = `token-${Date.now()}`;
      setToken(fallbackToken);
      setCurrentUser(found);
      localStorage.setItem("echohire_auth_token", fallbackToken);
      localStorage.setItem("echohire_current_user", JSON.stringify(found));
      return { success: true, user: found, token: fallbackToken };
    }

    return {
      success: false,
      message: "Invalid email address or password.",
    };
  };

  const register = async (userData) => {
    const rawRole = userData.role ? userData.role.toString().toLowerCase() : "user";
    const dbRole = rawRole === "employer" || rawRole === "recruiter" ? "recruiter" : "user";
    const normalizedData = { ...userData, role: dbRole };

    // 1. Try Backend REST API
    try {
      const res = await registerUser(normalizedData);
      if (res && res.success && res.user && res.token) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem("echohire_auth_token", res.token);
        localStorage.setItem("echohire_current_user", JSON.stringify(res.user));

        const savedUsersStr = localStorage.getItem("echohire_users");
        const localUsers = savedUsersStr ? JSON.parse(savedUsersStr) : DEMO_USERS;
        if (!localUsers.some((u) => u.email === res.user.email)) {
          localStorage.setItem("echohire_users", JSON.stringify([...localUsers, res.user]));
        }
        return { success: true, user: res.user, token: res.token };
      } else if (res && res.message && res.message.includes("already exists")) {
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.warn("Backend registration API unavailable, using local creation fallback:", err);
    }

    // 2. Fallback to local state creation
    const savedUsersStr = localStorage.getItem("echohire_users");
    const localUsers = savedUsersStr ? JSON.parse(savedUsersStr) : DEMO_USERS;
    const cleanEmail = userData.email.trim().toLowerCase();

    const existing = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: "An account with this email already exists." };
    }

    const fallbackUser = {
      id: `user-${Date.now()}`,
      ...normalizedData,
      name: userData.name || "User",
      email: cleanEmail,
      role: dbRole,
    };
    const fallbackToken = `token-${Date.now()}`;

    setToken(fallbackToken);
    setCurrentUser(fallbackUser);
    localStorage.setItem("echohire_auth_token", fallbackToken);
    localStorage.setItem("echohire_current_user", JSON.stringify(fallbackUser));
    localStorage.setItem("echohire_users", JSON.stringify([...localUsers, fallbackUser]));

    return { success: true, user: fallbackUser, token: fallbackToken };
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("echohire_auth_token");
    localStorage.removeItem("echohire_current_user");
  };

  const updateProfile = async (updatedData) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    localStorage.setItem("echohire_current_user", JSON.stringify(updatedUser));
    await updateProfileApi(currentUser.id, updatedData);
  };

  const isAuthenticated = Boolean(currentUser && token);
  const role = currentUser?.role || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated,
        role,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
