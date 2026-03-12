import { useState } from 'preact/hooks';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Mail, Lock, LogIn, Rocket, Eye, ChevronRight, Loader2 } from 'lucide-preact';

export const LoginView = ({ onLogin }: { onLogin: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate local auth check
    setTimeout(() => {
      onLogin();
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F8] flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Rocket className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">ProjectTracker</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]">
          <a href="#" className="hover:text-primary transition-colors">Product</a>
          <a href="#" className="hover:text-primary transition-colors">Pricing</a>
          <a href="#" className="hover:text-primary transition-colors">Support</a>
          <Button size="sm" className="px-6">Sign Up</Button>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 size-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 right-1/4 size-[500px] bg-emerald-500/5 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-[520px] relative z-10">
          <Card className="p-12 shadow-2xl border-white/50 bg-white/90 backdrop-blur-xl rounded-[32px]">
            <div className="text-center space-y-4 mb-10">
              <h1 className="text-4xl font-bold tracking-tight text-[#101622]">Welcome Back</h1>
              <p className="text-[#64748B]">Manage your projects and teams with ease.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#101622]">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    className="w-full pl-12 pr-4 py-4 bg-[#F6F6F8] border border-[#E2E8F0] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-[#101622]">Password</label>
                  <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full pl-12 pr-12 py-4 bg-[#F6F6F8] border border-[#E2E8F0] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-primary transition-colors">
                    <Eye size={20} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="remember" className="size-4 rounded border-[#E2E8F0] text-primary focus:ring-primary/20" />
                <label htmlFor="remember" className="text-sm font-medium text-[#64748B]">Remember this device</label>
              </div>

              <Button type="submit" className="w-full py-4 text-lg flex items-center justify-center gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E2E8F0]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-[#64748B]">
                  <span className="bg-white px-4">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="flex items-center justify-center gap-3 py-3 border border-[#E2E8F0] rounded-xl font-bold text-sm hover:bg-[#F6F6F8] transition-all">
                  <img src="https://www.google.com/favicon.ico" className="size-4" alt="Google" />
                  Google
                </button>
                <button type="button" className="flex items-center justify-center gap-3 py-3 border border-[#E2E8F0] rounded-xl font-bold text-sm hover:bg-[#F6F6F8] transition-all">
                  <img src="https://www.facebook.com/favicon.ico" className="size-4" alt="Facebook" />
                  Facebook
                </button>
              </div>
            </form>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-[#64748B]">
              Don't have an account? <a href="#" className="text-primary font-bold hover:underline">Start your free trial</a>
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-primary transition-colors">Contact Us</a>
        </div>
        <p>© 2024 ProjectTracker Inc.</p>
      </footer>
    </div>
  );
};
