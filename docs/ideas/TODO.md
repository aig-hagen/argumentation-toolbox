## Features
- Rework fonts to be consistent across browsers
- Localization


## Bugs and Issues

- quick share should not show on blankCanvas screen
- Notification placement should respect the tab bar and not overlap it
- Settings button only shows if no document exists at all; probably related to prev. issue, since that should not show; position settings top right

### desktop/general
- need a ranking tutorial for AF

### Mobile
#### Home and document management

- show reference on main view cards somewhere

#### Graph editor and interaction

- **[Enhancement]** Extension highlighting: could use some way to deactivate highlighting (other than clicking the extension again)
- **[Decision needed]** add some kind of toggle for physics mode: something that activated physics for a brief moment to let arguments adjust position. or something that enables pyhsics while pressed

#### Sharing and export

- **[Feature]** Per-share link preview cards. `index.html` now serves static Open Graph tags,
  so a shared link shows one *generic* branded card. To get a card specific to the shared
  framework, the `/share/:id` route must return server-rendered HTML with per-share `og:*` tags
  (title = framework name, description = arg/attack counts) — the share server currently only
  serves JSON. Stretch goal: a dynamic `og:image` rendering the actual graph (server-side
  SVG→PNG). Crawlers don't run JS, so this can't be done from the SPA.

#### Settings and visual design

- **[Design]** could update the creation-mode-switchers in the bottom left. visual style doesnt really fit well

#### Other
- Can we somehow enforce fullscreen on mobile? does that make sense?

## Features

### Mobile eval sheet: full-detent two-pane compare
At the `full` (~90dvh) detent, the mobile evaluation sheet should show a **second, one-off,
view-only** eval below a `Compare with` divider (`view only` + `✕` clear), so two evaluations
can be read side by side. Rules:
- Top pane = the switchable saved eval; **owns** the canvas highlight.
- Bottom pane = a one-off eval slot (own params + result), must **not** emit `highlight` — only
  one eval touches the canvas.
- Needs host-local state to hold the one-off instance (not in the saved chip list).
See the checklist in `docs/mobile-layout.md` (Evaluate UI rework).

### use tags to filter AF types
Tags are now defined and associated with each module (see `src/modules/common/tags.ts` and each module's `moduleConfig.ts`). In the future, those can be used to filter AF types; can also implement a search bar on the main page.


### Split Basic Tutorials into functional part and argumentation part
There should be a short tutorial, just for the controls, and one more detailed tutorial that explains in more detail the specifics of the argumentation formalism.

## New Framework Types

### Extended AFs
- need to implement extended edges in graph-component
- extended attacks stored separately
- distinguish between extended and recursive-extended AFs?
- need TweetyProject endpoint
- take a look at the TweetyProject reasoner (performance)

### Weighted AFs
- How to incorporate the Semiring? Select in EvalWindow?
- alpha/beta parameters need to be setable in the EvalWindow as well
- need TweetyProject endpoint
- reconsider TweetyProject reasoners; can we extend that easily to have more semantics available? no
