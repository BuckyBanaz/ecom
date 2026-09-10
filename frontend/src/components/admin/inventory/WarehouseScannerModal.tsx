import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Camera,
  Barcode,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Sliders,
  MapPin,
  Printer,
  History,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  Search,
  Package,
  Layers,
  FileText,
  Download,
  Settings2,
  ChevronDown,
  ChevronUp,
  Radio,
  Bluetooth,
  Usb,
  Check,
  CircleDot,
  RadioTower,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { InventoryItem, inventoryRepository } from '@/client/inventoryRepository';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { SafeImage } from '@/components/ui/SafeImage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ScanHistoryEntry {
  id: string;
  sku: string;
  productName: string;
  timestamp: Date;
  action: string;
  quantityOnHand: number;
}

// Web Audio API beep synthesizer
const playBeep = (soundEnabled: boolean = true) => {
  if (!soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.warn('Audio feedback error', e);
  }
};

export const WarehouseScannerModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();

  // Mode & Tabs
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MANUAL_LASER'>('CAMERA');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Scanner States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('Standard Camera');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Scanned Item State
  const [manualSkuInput, setManualSkuInput] = useState<string>('');
  const [loadingItem, setLoadingItem] = useState<boolean>(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  // Hardware Laser Device State (Real detection based on physical trigger events)
  const [lastLaserTriggerTime, setLastLaserTriggerTime] = useState<Date | null>(null);
  const [lastScannedSkuRaw, setLastScannedSkuRaw] = useState<string>('');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(null);
  const [isTriggerFlashing, setIsTriggerFlashing] = useState<boolean>(false);

  // Action states on loaded item
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [customBin, setCustomBin] = useState<string>('');
  const [exactCountInput, setExactCountInput] = useState<string>('');
  const [showExactModal, setShowExactModal] = useState<boolean>(false);

  // Print Configurator states
  const [showPrintConfig, setShowPrintConfig] = useState<boolean>(false);
  const [printLayout, setPrintLayout] = useState<'THERMAL_50x30' | 'A4_GRID_24' | 'A4_GRID_30'>('THERMAL_50x30');
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [printIncludePrice, setPrintIncludePrice] = useState<boolean>(true);
  const [printIncludeBin, setPrintIncludeBin] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Hardware Laser Gun Buffer & Fast Scan Memory Cache
  const laserBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const scanCacheRef = useRef<Map<string, InventoryItem>>(new Map());
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedTextRef = useRef<string>('');

  // Is hardware device verified active?
  const isGunDeviceConnected = Boolean(bluetoothDeviceName || lastLaserTriggerTime);

  // Initialize camera scanner when modal opens and tab is CAMERA
  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA') {
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  // Hardware Laser Gun Keydown Listener (detects ultra-fast burst keystrokes from USB / Bluetooth HID gun)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.id !== 'laser-hidden-input' &&
        target.id !== 'laser-manual-input'
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Laser barcode guns typically end with Enter or Tab
      if (e.key === 'Enter' || e.key === 'Tab') {
        const fullBuffer = laserBufferRef.current.replace(/[\x00-\x1F\x7F]/g, '').trim();
        laserBufferRef.current = '';
        if (fullBuffer.length >= 2) {
          e.preventDefault();
          setLastLaserTriggerTime(new Date());
          setLastScannedSkuRaw(fullBuffer);
          setIsTriggerFlashing(true);
          setTimeout(() => setIsTriggerFlashing(false), 800);
          handleScannedCode(fullBuffer, 'LASER_GUN');
        }
      } else if (e.key.length === 1) {
        // If gap between keystrokes is > 120ms, it's human typing — reset buffer
        if (diff > 120) {
          laserBufferRef.current = e.key;
        } else {
          laserBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen]);

  // Start Ultra-Fast Hardware-Accelerated Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (_) {}
      }

      const readerElement = document.getElementById('warehouse-qr-reader');
      if (!readerElement) return;

      const html5QrCode = new Html5Qrcode('warehouse-qr-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Native C++ OS hardware barcode decoder (Zero lag)
        },
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      let cameraToUse: any = { facingMode: 'environment' };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find((c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')) || cameras[0];
          setActiveCameraLabel(backCam.label || 'Default Camera');
          cameraToUse = backCam.id;
        }
      } catch (_) {}

      const qrConfig = {
        fps: 25,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          return {
            width: Math.floor(viewfinderWidth * 0.88),
            height: Math.floor(Math.min(viewfinderHeight * 0.78, viewfinderWidth * 0.65)),
          };
        },
        aspectRatio: 1.333,
        disableFlip: false,
      };

      try {
        await html5QrCode.start(
          cameraToUse,
          qrConfig,
          (decodedText) => {
            handleScannedCode(decodedText, 'CAMERA');
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn('First start attempt failed, retrying with generic device config:', firstErr);
        await html5QrCode.start(
          { facingMode: 'user' },
          qrConfig,
          (decodedText) => {
            handleScannedCode(decodedText, 'CAMERA');
          },
          () => {}
        );
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setIsCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? t('inventory.camera_permission_denied', 'Camera permission was denied. Please allow camera access in your browser.')
          : t('inventory.camera_unavailable', 'Camera is not available or not supported on this device.')
      );
    }
  };

  // Stop Camera and forcefully release hardware camera device
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }

    // Forcefully stop ALL media stream tracks to immediately release hardware camera
    try {
      const container = document.getElementById('warehouse-qr-reader');
      const videoElements = container
        ? container.querySelectorAll('video')
        : document.querySelectorAll('video');

      videoElements.forEach((video: any) => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          video.srcObject = null;
        }
      });
    } catch (e) {
      console.warn('Error releasing video tracks:', e);
    }

    setIsCameraActive(false);
    setTorchOn(false);
  };

  // Safe modal close handler
  const handleModalClose = async () => {
    await stopCamera();
    onClose();
  };

  // Toggle Flashlight
  const toggleTorch = async () => {
    if (scannerRef.current && isCameraActive) {
      try {
        const capabilities = (scannerRef.current as any).getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          await (scannerRef.current as any).applyVideoConstraints({
            advanced: [{ torch: !torchOn }],
          });
          setTorchOn(!torchOn);
        } else {
          toast.info(t('inventory.torch_not_supported', 'Flashlight not supported on this camera'));
        }
      } catch (e) {
        console.warn('Failed to toggle torch', e);
      }
    }
  };

  // Pair Web Bluetooth Scanner (BLE)
  const handlePairBluetooth = async () => {
    if (!('bluetooth' in navigator)) {
      toast.info('Direct Web Bluetooth API is not available on this browser. Plug your scanner via USB or connect via OS Bluetooth setting.');
      return;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'generic_access'],
      });
      setBluetoothDeviceName(device.name || 'Bluetooth Barcode Scanner');
      toast.success(`Connected to ${device.name || 'Bluetooth Scanner'}`);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error(err.message || 'Failed to connect bluetooth device');
      }
    }
  };

  // Process Scanned Barcode / QR (Ultra-Fast with Instant Cache)
  const handleScannedCode = async (rawCode: string, source: 'CAMERA' | 'LASER_GUN' | 'MANUAL') => {
    if (!rawCode) return;
    const now = Date.now();
    const cleanRaw = rawCode.trim();

    // Prevent duplicate camera jitter triggers within 1200ms for identical code
    if (source === 'CAMERA' && cleanRaw === lastScannedTextRef.current && now - lastScannedTimeRef.current < 1200) {
      return;
    }
    lastScannedTimeRef.current = now;
    lastScannedTextRef.current = cleanRaw;

    if ('vibrate' in navigator) {
      try { navigator.vibrate([60, 40, 60]); } catch (_) {}
    }

    playBeep(soundEnabled);

    let parsedSku = cleanRaw;
    if (cleanRaw.startsWith('{') && cleanRaw.endsWith('}')) {
      try {
        const json = JSON.parse(cleanRaw);
        if (json.sku) parsedSku = json.sku;
      } catch (_) {}
    }

    // 1. Instant 0ms response if item was cached in memory
    const cached = scanCacheRef.current.get(parsedSku.toLowerCase());
    if (cached) {
      setScannedItem(cached);
      setCustomBin(cached.binLocation || '');
      setExactCountInput(String(cached.quantityOnHand));
      setShowPrintConfig(false);
      setHistory((prev) => [
        {
          id: Math.random().toString(36).substring(7),
          sku: cached.variant.sku,
          productName: cached.variant.product.name,
          timestamp: new Date(),
          action: source === 'CAMERA' ? 'Camera Scan (Instant)' : source === 'LASER_GUN' ? 'Laser Gun Scan (Instant)' : 'Manual Search',
          quantityOnHand: cached.quantityOnHand,
        },
        ...prev.slice(0, 19),
      ]);
      toast.success(t('inventory.item_identified', 'Item found: {{name}}', { name: cached.variant.product.name }));
    }

    // 2. Fetch fresh record via fast single-item getBySku (< 15ms)
    setLoadingItem(!cached);
    try {
      let found: InventoryItem | null = null;
      try {
        const bySkuRes = await inventoryRepository.getBySku(parsedSku);
        if (bySkuRes.success && bySkuRes.data) {
          found = bySkuRes.data;
        }
      } catch (_) {
        // Fallback search if not direct SKU/Barcode
        const listRes = await inventoryRepository.getList({
          search: parsedSku,
          limit: 1,
        });
        if (listRes.data.items && listRes.data.items.length > 0) {
          found = listRes.data.items[0];
        }
      }

      if (found) {
        // Save to fast cache
        scanCacheRef.current.set(parsedSku.toLowerCase(), found);
        scanCacheRef.current.set(found.variant.sku.toLowerCase(), found);
        if (found.customBarcode) {
          scanCacheRef.current.set(found.customBarcode.toLowerCase(), found);
        }

        setScannedItem(found);
        setCustomBin(found.binLocation || '');
        setExactCountInput(String(found.quantityOnHand));
        setShowPrintConfig(false);

        if (!cached) {
          setHistory((prev) => [
            {
              id: Math.random().toString(36).substring(7),
              sku: found!.variant.sku,
              productName: found!.variant.product.name,
              timestamp: new Date(),
              action: source === 'CAMERA' ? 'Camera Scan' : source === 'LASER_GUN' ? 'Laser Gun Scan' : 'Manual Search',
              quantityOnHand: found!.quantityOnHand,
            },
            ...prev.slice(0, 19),
          ]);

          toast.success(t('inventory.item_identified', 'Item found: {{name}}', { name: found.variant.product.name }));
        }
      } else {
        toast.error(t('inventory.item_not_found', 'No inventory record matched "{{code}}"', { code: parsedSku }));
      }
    } catch (err: any) {
      if (!cached) {
        toast.error(err.message || t('inventory.fetch_error', 'Failed to lookup item'));
      }
    } finally {
      setLoadingItem(false);
    }
  };

  // Stock Quick Action (+1, -1)
  const handleQuickDelta = async (delta: number) => {
    if (!scannedItem) return;
    setActionLoading(true);
    try {
      const res = await inventoryRepository.adjustStorage({
        inventoryItemId: scannedItem.id,
        quantityChange: delta,
        reason: delta > 0 ? 'Mobile Scanner Quick Inward (+1)' : 'Mobile Scanner Quick Outward (-1)',
      });

      setScannedItem(res.data.inventoryItem);
      setExactCountInput(String(res.data.inventoryItem.quantityOnHand));
      playBeep(soundEnabled);
      if ('vibrate' in navigator) navigator.vibrate(50);

      toast.success(
        delta > 0
          ? t('inventory.stock_inward_success', '+1 Added (Now: {{count}})', { count: res.data.inventoryItem.quantityOnHand })
          : t('inventory.stock_outward_success', '-1 Removed (Now: {{count}})', { count: res.data.inventoryItem.quantityOnHand })
      );

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setActionLoading(false);
    }
  };

  // Set Exact Physical Storage Count
  const handleSaveExactCount = async () => {
    if (!scannedItem) return;
    const countNum = parseInt(exactCountInput, 10);
    if (isNaN(countNum) || countNum < 0) {
      toast.error(t('inventory.valid_number', 'Please enter a valid positive number'));
      return;
    }

    setActionLoading(true);
    try {
      const res = await inventoryRepository.adjustStorage({
        inventoryItemId: scannedItem.id,
        setExactCount: countNum,
        reason: 'Mobile Scanner Physical Count Audit',
      });

      setScannedItem(res.data.inventoryItem);
      setShowExactModal(false);
      playBeep(soundEnabled);

      toast.success(t('inventory.exact_count_saved', 'Stock verified at {{count}} units', { count: countNum }));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update count');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Bin Shelf Location
  const handleSaveBinLocation = async () => {
    if (!scannedItem) return;
    setActionLoading(true);
    try {
      const res = await inventoryRepository.updateLocation(scannedItem.id, customBin.trim());
      setScannedItem(res.data.inventoryItem);
      toast.success(t('inventory.location_saved', 'Shelf bin updated'));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bin location');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Configured Label Print
  const handleExecutePrint = async () => {
    if (!scannedItem) return;
    setIsPrinting(true);
    try {
      toast.loading(t('inventory.generating_pdf', 'Generating HD PDF...'), { id: 'pdf-gen' });
      const blob = await inventoryRepository.downloadLabelsPdf({
        layout: printLayout,
        items: [{ inventoryItemId: scannedItem.id, copies: printCopies }],
        includePrice: printIncludePrice,
        includeBin: printIncludeBin,
      });

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success(t('inventory.pdf_ready', 'Print PDF ready!'), { id: 'pdf-gen' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF', { id: 'pdf-gen' });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Bar */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{t('inventory.scanner_title', 'Warehouse Mobile Scanner')}</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-semibold px-2 py-0.5">
                    LIVE
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('inventory.scanner_subtitle', 'Scan camera QR, 1D barcodes or laser gun')}
                </DialogDescription>
              </div>
            </div>

            {/* Sound Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={soundEnabled ? t('inventory.mute_beep', 'Mute Beep') : t('inventory.enable_beep', 'Enable Beep')}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </DialogHeader>

        {/* Mode Switch Tabs */}
        <div className="px-6 pt-3 border-b bg-muted/20">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="w-full"
          >
            <TabsList className="bg-muted w-full sm:w-auto grid grid-cols-2">
              <TabsTrigger value="CAMERA" className="gap-2 text-xs">
                <Camera className="w-3.5 h-3.5" />
                <span>{t('inventory.tab_camera_scanner', 'Camera Viewfinder')}</span>
              </TabsTrigger>
              <TabsTrigger value="MANUAL_LASER" className="gap-2 text-xs">
                <Barcode className="w-3.5 h-3.5" />
                <span>{t('inventory.tab_manual_laser', 'Laser Gun & SKU Input')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* CAMERA TAB */}
          {activeTab === 'CAMERA' && (
            <div className="space-y-3">
              {/* Camera Device Status Badge Bar */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {isCameraActive ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    )}
                  </span>
                  <span className="font-semibold text-foreground">
                    {t('inventory.camera_status_label', 'Camera:')} {isCameraActive ? t('inventory.status_connected', 'CONNECTED') : t('inventory.status_initializing', 'INITIALIZING...')}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                    ({activeCameraLabel})
                  </span>
                </div>

                <Badge variant="outline" className={`text-[10px] font-mono font-medium ${isCameraActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                  {isCameraActive ? t('inventory.status_1080p_hd', '1080p HD') : t('inventory.status_standby', 'Standby')}
                </Badge>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center border border-border shadow-inner">
                {/* Viewfinder Mount Target */}
                <div id="warehouse-qr-reader" className="w-full h-full overflow-hidden" />

                {/* Laser Animation Overlay Line */}
                {isCameraActive && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                    <div className="w-48 sm:w-64 h-48 sm:h-64 border-2 border-primary/70 rounded-2xl relative overflow-hidden flex items-center justify-center">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-pulse" />
                      {/* Corner Target Marks */}
                      <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary" />
                      <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary" />
                      <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary" />
                      <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary" />
                    </div>
                  </div>
                )}

                {/* Camera Controls Overlay */}
                {isCameraActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={toggleTorch}
                      className="h-8 w-8 rounded-full bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800"
                      title={t('inventory.toggle_flashlight', 'Toggle Flashlight')}
                    >
                      {torchOn ? <Zap className="w-4 h-4 text-amber-400" /> : <ZapOff className="w-4 h-4" />}
                    </Button>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950 text-white space-y-3">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                    <p className="text-sm font-medium">{cameraError}</p>
                    <Button
                      size="sm"
                      onClick={startCamera}
                      className="text-xs"
                    >
                      {t('inventory.retry_camera', 'Try Again')}
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                {t('inventory.scanner_camera_tip', 'Point camera at product sticker QR code or 1D Barcode. It scans automatically.')}
              </p>
            </div>
          )}

          {/* MANUAL / LASER GUN TAB */}
          {activeTab === 'MANUAL_LASER' && (
            <div className="space-y-3">
              {/* ACCURATE DEVICE CONNECTION STATUS BANNER */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isTriggerFlashing
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                    : isGunDeviceConnected
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-muted/40 border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      {isGunDeviceConnected ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground/50"></span>
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Usb className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {isGunDeviceConnected
                              ? t('inventory.hardware_scanner_connected', 'Hardware Scanner: CONNECTED & ACTIVE')
                              : t('inventory.hardware_scanner_waiting', 'Hardware Scanner: WAITING FOR DEVICE TRIGGER')}
                          </span>
                        </span>
                        {bluetoothDeviceName && (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/20 font-mono">
                            {bluetoothDeviceName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {lastLaserTriggerTime ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            {t('inventory.gun_trigger_verified', 'Gun Trigger verified at {{time}} (Last SKU: {{sku}})', {
                              time: lastLaserTriggerTime.toLocaleTimeString(),
                              sku: lastScannedSkuRaw,
                            })}
                          </span>
                        ) : (
                          <span>{t('inventory.pull_trigger_desc', 'Pull the trigger on your USB / Wireless / Bluetooth scanner gun to connect & verify')}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 ${
                        isGunDeviceConnected
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {isGunDeviceConnected ? t('inventory.status_connected', 'CONNECTED') : t('inventory.status_standby', 'STANDBY')}
                    </Badge>

                    {'bluetooth' in navigator && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePairBluetooth}
                        className="h-7 text-[11px] gap-1 px-2 bg-background hover:bg-muted"
                        title={t('inventory.pair_ble_title', 'Pair Direct Bluetooth BLE Scanner')}
                      >
                        <Bluetooth className="w-3 h-3 text-blue-600" />
                        <span>{t('inventory.pair_ble_btn', 'Pair BLE')}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Laser Trigger Test & Manual Search Form */}
              <div className="p-4 rounded-xl bg-card border space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ScanLine className="w-4 h-4 text-primary" />
                  <span>{t('inventory.laser_gun_ready', 'Scan With Hardware Gun or Type Below')}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('inventory.laser_gun_desc', 'Any barcode scanner gun (USB / Bluetooth / Wireless) will automatically capture and lookup products immediately on trigger pull.')}
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualSkuInput.trim()) {
                      handleScannedCode(manualSkuInput.trim(), 'MANUAL');
                    }
                  }}
                  className="flex gap-2 pt-1"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={manualSkuInput}
                      onChange={(e) => setManualSkuInput(e.target.value)}
                      placeholder={t('inventory.enter_sku_prompt', 'Type SKU, barcode or scan with gun...')}
                      className="pl-9 h-10 text-xs"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loadingItem || !manualSkuInput.trim()}
                    className="gap-1.5 h-10 text-xs font-medium"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{t('common.search', 'Find SKU')}</span>
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* SCANNED ITEM ACTION DRAWER */}
          {scannedItem && (
            <div className="p-4 rounded-xl bg-card border shadow-xs space-y-4 animate-fadeIn">
              {/* Product Info Header */}
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted/40 border overflow-hidden flex items-center justify-center p-1 shrink-0">
                    {((scannedItem.variant.product as any).image || scannedItem.variant.product.images?.[0]) ? (
                      <SafeImage
                        src={(scannedItem.variant.product as any).image || scannedItem.variant.product.images[0]}
                        alt={scannedItem.variant.product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground/60" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">
                      {scannedItem.variant.product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-mono text-[10px] bg-muted text-muted-foreground">
                        {scannedItem.variant.sku}
                      </Badge>
                      {scannedItem.variant.product.category && (
                        <span className="text-[11px] text-muted-foreground">
                          {typeof scannedItem.variant.product.category === 'object'
                            ? scannedItem.variant.product.category.name
                            : scannedItem.variant.product.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Print sticker toggle button */}
                <Button
                  size="sm"
                  variant={showPrintConfig ? 'default' : 'outline'}
                  onClick={() => setShowPrintConfig(!showPrintConfig)}
                  className="gap-1 text-xs h-8"
                  title={t('inventory.configure_print_labels', 'Configure & Print Labels')}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('inventory.btn_print_labels', 'Print')}</span>
                  {showPrintConfig ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </Button>
              </div>

              {/* EXPANDABLE PRINT CONFIGURATOR PANEL */}
              {showPrintConfig && (
                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-primary" />
                      <span>{t('inventory.print_options_title', 'Print Format & Options')}</span>
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {printCopies} {printCopies === 1 ? t('inventory.copy', 'copy') : t('inventory.copies', 'copies')}
                    </span>
                  </div>

                  {/* Layout Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'THERMAL_50x30', label: t('inventory.format_roll_50x30', '50x30mm Roll'), desc: t('inventory.format_thermal_sticker', 'Thermal Sticker'), icon: Printer },
                      { id: 'A4_GRID_24', label: t('inventory.format_a4_24', 'A4 (24/Sheet)'), desc: t('inventory.format_a4_24_short', '3x8 Stickers'), icon: Layers },
                      { id: 'A4_GRID_30', label: t('inventory.format_a4_30', 'A4 (30/Sheet)'), desc: t('inventory.format_a4_30_short', '3x10 Compact'), icon: FileText },
                    ].map((fmt) => {
                      const Icon = fmt.icon;
                      const active = printLayout === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setPrintLayout(fmt.id as any)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            active
                              ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 mb-1 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="text-[11px] font-bold leading-tight text-foreground">{fmt.label}</p>
                          <p className="text-[9px] text-muted-foreground">{fmt.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Copies Stepper & Checkboxes */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    {/* Copies */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-muted-foreground">{t('inventory.copies_label', 'Copies:')}</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setPrintCopies((c) => Math.max(1, c - 1))}
                          className="h-7 w-7 text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={printCopies}
                          onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="h-7 w-12 text-xs font-bold text-center p-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setPrintCopies((c) => c + 1)}
                          className="h-7 w-7 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Checkbox inclusions */}
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={printIncludeBin}
                          onChange={(e) => setPrintIncludeBin(e.target.checked)}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>{t('inventory.shelf_bin', 'Shelf Bin')}</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={printIncludePrice}
                          onChange={(e) => setPrintIncludePrice(e.target.checked)}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>{t('inventory.price_euro', 'Price (€)')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Generate Print Action */}
                  <Button
                    onClick={handleExecutePrint}
                    disabled={isPrinting}
                    className="w-full h-8 text-xs font-semibold gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isPrinting ? t('inventory.generating_pdf', 'Generating PDF...') : t('inventory.btn_generate_print_now', 'Generate & Open PDF')}</span>
                  </Button>
                </div>
              )}

              {/* Current Counts Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary block">
                    {t('inventory.metric_total_onhand', 'Physical Storage')}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {scannedItem.quantityOnHand}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 block">
                    {t('inventory.metric_webshop_live', 'Webshop Quota')}
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    {scannedItem.webshopAllocated}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 block">
                    {t('inventory.metric_safety_reserve', 'Buffer Reserve')}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {Math.max(0, scannedItem.quantityOnHand - scannedItem.webshopAllocated)}
                  </span>
                </div>
              </div>

              {/* Quick Operation Actions */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  {t('inventory.quick_actions_header', 'Warehouse Actions')}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* +1 Inward */}
                  <Button
                    variant="outline"
                    onClick={() => handleQuickDelta(1)}
                    disabled={actionLoading}
                    className="h-10 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>{t('inventory.btn_inward_plus', '+1 Inward')}</span>
                  </Button>

                  {/* -1 Outward */}
                  <Button
                    variant="outline"
                    onClick={() => handleQuickDelta(-1)}
                    disabled={actionLoading || scannedItem.quantityOnHand <= 0}
                    className="h-10 text-xs font-semibold gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Minus className="w-4 h-4 text-rose-600" />
                    <span>{t('inventory.btn_outward_minus', '-1 Outward')}</span>
                  </Button>

                  {/* Set Exact Count */}
                  <Button
                    variant="outline"
                    onClick={() => setShowExactModal(!showExactModal)}
                    className="h-10 text-xs font-semibold gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>{t('inventory.btn_set_exact', 'Set Exact')}</span>
                  </Button>

                  {/* Clear selection */}
                  <Button
                    variant="ghost"
                    onClick={() => setScannedItem(null)}
                    className="h-10 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('common.done', 'Done')}</span>
                  </Button>
                </div>
              </div>

              {/* Expandable Exact Count Input */}
              {showExactModal && (
                <div className="p-3 rounded-lg bg-muted/40 border flex items-center gap-2 animate-fadeIn">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {t('inventory.set_exact_count', 'Physical Count')}:
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={exactCountInput}
                    onChange={(e) => setExactCountInput(e.target.value)}
                    className="h-8 w-24 text-xs font-bold text-center"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveExactCount}
                    disabled={actionLoading}
                    className="h-8 text-xs font-medium"
                  >
                    {t('common.save', 'Save')}
                  </Button>
                </div>
              )}

              {/* Rack Shelf Location Edit */}
              <div className="pt-2 border-t flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {t('inventory.shelf_location', 'Shelf Bin')}:
                </span>
                <Input
                  value={customBin}
                  onChange={(e) => setCustomBin(e.target.value)}
                  placeholder="e.g. Rack-A-Shelf-04"
                  className="h-8 text-xs font-mono flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveBinLocation}
                  disabled={actionLoading || customBin === scannedItem.binLocation}
                  className="h-8 text-xs font-medium"
                >
                  {t('common.update', 'Update')}
                </Button>
              </div>
            </div>
          )}

          {/* Session History Log */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  {t('inventory.scan_history', 'Session Scan History')} ({history.length})
                </span>
                <button
                  onClick={() => setHistory([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground normal-case font-normal"
                >
                  {t('common.clear', 'Clear')}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto divide-y rounded-lg border bg-card">
                {history.map((entry) => (
                  <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30">
                    <div>
                      <span className="font-semibold text-foreground">{entry.productName}</span>
                      <span className="font-mono text-[10px] text-muted-foreground ml-2">({entry.sku})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {entry.quantityOnHand} {t('inventory.units', 'units')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
