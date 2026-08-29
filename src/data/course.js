export const DAYS_PER_WEEK = 7;

const THEMES = {
  sand: { text:"#49351f", shadow:"rgba(73,53,31,.32)", base:"#7e694e", baseShadow:"#60503c", border:"#d4be95", top:"#e0c79f", middle:"#c7a77b", bottom:"#aa926c" },
  stone: { text:"#4f463b", shadow:"rgba(79,70,59,.32)", base:"#6f685e", baseShadow:"#565149", border:"#d8c3a1", top:"#e3d0b2", middle:"#c3ab8a", bottom:"#8e8575" },
  earth: { text:"#4f4034", shadow:"rgba(79,64,52,.32)", base:"#655f57", baseShadow:"#4d4943", border:"#c9b18e", top:"#ddc29b", middle:"#ba9567", bottom:"#9a8b75" },
  dune: { text:"#4d473d", shadow:"rgba(77,71,61,.32)", base:"#776e5e", baseShadow:"#5d5548", border:"#d5c19d", top:"#e3cea8", middle:"#c8a77a", bottom:"#a99b84" },
  clay: { text:"#514333", shadow:"rgba(81,67,51,.32)", base:"#766756", baseShadow:"#5a4e41", border:"#d4bd99", top:"#e1c9a1", middle:"#c9a373", bottom:"#c5b28f" },
  forest: { text:"#234d25", shadow:"rgba(35,77,37,.32)", base:"#4b9b32", baseShadow:"#367525", border:"#b7ef7e", top:"#e2ffc8", middle:"#a7e866", bottom:"#62bd3d" },
  amber: { text:"#5b360e", shadow:"rgba(91,54,14,.32)", base:"#8d6730", baseShadow:"#684b22", border:"#d9ae62", top:"#ffe2a1", middle:"#d0a15b", bottom:"#a87532" },
  ocean: { text:"#073b71", shadow:"rgba(4,63,122,.4)", base:"#096cc0", baseShadow:"#07549a", border:"#4ab8ff", top:"#c8edff", middle:"#36aaf5", bottom:"#087acf" },
  frost: { text:"#4d5864", shadow:"rgba(56,67,78,.28)", base:"#c7d0d8", baseShadow:"#9ca9b4", border:"#ffffff", top:"#ffffff", middle:"#eef3f7", bottom:"#cdd6df" },
  arcane: { text:"#351069", shadow:"rgba(53,16,105,.42)", base:"#6626be", baseShadow:"#4a168f", border:"#b779ff", top:"#f0d9ff", middle:"#a95bf1", bottom:"#7735cf" },
};

export const WEEK_THEMES = [
  THEMES.sand, THEMES.stone, THEMES.earth, THEMES.dune,
  THEMES.clay, THEMES.forest, THEMES.forest, THEMES.forest,
  THEMES.amber, THEMES.forest, THEMES.ocean, THEMES.ocean,
  THEMES.ocean, THEMES.frost, THEMES.arcane, THEMES.arcane,
];

export const COURSE_WEEKS = [
  { cardImage: "assets/course-cards/week1.webp", cardLabel: "Start Week 1: HTML, CSS and Git", positions: [[39.3, 44.3], [59.4, 51.7], [44.4, 59.7], [33.8, 67.3], [49.8, 74.4], [64.7, 81.6], [49.5, 89.1]] },
  { cardImage: "assets/course-cards/week2.webp", cardLabel: "Start Week 2: How JavaScript Runs", positions: [[39.0, 42.7], [59.0, 51.1], [44.5, 58.6], [33.5, 66.7], [49.5, 74.0], [64.5, 80.9], [49.2, 89.5]] },
  { cardImage: "assets/course-cards/week3.webp", cardLabel: "Start Week 3: JavaScript in Action", positions: [[39.3, 45.5], [59.6, 53.6], [44.2, 60.9], [33.6, 68.9], [49.4, 75.8], [64.0, 83.5], [49.6, 92.0]] },
  { cardImage: "assets/course-cards/week4.webp", cardLabel: "Start Week 4: Async JavaScript", positions: [[39.3, 43.9], [58.9, 51.2], [45.0, 59.4], [33.6, 67.5], [49.8, 74.4], [64.3, 82.1], [49.8, 90.0]] },
  { cardImage: "assets/course-cards/week5.webp", cardLabel: "Start Week 5: TypeScript Toolkit", positions: [[41.0, 43.9], [60.5, 51.5], [44.7, 60.3], [33.8, 68.1], [49.5, 75.1], [62.6, 83.0], [49.7, 90.7]] },
  { cardImage: "assets/course-cards/week6.webp", cardLabel: "Start Week 6: React Foundations", positions: [[40.5, 39.7], [60.4, 48.0], [45.2, 57.2], [33.3, 65.3], [49.2, 73.3], [64.0, 81.6], [49.4, 90.5]] },
  { cardImage: "assets/course-cards/week7.webp", cardLabel: "Start Week 7: React Hooks", positions: [[40.2, 37.9], [59.2, 45.9], [44.2, 54.6], [33.5, 62.5], [49.0, 70.0], [63.1, 77.9], [49.3, 86.7]] },
  { cardImage: "assets/course-cards/week8.webp", cardLabel: "Start Week 8: React App Quest", positions: [[39.4, 39.4], [59.3, 47.5], [44.8, 57.4], [35.0, 66.2], [49.8, 73.6], [63.6, 82.1], [49.8, 89.1]] },
  { cardImage: "assets/course-cards/week9.webp", cardLabel: "Start Week 9: Node.js Runtime", positions: [[40.1, 37.7], [59.1, 46.0], [44.4, 54.5], [43.8, 64.7], [50.5, 74.5], [62.4, 81.8], [47.1, 89.8]] },
  { cardImage: "assets/course-cards/week10.webp", cardLabel: "Start Week 10: Express and REST APIs", positions: [[40.1, 38.0], [59.3, 45.9], [44.5, 55.0], [33.2, 65.4], [50.5, 73.3], [61.9, 82.1], [48.5, 89.3]] },
  { cardImage: "assets/course-cards/week11.webp", cardLabel: "Start Week 11: PostgreSQL Data", positions: [[41.1, 37.2], [60.6, 45.3], [43.2, 54.8], [34.4, 63.2], [50.5, 71.2], [63.4, 79.8], [50.2, 87.4]] },
  { cardImage: "assets/course-cards/week12.webp", cardLabel: "Start Week 12: Full-Stack Connections", positions: [[40.4, 39.2], [60.2, 47.5], [44.6, 57.0], [31.4, 67.1], [50.5, 75.2], [62.0, 84.4], [47.6, 91.6]] },
  { cardImage: "assets/course-cards/week13.webp", cardLabel: "Start Week 13: Testing and Quality", positions: [[39.8, 39.4], [59.2, 47.4], [44.9, 56.5], [33.5, 66.0], [49.7, 75.4], [62.9, 84.8], [48.0, 91.8]] },
  { cardImage: "assets/course-cards/week14.webp", cardLabel: "Start Week 14: Deployment and DevOps", positions: [[71.4, 25.1], [39.9, 39.7], [59.5, 47.1], [44.3, 56.5], [33.5, 66.1], [48.6, 75.6], [63.2, 83.9]] },
  { cardImage: "assets/course-cards/week15.webp", cardLabel: "Start Week 15: Capstone Launch", positions: [[35.7, 30.4], [39.2, 39.5], [59.0, 47.6], [42.5, 57.4], [35.0, 67.0], [48.9, 76.6], [62.3, 85.5]] },
  { cardImage: "assets/course-cards/week16.webp", cardLabel: "Start Week 16: Future Frontier", cardWidth:1949, cardHeight:807, biomeHeight:1671, positions: [[42.2, 30.9], [55.6, 39.2], [42.4, 47.6], [58.5, 55.2], [40.5, 63.0], [56.8, 71.6], [47.7, 81.0]] },
];

export const TOTAL_DAYS = COURSE_WEEKS.length * DAYS_PER_WEEK;
