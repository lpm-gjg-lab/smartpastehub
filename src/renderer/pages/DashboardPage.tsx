import React from 'react';
import styles from '../styles/pages/DashboardPage.module.css';

const BEFORE_TEXT = `Text with    extra
spaces & some weird
characters....  \\n
 In and line breaks! \\n
\\n
[LINK: http://example.com/
dirty-url?tracker=123]`;

const AFTER_TEXT = `Text with extra spaces &
some weird characters...
and line breaks!

[LINK: http://example.co
m/dirty-url]`;

const RECENT_CLIPS = [
    { id: 1, text: 'Meeting notes from 10:00 AM...', time: '2 min' },
    { id: 2, text: 'function calculateTotal(a, b) {...', time: '10 min' },
    { id: 3, text: 'https://www.smartpastehub.com/docs', time: '1 hr' },
];

const AI_SUGGESTIONS = [
    { id: 1, text: 'Summarized: Project proposal for Q4, including budget estimates and timeline.' },
    { id: 2, text: 'Email Signature – Professional' },
];

export const DashboardPage: React.FC = () => {
    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.dashHeader}>
                <h1 className={styles.dashTitle}>Smart Paste Hub</h1>
                <button className={styles.searchBtn} aria-label="Search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>
            </div>

            {/* Quick Clean */}
            <div className={styles.quickClean}>
                <div className={styles.quickCleanTitle}>Quick Clean</div>
                <div className={styles.cleanPanels}>
                    {/* Before */}
                    <div className={styles.cleanPanel}>
                        <div className={styles.panelLabel}>Before</div>
                        <div className={styles.panelContent}>{BEFORE_TEXT}</div>
                    </div>

                    {/* Center Button */}
                    <div className={styles.cleanAction}>
                        <button className={styles.cleanBtn} aria-label="Auto Clean on Paste">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10" />
                                <polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                            </svg>
                            <span>Auto-Clean{'\n'}on Paste</span>
                        </button>
                    </div>

                    {/* After */}
                    <div className={styles.cleanPanel}>
                        <div className={styles.panelLabel}>After</div>
                        <div className={styles.panelContent}>{AFTER_TEXT}</div>
                    </div>
                </div>
            </div>

            {/* Bottom Panels */}
            <div className={styles.bottomGrid}>
                {/* Recent Clips */}
                <div className={styles.bottomPanel}>
                    <div className={styles.panelHeader}>
                        <span className={styles.panelTitle}>Recent Clips</span>
                        <button style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', fontSize: '0.6875rem', cursor: 'pointer' }}>
                            View all →
                        </button>
                    </div>
                    <div className={styles.clipList}>
                        {RECENT_CLIPS.map((clip) => (
                            <div key={clip.id} className={styles.clipItem}>
                                <div className={styles.clipIcon}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <span className={styles.clipText}>{clip.text}</span>
                                <span className={styles.clipTime}>{clip.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Suggestions */}
                <div className={styles.bottomPanel}>
                    <div className={styles.panelHeader}>
                        <span className={styles.panelTitle}>AI Suggestions</span>
                    </div>
                    <div className={styles.clipList}>
                        {AI_SUGGESTIONS.map((sug) => (
                            <div key={sug.id} className={styles.suggestionItem}>
                                <div className={styles.suggestionIcon}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                    </svg>
                                </div>
                                <span>{sug.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
