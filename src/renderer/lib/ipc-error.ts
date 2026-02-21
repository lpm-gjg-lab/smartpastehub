import { IPCFailure } from '../../shared/ipc-response';

export class IPCInvokeError extends Error {
  code: string;
  recoverable: boolean;

  constructor(payload: IPCFailure['error']) {
    super(`${payload.code}: ${payload.message}`);
    this.name = 'IPCInvokeError';
    this.code = payload.code;
    this.recoverable = payload.recoverable;
  }
}

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function toUserFacingErrorMessage(
  error: unknown,
  t: TranslateFn,
): string {
  if (error instanceof IPCInvokeError) {
    switch (error.code) {
      case 'CLEANING_FAILED':
        return t('errors.cleaningFailed');
      case 'DETECTION_FAILED':
        return t('errors.detectionFailed');
      case 'OCR_FAILED':
      case 'OCR_TIMEOUT':
      case 'OCR_ABORTED':
      case 'OCR_NO_CONTENT':
        return t('errors.ocrFailed');
      case 'SYNC_FAILED':
        return t('errors.syncFailed');
      case 'ENCRYPTION_FAILED':
        return t('errors.encryptionFailed');
      case 'PLUGIN_FAILED':
        return t('errors.pluginFailed', { name: 'Plugin' });
      case 'STORAGE_FAILED':
        return t('errors.storageFailed');
      case 'HOTKEY_CONFLICT':
        return t('errors.hotkeyConflict');
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t('errors.storageFailed');
}
