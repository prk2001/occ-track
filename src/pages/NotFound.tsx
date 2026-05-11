import Layout from '@/components/Layout';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 bg-sp-red-light rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl font-bold text-sp-red">404</span>
        </div>
        <h1 className="text-xl font-bold text-navy mb-2">Page Not Found</h1>
        <p className="text-sm text-slate mb-6">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <a
          href="#/"
          className="inline-flex items-center gap-2 h-12 px-6 bg-sp-red text-white font-semibold rounded-xl hover:bg-sp-red-dark active:scale-[0.97] transition-all"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </a>
      </div>
    </Layout>
  );
}
