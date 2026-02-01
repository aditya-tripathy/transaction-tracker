'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/transactions', label: 'Transactions', icon: '💳' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0d0d0d] border-r border-[#262626] h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-[#262626]">
        <h1 className="text-xl font-bold">💰 Transaction Tracker</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">AI-powered categorization</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-[#3b82f6] text-white'
                    : 'hover:bg-[#1a1a1a] text-[#a1a1aa]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#262626]">
        <div className="text-xs text-[#666]">
          Powered by Ollama
        </div>
      </div>
    </aside>
  );
}
