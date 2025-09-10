import { Calendar, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernLoadingProps {
    /** Type of data being loaded */
    type: 'daily' | 'weekly' | 'monthly' | 'general';
    /** Custom text override */
    text?: string;
    /** Additional CSS classes */
    className?: string;
    /** Show progress dots animation */
    showProgressDots?: boolean;
}

/**
 * Modern Loading Component
 * 
 * A beautiful, animated loading component with period-specific icons and messages.
 * Features smooth animations, gradient backgrounds, and contextual icons.
 * 
 * @param type - The type of period being loaded (daily, weekly, monthly, general)
 * @param text - Optional custom text override
 * @param className - Additional CSS classes
 * @param showProgressDots - Whether to show animated progress dots
 */
export function ModernLoading({
    type = 'general',
    text,
    className,
    showProgressDots = true
}: ModernLoadingProps) {

    /**
     * Get the appropriate icon based on the loading type
     */
    const getIcon = () => {
        const iconProps = { 
            size: 32, 
            className: "text-primary drop-shadow-sm" 
        };
        
        switch (type) {
            case 'daily':
                return <Calendar {...iconProps} />;
            case 'weekly':
                return <TrendingUp {...iconProps} />;
            case 'monthly':
                return <BarChart3 {...iconProps} />;
            default:
                return <Zap {...iconProps} />;
        }
    };

    /**
     * Get the appropriate text based on the loading type
     */
    const getText = () => {
        if (text) return text;
        
        switch (type) {
            case 'daily':
                return 'Cargando análisis diario';
            case 'weekly':
                return 'Cargando tendencias semanales';
            case 'monthly':
                return 'Cargando resumen mensual';
            default:
                return 'Cargando datos';
        }
    };

    /**
     * Get contextual subtitle based on type
     */
    const getSubtitle = () => {
        switch (type) {
            case 'daily':
                return 'Analizando métricas del día seleccionado';
            case 'weekly':
                return 'Procesando datos de la semana';
            case 'monthly':
                return 'Compilando estadísticas mensuales';
            default:
                return 'Un momento por favor...';
        }
    };

    return (
        <div className={cn(
            "flex flex-col items-center justify-center space-y-6 p-8",
            className
        )}>
            {/* Main loading container with gradient background */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative"
            >
                {/* Animated background ring */}
                <motion.div
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-md"
                    style={{ width: '80px', height: '80px', margin: '-8px' }}
                />
                
                {/* Icon container */}
                <motion.div
                    animate={{ 
                        y: [0, -4, 0],
                        rotateY: [0, 180, 360]
                    }}
                    transition={{ 
                        y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        rotateY: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg"
                >
                    {getIcon()}
                </motion.div>
            </motion.div>

            {/* Text content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center space-y-2"
            >
                {/* Main text with gradient */}
                <h3 className="text-xl font-semibold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
                    {getText()}
                </h3>
                
                {/* Subtitle */}
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                    {getSubtitle()}
                </p>

                {/* Animated progress dots */}
                {showProgressDots && (
                    <div className="flex items-center justify-center space-x-1 mt-4">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "easeInOut"
                                }}
                                className="w-2 h-2 rounded-full bg-primary/60"
                            />
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Floating particles animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            opacity: [0, 0.3, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            delay: i * 1.5,
                            ease: "easeInOut"
                        }}
                        className="absolute w-1 h-1 bg-primary/40 rounded-full"
                        style={{
                            left: `${20 + i * 30}%`,
                            top: `${60 + i * 10}%`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Legacy Loading Text Component (Enhanced)
 * Maintains backward compatibility while providing improved visuals
 */
interface LoadingTextProps {
    text: string;
    className?: string;
}

export function EnhancedLoadingText({ text, className }: LoadingTextProps) {
    // Determine type based on text content
    const getTypeFromText = (text: string) => {
        if (text.toLowerCase().includes('diario')) return 'daily';
        if (text.toLowerCase().includes('semanal')) return 'weekly';
        if (text.toLowerCase().includes('mensual')) return 'monthly';
        return 'general';
    };

    return (
        <ModernLoading 
            type={getTypeFromText(text)} 
            text={text}
            className={className}
            showProgressDots={true}
        />
    );
}

export default ModernLoading;