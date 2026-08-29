// Ship Ready's single content registry. Reuse an existing `type` to publish a
// new lesson with the approved shell and interactions; only its data changes.
// Keep approved cards in this order and append new templates at the end.
function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  });
  return Object.freeze(value);
}

export const SHIP_READY_TEMPLATES = deepFreeze([
  {
    route:"ship-ready-markdown", renderer:"markdown", label:"MARKDOWN WORKSPACE", title:"Markdown",
    chromeTitle:"MARKDOWN LAB", preview:{ type:"image", src:"assets/template-previews/markdown-lab-desktop.webp" },
  },
  {
    route:"ship-ready", renderer:"level", type:"content", label:"FIXED LAYOUT", title:"Content Area",
    chromeTitle:"DAY 00", preview:{ type:"image", src:"assets/template-previews/template-lesson-shell.webp" },
    content:{ title:"Content Area" },
  },
  {
    route:"ship-ready-mcq", renderer:"level", type:"mcq", label:"QUESTION LAYOUT", title:"MCQ Template",
    chromeTitle:"DAY 00", preview:{ type:"image", src:"assets/template-previews/template-mcq.webp" },
    content:{
      kicker:"KNOWLEDGE CHECK · CHOOSE ONE", title:"HTTP responses",
      prompt:"Which status code best fits a successful POST request that created a new resource?",
      answers:[
        { id:"200", text:"200 OK" }, { id:"204", text:"204 No Content" },
        { id:"201", text:"201 Created", correct:true }, { id:"404", text:"404 Not Found" },
      ],
      idleFeedback:"Select the best answer, then check your choice.",
      selectedFeedback:"Answer selected. Check it when you are ready.",
      correctFeedback:"`201 Created` confirms that the request created a new resource.",
      wrongFeedback:"A successful creation uses `201 Created`.",
    },
  },
  {
    route:"ship-ready-response", renderer:"level", type:"response", label:"WRITTEN RESPONSE", title:"Explain It",
    chromeTitle:"DAY 00", preview:{ type:"image", src:"assets/template-previews/template-explain-it.webp" },
    content:{
      title:"Request vs response", prompt:"Explain the idea in your own words. Keep it clear, useful, and grounded in one example.",
      rubricTitle:"A strong answer includes", rubric:["What the client sends", "What the server returns", "One real example"],
      fieldLabel:"Your explanation", placeholder:"A request is what the client sends to a server...", maxLength:420,
      guideTitle:"Explain it in your own words",
      guide:"Start with what the client sends. Then explain what the server returns and include one real example.",
      review:{
        passScore:8,
      },
    },
  },
  {
    route:"ship-ready-sequence", renderer:"level", type:"sequence", label:"FIXED STEPS", title:"Put in Order",
    chromeTitle:"DAY 00", preview:{ type:"sequence" }, lives:3,
    content:{
      kicker:"FIXED STEPS · PROGRAM FLOW", title:"Put the link journey in order",
      prompt:"Start when someone clicks a link. What happens before the new page appears?",
      mascot:"Follow the link, one step at a time!", placeholder:"Choose a step below",
      steps:[
        { id:"render", text:"The browser renders the new page" },
        { id:"request", text:"The browser sends an HTTP request" },
        { id:"click", text:"Someone clicks a link" },
        { id:"response", text:"The server sends a response" },
      ],
      expected:["click", "request", "response", "render"],
      correctFeedback:"A click becomes a request, then a response, then a rendered page.",
      wrongFeedback:"Think: click → request → response → render.",
    },
  },
  {
    route:"ship-ready-fill-blanks", renderer:"level", type:"fill-blanks", label:"CODE QUESTION", title:"Fill in the Blanks",
    chromeTitle:"DAY 00", preview:{ type:"fill-blanks" }, lives:3,
    content:{
      kicker:"CODE CHECK · FILL THE BLANKS", title:"Complete the fetch request",
      prompt:"Complete the request so it fetches the users.", mascot:"One blank at a time—you’ve got this!",
      codeLabel:"JavaScript code with two blanks",
      fragments:["const response = await fetch(", ", { method:", " });"],
      blanks:["endpoint", "method"], expected:['"/api/users"', '"GET"'],
      options:['"POST"', '"/api/users"', '"GET"', '"/api/posts"'],
      correctFeedback:"The browser sends a GET request to `/api/users`.",
      wrongFeedback:"The endpoint comes first, followed by the `GET` method.",
    },
  },
  {
    route:"ship-ready-spot-bug", renderer:"level", type:"spot-bug", label:"DEBUGGING QUESTION", title:"Spot the Bug",
    chromeTitle:"SPOT THE BUG", preview:{ type:"spot-bug" }, lives:3,
    content:{
      kicker:"DEBUGGING · SPOT THE BUG", title:"Which line breaks the code?",
      prompt:"Click the line with the syntax error. Then choose why it is wrong.",
      mascot:"Read it like the computer does—one line at a time.",
      lines:[
        "const userId = 42;", 'const response = await fetch("/api/users/" + userId);',
        "const user = await response.json(;", "console.log(user);",
      ],
      reasons:[
        { id:"method", text:"The `json` method does not exist" },
        { id:"parenthesis", text:"A closing parenthesis is missing" },
        { id:"await", text:"`await` cannot be used here" },
        { id:"declaration", text:"The variable must use `let`" },
      ],
      correctLine:3, correctReason:"parenthesis",
      correctFeedback:"Line 3 is missing the closing parenthesis for `response.json()`.",
      wrongFeedback:"The syntax error is on line 3: `response.json(;` needs a closing parenthesis.",
    },
  },
  {
    route:"ship-ready-code-lab", renderer:"code", label:"CODE PRACTICE", title:"Code Editor",
    chromeTitle:"CODE LAB", preview:{ type:"code" },
    content:{
      instructions:`# Your mission

Give the explorer card a background while keeping its most important content semantic and easy to understand.

## Requirements

- [ ] Keep the explorer name inside an \`<h1>\` element.
- [ ] Add a card background with \`background\` or \`background-color\`.`,
      files:{
        html:`<article class="explorer-card">
  <h1>Mira the Explorer</h1>
  <p>Level 4 · CSS Ranger</p>
</article>`,
        css:`.explorer-card {
  padding: 24px;
  border-radius: 16px;
  /* Add a background color */
}`,
        js:`const explorer = document.querySelector(".explorer-card");

console.log("Explorer card ready:", explorer.querySelector("h1").textContent);`,
      },
      previewStyles:".explorer-card{width:min(100%,280px);max-height:100%}",
      checks:[
        { type:"html-selector", selector:"h1" },
        { type:"css-property", properties:["background", "background-color"] },
      ],
    },
  },
]);

export const SHIP_READY_ROUTES = Object.freeze(SHIP_READY_TEMPLATES.map(({ route }) => route));

export function getShipReadyTemplate(route) {
  return SHIP_READY_TEMPLATES.find((template) => template.route === route) || null;
}

export function isShipReadyRoute(route) {
  return SHIP_READY_ROUTES.includes(route);
}
