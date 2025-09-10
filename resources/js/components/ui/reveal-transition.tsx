import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface RevealTransitionProps {
    show: boolean;
    children: ReactNode;
    fallback?: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    type?: 'fade' | 'slideUp' | 'scale' | 'blur';
}

const variants = {
    fade: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    },
    slideUp: {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    },
    scale: {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 }
    },
    blur: {
        hidden: { opacity: 0, filter: 'blur(4px)' },
        visible: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(4px)' }
    }
};

export function RevealTransition({
    show,
    children,
    fallback,
    className = '',
    delay = 0,
    duration = 0.3,
    type = 'fade'
}: RevealTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            {show ? (
                <motion.div
                    key="content"
                    className={className}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={variants[type]}
                    transition={{ 
                        duration, 
                        delay,
                        ease: [0.4, 0, 0.2, 1] // Custom easing for smooth feel
                    }}
                >
                    {children}
                </motion.div>
            ) : fallback ? (
                <motion.div
                    key="fallback"
                    className={className}
                    initial="visible"
                    animate="visible"
                    exit="exit"
                    variants={variants[type]}
                    transition={{ 
                        duration: duration * 0.7, // Faster exit for fallback
                        ease: [0.4, 0, 0.2, 1]
                    }}
                >
                    {fallback}
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

interface StaggeredRevealProps {
    children: ReactNode[];
    show: boolean;
    className?: string;
    staggerDelay?: number;
    type?: 'fade' | 'slideUp' | 'scale' | 'blur';
}

export function StaggeredReveal({
    children,
    show,
    className = '',
    staggerDelay = 0.1,
    type = 'slideUp'
}: StaggeredRevealProps) {
    return (
        <div className={className}>
            {children.map((child, index) => (
                <RevealTransition
                    key={index}
                    show={show}
                    delay={index * staggerDelay}
                    type={type}
                >
                    {child}
                </RevealTransition>
            ))}
        </div>
    );
}

// Higher-order component for wrapping components with reveal logic
interface WithRevealProps {
    isLoading: boolean;
    hasData: boolean;
    shouldReveal: boolean;
    skeleton?: ReactNode;
    className?: string;
    type?: 'fade' | 'slideUp' | 'scale' | 'blur';
    children: ReactNode;
}

export function WithReveal({
    isLoading,
    hasData,
    shouldReveal,
    skeleton,
    className,
    type = 'slideUp',
    children
}: WithRevealProps) {
    const showContent = !isLoading && hasData && shouldReveal;
    const showSkeleton = isLoading || !hasData || !shouldReveal;

    if (showSkeleton && skeleton) {
        return (
            <RevealTransition
                show={showSkeleton}
                className={className}
                type="fade"
                duration={0.2}
            >
                {skeleton}
            </RevealTransition>
        );
    }

    return (
        <RevealTransition
            show={showContent}
            className={className}
            type={type}
            duration={0.4}
        >
            {children}
        </RevealTransition>
    );
}