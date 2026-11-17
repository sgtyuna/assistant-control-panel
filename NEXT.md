# What's next

## Right now — Katie

Version 1 (the clickable mock-up) is built. Try it, then say what to change.

- [ ] Open it on your computer or phone: https://sgtyuna.github.io/assistant-control-panel/
- [ ] On your phone, add it to the home screen: in Safari tap Share, then **Add to Home Screen**
- [ ] Tap **Turn on Demo mode** (or Settings → Demo mode) and try everything on the sample data: OK and No, Pause Everything, a pause switch, Undo, an assistant's limits and rules
- [ ] Turn Demo mode off and add an assistant of your own. Use **Add by hand** to add something it did, since nothing is connected yet
- [ ] In Settings, tap **Save a copy to a file** once you have entered anything you want to keep
- [ ] Answer the questions below

## Questions for Katie

- [ ] **Name.** "Assistant Control Panel" is a placeholder. Keep it or pick another?
- [ ] **What "trusted" does.** Because approve-first beats trusted, a trusted store still has to ask when a limit or an "over $25" rule applies. So trusted only means "never treated as someone new". Is that what you want?
- [ ] **What can be undone.** A by-hand action can be undone only if you pick a time (1, 7 or 30 days) when adding it. Emails can never be undone, so the undo choice is switched off for them. OK?
- [ ] **Budgets do not stop anything.** Going over a category budget is marked on the Money screen, but it does not make an assistant ask. Only spending limits and rules do. OK?
- [ ] **"It already happened" skips the rules.** In Add by hand, the choice "It already happened: put it straight in Activity" records the action without asking your rules, even for a blocked store, so the record matches what really took place. Keep that, or should a blocked store still be marked blocked?
- [ ] **Access is shown, not enforced.** "What it can reach" lists email, calendar and cards and shuts off expiring access by itself, but an assistant with no card listed can still be given a purchase by hand. Should missing access block it?

## What version 1 does

- First open asks which of three home screens to use. No default. Change it in Settings.
- **Needs your OK**: each request with its assistant, cost and why it asked. OK and No.
- **Assistants**: a card each, with a pause switch, spending against its limit, and its last action. To add one, tap **Add your own**, tap a name (or type any name), then **Add assistant**.
- **Assistant detail**: limits, approve-first rules, trusted and blocked lists, what it can reach, access that expires, quiet hours, history, rename, remove.
- **Activity**: everything, newest first, with filters. The Undo tab lists what can still be undone and by when.
- **Money**: totals, budget by category (add, rename, remove), subscriptions with the next charge date.
- **Weekly summary**: what each assistant did and spent, Sunday through Saturday.
- **Alerts**: phone alerts shown inside the app (the bell at the top).
- **Pause Everything** on every screen. Resuming puts each assistant back as it was.
- **Settings**: home screen, quiet hours for all, add or remove an assistant, save and load your information, erase it, Demo mode and reset.
- Your information is kept in the browser's local storage, apart from the app and apart from the sample data. Saving a copy is switched off in Demo mode.

## After version 1 (not built)

- [ ] A real activity log, where assistants go through a gateway so each action is recorded
- [ ] Real limits and a real off switch (a virtual card per assistant; Google or Microsoft account permissions)
- [ ] Real phone alerts, then the iPhone app
- [ ] Family mode

## Notes

- Built with plain web files (no installs, no build step). The rules live in `js/logic.js` and `js/ops.js` with no screen code, and storage lives only in `js/store.js`, so the screens can move to React later, or real connections can replace the storage, without redoing the rules.
- A browser can clear local storage. The saved file is the real backup. It is one JSON file with a version number (now 2); newer versions of the app open older files, and an older app says plainly when a file is too new.
- Checks: `node --test tests/rules.test.mjs` (the behaviour rules), `node scripts/check.mjs` (sample data, sums, times, storage warnings) and `node tests/browser.test.mjs` (the real app in a browser at phone and computer size; needs Playwright once, see the top of that file). The first two run by themselves on every pull request.
- The names offered when adding an assistant live in `data/assistant-names.json`. To offer another name, add it to that list; nothing in the app's code changes.
- Starting picks are settled (Nov 16): rules go blocked, then paused, then approve-first, then trusted; weeks run Sunday through Saturday.
- The Forge repo is the main copy. GitHub (sgtyuna/assistant-control-panel) is the public mirror, and the link above is served from its main branch, so the link updates about a minute after each mirror.
- Your information stays in the browser you use. The phone and the computer each keep their own; use Save a copy and Load a saved copy to move it between them.
- To run it without the internet: in Terminal, go to this folder, run `python3 -m http.server 8791`, then open http://localhost:8791
