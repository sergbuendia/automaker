"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Wand2,
  LayoutGrid,
  Layers,
  FolderOpen,
  FileText,
  List,
  Cpu,
  Search,
  Share2,
  Trash2,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Home,
  LogOut,
  User,
  CreditCard,
} from "lucide-react";

interface AppSidebarProps {
  user: any;
  creditsBalance: number | null;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

export function AppSidebar({ user, creditsBalance }: AppSidebarProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [userMenuOpen]);

  const navSections: NavSection[] = [
    {
      items: [
        { href: "/generate", icon: Home, label: "Overview" },
        { href: "/generate/canvas", icon: Wand2, label: "Canvas" },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/generate/gallery", icon: LayoutGrid, label: "Gallery" },
        { href: "/generate/collections", icon: Layers, label: "Collections" },
        { href: "/generate/projects", icon: FolderOpen, label: "Projects" },
        { href: "/generate/prompts", icon: FileText, label: "Prompts" },
      ],
    },
    {
      label: "Tools",
      items: [
        { href: "/generate/batch", icon: List, label: "Batch" },
        { href: "/generate/models", icon: Cpu, label: "Models" },
      ],
    },
    {
      label: "Manage",
      items: [
        { href: "/generate/shared", icon: Share2, label: "Shared" },
        { href: "/generate/trash", icon: Trash2, label: "Trash" },
      ],
    },
  ];

  const isActiveRoute = (href: string) => {
    if (href === "/generate") {
      return pathname === "/generate";
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={`${
        sidebarCollapsed ? "w-16" : "w-16 lg:w-60"
      } flex-shrink-0 border-r border-white/10 bg-zinc-950/50 backdrop-blur-md flex flex-col z-30 transition-all duration-300 relative`}
      data-testid="left-sidebar"
      data-collapsed={sidebarCollapsed}
    >
      {/* Floating Collapse Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden lg:flex absolute top-20 -right-3 z-50 items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-700 hover:border-white/20 transition-all shadow-lg"
        data-testid="sidebar-collapse-button"
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <PanelLeft className="w-3.5 h-3.5" />
        ) : (
          <PanelLeftClose className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-zinc-800 flex-shrink-0 ${
          sidebarCollapsed ? "justify-center" : "justify-center lg:justify-start lg:px-6"
        }`}>
          <Link href="/generate" className="flex items-center">
            <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg shadow-lg shadow-brand-500/20 group cursor-pointer">
              <Sparkles className="text-white w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <span
              className={`ml-3 font-bold text-white text-base tracking-tight ${
                sidebarCollapsed ? "hidden" : "hidden lg:block"
              }`}
            >
              Image<span className="text-brand-500">Studio</span>
            </span>
          </Link>
        </div>

        {/* Nav Items - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-2 mt-2 pb-2">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={sectionIdx > 0 ? "mt-6" : ""}>
              {/* Section Label */}
              {section.label && !sidebarCollapsed && (
                <div className="hidden lg:block px-4 mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {section.label}
                  </span>
                </div>
              )}
              {section.label && sidebarCollapsed && (
                <div className="h-px bg-zinc-800 mx-2 mb-2"></div>
              )}

              {/* Nav Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isActiveRoute(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center px-2 lg:px-3 py-2.5 rounded-lg relative overflow-hidden transition-all ${
                        isActive
                          ? "bg-white/5 text-white border border-white/10"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-l-md"></div>
                      )}
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive
                            ? "text-brand-500"
                            : "group-hover:text-brand-400"
                        }`}
                      />
                      <span
                        className={`ml-2.5 font-medium text-sm ${
                          sidebarCollapsed ? "hidden" : "hidden lg:block"
                        }`}
                      >
                        {item.label}
                      </span>
                      {/* Tooltip for collapsed state */}
                      {sidebarCollapsed && (
                        <span
                          className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700"
                          data-testid={`sidebar-tooltip-${item.label.toLowerCase()}`}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section - User / Settings */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        {/* Usage & Settings Links */}
        <div className="p-2 space-y-1">
          <Link
            href="/generate/usage"
            className={`group flex items-center px-2 lg:px-3 py-2.5 rounded-lg relative overflow-hidden transition-all ${
              isActiveRoute("/generate/usage")
                ? "bg-white/5 text-white border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            title={sidebarCollapsed ? "Usage" : undefined}
          >
            {isActiveRoute("/generate/usage") && (
              <div className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-l-md"></div>
            )}
            <BarChart3
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                isActiveRoute("/generate/usage")
                  ? "text-brand-500"
                  : "group-hover:text-brand-400"
              }`}
            />
            <span
              className={`ml-2.5 font-medium text-sm ${
                sidebarCollapsed ? "hidden" : "hidden lg:block"
              }`}
            >
              Usage
            </span>
            {sidebarCollapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700">
                Usage
              </span>
            )}
          </Link>

          <Link
            href="/generate/settings"
            className={`group flex items-center px-2 lg:px-3 py-2.5 rounded-lg relative overflow-hidden transition-all ${
              isActiveRoute("/generate/settings")
                ? "bg-white/5 text-white border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            {isActiveRoute("/generate/settings") && (
              <div className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-l-md"></div>
            )}
            <Settings
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                isActiveRoute("/generate/settings")
                  ? "text-brand-500"
                  : "group-hover:text-brand-400"
              }`}
            />
            <span
              className={`ml-2.5 font-medium text-sm ${
                sidebarCollapsed ? "hidden" : "hidden lg:block"
              }`}
            >
              Settings
            </span>
            {sidebarCollapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700">
                Settings
              </span>
            )}
          </Link>
        </div>

        {/* Credits Display */}
        {!sidebarCollapsed && (
          <Link href="/generate/usage" className="hidden lg:block mx-3 mb-3">
            <div className="p-2.5 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
              <div className="flex justify-between text-[11px] font-medium text-zinc-400 mb-1.5">
                <span>Credits</span>
                <span className="text-white" data-testid="credits-sidebar-balance">
                  {creditsBalance !== null ? creditsBalance : "..."} / 1000
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-purple-500 h-1 rounded-full"
                  style={{
                    width: `${
                      creditsBalance !== null
                        ? Math.min((creditsBalance / 1000) * 100, 100)
                        : 30
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </Link>
        )}

        {/* User Profile */}
        <div className="p-3 border-t border-zinc-800" ref={userMenuRef}>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center p-1.5 rounded-lg transition-colors group relative w-full hover:bg-white/5 ${
                sidebarCollapsed ? "justify-center" : "lg:space-x-2.5"
              }`}
            >
              <div className="relative">
                <img
                  src={
                    user?.avatarUrl ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                  }
                  alt="User"
                  className="w-8 h-8 rounded-full border border-zinc-600"
                />
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
              </div>
              <div
                className={`overflow-hidden ${
                  sidebarCollapsed ? "hidden" : "hidden lg:block"
                }`}
              >
                <p className="text-xs font-medium text-white truncate">
                  {user ? user.name : "Guest"}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {user ? "Pro Account" : "Guest"}
                </p>
              </div>
              {/* Tooltip for user when collapsed */}
              {sidebarCollapsed && (
                <span
                  className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700"
                  data-testid="sidebar-tooltip-user"
                >
                  {user ? user.name : "Guest"}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                className={`absolute bottom-full mb-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg overflow-hidden z-50 ${
                  sidebarCollapsed ? "left-0" : "left-0 right-0"
                }`}
              >
                <div className="py-2">
                  <Link
                    href="/generate/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/generate/usage"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    <span>Usage</span>
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors"
                  >
                    <CreditCard className="w-4 h-4 mr-3" />
                    <span>Billing</span>
                  </Link>
                  <div className="border-t border-zinc-700 my-2"></div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // Add logout logic here
                      window.location.href = "/api/auth/logout";
                    }}
                    className="flex items-center px-4 py-2 text-sm text-red-400 hover:bg-zinc-700/50 hover:text-red-300 transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
