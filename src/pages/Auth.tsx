import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, AtSign, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { SignupStepper } from "@/components/auth/SignupStepper";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; username?: string }>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, loading, getEmailByUsername } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const validateLoginForm = () => {
    const newErrors: { email?: string; password?: string; name?: string; username?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = "Please enter your username";
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupForm = () => {
    const newErrors: { email?: string; password?: string; name?: string; username?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) return;
    
    setIsSubmitting(true);

    try {
      // Get email from username
      const userEmail = await getEmailByUsername(username.toLowerCase());
      
      if (!userEmail) {
        toast({
          title: "Login failed",
          description: "Username not found. Please check your username.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      const { error } = await signIn(userEmail, password);
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message === "Invalid login credentials" 
            ? "Invalid username or password. Please try again."
            : error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully."
        });
        navigate("/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) return;
    
    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, name, username);
      
      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        // Send welcome/verification email via edge function
        try {
          const verificationLink = `${window.location.origin}/dashboard`;
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
            },
            body: JSON.stringify({
              to: email,
              user_name: name || email.split('@')[0],
              verification_link: verificationLink
            })
          });

          if (!response.ok) {
            console.warn("Failed to send verification email");
          } else {
            console.log("Verification email sent successfully");
          }
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Don't block signup if email fails
        }
        
        toast({
          title: "Account created!",
          description: "Welcome to Academia! A verification email has been sent."
        });
        navigate("/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Academia</span>
          </Link>

          {isLogin ? (
            <>
              {/* Login Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Welcome back
                </h1>
                <p className="text-muted-foreground">
                  Enter your username and password to sign in
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-foreground font-medium">Username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                        if (errors.username) setErrors({ ...errors, username: undefined });
                      }}
                      className={`h-12 pl-12 ${errors.username ? 'border-destructive' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      className={`h-12 pl-12 pr-12 ${errors.password ? 'border-destructive' : ''}`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary font-semibold text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle to Signup */}
              <p className="text-center mt-8 text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setErrors({});
                    setEmail("");
                    setPassword("");
                    setName("");
                    setUsername("");
                  }}
                  className="text-primary font-semibold hover:underline"
                  disabled={isSubmitting}
                >
                  Sign up
                </button>
              </p>
            </>
          ) : (
            <>
              {/* Signup Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Create an account
                </h1>
                <p className="text-muted-foreground">
                  Start your journey to academic excellence
                </p>
              </div>

              {/* Signup Stepper */}
              <SignupStepper
                name={name}
                setName={setName}
                username={username}
                setUsername={setUsername}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                errors={errors}
                setErrors={setErrors}
                isSubmitting={isSubmitting}
                onSubmit={handleSignupSubmit}
                onSwitchToLogin={() => {
                  setIsLogin(true);
                  setErrors({});
                  setEmail("");
                  setPassword("");
                  setName("");
                  setUsername("");
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary-foreground/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground/20 blur-3xl" />
        </div>
        
        <div className="relative z-10 text-center text-primary-foreground max-w-lg">
          <div className="w-24 h-24 rounded-3xl bg-primary-foreground/20 backdrop-blur-lg flex items-center justify-center mx-auto mb-8">
            <GraduationCap className="w-14 h-14" />
          </div>
          <h2 className="text-4xl font-bold mb-6">
            Your Academic Success Starts Here
          </h2>
          <p className="text-xl text-primary-foreground/80 leading-relaxed">
            Join thousands of students who trust Academia to manage their grades, 
            attendance, expenses, and deadlines.
          </p>
          
        </div>
      </div>
    </div>
  );
};

export default Auth;
