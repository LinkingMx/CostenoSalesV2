import { useSessionStatus } from '@/hooks/useSessionStatus';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionIndicatorProps {
    className?: string;
    variant?: 'compact' | 'detailed' | 'minimal';
}

export function SessionIndicator({ className, variant = 'compact' }: SessionIndicatorProps) {
    const sessionStatus = useSessionStatus();
    const { t } = useTranslation();

    if (!sessionStatus || sessionStatus.status === 'inactive') {
        return null;
    }

    const formatTimeRemaining = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return '<1m';
        }
    };

    const getStatusColor = () => {
        if (sessionStatus.warning || sessionStatus.percentage < 10) return 'destructive';
        if (sessionStatus.percentage < 25) return 'secondary';
        return 'default';
    };

    const getStatusIcon = () => {
        if (sessionStatus.warning || sessionStatus.percentage < 10) {
            return <AlertCircle className="h-3 w-3" />;
        }
        if (sessionStatus.percentage < 25) {
            return <Clock className="h-3 w-3" />;
        }
        return <CheckCircle className="h-3 w-3" />;
    };

    if (variant === 'minimal') {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                {getStatusIcon()}
                <span className="text-xs text-muted-foreground">
                    {formatTimeRemaining(sessionStatus.remaining)}
                </span>
            </div>
        );
    }

    if (variant === 'detailed') {
        return (
            <div className={cn("space-y-2 p-3 border rounded-lg", className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <span className="text-sm font-medium">
                            Sesión activa
                        </span>
                    </div>
                    <Badge variant={getStatusColor()}>
                        {formatTimeRemaining(sessionStatus.remaining)}
                    </Badge>
                </div>
                <Progress 
                    value={sessionStatus.percentage} 
                    className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                    {sessionStatus.warning 
                        ? 'Tu sesión expirará pronto. La actividad la renovará automáticamente.'
                        : 'Tu sesión se renueva automáticamente con la actividad.'
                    }
                </p>
            </div>
        );
    }

    return (
        <Badge 
            variant={getStatusColor()}
            className={cn("flex items-center gap-1 text-xs", className)}
        >
            {getStatusIcon()}
            {formatTimeRemaining(sessionStatus.remaining)}
        </Badge>
    );
}