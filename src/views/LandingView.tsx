import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Rocket, LayoutDashboard, BarChart3, Calendar as CalendarIcon, ArrowRight, Check, Mail, Globe, Share2 } from 'lucide-preact';

export const LandingView = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-[#F6F6F8] text-[#101622] font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Rocket className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">ProjectTracker</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#solutions" className="hover:text-primary transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#about" className="hover:text-primary transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={onGetStarted} className="text-sm font-semibold hover:text-primary transition-colors">Log In</button>
            <Button onClick={onGetStarted} size="sm" className="hidden sm:flex">Get Started</Button>
          </div>
        </div>
      </header>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full">
              <span className="size-1.5 bg-primary rounded-full animate-pulse"></span>
              New: AI-Powered Insights
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">
              Manage Projects with <span className="text-primary">Precision</span> and Ease
            </h1>
            <p className="text-lg text-[#64748B] max-w-lg leading-relaxed">
              The all-in-one platform for modern teams to track, visualize, and ship complex projects faster. Friction-free collaboration at scale.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
                <input 
                  type="email" 
                  placeholder="Enter your work email" 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <Button onClick={onGetStarted} className="py-3 px-8">Get Started for Free</Button>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="size-8 rounded-full border-2 border-white overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#64748B] font-medium">Trusted by 10,000+ teams worldwide</p>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-emerald-50 rounded-3xl overflow-hidden shadow-2xl border border-white/50">
              <img 
                src="https://picsum.photos/seed/dashboard/800/800" 
                alt="Dashboard Preview" 
                className="w-full h-full object-cover opacity-90"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-[#E2E8F0] hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Check size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Project Completed</p>
                  <p className="text-xs text-[#64748B]">2 mins ago</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="features" className="px-6 md:px-12 py-24 bg-white">
          <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">Core Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need to ship faster</h2>
            <p className="text-[#64748B] max-w-2xl mx-auto">
              Stop juggling tabs. ProjectTracker provides the integrated tools you need to manage complex workflows without the friction.
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Kanban Boards',
                desc: 'Visualize your workflow and move tasks from To-Do to Done with drag-and-drop simplicity and custom statuses.',
                icon: LayoutDashboard,
                color: 'bg-blue-50 text-blue-600',
                img: 'https://picsum.photos/seed/kanban/400/300'
              },
              {
                title: 'Advanced Analytics',
                desc: 'Gain deep insights into team velocity and project bottlenecks with real-time data and customizable reports.',
                icon: BarChart3,
                color: 'bg-indigo-50 text-indigo-600',
                img: 'https://picsum.photos/seed/analytics/400/300'
              },
              {
                title: 'Integrated Calendar',
                desc: 'Keep everyone in sync with a unified schedule that connects tasks directly to deadlines and milestones.',
                icon: CalendarIcon,
                color: 'bg-purple-50 text-purple-600',
                img: 'https://picsum.photos/seed/calendar/400/300'
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-[#F6F6F8] border border-transparent hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className={`size-12 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed mb-6">{feature.desc}</p>
                <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-white border border-[#E2E8F0]">
                  <img src={feature.img} alt={feature.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 md:px-12 py-24">
          <div className="max-w-5xl mx-auto bg-[#0D121F] rounded-[40px] p-12 md:p-24 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to streamline your workflow?</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-lg">
                Join thousands of high-performing teams already using ProjectTracker to deliver their best work.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={onGetStarted} className="px-10 py-4 text-lg">Get Started Now</Button>
                <button className="px-10 py-4 text-lg font-bold border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">Talk to Sales</button>
              </div>
              <p className="text-sm text-slate-500">Free 14-day trial. No credit card required.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-16 border-t border-[#E2E8F0] bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 md:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Rocket className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">ProjectTracker</span>
            </div>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Building the future of project management with intuitive tools and powerful analytics.
            </p>
            <div className="flex items-center gap-4">
              <button className="size-10 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-primary hover:border-primary transition-all">
                <Globe size={18} />
              </button>
              <button className="size-10 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-primary hover:border-primary transition-all">
                <Mail size={18} />
              </button>
              <button className="size-10 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-primary hover:border-primary transition-all">
                <Share2 size={18} />
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-[#64748B]">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Enterprise</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-[#64748B]">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Webinars</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-[#64748B]">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#E2E8F0] flex flex-col md:row items-center justify-between gap-4 text-xs text-[#64748B]">
          <p>© 2024 ProjectTracker Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors">System Status</a>
            <a href="#" className="hover:text-primary transition-colors">Security</a>
            <a href="#" className="hover:text-primary transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
