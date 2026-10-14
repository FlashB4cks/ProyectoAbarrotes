import React, { useState, useEffect, useRef } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { playScannerBeep } from '../../utils/audio';
import { IconLock } from '../../components/icons/Icons';

/* ── COMPONENTE: INTERFAZ MÓVIL PARA TELÉFONO CELULAR (ESCÁNER WEB) ── */
export const MobileScannerPage = () => {
  const [sessionId, setSessionId] = useState('');
  const [pin, setPin] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [scannedHistory, setScannedHistory] = useState([]);
  const [hasCamera, setHasCamera] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Extraer session_id y pin de la URL si se escaneó el QR
    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : window.location.search);
    const s = params.get('s') || '';
    const p = params.get('p') || '';
    if (s) setSessionId(s);
    if (p) {
      setPin(p);
      setInputPin(p);
      setIsPaired(true);
      // Handshake inicial automático si vino por QR
      NohemyApi.enviarCodigoEscaner({
        session_id: s,
        pin: p,
        codigo_barras: '__PING__',
        dispositivo: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Teléfono Android',
      }).catch(() => {});
    }
  }, []);

  // Iniciar cámara trasera cuando esté emparejado (si el navegador móvil lo permite)
  useEffect(() => {
    if (!isPaired) return;

    let active = true;
    let detector = null;
    let intervalId = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Si el navegador soporta BarcodeDetector nativo
        if ('BarcodeDetector' in window) {
          detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });

          let lastDetected = '';
          let lastTime = 0;

          intervalId = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  const now = Date.now();
                  if (rawValue && (rawValue !== lastDetected || now - lastTime > 3000)) {
                    lastDetected = rawValue;
                    lastTime = now;
                    handleSendBarcode(rawValue);
                  }
                }
              } catch {
                // error frame detection
              }
            }
          }, 350);
        }
      } catch {
        setHasCamera(false);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isPaired]);

  const handleToggleTorch = () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        const newTorch = !torchOn;
        track.applyConstraints({ advanced: [{ torch: newTorch }] })
          .then(() => setTorchOn(newTorch))
          .catch(() => {});
      }
    }
  };

  const handleConnectWithPin = async () => {
    const clean = inputPin.trim();
    if (!clean) {
      setIsSuccess(false);
      setStatusMsg('Por favor ingresa el PIN de emparejamiento.');
      return;
    }
    setStatusMsg('Conectando con la computadora...');
    try {
      await NohemyApi.enviarCodigoEscaner({
        pin: clean,
        codigo_barras: '__PING__',
        dispositivo: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Teléfono Android',
      });
      setPin(clean);
      setIsPaired(true);
      setIsSuccess(true);
      setStatusMsg('¡Vinculado exitosamente a la computadora!');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      setIsSuccess(false);
      setStatusMsg('Error al conectar: ' + err.message);
    }
  };

  const handleSendBarcode = async (codeToSend) => {
    const code = (codeToSend || manualCode).trim();
    if (!code) return;

    try {
      if (navigator.vibrate) navigator.vibrate(120);
      playScannerBeep(true);

      await NohemyApi.enviarCodigoEscaner({
        session_id: sessionId,
        pin: pin,
        codigo_barras: code,
        dispositivo: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Teléfono Android',
      });

      setIsSuccess(true);
      setStatusMsg(`¡Transmitido a la PC: ${code}!`);
      setManualCode('');
      setScannedHistory(prev => [
        { code, time: new Date().toLocaleTimeString(), id: Date.now() },
        ...prev.slice(0, 9)
      ]);

      setTimeout(() => {
        setStatusMsg('');
      }, 3500);
    } catch (err) {
      setIsSuccess(false);
      setStatusMsg('Error al transmitir: ' + err.message);
    }
  };

  // Captura de foto con cámara nativa del celular (funciona en cualquier navegador móvil sin HTTPS)
  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setStatusMsg('Analizando código de barras en la foto...');
    try {
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue;
          handleSendBarcode(raw);
          setIsProcessingPhoto(false);
          return;
        }
      }
      setIsSuccess(false);
      setStatusMsg('No se detectó un código claro en la imagen. Intenta con mejor iluminación o ingresa los números abajo.');
    } catch (err) {
      setIsSuccess(false);
      setStatusMsg('Error al procesar foto: ' + err.message);
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="mobile-scanner-view" style={{ minHeight: '100vh', padding: '16px', background: '#12100e', color: '#f5f3ec', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <h2 style={{ color: 'var(--accent)', margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800 }}>NohemySys — Escáner Celular</h2>
        <span style={{ fontSize: '12px', color: '#a09885' }}>
          Lector de códigos por cable USB / Wi-Fi
        </span>
      </div>

      {statusMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '14px',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '13px',
          background: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: isSuccess ? '#10b981' : '#ef4444',
          border: `1px solid ${isSuccess ? '#10b981' : '#ef4444'}`
        }}>
          {statusMsg}
        </div>
      )}

      {!isPaired ? (
        <div style={{
          maxWidth: '400px', margin: '16px auto', background: '#24201c',
          padding: '24px', borderRadius: '16px', border: '1px solid #b8860b', textAlign: 'center', width: '100%'
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(184, 134, 11, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto',
            color: 'var(--accent)'
          }}>
            <IconLock size={26} />
          </div>
          <h3 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '18px' }}>Vincular con Computadora</h3>
          <p style={{ color: '#a09885', fontSize: '13px', margin: '0 0 18px 0', lineHeight: '1.4' }}>
            Ingresa el <strong>PIN de 4 dígitos</strong> que aparece en la pantalla de NohemySys en la computadora:
          </p>
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              inputMode="numeric" 
              maxLength={6}
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnectWithPin(); }}
              placeholder="PIN"
              style={{
                width: '180px',
                padding: '12px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '4px',
                fontWeight: 800,
                borderRadius: '8px',
                border: '2px solid var(--accent)',
                background: '#12100e',
                color: '#ffd700'
              }}
              autoFocus
            />
          </div>
          <button 
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '15px' }}
            onClick={handleConnectWithPin}
          >
            Conectar y Activar Escáner
          </button>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#24201c', padding: '10px 14px', borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.35)', marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="scanner-indicator-dot"></span>
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
                ● Vinculado a PC (PIN: {pin})
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => { setIsPaired(false); setPin(''); }}
              style={{ background: 'transparent', border: 'none', color: '#a09885', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Cambiar PIN
            </button>
          </div>

          {/* Visor de cámara en vivo si está disponible */}
          {hasCamera && (
            <div className="mobile-camera-viewport">
              <video ref={videoRef} className="mobile-camera-video" playsInline muted></video>
              <div className="mobile-camera-reticle"></div>
              <div className="scanner-laser-line"></div>
              <button 
                type="button" 
                onClick={handleToggleTorch}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: torchOn ? '#ffd700' : 'rgba(0,0,0,0.6)',
                  color: torchOn ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {torchOn ? 'Linterna ON' : 'Linterna'}
              </button>
            </div>
          )}

          {/* Botón de Captura Nativa con Cámara Móvil */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handlePhotoCapture} 
            style={{ display: 'none' }} 
          />
          <div style={{ margin: '10px auto 0 auto', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPhoto}
              className="btn btn-secondary"
              style={{
                width: '100%', padding: '12px', fontSize: '14.5px', fontWeight: 800,
                borderRadius: '10px', border: '2px solid var(--accent)', background: '#24201c', color: '#ffd700',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              Tomar Foto al Código con Cámara del Celular
            </button>
          </div>

          {/* Entrada de Código con Teclado Rápido */}
          <div style={{ marginTop: '14px', maxWidth: '420px', margin: '14px auto 0 auto', width: '100%' }}>
            <label style={{ fontSize: '13px', color: '#ffd700', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Ingreso Manual de Código:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendBarcode(); }}
                placeholder="Escribe el código..."
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #b8860b',
                  background: '#24201c',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700
                }}
              />
              <button 
                type="button" 
                onClick={() => handleSendBarcode()}
                className="btn btn-primary"
                style={{ padding: '0 16px', fontWeight: 800, fontSize: '13.5px' }}
              >
                Transmitir
              </button>
            </div>

            {/* Teclado táctil rápido de números para teléfonos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '10px' }}>
              {['1','2','3','4','5','6','7','8','9','Limpiar','0','Enviar'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'Limpiar') setManualCode('');
                    else if (key === 'Enviar') handleSendBarcode();
                    else setManualCode(prev => prev + key);
                  }}
                  style={{
                    padding: '10px 0',
                    fontSize: key === 'Limpiar' || key === 'Enviar' ? '12px' : '18px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #3d352b',
                    background: key === 'Enviar' ? 'var(--accent)' : (key === 'Limpiar' ? '#3d2522' : '#24201c'),
                    color: key === 'Enviar' ? '#000000' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {scannedHistory.length > 0 && (
            <div style={{ marginTop: '16px', maxWidth: '420px', margin: '16px auto 0 auto', width: '100%' }}>
              <h4 style={{ fontSize: '12px', color: '#a09885', margin: '0 0 6px 0' }}>Códigos Transmitidos a la Computadora:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scannedHistory.map((item) => (
                  <div key={item.id} style={{
                    background: '#24201c',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    border: '1px solid #332d26'
                  }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{item.code}</span>
                    <span style={{ color: '#888' }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'center' }}>
        <a 
          href="/" 
          style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}
        >
          ← Ir a la versión de escritorio de NohemySys
        </a>
      </div>
    </div>
  );
};


export default MobileScannerPage;
