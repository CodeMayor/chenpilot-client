'use client';

import React, { useState, createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { toggleTheme } from '@/store/slices/uiSlice';
import { clearMessages, startNewChat, loadChatHistory, deleteChatHistory, loadConversationsLocally, deleteConversationLocally } from '@/store/slices/chatSlice';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { 
  X,
  Menu,
  PanelLeft,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import Image from 'next/image';
import { useChatSearch, UseChatSearchReturn } from '@/hooks/useChatSearch';

// ─── Search Context ───────────────────────────────────────────────────────────
// Exposed so ChatEngine (and its children) can read/write the search state
// without prop-drilling through the Next.js page tree.

export const ChatSearchContext = createContext<UseChatSearchReturn | null>(null);

export function useChatSearchContext(): UseChatSearchReturn {
  const ctx = useContext(ChatSearchContext);
  if (!ctx) throw new Error('useChatSearchContext must be used inside ChatLayout');
  return ctx;
}

// ─── ChatLayout ───────────────────────────────────────────────────────────────

interface ChatLayoutProps {
  children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const theme = useAppSelector((state) => state.ui) || { mode: 'dark' };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Search ──
  const search = useChatSearch();
  const { isSearchOpen, openSearch, closeSearch, setQuery, goToNext, goToPrev, searchState, searchInputRef } = search;

  // Ctrl/Cmd+F – intercept only when focus is inside the chat route.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Only hijack the shortcut on the chat page.
        if (pathname?.startsWith('/chat')) {
          e.preventDefault();
          if (isSearchOpen) {
            searchInputRef.current?.focus();
          } else {
            openSearch();
          }
        }
      }
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pathname, isSearchOpen, openSearch, closeSearch, searchInputRef]);

  // Get chat history from Redux store
  const { chatHistory, currentConversation } = useAppSelector((state) => state.chat);
  
  // Convert chat history object to array for display
  const chatHistoryList = React.useMemo(() => {
    return Object.entries(chatHistory).map(([conversationId, messages]) => {
      const lastMessage = messages[messages.length - 1];
      const firstUserMessage = messages.find(msg => msg.type === 'user');
      return {
        id: conversationId,
        title: firstUserMessage ? 
          (typeof firstUserMessage.content === 'string' && firstUserMessage.content.length > 50 ? 
            firstUserMessage.content.substring(0, 50) + '...' : 
            typeof firstUserMessage.content === 'string' ? firstUserMessage.content : 'New Chat') : 
          'New Chat',
        lastMessage: typeof lastMessage?.content === 'string' ? lastMessage.content : '',
        timestamp: lastMessage?.timestamp || new Date().toISOString(),
        messageCount: messages.length,
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Show last 10 conversations
  }, [chatHistory]);

  const profileMenuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
    },
    {
      name: 'Contacts',
      href: '/contacts',
    },
    {
      name: 'Settings',
      href: '/settings',
    },
  ];

  const handleNewChat = () => {
    dispatch(startNewChat());
    toast.success('Starting new chat...');
    router.push('/chat');
    setSidebarOpen(false);
  };

  const handleLoadChat = (conversationId: string) => {
    dispatch(loadChatHistory(conversationId));
    router.push('/chat');
    setSidebarOpen(false);
  };

  const handleDeleteChat = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(deleteConversationLocally(conversationId));
    toast.success('Chat deleted');
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      toast.success('Successfully logged out!');
      router.push('/auth/login');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Logout failed');
      toast.error(errorMessage);
    }
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  // Load conversations from localStorage on component mount
  React.useEffect(() => {
    dispatch(loadConversationsLocally());
  }, [dispatch]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const isChatRoute = pathname?.startsWith('/chat');

  return (
    <ChatSearchContext.Provider value={search}>
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-gray-600 bg-opacity-75" />
          </div>
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[#2D1B69] shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "w-16" : "w-72"
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                {sidebarCollapsed ? (
                  <button 
                    onClick={toggleSidebar}
                    className="flex items-center hover:opacity-80 transition-opacity"
                    title="Expand sidebar"
                  >
                    <Menu className="h-6 w-6 text-[#C4B5FD]" />
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Image
                        src="/chenpilot.png"
                        alt="ChenPilot Logo"
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    </div>
                    <span className="text-xl font-thin text-[#C4B5FD] tracking-tight" style={{ fontFamily: 'Manrope' }}>
                      ChenPilot
                    </span>
                  </div>
                )}
              </div>
              
              {!sidebarCollapsed && (
                <div className="absolute top-4 right-4">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 text-[#C4B5FD] hover:bg-gray-800/50 rounded transition-colors"
                    title="Collapse sidebar"
                  >
                    <PanelLeft className="h-6 w-6" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="px-4 py-4">
              <Button
                onClick={handleNewChat}
                className={cn(
                  "w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl",
                  sidebarCollapsed ? "px-3" : "px-4"
                )}
              >
                {sidebarCollapsed ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <span>New Chat</span>
                )}
              </Button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-1">
                {!sidebarCollapsed && (
                  <h3 className="text-sm font-medium text-gray-300 mb-3 px-2">
                    Recents
                  </h3>
                )}
                {chatHistoryList.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "w-full rounded-lg hover:bg-gray-800/30 transition-all duration-200 group relative",
                      sidebarCollapsed ? "p-1" : "p-2"
                    )}
                  >
                    <button
                      onClick={() => handleLoadChat(chat.id)}
                      className="w-full text-left"
                      title={sidebarCollapsed ? (typeof chat.title === 'string' ? chat.title : 'Chat') : undefined}
                    >
                      <div className="flex items-start space-x-2">
                        {!sidebarCollapsed && (
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 group-hover:text-white transition-colors truncate leading-relaxed">
                              {typeof chat.title === 'string' ? chat.title : 'Chat'}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                    {!sidebarCollapsed && (
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1 rounded"
                        title="Delete chat"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Section */}
            <div className="border-t border-gray-700 p-4">
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={cn(
                    "w-full flex items-center rounded-xl hover:bg-gray-800/50 transition-all duration-200",
                    sidebarCollapsed ? "justify-center p-2" : "justify-between p-3"
                  )}
                  title={sidebarCollapsed ? user?.name || user?.email : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-white truncate">
                          {user?.name || 'Test User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user?.email || 'test@example.com'}
                        </p>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    profileMenuOpen ? (
                      <span className="text-gray-400">^</span>
                    ) : (
                      <span className="text-gray-400">v</span>
                    )
                  )}
                </button>

                {/* Profile Menu Dropdown */}
                {profileMenuOpen && !sidebarCollapsed && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
                    {profileMenuItems.map((item) => {
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleNavigation(item.href)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700/50 transition-all duration-200"
                        >
                          <span>{item.name}</span>
                        </button>
                      );
                    })}
                    <div className="border-t border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 transition-all duration-200"
                      >
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header with menu button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Image
                  src="/chenpilot.png"
                  alt="ChenPilot Logo"
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
              </div>
              <h1 className="text-lg font-thin text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
                ChenPilot
              </h1>
            </div>
            {/* Mobile search toggle */}
            {isChatRoute && (
              <button
                onClick={isSearchOpen ? closeSearch : openSearch}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                title="Search messages (Ctrl+F)"
                aria-label="Toggle search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Desktop chat header – search bar (only on chat route) */}
          {isChatRoute && (
            <div
              className={cn(
                'hidden lg:flex items-center justify-end px-4 py-2 border-b border-gray-800/40 bg-[#0F0F23]/90 backdrop-blur-sm',
                'transition-all duration-200',
              )}
            >
              {isSearchOpen ? (
                <SearchBar
                  inputRef={searchInputRef}
                  query={searchState.query}
                  totalMatches={searchState.totalMatches}
                  activeIndex={searchState.activeIndex}
                  onQueryChange={setQuery}
                  onNext={goToNext}
                  onPrev={goToPrev}
                  onClose={closeSearch}
                />
              ) : (
                <button
                  onClick={openSearch}
                  className="flex items-center space-x-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors px-2 py-1 rounded hover:bg-gray-800/50"
                  title="Search messages (Ctrl+F)"
                  aria-label="Open search"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                  <kbd className="ml-1 text-xs text-gray-600 border border-gray-700 rounded px-1 py-0.5 font-mono">⌘F</kbd>
                </button>
              )}
            </div>
          )}

          {/* Mobile search bar (shown below the header on chat route) */}
          {isChatRoute && isSearchOpen && (
            <div className="lg:hidden px-4 py-2 border-b border-gray-700 bg-[#0F0F23]">
              <SearchBar
                inputRef={searchInputRef}
                query={searchState.query}
                totalMatches={searchState.totalMatches}
                activeIndex={searchState.activeIndex}
                onQueryChange={setQuery}
                onNext={goToNext}
                onPrev={goToPrev}
                onClose={closeSearch}
              />
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </ChatSearchContext.Provider>
  );
}

// ─── SearchBar sub-component ──────────────────────────────────────────────────

interface SearchBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  totalMatches: number;
  activeIndex: number;
  onQueryChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function SearchBar({
  inputRef,
  query,
  totalMatches,
  activeIndex,
  onQueryChange,
  onNext,
  onPrev,
  onClose,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const counterLabel =
    totalMatches === 0
      ? query.length > 0
        ? 'No results'
        : ''
      : `${activeIndex + 1} / ${totalMatches}`;

  return (
    <div
      className="flex items-center space-x-2 bg-[#1A1A2E] border border-gray-700 rounded-lg px-3 py-1.5 w-full max-w-sm"
      role="search"
      aria-label="Search messages"
    >
      <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search messages…"
        aria-label="Search query"
        className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 focus:outline-none min-w-0"
      />

      {counterLabel && (
        <span
          className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap"
          aria-live="polite"
          aria-atomic="true"
        >
          {counterLabel}
        </span>
      )}

      <div className="flex items-center space-x-0.5 flex-shrink-0">
        <button
          onClick={onPrev}
          disabled={totalMatches === 0}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          title="Previous match (Shift+Enter)"
          aria-label="Previous match"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onNext}
          disabled={totalMatches === 0}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          title="Next match (Enter)"
          aria-label="Next match"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition-colors rounded"
          title="Close search (Esc)"
          aria-label="Close search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
