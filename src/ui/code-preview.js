const PREVIEW_MESSAGE_SOURCE = "full-stack-quest-code-lab";

function escapeClosingTag(source, tagName) {
  return String(source ?? "").replace(new RegExp(`</${tagName}`, "gi"), `<\\/${tagName}`);
}

function renderConsoleBridge(runId) {
  return `<script>(()=>{const source=${JSON.stringify(PREVIEW_MESSAGE_SOURCE)},runId=${Number(runId)};const format=(value)=>{if(typeof value==="string")return value;if(typeof value==="undefined")return "undefined";if(typeof value==="function")return value.toString();if(value instanceof Error)return value.stack||value.message;try{const seen=new WeakSet();return JSON.stringify(value,(key,item)=>{if(typeof item==="object"&&item!==null){if(seen.has(item))return "[Circular]";seen.add(item)}return item},2)}catch{return String(value)}};const send=(type,detail={})=>parent.postMessage({source,runId,type,...detail},"*");for(const level of ["log","info","warn","error"]){const original=console[level].bind(console);console[level]=(...args)=>{send("console",{level,args:args.map(format)});original(...args)}}console.clear=()=>send("clear");addEventListener("error",event=>send("console",{level:"error",args:[event.error?.stack||event.message]}));addEventListener("unhandledrejection",event=>send("console",{level:"error",args:[format(event.reason)]}))})();<\/script>`;
}

export function createCodePreviewDocument({ html, css, js, previewStyles = "", runId }) {
  const safeCss = escapeClosingTag(css, "style");
  const safePreviewStyles = escapeClosingTag(previewStyles, "style");
  const safeJs = escapeClosingTag(js, "script");
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{height:100%;overflow:hidden}*{box-sizing:border-box}body{display:grid;place-items:center;margin:0;padding:28px;font-family:Arial,sans-serif;color:#35404a;background:#f7f7f7}${safePreviewStyles}</style><style>${safeCss}</style>${renderConsoleBridge(runId)}</head><body>${html}<script>${safeJs}<\/script></body></html>`;
}

export { PREVIEW_MESSAGE_SOURCE };
