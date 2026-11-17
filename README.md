# Assistant Control Panel

One place to see what each AI assistant did, cap what it can spend, and switch it off.

This is version 1: a clickable mock-up. Nothing connects to a real assistant, account, card or login.

**Where things stand and what comes next: see [NEXT.md](NEXT.md).**

## How it is put together

Three things are kept apart and never mixed:

| What | Where it lives |
| --- | --- |
| The app (an empty shell) | `index.html`, `css/`, `js/`. No assistant, limit, rule or name is written in the code. |
| Your information | The browser's local storage on your device. Never in this repo. |
| Sample data | `data/demo.json`. Shown only in Demo mode, which is clearly marked. |

- `js/store.js` is the only file that reads or writes stored information. Real connections can replace it later.
- `js/logic.js` holds the sums and rules, with no screen code.
- `js/views/` holds one file per screen.

It is plain web files with no build step, so it can be wrapped as an iPhone app later, or the screens can be moved to a framework such as React while `store.js`, `logic.js` and the saved-file format stay the same.

## Open it on this computer

In Terminal, from this folder:

```
python3 -m http.server 8791
```

Then open http://localhost:8791 in a browser.

## Run the checks

```
node scripts/check.mjs
node tests/browser.test.mjs
```

The second one opens the real app in a test browser and needs Playwright once (see the top of that file).
