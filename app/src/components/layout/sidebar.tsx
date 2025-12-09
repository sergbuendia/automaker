"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Settings,
  FileText,
  LayoutGrid,
  Code,
  Bot,
  ChevronLeft,
  ChevronRight,
  Folder,
  X,
  Search,
  Wrench,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  User,
  LogOut,
  Cpu,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavSection {
  label?: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export function Sidebar() {
  const {
    projects,
    currentProject,
    currentView,
    sidebarOpen,
    setCurrentProject,
    setCurrentView,
    toggleSidebar,
    removeProject,
  } = useAppStore();

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
      label: "Project",
      items: [
        { id: "board", label: "Kanban Board", icon: LayoutGrid },
        { id: "agent", label: "Agent Runner", icon: Bot },
      ],
    },
    {
      label: "Tools",
      items: [
        { id: "spec", label: "Spec Editor", icon: FileText },
        { id: "code", label: "Code View", icon: Code },
        { id: "analysis", label: "Analysis", icon: Search },
        { id: "tools", label: "Agent Tools", icon: Wrench },
      ],
    },
  ];

  const isActiveRoute = (id: string) => {
    return currentView === id;
  };

  return (
    <aside
      className={cn(
        "flex-shrink-0 border-r border-white/10 bg-zinc-950/50 backdrop-blur-md flex flex-col z-30 transition-all duration-300 relative",
        sidebarOpen ? "w-16 lg:w-60" : "w-16"
      )}
      data-testid="sidebar"
    >
      {/* Floating Collapse Toggle Button - Desktop only */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex absolute top-20 -right-3 z-50 items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-700 hover:border-white/20 transition-all shadow-lg titlebar-no-drag"
        data-testid="sidebar-collapse-button"
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-3.5 h-3.5" />
        ) : (
          <PanelLeft className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Logo */}
        <div
          className={cn(
            "h-20 pt-8 flex items-center justify-between border-b border-zinc-800 flex-shrink-0 titlebar-drag-region",
            sidebarOpen ? "px-3 lg:px-6" : "px-3"
          )}
        >
          <div
            className="flex items-center titlebar-no-drag cursor-pointer"
            onClick={() => setCurrentView("welcome")}
            data-testid="logo-button"
          >
            <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg shadow-lg shadow-brand-500/20 group">
              <Cpu className="text-white w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <span
              className={cn(
                "ml-3 font-bold text-white text-base tracking-tight",
                sidebarOpen ? "hidden lg:block" : "hidden"
              )}
            >
              Auto<span className="text-brand-500">maker</span>
            </span>
          </div>

          {/* Project Actions */}
          <div className="flex items-center gap-1 titlebar-no-drag">
            <button
              onClick={() => setCurrentView("welcome")}
              className="group flex items-center justify-center w-8 h-8 rounded-lg relative overflow-hidden transition-all text-zinc-400 hover:text-white hover:bg-white/5"
              title="New Project"
              data-testid="new-project-button"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
            </button>
            <button
              onClick={() => setCurrentView("welcome")}
              className="group flex items-center justify-center w-8 h-8 rounded-lg relative overflow-hidden transition-all text-zinc-400 hover:text-white hover:bg-white/5"
              title="Open Project"
              data-testid="open-project-button"
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Project Selector */}
        {sidebarOpen && projects.length > 0 && (
          <div className="px-2 mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white titlebar-no-drag"
                  data-testid="project-selector"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Folder className="h-4 w-4 text-brand-500 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {currentProject?.name || "Select Project"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-zinc-800 border-zinc-700"
                align="start"
              >
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => setCurrentProject(project)}
                    className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-700/50"
                    data-testid={`project-option-${project.id}`}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="flex-1 truncate">{project.name}</span>
                    {currentProject?.id === project.id && (
                      <Check className="h-4 w-4 text-brand-500" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}


        {/* Nav Items - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-2 mt-4 pb-2">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={sectionIdx > 0 ? "mt-6" : ""}>
              {/* Section Label */}
              {section.label && sidebarOpen && (
                <div className="hidden lg:block px-4 mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {section.label}
                  </span>
                </div>
              )}
              {section.label && !sidebarOpen && (
                <div className="h-px bg-zinc-800 mx-2 mb-2"></div>
              )}

              {/* Nav Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isActiveRoute(item.id);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id as any)}
                      className={cn(
                        "group flex items-center w-full px-2 lg:px-3 py-2.5 rounded-lg relative overflow-hidden transition-all titlebar-no-drag",
                        isActive
                          ? "bg-white/5 text-white border border-white/10"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      )}
                      title={!sidebarOpen ? item.label : undefined}
                      data-testid={`nav-${item.id}`}
                    >
                      {isActive && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-l-md"></div>
                      )}
                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          isActive
                            ? "text-brand-500"
                            : "group-hover:text-brand-400"
                        )}
                      />
                      <span
                        className={cn(
                          "ml-2.5 font-medium text-sm",
                          sidebarOpen ? "hidden lg:block" : "hidden"
                        )}
                      >
                        {item.label}
                      </span>
                      {/* Tooltip for collapsed state */}
                      {!sidebarOpen && (
                        <span
                          className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700"
                          data-testid={`sidebar-tooltip-${item.label.toLowerCase()}`}
                        >
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section - User / Settings */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        {/* Settings Link */}
        <div className="p-2">
          <button
            onClick={() => setCurrentView("settings")}
            className={cn(
              "group flex items-center w-full px-2 lg:px-3 py-2.5 rounded-lg relative overflow-hidden transition-all titlebar-no-drag",
              isActiveRoute("settings")
                ? "bg-white/5 text-white border border-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/5",
              sidebarOpen ? "justify-start" : "justify-center"
            )}
            title={!sidebarOpen ? "Settings" : undefined}
            data-testid="settings-button"
          >
            {isActiveRoute("settings") && (
              <div className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 rounded-l-md"></div>
            )}
            <Settings
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-colors",
                isActiveRoute("settings")
                  ? "text-brand-500"
                  : "group-hover:text-brand-400"
              )}
            />
            <span
              className={cn(
                "ml-2.5 font-medium text-sm",
                sidebarOpen ? "hidden lg:block" : "hidden"
              )}
            >
              Settings
            </span>
            {!sidebarOpen && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700">
                Settings
              </span>
            )}
          </button>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-zinc-800" ref={userMenuRef}>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                "flex items-center p-1.5 rounded-lg transition-colors group relative w-full hover:bg-white/5 titlebar-no-drag",
                sidebarOpen ? "lg:space-x-2.5" : "justify-center"
              )}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full border border-zinc-600 bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
              </div>
              <div
                className={cn(
                  "overflow-hidden",
                  sidebarOpen ? "hidden lg:block" : "hidden"
                )}
              >
                <p className="text-xs font-medium text-white truncate">
                  Developer
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  Active Session
                </p>
              </div>
              {/* Tooltip for user when collapsed */}
              {!sidebarOpen && (
                <span
                  className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700"
                  data-testid="sidebar-tooltip-user"
                >
                  Developer
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                className={cn(
                  "absolute bottom-full mb-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg overflow-hidden z-50",
                  sidebarOpen ? "left-0 right-0" : "left-0"
                )}
              >
                <div className="py-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setCurrentView("settings");
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors titlebar-no-drag"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    <span>Settings</span>
                  </button>
                  <div className="border-t border-zinc-700 my-2"></div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // Add logout logic here if needed
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-zinc-700/50 hover:text-red-300 transition-colors titlebar-no-drag"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span>Exit</span>
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
