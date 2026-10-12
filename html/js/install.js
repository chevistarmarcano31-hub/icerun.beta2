(() => {
  let installPrompt = null;
  const apkPath = 'downloads/los-magos-del-tiempo.apk';

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (typeof UI !== 'undefined') UI.toast('📱 Aplicación instalada', 'gold');
  });

  window.downloadGameApk = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      installPrompt = null;
      if (result.outcome === 'accepted' && typeof UI !== 'undefined') {
        UI.toast('📱 Instalación iniciada', 'gold');
      }
      return;
    }

    try {
      const response = await fetch(apkPath, { method: 'HEAD' });
      if (!response.ok) throw new Error(`APK no disponible (${response.status})`);
      const link = document.createElement('a');
      link.href = apkPath;
      link.download = 'los-magos-del-tiempo.apk';
      link.click();
    } catch (error) {
      console.error('No se pudo descargar la APK:', error);
      if (typeof UI !== 'undefined') {
        UI.toast('La APK aún no está publicada. Usa la instalación de Android o genera el APK.', 'danger');
      }
    }
  };

  const downloadButton = document.getElementById('btn-download-apk');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => window.downloadGameApk());
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.warn('No se pudo activar el modo instalable:', error);
    });
  }
})();
