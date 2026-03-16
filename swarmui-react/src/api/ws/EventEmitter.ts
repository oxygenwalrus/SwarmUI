/**
 * Lightweight Typed Event Emitter
 * 
 * Simple pub/sub system for WebSocket events with automatic cleanup.
 */

import type { WSEvent, WSEventType, WSCallback, Subscription } from './types';

let subscriptionIdCounter = 0;

export class EventEmitter {
    private subscriptions: Map<WSEventType | '*', Subscription[]> = new Map();
    private debug: boolean;

    constructor(debug = false) {
        this.debug = debug;
    }

    /**
     * Subscribe to an event type
     */
    on<T = unknown>(
        eventType: WSEventType | '*',
        callback: WSCallback<T>,
        once = false
    ): () => void {
        const id = `sub_${++subscriptionIdCounter}`;
        const subscription: Subscription = {
            id,
            eventType,
            callback: callback as WSCallback,
            once,
        };

        const existing = this.subscriptions.get(eventType) || [];
        this.subscriptions.set(eventType, [...existing, subscription]);

        if (this.debug) {
            console.debug(`[EventEmitter] Subscribed: ${eventType} (${id})`);
        }

        // Return unsubscribe function
        return () => this.off(eventType, id);
    }

    /**
     * Subscribe to an event once
     */
    once<T = unknown>(
        eventType: WSEventType | '*',
        callback: WSCallback<T>
    ): () => void {
        return this.on(eventType, callback, true);
    }

    /**
     * Unsubscribe by subscription ID
     */
    off(eventType: WSEventType | '*', subscriptionId: string): void {
        const subs = this.subscriptions.get(eventType);
        if (subs) {
            this.subscriptions.set(
                eventType,
                subs.filter((s) => s.id !== subscriptionId)
            );
            if (this.debug) {
                console.debug(`[EventEmitter] Unsubscribed: ${eventType} (${subscriptionId})`);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit<T = unknown>(event: WSEvent<T>): void {
        if (this.debug) {
            console.debug(`[EventEmitter] Emit: ${event.type}`, event.data);
        }

        // Notify specific subscribers
        const specificSubs = this.subscriptions.get(event.type) || [];
        const wildcardSubs = this.subscriptions.get('*') || [];

        const allSubs = [...specificSubs, ...wildcardSubs];
        const toRemove: { type: WSEventType | '*'; id: string }[] = [];

        for (const sub of allSubs) {
            try {
                sub.callback(event as WSEvent);
                if (sub.once) {
                    toRemove.push({ type: sub.eventType, id: sub.id });
                }
            } catch (error) {
                console.error(`[EventEmitter] Callback error for ${event.type}:`, error);
            }
        }

        // Remove once-subscriptions
        for (const { type, id } of toRemove) {
            this.off(type, id);
        }
    }

    /**
     * Remove all subscriptions
     */
    clear(): void {
        if (this.debug) {
            console.debug('[EventEmitter] Cleared all subscriptions');
        }
        this.subscriptions.clear();
    }

    /**
     * Get subscription count for debugging
     */
    getSubscriptionCount(eventType?: WSEventType | '*'): number {
        if (eventType) {
            return this.subscriptions.get(eventType)?.length || 0;
        }
        let total = 0;
        for (const subs of this.subscriptions.values()) {
            total += subs.length;
        }
        return total;
    }
}
