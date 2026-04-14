import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import mwLogo from "@/assets/mw-logo.svg";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDefaultPage } from "@/lib/roles";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Fetch role to determine redirect
    const { data: role } = await supabase.rpc("get_user_role");
    
    toast.success("Welcome back!");
    navigate(getDefaultPage(role));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden items-center justify-center" style={{ background: "#070A0F" }}>
        {/* Animated grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(271 81% 56% / 0.05) 1px, transparent 1px),
            linear-gradient(90deg, hsl(271 81% 56% / 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />

        {/* Glow orb */}
        <div className="absolute bottom-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />

        <div className="relative z-10 text-center animate-fade-in-up">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img
              src={mwLogo}
              alt="MW Growth Systems"
              className="h-[80px] w-auto"
            />
          </div>

          {/* Feature badges */}
          <div className="flex items-center gap-3 mt-10">
            {[
              { icon: "📊", label: "Real-time Analytics" },
              { icon: "🤖", label: "AI Insights" },
              { icon: "🎯", label: "Campaign Tracking" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 bg-card/40 border border-border/50 rounded-lg px-4 py-2.5 backdrop-blur-sm"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-xs font-medium text-foreground/80">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="w-full lg:w-[40%] bg-card border-l border-border flex flex-col justify-center px-8 sm:px-16">
        <div className="max-w-sm mx-auto w-full animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-10 lg:hidden">
            <img
              src={mwLogo}
              alt="MW Growth Systems"
              className="h-[50px] w-auto"
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full h-11 bg-secondary border border-border rounded-lg pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 bg-secondary border border-border rounded-lg pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label className="text-xs text-muted-foreground cursor-pointer">Remember me</label>
              </div>
              <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-transform active:scale-[0.98] hover:scale-[1.02]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {/* Free tool link */}
            <a href="/calculator" className="block">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-primary/40 text-primary hover:bg-primary/10 font-medium text-sm"
              >
                🧮 Free CPL Calculator — No signup needed →
              </Button>
            </a>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Don't have an account?{" "}
            <span className="text-primary font-medium">Contact admin</span>
          </p>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-[10px] text-muted-foreground/60">
              © 2026 Mohamed Waheed — MW Growth Systems • v1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
