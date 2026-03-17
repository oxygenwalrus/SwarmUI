import { notifications } from '@mantine/notifications';

// Track recent notifications for grouping
const recentNotifications = new Map<string, { count: number; id: string; timestamp: number }>();

// Clean old entries periodically
const NOTIFICATION_TIMEOUT = 5000; // 5 seconds
export const MAX_STACKED = 5;

interface NotificationOptions {
    title: string;
    message: string;
    color?: string;
    autoClose?: number | false;
    /** Unique key for grouping similar notifications */
    groupKey?: string;
}

/**
 * Clean up old notification tracking entries
 */
function cleanupOldEntries() {
    const now = Date.now();
    for (const [key, entry] of recentNotifications.entries()) {
        if (now - entry.timestamp > NOTIFICATION_TIMEOUT) {
            recentNotifications.delete(key);
        }
    }
}

/**
 * Show a notification with smart stacking/grouping.
 * When multiple similar notifications fire quickly, they're grouped.
 */
export function showNotification({
    title,
    message,
    color = 'blue',
    autoClose = 4000,
    groupKey,
}: NotificationOptions) {
    cleanupOldEntries();

    // If groupKey provided, check for recent similar notifications
    if (groupKey) {
        const existing = recentNotifications.get(groupKey);

        if (existing) {
            // Update existing notification
            existing.count++;
            existing.timestamp = Date.now();

            // Update the notification
            notifications.update({
                id: existing.id,
                title: `${title} (${existing.count}x)`,
                message: `${message}`,
                color,
                autoClose,
            });

            return existing.id;
        }

        // Create new grouped notification
        const id = `notification-${groupKey}-${Date.now()}`;
        recentNotifications.set(groupKey, { count: 1, id, timestamp: Date.now() });

        notifications.show({
            id,
            title,
            message,
            color,
            autoClose,
        });

        return id;
    }

    // Regular notification without grouping
    return notifications.show({
        title,
        message,
        color,
        autoClose,
    });
}

/**
 * Show a success notification
 */
export function showSuccess(title: string, message: string, groupKey?: string) {
    return showNotification({ title, message, color: 'green', groupKey });
}

/**
 * Show an error notification
 */
export function showError(title: string, message: string) {
    return showNotification({ title, message, color: 'red', autoClose: 6000 });
}

/**
 * Show a warning notification
 */
export function showWarning(title: string, message: string) {
    return showNotification({ title, message, color: 'yellow', autoClose: 5000 });
}

/**
 * Show an info notification
 */
export function showInfo(title: string, message: string, groupKey?: string) {
    return showNotification({ title, message, color: 'blue', groupKey });
}

/**
 * Show image generation completed notification with grouping
 */
export function showGenerationComplete(count: number = 1) {
    return showNotification({
        title: 'Generation Complete',
        message: count > 1 ? `${count} images generated` : 'Image generated successfully',
        color: 'green',
        groupKey: 'generation-complete',
    });
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
    notifications.clean();
    recentNotifications.clear();
}

/**
 * Hide a specific notification by ID
 */
export function hideNotification(id: string) {
    notifications.hide(id);
}
