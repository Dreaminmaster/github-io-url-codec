(() => {
  "use strict";

  const MARKER = "TXT1:";
  const MODES = Object.freeze({
    P_RUNS: "p",
    LOOKALIKE: "look",
    GITHUB_IO: "githubio"
  });
  const LOOKALIKE = ["p", "ρ", "р", "ᴘ"];

  function toDigits(text) {
    const bytes = new TextEncoder().encode(MARKER + String(text));
    const digits = [];
    for (const byte of bytes) {
      digits.push((byte >> 6) & 3, (byte >> 4) & 3, (byte >> 2) & 3, byte & 3);
    }
    return digits;
  }

  function fromDigits(digits) {
    if (!digits.length || digits.length % 4 !== 0) throw new Error("编码长度不完整");
    const bytes = new Uint8Array(digits.length / 4);
    for (let i = 0; i < digits.length; i += 4) {
      const group = digits.slice(i, i + 4);
      if (group.some((n) => !Number.isInteger(n) || n < 0 || n > 3)) {
        throw new Error("编码中包含无效内容");
      }
      bytes[i / 4] = group[0] * 64 + group[1] * 16 + group[2] * 4 + group[3];
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!decoded.startsWith(MARKER)) throw new Error("这不是本页面生成的编码");
    return decoded.slice(MARKER.length);
  }

  function encode(text, mode) {
    const digits = toDigits(text);
    if (mode === MODES.P_RUNS) return digits.map((n) => "p".repeat(n + 1)).join(".");
    if (mode === MODES.LOOKALIKE) return digits.map((n) => LOOKALIKE[n]).join("");
    if (mode === MODES.GITHUB_IO) {
      return digits.map((n) => Array.from({ length: n + 1 }, () => "github.io").join(".")).join("/");
    }
    throw new Error("未知编码模式");
  }

  function decode(payload, mode) {
    let digits;
    if (mode === MODES.P_RUNS) {
      if (!payload || !/^[p.]+$/.test(payload)) throw new Error("重复 p 编码格式不正确");
      digits = payload.split(".").map((group) => {
        if (!/^p{1,4}$/.test(group)) throw new Error("每组必须由 1 至 4 个 p 组成");
        return group.length - 1;
      });
    } else if (mode === MODES.LOOKALIKE) {
      const reverse = new Map(LOOKALIKE.map((char, index) => [char, index]));
      digits = Array.from(payload || "").map((char) => {
        if (!reverse.has(char)) throw new Error("相似 p 编码中包含无法识别的字符");
        return reverse.get(char);
      });
    } else if (mode === MODES.GITHUB_IO) {
      if (!payload) throw new Error("重复 github.io 编码为空");
      digits = payload.split("/").filter(Boolean).map((group) => {
        if (!/^(?:github\.io)(?:\.github\.io){0,3}$/.test(group)) {
          throw new Error("每组必须重复 1 至 4 次 github.io");
        }
        return (group.match(/github\.io/g) || []).length - 1;
      });
    } else {
      throw new Error("未知编码模式");
    }
    return fromDigits(digits);
  }

  window.GlyphTextCodec = Object.freeze({ MODES, encode, decode });
})();