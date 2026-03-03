'use client';

import { Button } from '@/components/ui/button';
import { Brain, LayoutDashboard, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const isDashboardActive = pathname === '/dashboard';
  const isNotesActive = pathname === '/dashboard/notes';

  return (
    <header className="border-b border-purple-900/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="p-2.5 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-xl shadow-lg shadow-purple-500/50">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                LetsStud
              </h1>
            </Link>

            <nav className="hidden md:flex items-center gap-4 ml-6">
              <Link href="/dashboard">
                <Button variant="ghost" className={isDashboardActive ? 'text-white bg-purple-900/30' : 'text-purple-300 hover:text-white hover:bg-purple-900/30'}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/notes">
                <Button variant="ghost" className={isNotesActive ? 'text-white bg-purple-900/30' : 'text-purple-300 hover:text-white hover:bg-purple-900/30'}>
                  <FileText className="w-4 h-4 mr-2" />
                  My Notes
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
