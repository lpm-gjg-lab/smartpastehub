export class SmartPasteError extends Error {
  code: string;
  recoverable: boolean;

  constructor(message: string, code: string, recoverable = true) {
    super(message);
    this.name = 'SmartPasteError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class CleaningError extends SmartPasteError {
  constructor(message: string, public inputType: string) {
    super(message, 'CLEANING_FAILED', true);
  }
}

export class DetectionError extends SmartPasteError {
  constructor(message: string) {
    super(message, 'DETECTION_FAILED', true);
  }
}

export class SecurityScanError extends SmartPasteError {
  constructor(message: string) {
    super(message, 'SECURITY_SCAN_FAILED', true);
  }
}

export class OCRError extends SmartPasteError {
  constructor(message: string, public imagePath?: string) {
    super(message, 'OCR_FAILED', true);
  }
}

export class SyncError extends SmartPasteError {
  constructor(message: string, public deviceId?: string) {
    super(message, 'SYNC_FAILED', true);
  }
}

export class EncryptionError extends SmartPasteError {
  constructor(message: string) {
    super(message, 'ENCRYPTION_FAILED', false);
  }
}

export class PluginError extends SmartPasteError {
  constructor(message: string, public pluginName: string) {
    super(message, 'PLUGIN_FAILED', true);
  }
}

export class StorageError extends SmartPasteError {
  constructor(message: string, public operation: string) {
    super(message, 'STORAGE_FAILED', true);
  }
}
