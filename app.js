(() => {
  "use strict";

  const codec = window.UrlGlyphCodec;
  const elements = {
    form: document.querySelector("#encode-form"),
    input: document.querySelector("#url-input"),
    outputCard: document.querySelector("#output-card"),
    output: document.querySelector("#output-url"),
    copy: document.querySelector("#copy-button"),
    open: document.querySelector("#open-button"),
    length: document.querySelector("#length-info"),
    status: document.querySelector("#status"),
    decodeInput: document.querySelector("#decode-input"),
    decodeButton: document.querySelector("#decode-button"),
    decoded: document.querySelector("#decoded-url"),
    theme: document.querySelector("#theme-button"),
    redirectHost: document.querySelector("#redirect-host"),
    redirectTarget: document.querySelector("#redirect-target"),
    continueButton: document.querySelector("#continue-button"),
    cancelButton: document.querySelector("#cancel-button")
  };

  let lastGeneratedUrl = "";

  function selectedMode() {
    return document.querySelector('input[name="mode"]:checked').value;
  }

  function baseUrl() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (!url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
    }
    return url.href;
  }

  function makeShareUrl(mode, payload) {
    return new URL(`${mode}/${payload}`, baseUrl()).href;
  }

  function showStatus(message, kind = "info") {
    elements.status.textContent = message;
    elements.status.dataset.kind = kind;
  }

  function clearStatus() {
    elements.status.textContent = "";
    elements.status.removeAttribute("data-kind");
  }

  function generate(event) {
    event.preventDefault();
    clearStatus();

    try {
      const normalized = codec.normalizeHttpUrl(elements.input.value);
      const mode = selectedMode();
      const payload = codec.encode(normalized, mode);
      lastGeneratedUrl = makeShareUrl(mode, payload);

      elements.output.textContent = lastGeneratedUrl;
      elements.output.href = lastGeneratedUrl;
      elements.open.href = lastGeneratedUrl;
      elements.length.textContent = `原网址 ${normalized.length} 个字符 · 新网址 ${lastGeneratedUrl.length} 个字符`;
      elements.outputCard.hidden = false;
      elements.copy.focus({ preventScroll: true });
    } catch (error) {
      elements.outputCard.hidden = true;
      showStatus(error.message || "转换失败", "error");
    }
  }

  async function copyGenerated() {
    if (!lastGeneratedUrl) return;
    try {
      await navigator.clipboard.writeText(lastGeneratedUrl);
    } catch {
      const area = document.createElement("textarea");
      area.value = lastGeneratedUrl;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    showStatus("已复制到剪贴板", "success");
  }

  function parseEncodedUrl(value) {
    const parsed = new URL(codec.normalizeHttpUrl(value));
    const parts = parsed.pathname.split("/").filter(Boolean);
    const modes = Object.values(codec.MODES);
    const modeIndex = parts.findIndex((part) => modes.includes(part));

    if (modeIndex !== -1 && parts.length > modeIndex + 1) {
      return {
        mode: parts[modeIndex],
        payload: decodeURIComponent(parts.slice(modeIndex + 1).join("/"))
      };
    }

    const hashMatch = parsed.hash.match(/^#\/(p|look|githubio)\/(.+)$/s);
    if (hashMatch) {
      return { mode: hashMatch[1], payload: decodeURIComponent(hashMatch[2]) };
    }

    throw new Error("没有在网址中找到可识别的编码");
  }

  function decodeManually() {
    clearStatus();
    elements.decoded.hidden = true;
    try {
      const { mode, payload } = parseEncodedUrl(elements.decodeInput.value);
      const decoded = codec.decode(payload, mode);
      if (!codec.isSafeHttpUrl(decoded)) throw new Error("解码结果不是 HTTP(S) 网址");
      elements.decoded.textContent = decoded;
      elements.decoded.href = decoded;
      elements.decoded.hidden = false;
    } catch (error) {
      showStatus(error.message || "解码失败", "error");
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    elements.theme.setAttribute("aria-label", theme === "dark" ? "切换到浅色模式" : "切换到深色模式");
    elements.theme.textContent = theme === "dark" ? "☀︎" : "◐";
  }

  function initializeTheme() {
    const saved = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(saved || (systemDark ? "dark" : "light"));
  }

  function showLegacyHashDestination() {
    const match = window.location.hash.match(/^#\/(p|look|githubio)\/(.+)$/s);
    if (!match) return false;

    document.body.classList.add("redirecting");
    try {
      const destination = codec.decode(decodeURIComponent(match[2]), match[1]);
      if (!codec.isSafeHttpUrl(destination)) throw new Error("解码结果不是 HTTP(S) 网址");
      const parsedDestination = new URL(destination);
      elements.redirectHost.textContent = parsedDestination.hostname;
      elements.redirectTarget.textContent = destination;
      elements.continueButton.href = destination;
      elements.cancelButton.href = baseUrl();
    } catch (error) {
      document.body.classList.remove("redirecting");
      showStatus(`无法读取：${error.message}`, "error");
      history.replaceState(null, "", baseUrl());
    }
    return true;
  }

  elements.form.addEventListener("submit", generate);
  elements.copy.addEventListener("click", copyGenerated);
  elements.decodeButton.addEventListener("click", decodeManually);
  elements.decodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      decodeManually();
    }
  });
  elements.theme.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (elements.input.value.trim()) elements.form.requestSubmit();
    });
  });

  initializeTheme();
  showLegacyHashDestination();
})();
