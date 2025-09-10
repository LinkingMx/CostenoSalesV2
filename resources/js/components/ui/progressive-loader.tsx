import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LoadingStage {
    id: string;
    label: string;
    duration: number; // Expected duration in milliseconds
    icon?: React.ReactNode;
}

interface ProgressiveLoaderProps {
    isLoading: boolean;
    stages: LoadingStage[];
    currentStage?: string;
    className?: string;
    showProgress?: boolean;
    showDetails?: boolean;
}

export function ProgressiveLoader({
    isLoading,
    stages,
    currentStage,
    className,
    showProgress = true,
    showDetails = false
}: ProgressiveLoaderProps) {
    const [progress, setProgress] = useState(0);
    const [activeStageIndex, setActiveStageIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    
    useEffect(() => {
        if (!isLoading) {
            setProgress(0);
            setActiveStageIndex(0);
            setElapsed(0);
            return;
        }
        
        const startTime = Date.now();
        let animationFrame: number;
        
        const updateProgress = () => {
            const currentTime = Date.now();
            const totalElapsed = currentTime - startTime;
            setElapsed(totalElapsed);
            
            // Calculate total expected duration
            const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
            
            // Update progress based on current stage or elapsed time
            if (currentStage) {
                const stageIndex = stages.findIndex(s => s.id === currentStage);
                if (stageIndex !== -1) {
                    const completedDuration = stages.slice(0, stageIndex).reduce((sum, stage) => sum + stage.duration, 0);
                    const newProgress = Math.min((completedDuration / totalDuration) * 100, 95); // Never reach 100% until loading is complete
                    setProgress(newProgress);
                    setActiveStageIndex(stageIndex);
                }
            } else {
                // Estimate progress based on elapsed time
                const estimatedProgress = Math.min((totalElapsed / totalDuration) * 100, 95);
                setProgress(estimatedProgress);
                
                // Update active stage based on elapsed time
                let cumulativeDuration = 0;
                for (let i = 0; i < stages.length; i++) {
                    cumulativeDuration += stages[i].duration;
                    if (totalElapsed <= cumulativeDuration) {
                        setActiveStageIndex(i);
                        break;
                    }
                }
            }
            
            if (isLoading) {
                animationFrame = requestAnimationFrame(updateProgress);
            }
        };
        
        animationFrame = requestAnimationFrame(updateProgress);
        
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [isLoading, currentStage, stages]);
    
    // Complete the progress when loading finishes
    useEffect(() => {
        if (!isLoading && progress > 0) {
            setProgress(100);
            // Reset after a short delay
            const timeout = setTimeout(() => {
                setProgress(0);
                setActiveStageIndex(0);
                setElapsed(0);
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [isLoading, progress]);
    
    if (!isLoading && progress === 0) return null;
    
    const activeStage = stages[activeStageIndex];
    const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
    
    return (
        <Card className={cn("w-full border-0 bg-transparent shadow-none", className)}>
            <CardContent className="px-4 py-3">
                <div className="space-y-3">
                    {/* Current stage info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {activeStage?.icon && (
                                <div className="flex h-5 w-5 items-center justify-center">
                                    {activeStage.icon}
                                </div>
                            )}
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {activeStage?.label || 'Cargando...'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTime(elapsed)}
                        </span>
                    </div>
                    
                    {/* Progress bar */}
                    {showProgress && (
                        <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Progreso</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Detailed stage list */}
                    {showDetails && (
                        <div className="space-y-1">
                            {stages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    className={cn(
                                        "flex items-center gap-2 text-xs px-2 py-1 rounded",
                                        index === activeStageIndex
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                            : index < activeStageIndex
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-slate-400 dark:text-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        index === activeStageIndex
                                            ? "bg-blue-500 animate-pulse"
                                            : index < activeStageIndex
                                            ? "bg-green-500"
                                            : "bg-slate-300 dark:bg-slate-600"
                                    )} />
                                    <span>{stage.label}</span>
                                    {index < activeStageIndex && (
                                        <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Predefined loading stages for different operations
export const loadingStages = {
    monthlyData: [
        { id: 'init', label: 'Iniciando consulta mensual...', duration: 1000 },
        { id: 'weeks', label: 'Calculando semanas del mes...', duration: 2000 },
        { id: 'api', label: 'Consultando datos de la API...', duration: 25000 },
        { id: 'process', label: 'Procesando respuesta...', duration: 2000 },
        { id: 'cache', label: 'Guardando en caché...', duration: 1000 }
    ],
    
    weeklyData: [
        { id: 'init', label: 'Iniciando consulta semanal...', duration: 500 },
        { id: 'range', label: 'Calculando rango de fechas...', duration: 1000 },
        { id: 'api', label: 'Obteniendo datos semanales...', duration: 8000 },
        { id: 'compare', label: 'Comparando con semana anterior...', duration: 2000 }
    ],
    
    dailyData: [
        { id: 'init', label: 'Consultando datos del día...', duration: 500 },
        { id: 'main', label: 'Obteniendo resumen principal...', duration: 3000 },
        { id: 'hours', label: 'Cargando análisis por horas...', duration: 4000 },
        { id: 'branches', label: 'Procesando datos de sucursales...', duration: 2000 }
    ]
};