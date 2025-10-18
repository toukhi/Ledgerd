import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CreateFab() {
  const location = useLocation();

  // Hide the FAB on the issue page (and any nested routes)
  if (location.pathname === '/issue' || location.pathname.startsWith('/issue/')) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 bottom-6 flex justify-center z-50 md:hidden pointer-events-none">
      <Link to="/issue" className="pointer-events-auto">
        <Button className="flex items-center gap-2 bg-[#c7395c] text-white hover:bg-[#a9667e] border-none px-5 py-3 rounded-2xl shadow-2xl">
          <Plus className="h-4 w-4" />
          <span className="ml-2">Create</span>
        </Button>
      </Link>
    </div>
  );
}
