import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-xl">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Access Denied</h1>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        You do not have the required permissions or role to access this area of the Brightloop platform.
      </p>
      <div className="flex gap-3">
        <Link to="/login">
          <Button variant="secondary">Sign in with another account</Button>
        </Link>
        <Link to="/admin">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
