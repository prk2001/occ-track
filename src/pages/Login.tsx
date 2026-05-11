import Layout from '@/components/Layout';

export default function Login() {
  return (
    <Layout hideNav>
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6">
        <div className="w-20 h-20 bg-sp-red rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <span className="text-white text-3xl font-bold">+</span>
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">OCC Track</h1>
        <p className="text-sm text-slate text-center mb-8">Operation Christmas Child — Shoebox Collection Tracker</p>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate uppercase tracking-wider mb-1.5 block">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full h-13 px-4 bg-bg-card border border-border-custom rounded-xl text-navy placeholder-slate-light focus:outline-none focus:border-sp-red focus:ring-2 focus:ring-sp-red/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate uppercase tracking-wider mb-1.5 block">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full h-13 px-4 bg-bg-card border border-border-custom rounded-xl text-navy placeholder-slate-light focus:outline-none focus:border-sp-red focus:ring-2 focus:ring-sp-red/20 transition-all"
            />
          </div>
          <button className="w-full h-13 bg-sp-red text-white font-semibold rounded-xl hover:bg-sp-red-dark active:scale-[0.97] transition-all shadow-md mt-4">
            Sign In
          </button>
        </div>

        <div className="mt-12 p-4 bg-blue-light rounded-xl border border-blue-accent/20 max-w-sm w-full">
          <p className="text-xs font-semibold text-blue-accent mb-2 uppercase tracking-wider">Demo Mode</p>
          <p className="text-sm text-slate">Use the hamburger menu on the Dashboard to switch between user roles and see all views.</p>
        </div>
      </div>
    </Layout>
  );
}
