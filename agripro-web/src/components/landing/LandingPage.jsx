import React from 'react';
import { 
  IconPlant, 
  IconTrendingUp, 
  IconUsers, 
  IconTractor, 
  IconReportMoney, 
  IconShieldCheck, 
  IconChevronRight,
  IconArrowRight,
  IconCircleCheckFilled,
  IconMenu2,
  IconX
} from '@tabler/icons-react';
import Button from '../shared/Button';
import WhatsAppButton from '../shared/WhatsAppButton';

const LandingPage = ({ onGetStarted }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const features = [
    {
      title: "Smart Financials",
      description: "Track every rupee with professional Ledger and Loan management built for agriculture.",
      icon: IconReportMoney,
      color: "text-revenue bg-revenue/10"
    },
    {
      title: "Field Operations",
      description: "Log crop cycles, irrigation, and spray schedules to maximize your yield efficiency.",
      icon: IconPlant,
      color: "text-primary bg-primary/10"
    },
    {
      title: "Asset Tracking",
      description: "Complete monitoring of machinery usage, livestock health, and inventory levels.",
      icon: IconTractor,
      color: "text-accent-blue bg-accent-blue/10"
    },
    {
      title: "Team Collaboration",
      description: "Invite managers and workers to your organization with specific access roles.",
      icon: IconUsers,
      color: "text-accent-amber bg-accent-amber/10"
    }
  ];

  const pricing = [
    {
      name: "Free Tier",
      price: "0",
      description: "Perfect for starting your digital farming journey.",
      features: ["Manage 1 Farm", "Financial Tracking", "Inventory Management", "Community Support"],
      button: "Get Started",
      highlight: false
    },
    {
      name: "Pro Plan",
      price: "2,500",
      description: "Full power for commercial agricultural operations.",
      features: ["Unlimited Farms", "Team Collaboration", "Advanced Analytics", "Priority Support", "Multi-user Roles"],
      button: "Upgrade to Pro",
      highlight: true
    }
  ];

  return (
    <div className="min-h-screen bg-white text-text-primary selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                <IconPlant size={22} />
              </div>
              <span className="text-xl font-bold tracking-tight text-primary">AgriPro</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Pricing</a>
              <div className="h-4 w-px bg-gray-200"></div>
              <button 
                onClick={onGetStarted}
                className="text-sm font-bold text-primary hover:text-primary-dark transition-colors"
              >
                Sign In
              </button>
              <Button onClick={onGetStarted} size="small">
                Get Started
                <IconChevronRight size={16} />
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-text-secondary" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <IconX /> : <IconMenu2 />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-4 space-y-4 animate-in slide-in-from-top duration-300">
            <a href="#features" className="block text-sm font-medium py-2">Features</a>
            <a href="#pricing" className="block text-sm font-medium py-2">Pricing</a>
            <Button onClick={onGetStarted} className="w-full">Get Started</Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-blue/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next Generation Farm Management
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-text-primary mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Manage your fields with <br />
            <span className="text-primary italic">Modern Intelligence.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg text-text-secondary mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            The all-in-one SaaS platform built for professional farmers. Track revenue, manage labor, and monitor every acre with precision data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Button onClick={onGetStarted} size="large" className="px-10 h-14 text-lg">
              Start Managing for Free
              <IconArrowRight size={20} />
            </Button>
            <div className="flex items-center gap-2 text-text-muted text-sm px-4">
              <IconShieldCheck size={18} className="text-primary" />
              Secure Data Isolation
            </div>
          </div>

          {/* App Preview Mockup */}
          <div className="mt-20 relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="h-8 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-300"></div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200" 
                alt="AgriPro Dashboard" 
                className="w-full grayscale-[20%] opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Built for Every Agricultural Need</h2>
            <p className="text-text-secondary max-w-xl mx-auto">AgriPro provides professional-grade tools to streamline your entire farming operation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="agri-card p-8 bg-white border-none shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${feature.color}`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-3">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Transparent Pricing</h2>
            <p className="text-text-secondary">Choose the plan that fits your farm's scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricing.map((plan, idx) => (
              <div 
                key={idx} 
                className={`agri-card p-10 flex flex-col relative transition-all duration-300 ${
                  plan.highlight 
                    ? 'border-2 border-primary shadow-2xl scale-105 z-10' 
                    : 'border-gray-100 shadow-lg'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-[2px] shadow-lg">
                    Recommended
                  </span>
                )}
                
                <div className="mb-8">
                  <h4 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h4>
                  <p className="text-sm text-text-muted">{plan.description}</p>
                </div>

                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-sm font-bold text-text-muted">PKR</span>
                  <span className="text-4xl font-black text-text-primary">{plan.price}</span>
                  <span className="text-text-muted text-sm font-medium">/month</span>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-text-secondary font-medium">
                      <IconCircleCheckFilled size={18} className="text-primary opacity-80" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={onGetStarted}
                  variant={plan.highlight ? 'primary' : 'outline'} 
                  className={`w-full h-12 text-sm font-bold ${!plan.highlight ? 'border-gray-200' : ''}`}
                >
                  {plan.button}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-[40px] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-primary/40">
            {/* Background patterns */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/20 blur-3xl rounded-full"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 blur-3xl rounded-full"></div>
            </div>

            <h2 className="text-4xl lg:text-5xl font-black mb-6 relative z-10">
              Ready to modernize <br /> your agriculture?
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto relative z-10">
              Join hundreds of professional farmers already using AgriPro to scale their business and increase profitability.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <button 
                onClick={onGetStarted}
                className="px-10 h-14 bg-white text-primary font-bold rounded-2xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                Create Free Account
              </button>
              <button 
                className="px-10 h-14 bg-primary-dark/30 text-white font-bold rounded-2xl border border-white/20 hover:bg-primary-dark/40 transition-all"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <IconPlant className="text-primary" size={24} />
            <span className="text-xl font-bold tracking-tight text-primary">AgriPro</span>
          </div>
          <p className="text-sm text-text-muted mb-8">© 2026 AgriPro Farm Manager. All rights reserved.</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-text-muted hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-text-muted hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-text-muted hover:text-primary transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
      <WhatsAppButton />
    </div>
  );
};

export default LandingPage;
