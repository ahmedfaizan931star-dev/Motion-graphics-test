# Claude Code — Motion Graphics Explainer

A fully animated, 65-second motion graphics video built for talking-head overlay. No video editor, no After Effects — it's a single HTML file that animates itself, and GitHub Actions turns it into an MP4 for free.

This was built to explain **Claude Code**, but the whole system — the prompt, the file structure, the render pipeline — is reusable for literally any topic. Swap the topic, run the prompt again, get a new video.

---

## What's actually in this repo

```
index.html                      → the entire video. Open it in a browser and it plays.
capture.mjs                     → turns index.html into output.mp4 (frame-by-frame capture + ffmpeg)
.github/workflows/render.yml    → runs capture.mjs on GitHub's servers, for free, on every push
README.md                       → you are here
```

That's it. Three real files. No `node_modules` committed, no build step you need to run yourself — GitHub Actions does the heavy lifting.

---

## How it works (the short version)

`index.html` is a self-contained animation: CSS keyframes + the Web Animations API drive every scene on a timeline, all scripted in plain JavaScript at the bottom of the file. Open it in any browser and it just plays, start to finish, on its own — no clicking, no interaction.

The problem is: a browser playing an animation isn't a video file. That's what `capture.mjs` is for. It:

1. Opens `index.html` in a headless (invisible) Chrome browser
2. Uses a Chrome DevTools trick called **virtual time** to fast-forward through the animation's 65 seconds without actually waiting 65 real seconds
3. Takes a screenshot every 1/30th of a second (30fps)
4. Hands all those screenshots to **ffmpeg**, which stitches them into `output.mp4`

You never have to run any of this on your phone. `render.yml` tells GitHub: "every time `index.html` or `capture.mjs` changes on `main`, do all of the above on your own servers, and hand me back the finished MP4." That's the whole point of doing it this way — zero local compute, zero cost (GitHub Actions is free for public repos, and even private repos get 2,000 free minutes a month, and this render doesn't come close to using them).

---

## Running it — step by step

1. Push `index.html`, `capture.mjs`, and the `.github/workflows/render.yml` folder to your repo's `main` branch (all three, keeping the folder structure — `.github/workflows/render.yml` has to stay nested exactly like that, GitHub only recognizes workflows in that exact path).
2. Go to your repo on GitHub (or the GitHub mobile app) → **Actions** tab.
3. You'll see **"Render motion graphics to MP4"** in the sidebar. Either:
   - It already started automatically because you pushed a change to `index.html` or `capture.mjs`, or
   - Click into it → **Run workflow** button → run it manually.
4. Wait. The log will print lines like `captured frame 450/1950 (38.2s elapsed)` so you can watch it actually making progress instead of staring at a blank screen.
5. When it finishes (green checkmark), click into the run → scroll down to **Artifacts** → download `claude-code-explainer-mp4`. That's your video.

**If it fails (red X):** click into the run and read the log — don't just assume it silently didn't work. If the render step itself failed partway, there's also a `debug-frames` artifact with whatever frames it managed to capture before dying, which is useful for figuring out where it broke.

**If it's still slow:** the workflow's `timeout-minutes` is set generously (30 min) specifically so a merely-slow render doesn't get killed while it's still working. GitHub Actions runners can vary in speed. If it's consistently taking a very long time, the honest fix is lowering the frame rate in `capture.mjs` (drop `FPS` from 30 to 24 — still looks smooth, cuts total frame count by 20%) rather than fighting for more timeout headroom.

---

## Editing the video

Everything lives in `index.html`. It's organized in clearly labeled sections:

- **CSS variables at the top** (`--charcoal`, `--orange`, etc.) — change these to reskin the whole thing's colors in one place.
- **Scene sections** (`<section class="scene" id="s1">` through `s7`) — each one is a screen/beat of the video. Text, icons, and layout live here.
- **The `<script>` at the bottom** — this is the timeline. Every `fadeUp(...)`, `fadeIn(...)`, and `sceneIn(...)/sceneOut(...)` call has a `delay` in milliseconds, which is literally the timestamp in the video that thing appears. Change the number, change when it happens.

After editing, just open `index.html` directly in a desktop browser to preview instantly — no need to run the full render pipeline just to check how something looks. Only push to GitHub (which triggers the actual MP4 render) once you're happy with how it looks live in the browser.

---

## The reusable prompt

This is the actual prompt that produced this project. It's written to be topic-agnostic — swap out the bracketed parts for whatever you're explaining next (a new app, a feature, a concept, anything), paste the whole thing to Claude in one message, and it'll go through the same process: ask a couple of quick preference questions, plan a scene-by-scene storyboard, build the animated HTML, verify it actually renders correctly, and hand you back a working GitHub Actions pipeline plus this same kind of README.

Copy everything inside the box below:

```
I want a fully animated motion graphics explainer video, built to be used
as an overlay alongside a talking-head video of me.

TOPIC: [describe what this video should explain — e.g. "a new app called
X that does Y", "how [concept] works", "our product's onboarding flow"]

Build it as a single self-contained HTML file (CSS + JavaScript animation,
Web Animations API and/or CSS keyframes) — no video editor, no external
video assets. It should autoplay on its own the moment it's opened in a
browser, start to finish, no clicks needed.

Requirements:
- Aspect ratio 16:9, target resolution 1920x1080
- Length: roughly 60-90 seconds
- Default to graphics, icons, and motion over walls of text. Use real
  text on screen only for definitions, labels, or short key phrases —
  never paragraphs.
- Wherever it's natural, recreate the actual interface/UI of the thing
  being explained (a terminal, an app screen, a dashboard) rather than
  abstract shapes — it should look like the real product, not a generic
  stock-animation template.
- Reserve blank space for a talking-head video overlay: alternate between
  leaving the right third empty and leaving the top third empty,
  depending on what fits each scene. Some scenes can go full-screen with
  no reserved space at all if the moment calls for it (a big reveal, a
  logo, a CTA).
- Visual style: [describe it, e.g. "dark mode, terminal aesthetic" / "our
  brand colors: [hex codes]" / "clean and minimal, light background"]
- Before building, plan a scene-by-scene storyboard/beat sheet (timestamp
  → what's on screen → what's reserved for the talking head) and show it
  to me before writing the full animation, so I can sanity-check the
  pacing first.

Once the storyboard looks right, build the full HTML file.

Then set up a free rendering pipeline so I can turn it into an actual
MP4 without needing a video editor or a laptop:
- A Node.js script using Playwright (headless Chrome) + ffmpeg that
  captures the HTML animation frame-by-frame and stitches it into an
  MP4 — verify this script actually works by testing it yourself before
  handing it to me, don't just hand me untested code
- A GitHub Actions workflow file (.github/workflows/render.yml) that
  runs that script automatically on GitHub's own servers whenever I push
  changes, so rendering costs me nothing and doesn't need my own
  machine's compute at all
- Package the final HTML file, the capture script, and the workflow file
  together, and explain clearly how to push them and where to download
  the finished video from once it renders

Finally, write a clear, human-sounding README.md explaining what
everything is, how to run it, how to edit the video afterward, and
include this exact prompt inside the README (formatted so I can copy
it and reuse it for a different topic later) so I don't have to
re-explain all of this from scratch next time.

Optimize your approach for Claude Sonnet — keep the storyboard and
architecture decisions clear and well-reasoned up front, verify your
own work with real tests before calling anything done, and be upfront
with me about anything you genuinely couldn't verify rather than just
asserting it works.
```

A few notes on using this prompt again:

- The **TOPIC** and **visual style** lines are the only two things you really need to change most of the time.
- If you already have brand colors or an existing style guide, paste the hex codes directly into the visual style line — you'll get a much more on-brand result than describing it in words.
- If the topic has a real interface (an app, a website, a CLI) worth showing, mention that explicitly — it's what pushed this version toward recreating a realistic terminal window instead of generic decorative shapes.
- The "verify your own work" line at the end matters more than it looks — it's what makes Claude actually test the render pipeline (screenshot comparisons, a real short proof-of-concept clip, checking the timing math) instead of just writing plausible-looking code and hoping.

---

## Honest limitations, so there are no surprises

- The render pipeline was tested and verified for correctness (frame-by-frame content confirmed accurate, a real short MP4 clip produced and played back successfully) — but the *full* 65-second render was only ever completed end-to-end on GitHub's actual servers, not locally, since the sandbox used to build this can't run a full browser. If your very first CI run has issues, that's expected to sometimes happen with any new pipeline — the debug-frames artifact and the progress log lines exist specifically so you (or Claude, if you paste in the log) can diagnose it quickly.
- Rendering speed depends on GitHub's runner performance on the day, which isn't fully predictable. The 30-minute timeout is intentionally generous headroom, not an expected duration.
