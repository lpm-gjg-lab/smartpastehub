import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/pages/DashboardPage.module.css";
import { invokeIPC } from "../lib/ipc";
import { Button } from "../components/Button";
import type { AppSettings } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/constants";
import { useTranslation } from "react-i18next";

interface HistoryClip {
  id: number;
  cleaned_text: string;
  content_type: string;
  created_at: string;
}

interface UsageSummary {
  recentClips: HistoryClip[];
  totalPastes: number;
}

import { TYPE_ICONS } from "../types";

const STAT_ICONS: React.ReactNode[] = [
  <svg key="target" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>,
  <svg key="spark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3l2.2 5.1L19 10.2l-4.8 2.1L12 17.4l-2.2-5.1L5 10.2l4.8-2.1L12 3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>,
  <svg key="pin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8 3h8l-1.5 6 3 3v2H6v-2l3-3L8 3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 14v7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>,
  <svg key="bolt" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M13 2L5 13h6l-1 9 8-11h-6l1-9z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>,
];

const TOOL_ITEMS: Array<{
  icon: React.ReactNode;
  label: string;
  route: string;
  w: number;
  h: number;
}> = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="6" y="11" width="3" height="7" fill="currentColor" rx="1" />
        <rect x="11" y="8" width="3" height="10" fill="currentColor" rx="1" />
        <rect x="16" y="5" width="3" height="13" fill="currentColor" rx="1" />
      </svg>
    ),
    label: "AutoChart",
    route: "/auto-chart",
    w: 440,
    h: 600,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8 9h8M8 12h8M8 15h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    label: "QR Bridge",
    route: "/qr-bridge",
    w: 440,
    h: 560,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M3 12h18M12 3c2.5 2.2 3.7 5.1 3.7 9S14.5 18.8 12 21c-2.5-2.2-3.7-5.1-3.7-9S9.5 5.2 12 3z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
    label: "Web Clipper",
    route: "/web-clipper",
    w: 480,
    h: 640,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4v10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8 10l4 4 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="4"
          y="16"
          width="16"
          height="4"
          rx="1"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
    label: "Drag & Drop",
    route: "/drag-drop-zone",
    w: 440,
    h: 520,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 4h10l4 4v12H6z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M16 4v4h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9 13h6M9 16h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    label: "Template Form",
    route: "/template-form",
    w: 480,
    h: 560,
  },
];

export function ensureUTC(dateStr: string): string {
  if (!dateStr.endsWith("Z") && !dateStr.includes("+") && !dateStr.includes("-")) {
    return dateStr.replace(" ", "T") + "Z";
  }
  return dateStr;
}

const getGreeting = (t: (key: string) => string) => {
  const h = new Date().getHours();
  if (h < 12) return t("dashboard.greeting_morning");
  if (h < 17) return t("dashboard.greeting_afternoon");
  return t("dashboard.greeting_evening");
};

type QuickAction = "paste" | "history" | "settings";

interface DashboardPageProps {
  onQuickAction: (target: QuickAction) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onQuickAction,
}) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<UsageSummary>({
    recentClips: [],
    totalPastes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pasteHotkey, setPasteHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.pasteClean,
  );
  const [ghostWriteHotkey, setGhostWriteHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.ghostWrite,
  );
  const [translateHotkey, setTranslateHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.translateClipboard,
  );
  const [presetSwitchHotkey, setPresetSwitchHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.presetSwitch,
  );
  const [historyHotkey, setHistoryHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.historyOpen,
  );
  const [multiCopyHotkey, setMultiCopyHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.multiCopy,
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await invokeIPC<UsageSummary>("usage:summary");
        if (active && data) {
          setSummary({
            recentClips: data.recentClips ?? [],
            totalPastes: data.totalPastes ?? 0,
          });
        }

        const settings = await invokeIPC<AppSettings>("settings:get");
        if (active) {
          setPasteHotkey(
            settings?.hotkeys?.pasteClean ||
              DEFAULT_SETTINGS.hotkeys.pasteClean,
          );
          setGhostWriteHotkey(
            settings?.hotkeys?.ghostWrite ||
              DEFAULT_SETTINGS.hotkeys.ghostWrite,
          );
          setTranslateHotkey(
            settings?.hotkeys?.translateClipboard ||
              DEFAULT_SETTINGS.hotkeys.translateClipboard,
          );
          setPresetSwitchHotkey(
            settings?.hotkeys?.presetSwitch ||
              DEFAULT_SETTINGS.hotkeys.presetSwitch,
          );
          setHistoryHotkey(
            settings?.hotkeys?.historyOpen ||
              DEFAULT_SETTINGS.hotkeys.historyOpen,
          );
          setMultiCopyHotkey(
            settings?.hotkeys?.multiCopy || DEFAULT_SETTINGS.hotkeys.multiCopy,
          );
        }
      } catch {
        if (active) setSummary({ recentClips: [], totalPastes: 0 });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const topTypes = useMemo(() => {
    const count = new Map<string, number>();
    for (const clip of summary.recentClips) {
      count.set(clip.content_type, (count.get(clip.content_type) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [summary.recentClips]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return summary.recentClips.filter(
      (c) => new Date(ensureUTC(c.created_at)).toDateString() === today,
    ).length;
  }, [summary.recentClips]);

  // Weekly activity: last 7 days, indexed 0=oldest … 6=today
  const weeklyActivity = useMemo(() => {
    const days: number[] = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    for (const clip of summary.recentClips) {
      const d = new Date(ensureUTC(clip.created_at));
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / 86_400_000);
      if (diffDays >= 0 && diffDays < 7) {
        days[6 - diffDays] = (days[6 - diffDays] ?? 0) + 1;
      }
    }
    return days;
  }, [summary.recentClips]);

  const recentPreview = useMemo(
    () =>
      summary.recentClips.slice(0, 8).map((clip) => ({
        ...clip,
        shortText:
          clip.cleaned_text.length > 64
            ? `${clip.cleaned_text.slice(0, 64)}…`
            : clip.cleaned_text,
      })),
    [summary.recentClips],
  );

  const stats = [
    {
      icon: STAT_ICONS[0]!,
      value: summary.totalPastes,
      label: t("dashboard.stats_total_pastes"),
      unit: t("dashboard.stats_all_time"),
    },
    {
      icon: STAT_ICONS[1]!,
      value: todayCount,
      label: t("dashboard.stats_today"),
      unit: t("dashboard.stats_clean_pastes"),
    },
    {
      icon: STAT_ICONS[2]!,
      value: topTypes[0]?.[0]?.replace(/_/g, " ") ?? "—",
      label: t("dashboard.stats_top_type"),
      unit: t("dashboard.stats_items", { count: topTypes[0]?.[1] ?? 0 }),
    },
    {
      icon: STAT_ICONS[3]!,
      value: summary.recentClips.length,
      label: t("dashboard.stats_recent_window"),
      unit: t("dashboard.stats_last_clips"),
    },
  ];

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{getGreeting(t)} 👋</h1>
            <div className={styles.subtitle}>
              <span className={`${styles.statusDot} ${styles.dotActive}`} />
              <span>{t("dashboard.loading_analytics")}</span>
            </div>
          </div>
        </div>
        <div className={styles.skeletonStatsRow}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={styles.skeletonStatCard}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonPanel} />
          <div className={styles.skeletonPanel} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{getGreeting(t)} 👋</h1>
          <div className={styles.subtitle}>
            <span className={`${styles.statusDot} ${styles.dotActive}`} />
            <span>
              {t("dashboard.recent_clips_tracked", {
                count: summary.recentClips.length,
              })}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onQuickAction("paste")}
          >
            {t("dashboard.quick_paste")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onQuickAction("history")}
          >
            {t("dashboard.open_history")}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsRow}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={styles.statCard}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statUnit}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Recent Clips */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>{t("dashboard.recent_clips")}</h2>
            <span className={styles.panelCount}>{recentPreview.length}</span>
          </div>
          <div className={styles.clipList}>
            {recentPreview.length === 0 ? (
              <div className={styles.emptyHint}>
                <div className={styles.emptyIcon}>📋</div>
                {t("dashboard.no_clips_yet")}
              </div>
            ) : (
              recentPreview.map((clip) => (
                <div key={clip.id} className={styles.clipRow}>
                  <div className={styles.clipTypeIcon}>
                    {TYPE_ICONS[clip.content_type] ?? "📄"}
                  </div>
                  <div className={styles.clipContent}>
                    <span className={styles.clipText}>{clip.shortText}</span>
                    <span className={styles.clipTime}>
                      {new Date(ensureUTC(clip.created_at)).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Content Types */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              {t("dashboard.content_types")}
            </h2>
            <button
              type="button"
              className={styles.panelAction}
              onClick={() => onQuickAction("settings")}
            >
              ⚙️ {t("dashboard.tune")}
            </button>
          </div>
          <div className={styles.chartArea}>
            {topTypes.length === 0 ? (
              <div className={styles.emptyHint}>
                <div className={styles.emptyIcon}>📊</div>
                {t("dashboard.no_type_data")}
              </div>
            ) : (
              topTypes.map(([type, value]) => {
                const max = topTypes[0]?.[1] ?? 1;
                const width = Math.max(6, Math.round((value / max) * 100));
                return (
                  <div key={type} className={styles.chartRow}>
                    <span className={styles.chartLabel}>
                      {type.replace(/_/g, " ")}
                    </span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.bar}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className={styles.chartValue}>{value}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Weekly Activity */}
      <section className={styles.activitySection}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{t("dashboard.activity_7d")}</h2>
          <span className={styles.panelCount}>
            {t("dashboard.clips_count", { count: summary.recentClips.length })}
          </span>
        </div>
        <div className={styles.activityBars}>
          {weeklyActivity.map((count, i) => {
            const max = Math.max(1, ...weeklyActivity);
            const heightPct = Math.max(4, Math.round((count / max) * 100));
            const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const today = new Date().getDay(); // 0=Sun…6=Sat
            // index 6 = today, index 0 = 6 days ago
            const dayIdx = (today - (6 - i) + 7) % 7;
            const label = dayLabel[dayIdx] ?? "";
            return (
              <div key={label} className={styles.activityBarCol}>
                <span className={styles.activityCount}>
                  {count > 0 ? count : ""}
                </span>
                <div className={styles.activityBarTrack}>
                  <div
                    className={`${styles.activityBar} ${i === 6 ? styles.activityBarToday : ""}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`${styles.activityLabel} ${i === 6 ? styles.activityLabelToday : ""}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tools Launcher */}
      <section className={styles.toolsSection}>
        <div className={styles.toolsHeader}>
          <h2 className={styles.panelTitle}>{t("dashboard.tools")}</h2>
          <span className={styles.panelCount}>5</span>
        </div>
        <div className={styles.toolsGrid}>
          {TOOL_ITEMS.map(({ icon, label, route, w, h }) => (
            <button
              key={route}
              type="button"
              className={styles.toolBtn}
              onClick={() =>
                invokeIPC("window:open", { route, width: w, height: h })
              }
            >
              <span className={styles.toolBtnIcon}>{icon}</span>
              <span className={styles.toolBtnLabel}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Hotkey Cheatsheet */}
      <section className={styles.cheatsheetSection}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            {t("dashboard.keyboard_shortcuts")}
          </h2>
        </div>
        <div className={styles.cheatsheetGrid}>
          {[
            {
              keys: pasteHotkey,
              desc: t("dashboard.shortcut_smart_paste"),
            },
            {
              keys: ghostWriteHotkey,
              desc: t("dashboard.shortcut_ghost_write"),
            },
            { keys: translateHotkey, desc: t("dashboard.shortcut_translate") },
            {
              keys: presetSwitchHotkey,
              desc: t("dashboard.shortcut_cycle_ai_mode"),
            },
            { keys: historyHotkey, desc: t("dashboard.shortcut_history_ring") },
            { keys: multiCopyHotkey, desc: t("dashboard.shortcut_multi_copy") },
          ].map(({ keys, desc }) => (
            <div key={keys} className={styles.cheatRow}>
              <kbd className={styles.kbd}>{keys}</kbd>
              <span className={styles.cheatDesc}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Hint */}
      <div className={styles.hint}>
        <span className={styles.hintIcon}>💡</span>
        {t("dashboard.tip")}
      </div>
    </div>
  );
};
