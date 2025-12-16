import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Welcome back!",
        description: `Signed in as ${result.user.email}`,
      });
    } catch (error: any) {
      const message = error.code === "auth/invalid-credential" 
        ? "Invalid email or password" 
        : error.code === "auth/user-not-found"
        ? "No account found with this email"
        : error.code === "auth/wrong-password"
        ? "Incorrect password"
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Sign-in failed",
        description: message,
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Account created!",
        description: `Welcome to LabVio, ${result.user.email}`,
      });
    } catch (error: any) {
      const message = error.code === "auth/email-already-in-use"
        ? "An account with this email already exists"
        : error.code === "auth/weak-password"
        ? "Password should be at least 6 characters"
        : error.code === "auth/invalid-email"
        ? "Invalid email address"
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Sign-up failed",
        description: message,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-out failed",
        description: error.message,
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
