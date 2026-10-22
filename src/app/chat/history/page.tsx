'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { History, MessageCircle, Clock } from 'lucide-react';

export default function ChatHistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { messages } = useAppSelector((state) => state.chat);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Chat History
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage your previous conversations with the AI agent.
              </p>
            </div>

            {messages.length === 0 ? (
              <EmptyState
                icon={<History aria-hidden="true" className="h-8 w-8" />}
                title="No chat history yet"
                description="Your previous conversations will appear here once you start chatting."
                action={{
                  label: 'Start new chat',
                  onClick: () => router.push('/chat'),
                  icon: <MessageCircle aria-hidden="true" className="h-4 w-4" />,
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Conversations
                  </h2>
                  <Button
                    onClick={() => router.push('/chat')}
                    className="inline-flex items-center"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                </div>
                
                <div className="grid gap-2">
                  {messages.map((message, index) => (
                    <Card key={message.id} className="p-2 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-2">
                        <div className={`w-2 h-2 rounded-full mt-1 ${
                          message.type === 'user' ? 'bg-blue-500' : 
                          message.type === 'agent' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {message.type}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
                          </p>
                          {message.metadata && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {message.metadata?.type && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {message.metadata?.type}
                                </span>
                              )}
                              {message.metadata?.action && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {message.metadata?.action}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
