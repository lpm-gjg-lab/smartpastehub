import { Menu, Tray, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

export function createTray(
  onOpenSettings: () => void,
  onOpenHistory: () => void,
): Tray {
  const iconPath = path.join(__dirname, '../../assets/tray/icon.png');
  const icon = fs.existsSync(iconPath) ? iconPath : nativeImage.createEmpty();
  const tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Preset: Plain Text', type: 'radio', checked: true },
    { label: 'Preset: Keep Structure', type: 'radio' },
    { type: 'separator' },
    { label: 'Multi-Clipboard: OFF', enabled: false },
    { label: 'Paste Queue: 0 items', enabled: false },
    { type: 'separator' },
    { label: 'Settings', click: onOpenSettings },
    { label: 'History', click: onOpenHistory },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip('Smart Paste Hub');
  return tray;
}
