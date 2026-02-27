# SmartPasteHub — Toast & Popup Improvement Plan

## Phase 1: Accessibility Fixes (Critical)
- [ ] Fix FloatingWindowShell accessibility (role, focus trap, Escape key)
- [ ] Fix ToastApp floating toast accessibility (ARIA, keyboard, Escape)
- [ ] Fix Onboarding modal accessibility (dialog role, auto-focus, focus trap)
- [ ] Add aria-label to all close buttons ("✕")
- [ ] Wire up `#sr-announcer` for screen reader announcements

## Phase 2: Toast UX Improvements
- [ ] Eliminate triple notification (OS + Toast + Floating) → single mechanism
- [ ] Add toast stacking limit (max 3 visible)
- [ ] Add Undo action on "Deleted" toast
- [ ] Add pause-on-hover for toast auto-dismiss timer

## Phase 3: Missing Toasts
- [ ] Add "Clipboard Auto-Cleared" toast
- [ ] Add "Sync Connected" / "Sync Disconnected" toast
- [ ] Add "Clipboard Received from [Device]" toast
- [ ] Add "AI Rewrite Complete" toast
- [ ] Add "Plugin Activated" / "Plugin Failed" toast
- [ ] Add "Multi-Copy: Collecting..." and "Queue: N items" toasts

## Phase 4: Feature Accessibility via Toast/Popup
- [ ] Add "💾 Save as Snippet" button to Floating Toast for all content types
- [ ] Add Multi-Clipboard indicator toast ("Collecting... 3/10 items")
- [ ] Add Format Converter buttons to Floating Toast (JSON↔YAML↔TOML)
- [ ] Add Paste Queue indicator toast ("Queue: 5 items, next: ...")
- [ ] Implement OCR Capture popup and backend integration
- [ ] Add missing AI Action buttons to Floating Toast (Fix Grammar, Rephrase, Formalize)

## Phase 5: ToastActionBar Polish
- [ ] Add descriptive aria-labels to all action buttons
- [ ] Add aria-busy state during AI loading
- [ ] Add keyboard shortcuts (1-9) for quick actions
- [ ] Support prefers-reduced-motion for animations

## Phase 6: Verification
- [ ] Run accessibility checks on all modified components
- [ ] Test keyboard-only navigation through all toast/popup flows
- [ ] Verify screen reader announces all toasts correctly
- [ ] Test new toast actions (Save Snippet, Convert Format, Queue indicator)
