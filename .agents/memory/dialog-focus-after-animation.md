---
name: Dialog focus after animation
description: Timing considerations for browser assertions on Radix dialog focus restoration.
---

When checking that a Radix dialog returns focus to its trigger, wait until the dialog's close autofocus runs after the exit transition rather than asserting focus immediately after the close button click.

**Why:** The guided-trial dialog animates on close, so the immediate post-click active element can still be inside the closing overlay even though the application restores focus correctly.

**How to apply:** In browser tests for animated dialogs, poll for the expected trigger to become `document.activeElement`; keep the assertion bounded by the test timeout.