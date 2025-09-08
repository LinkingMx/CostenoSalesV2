import { useSessionStatus } from '@/hooks/useSessionStatus';
import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import { router } from '@inertiajs/react';

export function SessionWarning() {
    const sessionStatus = useSessionStatus();
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissed state when session is renewed
    useEffect(() => {
        if (sessionStatus && !sessionStatus.warning && sessionStatus.percentage > 25) {
            setDismissed(false);
        }
    }, [sessionStatus]);

    if (!sessionStatus || !sessionStatus.warning || dismissed) {
        return null;
    }

    const formatTimeRemaining = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days} ${days === 1 ? 'día' : 'días'} y ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        } else if (hours > 0) {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        } else if (minutes > 0) {
            return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        } else {
            return 'menos de 1 minuto';
        }
    };

    const refreshSession = () => {
        // Make a simple request to refresh the session
        router.reload({ only: [] });
        setDismissed(true);
    };

    return (
        <div className="fixed top-4 right-4 z-50 w-96 max-w-[90vw]">
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                            <p className="font-medium mb-1">
                                Tu sesión expirará pronto
                            </p>
                            <p className="text-sm mb-3">
                                Quedan aproximadamente {formatTimeRemaining(sessionStatus.remaining)}. 
                                La actividad renovará tu sesión automáticamente.
                            </p>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={refreshSession}
                                    className="h-7 text-xs"
                                >
                                    Renovar ahora
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setDismissed(true)}
                                    className="h-7 text-xs"
                                >
                                    Entendido
                                </Button>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                            onClick={() => setDismissed(true)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
}