# Message Ordering & Race Condition Handling

## Problem
Messages were appearing out of order due to:
- Rapid consecutive sends
- Network delays
- Asynchronous message arrivals

## Solution

### 1. Server Timestamp Sorting
All messages are sorted by `timestamp` field instead of insertion order:

```typescript
const sortMessagesByTimestamp = (messages: ChatMessage[]): ChatMessage[] => {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return aTime - bTime;
  });
};
```

### 2. Redux Actions with Auto-Sorting

**Key reducers that automatically sort:**
- `addMessage()` - Adds single message and re-sorts
- `setMessages()` - Sets multiple messages and sorts
- `updateMessage()` - Updates and re-sorts (timestamp may change)
- `loadChatHistory()` - Loads history and ensures sorted order
- `resolveOptimisticUpdate()` - Resolves pending updates and sorts

### 3. Timestamps in sendMessage Thunk

```typescript
// User message gets server timestamp
const userMessage: ChatMessage = {
  id: `msg_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: "user",
  content: query,
  timestamp: serverTimestamp, // ← Server time, not client time
};

// Agent message gets slightly later timestamp
const agentTimestamp = new Date(
  new Date(serverTimestamp).getTime() + 1,
).toISOString();
```

### 4. Optimistic Updates

New actions for handling optimistic updates:
- `storeOptimisticUpdate()` - Cache optimistic message
- `removeOptimisticUpdate()` - Remove from cache
- `resolveOptimisticUpdate()` - Replace optimistic with server version

```typescript
resolveOptimisticUpdate({
  clientId: 'msg_optimistic_123',
  serverMessage: {
    id: 'msg_server_456',
    type: 'agent',
    content: '...',
    timestamp: '2024-01-01T12:00:00Z',
  },
})
```

### 5. useMessageOrdering Hook

For components that need guaranteed sorted messages:

```typescript
import { useMessageOrdering } from '@/hooks/useMessageOrdering';

function ChatComponent() {
  const messages = useAppSelector(state => state.chat.messages);
  const sortedMessages = useMessageOrdering(messages);
  
  return (
    <div>
      {sortedMessages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

## Test Coverage

Race condition tests in `src/store/slices/__tests__/chatSlice.ordering.test.ts`:

1. ✅ Messages sorted by server timestamp
2. ✅ Chronological order on rapid consecutive sends
3. ✅ Re-sorting when timestamp updates
4. ✅ Optimistic update resolution
5. ✅ Out-of-order network responses resolved correctly

## Usage Guidelines

### For Adding Messages
```typescript
dispatch(addMessage(message)); // Auto-sorted
```

### For Bulk Operations
```typescript
dispatch(setMessages(messagesArray)); // Auto-sorted
```

### For Network Updates
```typescript
dispatch(resolveOptimisticUpdate({
  clientId: optimisticId,
  serverMessage: actualServerMessage,
})); // Auto-sorted, old message removed
```

## Key Properties

- **Timestamp Format**: ISO 8601 (e.g., `2024-01-01T12:00:00Z`)
- **Sorting Logic**: Chronological by timestamp, ID as tiebreaker
- **Persistence**: Chat history maintains sort order in localStorage
- **Performance**: O(n log n) sorting only on relevant operations

## Monitoring

Use `useDetectMessageOrderingIssues` hook to detect problems:

```typescript
const hasIssues = useDetectMessageOrderingIssues(messages);
if (hasIssues) {
  console.warn('Message ordering issue detected');
}
```
