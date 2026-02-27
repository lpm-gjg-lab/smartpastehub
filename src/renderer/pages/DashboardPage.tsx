import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/pages/DashboardPage.module.css";
import { invokeIPC } from "../lib/ipc";
import { Button } from "../components/Button";

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

const TYPE_ICONS: Record<string, string> = {
  plain_text: "📄",
  pdf_text: "📋",
  source_code: "💻",
  json_data: "{}",
  csv_table: "📊",
  tsv_table: "📊",
  html_table: "🗂️",
  url_text: "🔗",
  email_text: "✉️",
  address: "📍",
  date_text: "📅",
  phone_number: "📞",
  math_expression: "🧮",
  color_code: "🎨",
  path_text: "📁",
  md_text: "Ⓜ️",
  text_with_links: "🔗",
  yaml_data: "⚙️",
  toml_data: "⚙️",
};

const STAT_ICONS = ["🎯", "✨", "📌", "⚡"];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

type QuickAction = "paste" | "history" | "settings";

interface DashboardPageProps {
  onQuickAction: (target: QuickAction) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onQuickAction }) => {
  const [summary, setSummary] = useState<UsageSummary>({ recentClips: [], totalPastes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await invokeIPC<UsageSummary>("usage:summary");
        if (active && data) {
          setSummary({ recentClips: data.recentClips ?? [], totalPastes: data.totalPastes ?? 0 });
        }
      } catch {
        if (active) setSummary({ recentClips: [], totalPastes: 0 });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
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
      (c) => new Date(c.created_at).toDateString() === today
    ).length;
  }, [summary.recentClips]);

  // Weekly activity: last 7 days, indexed 0=oldest … 6=today
  const weeklyActivity = useMemo(() => {
    const days: number[] = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    for (const clip of summary.recentClips) {
      const d = new Date(clip.created_at);
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / 86_400_000);
      if (diffDays >= 0 && diffDays < 7) {
        days[6 - diffDays] = (days[6 - diffDays] ?? 0) + 1;
      }
    }
    return days;
  }, [summary.recentClips]);

  const recentPreview = useMemo(
    () => summary.recentClips.slice(0, 8).map((clip) => ({
      ...clip,
      shortText: clip.cleaned_text.length > 64
        ? `${clip.cleaned_text.slice(0, 64)}…`
        : clip.cleaned_text,
    })),
    [summary.recentClips]
  );

  const stats = [
    { icon: STAT_ICONS[0]!, value: summary.totalPastes, label: "Total Pastes", unit: "all time" },
    { icon: STAT_ICONS[1]!, value: todayCount, label: "Today", unit: "clean pastes" },
    { icon: STAT_ICONS[2]!, value: topTypes[0]?.[0]?.replace(/_/g, " ") ?? "—", label: "Top Type", unit: `${topTypes[0]?.[1] ?? 0} items` },
    { icon: STAT_ICONS[3]!, value: summary.recentClips.length, label: "Recent Window", unit: "last 50 clips" },
  ];

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{getGreeting()} 👋</h1>
            <div className={styles.subtitle}>
              <span className={`${styles.statusDot} ${styles.dotActive}`} />
              <span>Loading analytics…</span>
            </div>
          </div>
        </div>
        <div className={styles.skeletonStatsRow}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonStatCard} style={{ animationDelay: `${i * 80}ms` }} />
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
          <h1 className={styles.title}>{getGreeting()} 👋</h1>
          <div className={styles.subtitle}>
            <span className={`${styles.statusDot} ${styles.dotActive}`} />
            <span>
              {`${summary.recentClips.length} recent clips tracked`}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button size="sm" variant="primary" onClick={() => onQuickAction("paste")}>
            Quick Paste
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onQuickAction("history")}>
            Open History
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsRow}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statCard} style={{ animationDelay: `${i * 50}ms` }}>
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
            <h2 className={styles.panelTitle}>Recent Clips</h2>
            <span className={styles.panelCount}>{recentPreview.length}</span>
          </div>
          <div className={styles.clipList}>
            {recentPreview.length === 0 ? (
              <div className={styles.emptyHint}>
                <div className={styles.emptyIcon}>📋</div>
                No clips yet. Start with Smart Paste.
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
                      {new Date(clip.created_at).toLocaleTimeString([], {
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
            <h2 className={styles.panelTitle}>Content Types</h2>
            <button
              type="button"
              className={styles.panelAction}
              onClick={() => onQuickAction("settings")}
            >
              ⚙️ Tune
            </button>
          </div>
          <div className={styles.chartArea}>
            {topTypes.length === 0 ? (
              <div className={styles.emptyHint}>
                <div className={styles.emptyIcon}>📊</div>
                No type data yet.
              </div>
            ) : (
              topTypes.map(([type, value]) => {
                const max = topTypes[0]?.[1] ?? 1;
                const width = Math.max(6, Math.round((value / max) * 100));
                return (
                  <div key={type} className={styles.chartRow}>
                    <span className={styles.chartLabel}>{type.replace(/_/g, " ")}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.bar} style={{ width: `${width}%` }} />
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
          <h2 className={styles.panelTitle}>7-Day Activity</h2>
          <span className={styles.panelCount}>{summary.recentClips.length} clips</span>
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
              <div key={i} className={styles.activityBarCol}>
                <span className={styles.activityCount}>{count > 0 ? count : ""}</span>
                <div className={styles.activityBarTrack}>
                  <div
                    className={`${styles.activityBar} ${i === 6 ? styles.activityBarToday : ""}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={`${styles.activityLabel} ${i === 6 ? styles.activityLabelToday : ""}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </section>


      {/* Tools Launcher */}
      <section className={styles.toolsSection}>
        <div className={styles.toolsHeader}>
          <h2 className={styles.panelTitle}>Tools</h2>
          <span className={styles.panelCount}>5</span>
        </div>
        <div className={styles.toolsGrid}>
          {([
            { icon: "📊", label: "AutoChart", route: "/auto-chart", w: 440, h: 600 },
            { icon: "📷", label: "QR Bridge", route: "/qr-bridge", w: 440, h: 560 },
            { icon: "🌐", label: "Web Clipper", route: "/web-clipper", w: 480, h: 640 },
            { icon: "📥", label: "Drag & Drop", route: "/drag-drop-zone", w: 440, h: 520 },
            { icon: "📝", label: "Template Form", route: "/template-form", w: 480, h: 560 },
          ] as const).map(({ icon, label, route, w, h }) => (
            <button
              key={route}
              type="button"
              className={styles.toolBtn}
              onClick={() => invokeIPC("window:open", { route, width: w, height: h })}
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
          <h2 className={styles.panelTitle}>Keyboard Shortcuts</h2>
        </div>
        <div className={styles.cheatsheetGrid}>
          {([
            { keys: "Ctrl+Shift+V", desc: "Smart Paste (text or image→OCR)" },
            { keys: "Ctrl+Alt+G",   desc: "Ghost Write" },
            { keys: "Ctrl+Alt+T",   desc: "Translate" },
            { keys: "Ctrl+Alt+P",   desc: "Cycle AI Mode" },
            { keys: "Ctrl+Alt+H",   desc: "History Ring" },
            { keys: "Ctrl+Alt+C",   desc: "Multi-Copy" },
          ]).map(({ keys, desc }) => (
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
        Tip: Use Dashboard for trend checks, then jump to History for detailed actions.
      </div>
    </div>
  );
};
