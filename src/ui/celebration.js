import { prefersReducedMotion } from "../lib/dom.js";

const PARTICLE_COLORS = Object.freeze(["#ff3b69", "#1cb0f6", "#ffd84d", "#62bd3d", "#a95bf1", "#ff8a24"]);

export function launchCelebration({ className, signal, replaceExisting = false, particleCount = 110 }) {
  const existing = document.querySelector(`.${className}`);
  if (prefersReducedMotion()) {
    existing?.remove();
    return null;
  }
  if (existing && !replaceExisting) return existing;
  existing?.remove();

  const layer = document.createElement("div");
  layer.className = className;
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = "<strong>✦</strong>";
  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const distance = 28 + Math.random() * 62;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 12;
    particle.style.setProperty("--burst-x", `${x}vw`);
    particle.style.setProperty("--burst-y", `${y}vh`);
    particle.style.setProperty("--fall-y", `${y + 78}vh`);
    particle.style.setProperty("--delay", `${Math.random() * .16}s`);
    particle.style.setProperty("--duration", `${1.35 + Math.random() * .9}s`);
    particle.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
    particle.style.setProperty("--color", PARTICLE_COLORS[index % PARTICLE_COLORS.length]);
    layer.append(particle);
  }

  document.body.append(layer);
  const animatedElements = new Set(layer.querySelectorAll("strong, i"));
  const settleParticle = (event) => {
    animatedElements.delete(event.target);
    if (animatedElements.size === 0) layer.remove();
  };
  const options = signal ? { signal } : undefined;
  layer.addEventListener("animationend", settleParticle, options);
  layer.addEventListener("animationcancel", settleParticle, options);
  return layer;
}
