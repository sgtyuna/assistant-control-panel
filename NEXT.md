# What's next

## Right now — Katie

Stage A is built. Look it over, then say OK (or what to change) before Stage B starts.

- [ ] Open it on your Mac: in Terminal, go to this folder and run `python3 -m http.server 8791`, then open http://localhost:8791
- [ ] Pick a home screen on the first-open page
- [ ] Tap **Turn on Demo mode** to see the three screens with sample data
- [ ] Look at Needs your OK, Assistants and Activity (try the Activity filters)
- [ ] In **More**, change the home screen and turn Demo mode off again
- [ ] Tell Claude: OK for Stage B, or what to change

## Questions for Katie

- [ ] **Phone link.** GitHub Pages from a private repo needs a paid GitHub plan. Choose one: make the GitHub copy public (safe: the code ships empty and the sample data is made up), or pay for GitHub Pro, or host the link somewhere else.
- [ ] **Name.** "Assistant Control Panel" is a placeholder. Keep it or pick another?
- [ ] **Starting picks.** Keep the rule order (blocked, then paused, then approve-first, then trusted) and the other starting picks, or change any before Stage B?

## What works in Stage A

- First open asks which of the three home screens to use, with a small preview of each. No default.
- The three home screens, showing Demo data: Needs your OK, Assistants, Activity.
- Activity filters: by assistant, by kind, flagged only.
- Demo mode on and off, clearly marked. Sample data never enters your information.
- The home screen choice and Demo mode on/off are remembered between visits.
- Friendly empty states when Demo mode is off.

## What does not work yet (shown in place, but they do nothing)

- OK and No
- Pause Everything
- Each assistant's pause switch
- Add your own assistant
- Tapping an assistant card to see its detail

Tapping one shows a short note saying it starts working in the next stage.

## Next: Stage B

- [ ] OK, No, Pause Everything, each pause switch, Undo
- [ ] Assistant detail: limits, approve-first rules, trusted and blocked lists, quiet hours, access that expires
- [ ] Money, Weekly summary, Settings
- [ ] Phone alerts shown inside the app
- [ ] Entering your own assistants, actions and requests
- [ ] Saving your information to one file and loading it back (switched off in Demo mode)
- [ ] Reset Demo mode back to the starting sample data
- [ ] The full list of checks from the build prompt

## After Stage B (not in version 1)

A real activity log, real limits and a real off switch, real phone alerts, the iPhone app, family mode.

## Notes

- Built with plain web files (no installs, no build step), with the option to move to React later.
- Your information is kept in the browser's local storage. A browser can clear that storage, so the save-to-file feature in Stage B is the real backup.
- The Forge repo is the main copy. GitHub (sgtyuna/assistant-control-panel) is the mirror.
