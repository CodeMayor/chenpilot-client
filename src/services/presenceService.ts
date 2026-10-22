/**
 * Presence Service - Manages real-time user presence and status
 */

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  userId: string;
  userName: string;
  status: PresenceStatus;
  lastSeen: string;
  conversationId?: string;
}

export interface PresenceConfig {
  idleTimeout: number; // Time in ms before marking as away
  cleanupTimeout: number; // Time in ms before removing offline user
}

export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  idleTimeout: 5 * 60 * 1000, // 5 minutes
  cleanupTimeout: 30 * 60 * 1000, // 30 minutes
};

class PresenceService {
  private userPresenceMap = new Map<string, UserPresence>();
  private activityTimers = new Map<string, NodeJS.Timeout>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private callbacks = {
    onStatusChange: [] as Array<(presence: UserPresence) => void>,
    onUserJoin: [] as Array<(presence: UserPresence) => void>,
    onUserLeave: [] as Array<(userId: string) => void>,
  };

  /**
   * Mark user as online
   */
  setUserOnline(
    userId: string,
    userName: string,
    conversationId?: string,
    config: PresenceConfig = DEFAULT_PRESENCE_CONFIG,
  ) {
    // Cancel existing timers
    this.cancelActivityTimer(userId);
    this.cancelCleanupTimer(userId);

    // Check if this is a new user joining
    const isNewUser = !this.userPresenceMap.has(userId);

    const presence: UserPresence = {
      userId,
      userName,
      status: 'online',
      lastSeen: new Date().toISOString(),
      conversationId,
    };

    this.userPresenceMap.set(userId, presence);

    if (isNewUser) {
      this.callbacks.onUserJoin.forEach((cb) => cb(presence));
    } else {
      this.callbacks.onStatusChange.forEach((cb) => cb(presence));
    }

    // Set idle timeout to mark as away
    const idleTimer = setTimeout(() => {
      this.setUserAway(userId, config);
    }, config.idleTimeout);

    this.activityTimers.set(userId, idleTimer);
  }

  /**
   * Mark user as away after idle timeout
   */
  setUserAway(
    userId: string,
    config: PresenceConfig = DEFAULT_PRESENCE_CONFIG,
  ) {
    const presence = this.userPresenceMap.get(userId);
    if (!presence || presence.status === 'offline') {
      return;
    }

    presence.status = 'away';
    presence.lastSeen = new Date().toISOString();
    this.userPresenceMap.set(userId, presence);

    this.callbacks.onStatusChange.forEach((cb) => cb(presence));

    // Set cleanup timeout to remove after longer period
    const cleanupTimer = setTimeout(() => {
      this.setUserOffline(userId);
    }, config.cleanupTimeout);

    this.cleanupTimers.set(userId, cleanupTimer);
  }

  /**
   * Mark user as offline and remove from tracking
   */
  setUserOffline(userId: string) {
    const presence = this.userPresenceMap.get(userId);
    if (!presence) {
      return;
    }

    this.userPresenceMap.delete(userId);
    this.cancelActivityTimer(userId);
    this.cancelCleanupTimer(userId);

    this.callbacks.onUserLeave.forEach((cb) => cb(userId));
  }

  /**
   * Activity detected - keep user online
   */
  recordActivity(userId: string, config: PresenceConfig = DEFAULT_PRESENCE_CONFIG) {
    const presence = this.userPresenceMap.get(userId);
    if (presence && presence.status !== 'offline') {
      // Reset idle timer
      this.cancelActivityTimer(userId);
      presence.status = 'online';
      presence.lastSeen = new Date().toISOString();

      const idleTimer = setTimeout(() => {
        this.setUserAway(userId, config);
      }, config.idleTimeout);

      this.activityTimers.set(userId, idleTimer);

      this.callbacks.onStatusChange.forEach((cb) => cb(presence));
    }
  }

  /**
   * Get presence for specific user
   */
  getPresence(userId: string): UserPresence | undefined {
    return this.userPresenceMap.get(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.userPresenceMap.values()).filter(
      (p) => p.status === 'online',
    );
  }

  /**
   * Get all away users
   */
  getAwayUsers(): UserPresence[] {
    return Array.from(this.userPresenceMap.values()).filter(
      (p) => p.status === 'away',
    );
  }

  /**
   * Get all users (online and away)
   */
  getAllUsers(): UserPresence[] {
    return Array.from(this.userPresenceMap.values());
  }

  /**
   * Get users in specific conversation
   */
  getUsersInConversation(conversationId: string): UserPresence[] {
    return Array.from(this.userPresenceMap.values()).filter(
      (p) => p.conversationId === conversationId && p.status !== 'offline',
    );
  }

  /**
   * Clear all presence data
   */
  clear() {
    this.userPresenceMap.clear();
    this.activityTimers.forEach((timer) => clearTimeout(timer));
    this.cleanupTimers.forEach((timer) => clearTimeout(timer));
    this.activityTimers.clear();
    this.cleanupTimers.clear();
  }

  private cancelActivityTimer(userId: string) {
    const timer = this.activityTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.activityTimers.delete(userId);
    }
  }

  private cancelCleanupTimer(userId: string) {
    const timer = this.cleanupTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(userId);
    }
  }

  onStatusChange(callback: (presence: UserPresence) => void): () => void {
    this.callbacks.onStatusChange.push(callback);
    return () => {
      this.callbacks.onStatusChange = this.callbacks.onStatusChange.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onUserJoin(callback: (presence: UserPresence) => void): () => void {
    this.callbacks.onUserJoin.push(callback);
    return () => {
      this.callbacks.onUserJoin = this.callbacks.onUserJoin.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onUserLeave(callback: (userId: string) => void): () => void {
    this.callbacks.onUserLeave.push(callback);
    return () => {
      this.callbacks.onUserLeave = this.callbacks.onUserLeave.filter(
        (cb) => cb !== callback,
      );
    };
  }
}

export const presenceService = new PresenceService();
