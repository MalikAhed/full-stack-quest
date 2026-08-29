import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: flexbox-axis-mission -->
# Flexbox: control one axis on purpose

Yesterday you made your profile page readable with typography, color, spacing, and the cascade. Today you will change its layout with [[term: Flexbox | A one-dimensional CSS layout model that arranges direct children along a row or a column and distributes available space between them.]].

The durable skill is not memorizing dozens of values. It is answering three questions before you type:

1. **Which element is the container?**
2. **Which direct children should move?**
3. **Which direction is the main axis?**

By the end of today, you will be able to:

- predict what \`justify-content\` and \`align-items\` will do from \`flex-direction\`;
- put container properties on the parent and \`flex\` on the child;
- build a wrapping navigation bar, an unequal card row, and a sticky footer;
- diagnose a Flexbox rule that appears to do nothing; and
- recreate centering and the sticky-footer pattern from memory.

:::warning Zero-AI day
Turn off AI autocomplete and do not ask an assistant to write, repair, complete, or check today's HTML or CSS. Type every Flexbox declaration yourself. Documentation and DevTools are allowed: after 25 minutes on one obstacle, inspect MDN; after 45 minutes, ask your human instructor and show the CSS you wrote.
:::

## Your four-hour route

- **0:00–0:20 — Watch:** one visual explainer, with a hard stop at twenty minutes. Watch for the axes, not a property catalogue.
- **0:20–1:05 — Drill:** [Flexbox Froggy](https://flexboxfroggy.com/), capped at forty-five minutes. Stop when the timer ends even if levels remain.
- **1:05–1:15 — Break.**
- **1:15–2:00 — Build 1:** the navigation bar.
- **2:00–2:45 — Build 2:** the card row.
- **2:45–2:55 — Break.**
- **2:55–3:30 — Build 3:** the sticky footer.
- **3:30–4:00 — Read and retrieve:** skim [MDN's basic Flexbox concepts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts), then do the memory tests with no notes.

https://www.youtube.com/watch?v=fYq5PXgSsbE

The written lesson contains everything required. The video is a timed visual first pass, not a prerequisite you must copy from.

:::note Today's boundary
Master six container properties—\`display\`, \`flex-direction\`, \`justify-content\`, \`align-items\`, \`gap\`, and \`flex-wrap\`—plus the child shorthand \`flex\`. Do not study longhand sizing algorithms, visual reordering, multi-line alignment, baseline variants, or page layouts that need both rows and columns.
:::

<!-- lesson-step -->
<!-- step-id: flex-container-and-items -->
# The parent creates the layout

Flexbox is a relationship between one **flex container** and its **flex items**.

\`display: flex\` goes on the container. The browser then treats that element's **direct children** as flex items.

\`\`\`html title=relationship.html
<nav class="site-nav">
  <a href="/">Mira</a>
  <ul class="nav-links">
    <li><a href="#about">About</a></li>
    <li><a href="#projects">Projects</a></li>
  </ul>
</nav>
\`\`\`

\`\`\`css title=relationship.css
.site-nav {
  display: flex;
}
\`\`\`

Here, the name link and the \`ul\` are flex items because they are direct children of \`nav\`. The two \`li\` elements are **not** items of \`.site-nav\`; their direct parent is the \`ul\`.

If the list items also need Flexbox layout, their parent must become a second flex container:

\`\`\`css title=nested-container.css
.nav-links {
  display: flex;
}
\`\`\`

An element may be both things at once: \`.nav-links\` is a flex **item** inside \`.site-nav\`, and a flex **container** for its own direct children.

:::remember The first debugging question
When a Flexbox property appears to do nothing, inspect the element you want to move and ask: **Who is its direct parent, and does that parent have \`display: flex\`?**
:::

:::mcq
id: direct-child-boundary-check
title: Find the actual flex items
question: Only .site-nav has display: flex in the HTML above. Which elements does that rule arrange directly?
- [ ] list-items | The two \`li\` elements
- [x] link-and-list | The name \`a\` and the \`ul\`
- [ ] all-descendants | Every descendant inside \`nav\`
- [ ] nav-itself | The \`nav\` relative to the rest of the page
explanation: Flexbox affects the container's direct children. The name link and list are direct children; the list items belong to a different parent-child relationship.
hint: Ignore grandchildren. Look one DOM level below the element with \`display: flex\`.
:::

<!-- step-id: main-axis-cross-axis -->
# Direction decides what alignment means

Every flex container has two perpendicular directions:

- The [[term: main axis | The direction in which a flex container lays out its items; it is chosen by flex-direction.]] is controlled by \`flex-direction\`.
- The [[term: cross axis | The direction perpendicular to the main axis.]] automatically follows from that choice.

| \`flex-direction\` | Main axis | Cross axis | \`justify-content\` moves along | \`align-items\` moves along |
| --- | --- | --- | --- | --- |
| \`row\` | Along the row | Across the row | Main axis: along the row | Cross axis: up/down in common horizontal writing |
| \`column\` | Down the column | Across the column | Main axis: up/down | Cross axis: side to side in common horizontal writing |

Use “row” and “column,” not “horizontal” and “vertical,” as the durable model. Pages can use different writing directions. The invariant is always:

> \`justify-content\` controls the **main axis**. \`align-items\` controls the **cross axis**. \`flex-direction\` decides which axis points where.

<!-- lesson-step -->
<!-- step-id: flex-axis-rotation-comparison -->
# The properties follow their axes

Start with a row:

\`\`\`css title=row-axis.css
.demo {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}
\`\`\`

The items are centered along the row by \`justify-content\` and across it by \`align-items\`.

Now change only one declaration:

\`\`\`css title=column-axis.css highlight=3
.demo {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
\`\`\`

The values did not change, but their physical directions swapped because the main axis became the column.

:::mcq
id: column-axis-prediction
title: Predict before rendering
question: A tall sidebar uses flex-direction: column and justify-content: space-between. Where is the free space distributed?
- [ ] across-sidebar | Across the sidebar from side to side
- [x] down-sidebar | Down the sidebar between items on the column's main axis
- [ ] around-page | Around the sidebar relative to the whole page
- [ ] nowhere | justify-content works only with flex-direction: row
explanation: With a column direction, the main axis runs down the column. \`justify-content\` always acts on that main axis.
hint: First identify the main axis from \`flex-direction\`; only then interpret \`justify-content\`.
:::

<!-- lesson-step -->
<!-- step-id: seven-working-properties -->
# Seven declarations cover today's work

These are the only Flexbox properties you need to practice today.

| Property | Put it on | Working meaning today |
| --- | --- | --- |
| \`display: flex\` | Container | Make direct children flex items. |
| \`flex-direction: row\` or \`column\` | Container | Choose the main axis. The default is \`row\`. |
| \`justify-content\` | Container | Distribute items or free space on the main axis. |
| \`align-items\` | Container | Align the items on the cross axis. |
| \`gap\` | Container | Add consistent space between flex items. |
| \`flex-wrap: wrap\` | Container | Allow items to continue onto another line when they cannot fit. The default is \`nowrap\`. |
| \`flex: 1\` | Item | Let sibling items with the same value take equal shares of the available main-axis space. |

When you use \`justify-content\`, prefer \`flex-start\`, \`center\`, \`flex-end\`, or \`space-between\`. Use \`gap\` for predictable spacing between neighbors rather than trying to choose between \`space-around\` and \`space-evenly\`.

## Make the ownership visible

\`\`\`css title=parent-and-child.css
.cards {                 /* parent: controls the group */
  display: flex;
  gap: 1rem;
}

.cards > article {       /* children: control their shares */
  flex: 1;
}
\`\`\`

The selector does not decide whether a property is a container or item property; the property does. \`gap\` belongs to the parent because it describes relationships between its children. \`flex\` belongs to each child because it describes that item's share.

More precisely, a positive-number shorthand such as \`flex: 1\` sets the grow, shrink, and starting-size parts together. Today, use the working model “one equal share.” Do not split it into \`flex-grow\`, \`flex-shrink\`, and \`flex-basis\`; those longhands are lookup material.

:::fill-blanks
id: center-from-axis-model
title: Center without guessing
question: Complete the parent rule that centers its child on both axes.
code:
\`\`\`css
.stage {
  display: [[display-value]];
  min-height: 100vh;
  justify-content: [[main-axis-value]];
  align-items: [[cross-axis-value]];
}
\`\`\`
answers:
- display-value | flex
- main-axis-value | center
- cross-axis-value | center
options:
- \`grid\`
- \`flex\`
- \`center\`
- \`center\`
- \`space-between\`
explanation: The parent becomes a flex container, then centers its direct child on the main axis and the cross axis.
hint: Both axes use the same value, but the two alignment properties still have different responsibilities.
:::

<!-- step-id: flexbox-retrieval-hooks -->
# Know what exists, then leave it alone

Today's narrow boundary is deliberate:

- \`align-self\` can override cross-axis alignment for one flex item. Look it up when one item genuinely differs.
- \`align-content\` matters only when a wrapping container has multiple flex lines and extra cross-axis space. It is not a substitute for \`align-items\`.
- Do not use \`order\`. It can change visual order without changing document, screen-reader, or keyboard order.
- Do not study \`flex-basis\`, \`flex-grow\`, and \`flex-shrink\` separately. Remember only that \`flex: 1\` is the shorthand used today.
- Skip reverse directions, baseline variants, and whole-page Flexbox mosaics.

Tomorrow, Grid will handle layouts where you intentionally control rows **and** columns. Today, Flexbox is for one line or one direction at a time.

:::mistake A wrapped Flexbox is still one-dimensional
When \`flex-wrap: wrap\` creates several lines, each line distributes its own space. Flexbox did not become a coordinated two-dimensional grid. Do not pixel-fight it into tomorrow's job.
:::

<!-- lesson-step -->
<!-- step-id: build-navigation -->
# Build 1: a navigation bar that can wrap

**Time box: 45 minutes.** Work in yesterday's \`index.html\` and \`style.css\`. Keep the semantic links from Day 3; Flexbox changes presentation, not meaning.

The target behavior is:

- your name stays at the start;
- the page links form a group at the end;
- everything is centered on the cross axis;
- neighboring links have consistent spacing; and
- narrow screens may wrap rather than overflow.

## 1. Inspect the parent-child boundary

If your navigation resembles this structure, \`nav\` and \`ul\` must each handle one relationship:

\`\`\`html title=navigation-shape.html
<nav class="site-nav">
  <a class="site-name" href="/">Your Name</a>
  <ul class="nav-links">
    <li class="nav-links__start"><a href="#about">About</a></li>
    <li><a href="#projects">Projects</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
</nav>
\`\`\`

Do not replace your own accessible markup merely to match the sample. Add classes where your selectors need stable names.

## 2. Write the Flexbox rules yourself

Before opening the reveal, type rules that use:

- \`display: flex\` on each parent whose direct children must line up;
- \`align-items: center\`;
- one \`gap\` value from yesterday's spacing system;
- \`flex-wrap: wrap\` on both groups that may run out of room;
- \`flex: 1\` on the link list so it receives the remaining row space; and
- \`margin-left: auto\` on the **first list item**, not on the list itself.

That last declaration is today's one use of the auto-margin trick. An auto margin consumes available space before that one flex item, pushing it and the siblings after it toward the end.

:::reveal Compare only after your attempt
One valid shape is:

\`\`\`css title=navigation-flex.css
.site-nav,
.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-links {
  flex: 1;
}

.nav-links__start {
  margin-left: auto;
}
\`\`\`

Keep list reset declarations such as padding or list style in your existing base CSS. They are not Flexbox concepts. If your links are direct children of \`nav\` rather than inside a list, apply \`margin-left: auto\` to the first page link instead.
:::

## 3. Test the behavior, not a screenshot

Resize slowly from wide to narrow. Confirm:

- links stay usable when they wrap;
- the page does not gain a horizontal scrollbar from the nav;
- the DOM order still matches the reading and keyboard order; and
- every link still receives a visible focus indicator with \`Tab\`.

Do not add a media query, absolute positioning, a float, or \`order\`. Do not spend the block nudging pixels.

:::mcq
id: nav-property-placement
title: Diagnose a motionless link group
question: The links are li elements inside ul.nav-links. You put justify-content on nav.site-nav, but the individual links do not spread out. What should you inspect first?
- [ ] link-color | Whether every link has a color declaration
- [x] list-container | Whether \`ul.nav-links\`, their direct parent, is itself a flex container
- [ ] z-index | Whether the links have a larger \`z-index\`
- [ ] document-title | Whether the page has a \`title\` element
explanation: The outer nav arranges only its direct children. To arrange individual list items, make their direct parent—the list—the relevant flex container.
hint: Find the direct parent of the elements that should move.
:::

<!-- lesson-step -->
<!-- step-id: build-card-row -->
# Build 2: distribute card space

**Time box: 45 minutes.** Use three of the six project articles from Day 3.

Those articles need a parent that describes the row. If your projects section currently contains its heading and all articles directly, add a small layout wrapper around the three practice cards:

\`\`\`html title=project-row-shape.html
<div class="project-row">
  <article>...</article>
  <article>...</article>
  <article>...</article>
</div>
\`\`\`

This is a legitimate \`div\`: it adds no document meaning and exists only to group items for layout. Do not turn it into another \`section\` or \`article\` and invent semantics it does not have.

## Pass 1: equal shares

Write the parent rule, then the child rule:

\`\`\`css title=equal-card-row.css
.project-row {
  display: flex;
  gap: 1rem;
}

.project-row > article {
  flex: 1;
}
\`\`\`

Under ordinary wrapping text content, all three cards receive equal shares of the row even when one description is longer. The cards may have different internal text wrapping; the row shares are equal.

Use DevTools to select each article. In the Layout or Computed evidence available in your browser, confirm that the articles are flex items and compare their computed widths.

## Pass 2: make the middle card twice as wide

Change one number on one child:

\`\`\`css title=weighted-card-row.css highlight=2
.project-row > article:nth-child(2) {
  flex: 2;
}
\`\`\`

The shares are now \`1 : 2 : 1\`. The middle item receives two of four shares; each neighbor receives one.

:::note What “twice” means here
The ratio applies to Flexbox's distributed main-axis shares. Borders, padding, and the gap still occupy space, so do not use a ruler to demand that the outer painted rectangle is mathematically twice every measurement. Predict the allocation, inspect the computed result, and stop when the layout behavior is correct.
:::

## Reset before tomorrow

Return the middle card to \`flex: 1\` after you have proved the ratio. Day 6 replaces this temporary row with a responsive Grid across all project cards.

:::mcq
id: card-share-transfer
title: Transfer the share model
question: Four sibling flex items use values 1, 1, 2, and 4. What proportion of the distributed main-axis shares belongs to the last item?
- [ ] one-quarter | 1 of 4 shares
- [ ] one-third | 4 of 12 shares
- [x] one-half | 4 of 8 shares
- [ ] all-space | All available space because 4 is the largest value
explanation: The values total 8 shares. The last item receives 4 of them, which is one half.
hint: Add the four numbers, then compare the last value with that total.
:::

<!-- lesson-step -->
<!-- step-id: build-sticky-footer -->
# Build 3: a footer that reaches the bottom

**Time box: 35 minutes.** The goal is sometimes called a **sticky footer**, but it is not \`position: sticky\` and it does not float over content.

The required behavior has two cases:

| Page state | Expected footer position |
| --- | --- |
| Content is shorter than the viewport | At the bottom edge of the viewport |
| Content is taller than the viewport | After the content, reached by normal scrolling |

Your semantic structure from Day 3 already gives the correct three siblings:

\`\`\`html title=page-children.html
<body>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</body>
\`\`\`

Predict before typing: if \`body\` becomes a column flex container, which axis runs from the top of the page to the bottom? Which one child should consume the unused share?

:::reveal Two-rule mechanism
Merge these declarations into your existing rules rather than creating duplicate selectors:

\`\`\`css title=sticky-footer.css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}
\`\`\`

\`body\` is at least as tall as the viewport. Its main axis points down the column. The \`main\` flex item grows into unused main-axis space, so it pushes the footer to the bottom when content is short. When content is long, the body grows and the footer remains after the main content in normal flow.
:::

## Prove both cases

1. Temporarily hide or shorten enough project content that the page is shorter than the viewport. Confirm the footer reaches the bottom.
2. Restore all content. Confirm the footer follows the content and does not cover it.
3. Use DevTools to toggle \`flex: 1\` on \`main\`. Observe exactly which free space appears or disappears.
4. Restore every temporary content change.

:::mistake Do not position the footer
\`position: fixed\` would remove the footer from normal flow and can cover long content. The Flexbox solution changes how available space is allocated while preserving document order.
:::

:::mcq
id: sticky-footer-causal-check
title: Explain what pushes the footer
question: On a short page, why does main { flex: 1 } move the footer to the viewport bottom?
- [ ] footer-position | It secretly changes the footer to \`position: fixed\`.
- [ ] body-margin | It adds a large bottom margin to \`body\`.
- [x] main-grows | In the body's column main axis, \`main\` grows into unused space before the footer.
- [ ] footer-order | It reverses the DOM order so the footer renders last.
explanation: The body supplies viewport-height space, and the main flex item consumes the unused portion of the column's main axis. The footer remains in normal flow after it.
hint: Identify the growing flex item and the direction of the body's main axis.
:::

<!-- lesson-step -->
<!-- step-id: flexbox-debugging-loop -->
# Debug from relationships, not random values

Use yesterday's DevTools habits. A fast Flexbox investigation is a causal loop:

1. **Observe the symptom.** Name the element that is misplaced, overflowing, or not growing.
2. **Inspect its direct parent.** Confirm the parent is the container you intended.
3. **Check Computed \`display\`.** If it is not \`flex\`, find which rule lost in the cascade or whether the selector missed.
4. **Read \`flex-direction\`.** State the main and cross axes out loud.
5. **Check property ownership.** Alignment, wrapping, and gap belong on the container; \`flex\` belongs on an item.
6. **Toggle one declaration.** Change one cause and watch one effect.
7. **Test narrow and wide.** A working desktop row can still overflow when space disappears.

| Symptom | First evidence to inspect | Likely model gap |
| --- | --- | --- |
| Individual nav links ignore alignment | Their direct parent | The outer nav controls the list as one item, not its grandchildren. |
| \`justify-content\` moves things in the “wrong” direction | Computed \`flex-direction\` | The main axis was assumed instead of identified. |
| \`gap\` does not appear between expected elements | Container's direct children | The visible elements are nested below the flex-item boundary. |
| Footer stops below short content but above the viewport edge | \`body\` height and \`main\` computed \`flex\` | Viewport space was not supplied, or \`main\` did not grow. |
| Navigation creates horizontal scroll | Computed wrapping and overflowing child | \`flex-wrap\` is missing or applied to the wrong parent. |

:::mcq
id: cascade-versus-flex-diagnosis
title: Localize the failure
question: DevTools shows .toolbar { display: flex } struck through and computed display: block. What should you investigate next?
- [x] cascade-winner | The competing rule that won the cascade and why
- [ ] child-flex | Add \`flex: 1\` to every descendant immediately
- [ ] html-semantics | Replace the toolbar with a \`div\` regardless of its meaning
- [ ] network | Whether the server returned a 404 status
explanation: Flexbox never became active because the computed display is block. Use the Styles pane to find the winning rule before changing layout values.
hint: Day 4 taught that struck-through declarations lost before their layout behavior could apply.
:::

<!-- lesson-step -->
<!-- step-id: flexbox-memory-tests -->
# Close everything and retrieve

Use the final thirty minutes after your MDN skim. Close MDN, Flexbox Froggy, this lesson, and AI tools.

## Test 1: center in under 60 seconds

In a blank CodePen or scratch page, make a parent at least one viewport tall and center one box on both axes. Type from memory:

- the declaration that creates the flex container;
- the main-axis centering declaration; and
- the cross-axis centering declaration.

Run it only after predicting where the box will appear. If you look anything up, clear the CSS and repeat tomorrow morning before Grid.

## Test 2: header, growing main, footer

Still from memory, create a body with a header, main, and footer. Make the body a full-viewport column and make only \`main\` grow. Explain each line while typing.

## Test 3: flip the axis verbally

Without code, answer:

1. What does \`justify-content\` control?
2. What changes when \`flex-direction\` changes from \`row\` to \`column\`?
3. Which element receives \`justify-content\`: parent or child?
4. Why does \`align-items: center\` move side to side in a column under common horizontal writing?

:::reveal Retrieval standard
A complete explanation says: \`flex-direction\` defines the main axis; \`justify-content\` acts on that main axis; \`align-items\` acts on the perpendicular cross axis; both alignment properties belong to the flex container.
:::

:::mcq
id: axis-transfer-finish-check
title: Transfer the model to a new component
question: A vertical card uses flex-direction: column. You want its title at the top and its action at the bottom. Which parent rule expresses that main-axis distribution?
- [ ] align-center | \`align-items: center\`
- [x] justify-between | \`justify-content: space-between\`
- [ ] child-flex | \`flex: 1\` on both the title and action
- [ ] wrap | \`flex-wrap: wrap\`
explanation: In a column, the main axis runs from top to bottom. \`justify-content: space-between\` places the first and last items at opposite ends of that axis.
hint: The requested separation runs along the column's main axis.
:::

<!-- lesson-step -->
<!-- step-id: flexbox-day-finish-line -->
# Day 5 finish line

You are done when all of this is true:

- Your name and navigation links align and wrap without floats, absolute positioning, or visual reordering.
- Three project cards take equal shares, and you have proved a \`1 : 2 : 1\` variation by changing one number.
- The footer sits at the viewport bottom on a short page and follows the content on a long page.
- You can identify the flex container and its direct flex items in each build.
- You can state the main axis before explaining \`justify-content\`.
- You can center a box and recreate the sticky-footer pattern from memory.
- You wrote today's CSS yourself with AI autocomplete disabled.

:::remember The model to carry forward
Flexbox arranges a parent's direct children in one direction. The parent chooses the main axis and controls group alignment; each child controls its own share. Identify those relationships first, then type properties.
:::

## Final recap: trace the relationship

Start at **Parent controls**, then move into the central flex container. The parent chooses the direction and controls alignment, gaps, and wrapping for its direct children. The main axis follows that direction; the cross axis stays perpendicular. **Child share** is separate because \`flex\` belongs to an item, not the container. Finally, follow the three lower branches to revisit where the same model powered today's nav, card row, and sticky footer.

![Parent controls feed a Flex container whose direct children follow a main axis and perpendicular cross axis, while each child's flex value controls its share; the same parent-child model branches into the navigation, card-row, and sticky-footer layouts.](assets/lessons/day-005/flexbox-relationship-recap.webp)

Use the picture as a debugging map: identify the direct parent, name its main axis, then decide whether the property belongs to the group or to one child.

Tomorrow, replace the temporary card row with Grid. Flex will remain the right tool for the one-dimensional nav and the page's header–main–footer column.`;

export default defineMarkdownLesson({
  status:"published",
  title:"Flexbox: control one axis on purpose",
  summary:"Use the container-item boundary and main/cross axes to build a nav, weighted card row, and sticky footer by hand.",
  outcome:"Predict Flexbox alignment, place properties on the correct element, build three one-dimensional layouts, and debug them from DevTools evidence.",
  mode:"Watch → drill → build → retrieve",
  mission:"Turn Flexbox from property guessing into a parent-child and axis model you can review from memory.",
  duration:"4 hours",
  level:"Complete beginner",
  reward:40,
  passingScore:80,
}, LESSON_MARKDOWN, { day:5 });
