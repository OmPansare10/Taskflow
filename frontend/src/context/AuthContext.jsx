import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import { apiRequest } from "../services/api";


const AuthContext = createContext();


export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);


  /* ================= CHECK LOGIN ================= */

  useEffect(() => {

    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }


    const getUser = async () => {

      try {

        const data = await apiRequest(
          "/auth/me",
          "GET",
          null,
          token
        );

        setUser(data);

      } catch (error) {

        console.log(
          "Authentication failed"
        );

        localStorage.removeItem(
          "access_token"
        );

        setUser(null);

      } finally {

        setLoading(false);

      }

    };


    getUser();

  }, []);


  /* ================= LOGIN ================= */

  const login = async (
    email,
    password
  ) => {

    const data = await apiRequest(
      "/auth/login",
      "POST",
      {
        email,
        password
      }
    );


    localStorage.setItem(
      "access_token",
      data.access_token
    );


    setUser(data.user);


    return data;

  };


  /* ================= LOGOUT ================= */

  const logout = () => {

    localStorage.removeItem(
      "access_token"
    );

    setUser(null);

  };


  return (

    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}


/* ================= useAuth ================= */

export function useAuth() {

  return useContext(
    AuthContext
  );

}