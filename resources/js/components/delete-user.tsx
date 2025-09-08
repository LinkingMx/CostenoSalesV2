import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <HeadingSmall title={t('settings.delete_account')} description={t('settings.delete_account_description')} />
            <div className="space-y-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-200/10 dark:bg-red-700/10">
                <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                    <p className="font-medium">{t('settings.delete_account_warning')}</p>
                    <p className="text-sm">{t('settings.delete_account_warning_text')}</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">{t('settings.delete_account_button')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>{t('settings.delete_account_confirm', '¿Estás seguro de que quieres eliminar tu cuenta?')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.delete_account_warning_full', 'Una vez que tu cuenta sea eliminada, todos sus recursos y datos también serán eliminados permanentemente. Por favor ingresa tu contraseña para confirmar que deseas eliminar permanentemente tu cuenta.')}
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password" className="sr-only">
                                            {t('settings.current_password')}
                                        </Label>

                                        <Input
                                            id="password"
                                            type="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Password"
                                            autoComplete="current-password"
                                        />

                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button variant="secondary" onClick={() => resetAndClearErrors()}>
                                                {t('common.cancel')}
                                            </Button>
                                        </DialogClose>

                                        <Button variant="destructive" disabled={processing} asChild>
                                            <button type="submit">{t('settings.delete_account_button')}</button>
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
