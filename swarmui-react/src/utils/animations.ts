/**
 * Framer Motion animation variants and utilities
 * Provides consistent animations across the application
 */
import type { Variants, Transition } from 'framer-motion';

// ==================== TRANSITIONS ====================

/** Default spring transition for most animations */
export const springTransition: Transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
};

/** Gentle spring for subtle movements */
export const gentleSpring: Transition = {
    type: 'spring',
    stiffness: 200,
    damping: 25,
};

/** Fast spring for quick interactions */
export const fastSpring: Transition = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
};

/** Instant spring for real-time WebSocket updates - ultra responsive */
export const instantSpring: Transition = {
    type: 'spring',
    stiffness: 500,
    damping: 35,
    mass: 0.8,
};

/** Snappy spring for micro-interactions */
export const snappySpring: Transition = {
    type: 'spring',
    stiffness: 600,
    damping: 40,
    mass: 0.5,
};

/** Smooth ease for fading */
export const smoothEase: Transition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
};

/** Quick ease for responsive UI - 60ms */
export const quickEase: Transition = {
    duration: 0.06,
    ease: [0.4, 0, 0.2, 1],
};

// ==================== PAGE TRANSITIONS ====================

/** Page fade in/out */
export const pageVariants: Variants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
};

/** Page slide from right */
export const pageSlideVariants: Variants = {
    initial: { opacity: 0, x: 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -12 },
};

// ==================== MODAL/OVERLAY VARIANTS ====================

/** Modal backdrop */
export const backdropVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

/** Modal content scale up */
export const modalVariants: Variants = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
};

/** Drawer slide from right */
export const drawerRightVariants: Variants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
};

/** Drawer slide from left */
export const drawerLeftVariants: Variants = {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
};

// ==================== LIST/CARD VARIANTS ====================

/** Container for staggered children */
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

/** Individual list item animation */
export const listItemVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

/** Card hover effect */
export const cardHoverVariants: Variants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
};

/** Image card with fade */
export const imageCardVariants: Variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    hover: {
        scale: 1.02,
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    },
};

// ==================== BUTTON/INTERACTIVE VARIANTS ====================

/** Button pulse effect */
export const buttonPulseVariants: Variants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
};

/** Icon button rotate on hover */
export const iconRotateVariants: Variants = {
    initial: { rotate: 0 },
    hover: { rotate: 180 },
};

// ==================== LOADING/SKELETON VARIANTS ====================

/** Pulse animation for loading states */
export const pulseVariants: Variants = {
    initial: { opacity: 0.5 },
    animate: {
        opacity: [0.5, 1, 0.5],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

/** Skeleton shimmer effect */
export const shimmerVariants: Variants = {
    initial: { x: '-100%' },
    animate: {
        x: '100%',
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// ==================== NOTIFICATION VARIANTS ====================

/** Toast notification slide in */
export const toastVariants: Variants = {
    initial: { opacity: 0, y: -50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.9 },
};

// ==================== PROGRESS VARIANTS ====================

/** Progress bar fill */
export const progressVariants: Variants = {
    initial: { width: 0 },
    animate: (progress: number) => ({
        width: `${progress}%`,
        transition: { duration: 0.3, ease: 'easeOut' },
    }),
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a stagger delay for items based on index
 */
export const getStaggerDelay = (index: number, baseDelay = 0.05) => ({
    transition: { delay: index * baseDelay },
});

/**
 * Create animation props for fade in on scroll
 */
export const fadeInOnScroll = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
};

// ==================== REAL-TIME GENERATION VARIANTS ====================

/** Gallery item entrance - scale+fade with stagger-friendly design */
export const galleryItemVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.9,
        y: 10,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 600,
            damping: 35,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.92,
        transition: { duration: 0.1 },
    },
    hover: {
        scale: 1.04,
        transition: { type: 'spring', stiffness: 500, damping: 30 },
    },
    tap: {
        scale: 0.98,
    },
};

/** Preview image crossfade - smooth transition between preview and final */
export const previewFadeVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: 'easeIn' },
    },
};

/** Live preview pulse during generation */
export const livePreviewPulse: Variants = {
    animate: {
        opacity: [0.85, 1, 0.85],
        scale: [1, 1.01, 1],
        transition: {
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

/** Progress bar with smooth spring animation */
export const smoothProgressVariants: Variants = {
    initial: { scaleX: 0 },
    animate: (progress: number) => ({
        scaleX: progress / 100,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 40,
            mass: 0.8,
        },
    }),
};

/** Container for fast staggered gallery items */
export const fastStaggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.03,
            delayChildren: 0.02,
        },
    },
};

