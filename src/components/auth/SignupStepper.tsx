import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, AtSign, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface SignupStepperProps {
  name: string;
  setName: (name: string) => void;
  username: string;
  setUsername: (username: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  errors: { email?: string; password?: string; name?: string; username?: string };
  setErrors: (errors: { email?: string; password?: string; name?: string; username?: string }) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToLogin: () => void;
}

const steps = [
  { id: 1, title: "Personal Info", description: "Name & Username" },
  { id: 2, title: "Email", description: "Your email address" },
  { id: 3, title: "Password", description: "Create password" },
];

export const SignupStepper = ({
  name,
  setName,
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  errors,
  setErrors,
  isSubmitting,
  onSubmit,
  onSwitchToLogin,
}: SignupStepperProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  
  const { checkUsernameExists, checkEmailExists } = useAuth();

  // Debounced username check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      const exists = await checkUsernameExists(username);
      setUsernameAvailable(!exists);
      setUsernameChecking(false);
      if (exists) {
        setErrors({ ...errors, username: "This username is already taken" });
      } else {
        setErrors({ ...errors, username: undefined });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Debounced email check
  useEffect(() => {
    if (!email.includes("@") || !email.includes(".")) {
      setEmailAvailable(null);
      return;
    }

    setEmailChecking(true);
    const timer = setTimeout(async () => {
      const exists = await checkEmailExists(email);
      setEmailAvailable(!exists);
      setEmailChecking(false);
      if (exists) {
        setErrors({ ...errors, email: "An account with this email already exists" });
      } else {
        setErrors({ ...errors, email: undefined });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  const canProceedStep1 = name.trim().length >= 2 && username.trim().length >= 3 && usernameAvailable === true;
  const canProceedStep2 = email.includes("@") && email.includes(".") && !errors.email;
  const canProceedStep3 = password.length >= 6;

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedStep2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep < 3) {
        handleNext();
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300",
                  currentStep > step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p className={cn(
                  "text-sm font-medium",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-12 sm:w-20 h-1 mx-2 rounded-full transition-all duration-300",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Step 1: Name & Username */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Let's get started</h2>
              <p className="text-muted-foreground mt-1">Tell us about yourself</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 pl-12"
                  autoFocus
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "h-12 pl-12 pr-12",
                    errors.username && "border-destructive",
                    usernameAvailable === true && "border-green-500"
                  )}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameChecking && (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {!usernameChecking && usernameAvailable === true && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Use this to sign in later (letters, numbers, underscores only)</p>
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
              {usernameAvailable === true && !errors.username && (
                <p className="text-sm text-green-500">Username is available!</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Email */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">What's your email?</h2>
              <p className="text-muted-foreground mt-1">We'll send you a verification email</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "h-12 pl-12 pr-12",
                    errors.email && "border-destructive",
                    emailAvailable === true && "border-green-500"
                  )}
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {emailChecking && (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {!emailChecking && emailAvailable === false && (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Password */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Create a password</h2>
              <p className="text-muted-foreground mt-1">Make it strong and secure</p>
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
                  className={cn("h-12 pl-12 pr-12", errors.password && "border-destructive")}
                  autoFocus
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
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all",
                      password.length >= i * 2 ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-4">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button
              type="button"
              className="flex-1 h-12 gradient-primary"
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2)
              }
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 h-12 gradient-primary"
              disabled={isSubmitting || !canProceedStep3}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Switch to Login */}
      <p className="text-center text-muted-foreground">
        Already have an account?{" "}
        <button
          onClick={onSwitchToLogin}
          className="text-primary font-semibold hover:underline"
          disabled={isSubmitting}
        >
          Sign in
        </button>
      </p>
    </div>
  );
};