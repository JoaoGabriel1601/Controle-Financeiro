import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Share, SquarePlus, Smartphone } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { toast } from './toastStore';
import styles from './InstallApp.module.css';

// `beforeinstallprompt` ainda não faz parte da lib padrão do TS.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Mode = 'installed' | 'installable' | 'ios' | 'other';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS expõe isso fora do padrão.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(() => {
    if (isStandalone()) return 'installed';
    if (isIOS()) return 'ios';
    return 'other';
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('installable');
    };
    const onInstalled = () => {
      setDeferred(null);
      setMode('installed');
      toast.info('App instalado com sucesso');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setDeferred(null);
  };

  if (mode === 'installed') {
    return (
      <Card title="Aplicativo" subtitle="Instale o app no seu dispositivo">
        <div className={styles.installed}>
          <CheckCircle2 size={20} />
          <span>App instalado — você já está usando a versão instalada. 🎉</span>
        </div>
      </Card>
    );
  }

  if (mode === 'installable') {
    return (
      <Card title="Aplicativo" subtitle="Instale o app no seu dispositivo">
        <div className={styles.row}>
          <p className={styles.lead}>
            Instale o Controle Financeiro para abrir em tela cheia, direto da sua tela inicial e
            funcionar offline.
          </p>
          <Button leftIcon={<Download size={16} />} onClick={handleInstall}>
            Instalar app
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === 'ios') {
    return (
      <Card title="Instalar no iPhone / iPad" subtitle="Adicione à tela de início pelo Safari">
        <ol className={styles.steps}>
          <li>
            <Share size={18} />
            <span>
              Toque em <strong>Compartilhar</strong> na barra do Safari.
            </span>
          </li>
          <li>
            <SquarePlus size={18} />
            <span>
              Escolha <strong>Adicionar à Tela de Início</strong>.
            </span>
          </li>
          <li>
            <Smartphone size={18} />
            <span>
              Confirme em <strong>Adicionar</strong> — o ícone aparece junto dos seus apps.
            </span>
          </li>
        </ol>
        <p className={styles.note}>
          Funciona offline e abre em tela cheia. O passo é manual porque o iOS não permite o botão
          automático de instalar.
        </p>
      </Card>
    );
  }

  // Desktop ou navegador sem prompt nativo (ex.: Firefox, Safari no Mac).
  return (
    <Card title="Aplicativo" subtitle="Instale o app no seu dispositivo">
      <p className={styles.lead}>
        No celular Android (Chrome) aparece a opção <strong>Instalar app</strong> aqui. No iPhone,
        use <strong>Compartilhar → Adicionar à Tela de Início</strong> no Safari. No computador,
        procure o ícone de instalar na barra de endereço do navegador.
      </p>
    </Card>
  );
}
