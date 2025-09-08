import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { appearance } from '@/routes';
import { useTranslation } from '@/hooks/useTranslation';

export default function Appearance() {
    const { t } = useTranslation();
    
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('settings.appearance_settings', 'Configuración de apariencia'),
            href: appearance().url,
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.appearance_settings', 'Configuración de apariencia')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('settings.appearance_settings', 'Configuración de apariencia')} description={t('settings.appearance_description', 'Actualiza la configuración de apariencia de tu cuenta')} />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
