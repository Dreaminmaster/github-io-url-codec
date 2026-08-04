(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.UrlGlyphCodec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PREFIX = "GIO1:";
  const LOOKALIKE_ALPHABET = ["p", "ρ", "р", "ᴘ"];
  const MODES = Object.freeze({
    P_RUNS: "p",
    LOOKALIKE: "look",
    GITHUB_IO: "githubio"
  });

  function textToDigits(text) {
    const bytes = new TextEncoder().encode(PREFIX + text);
    const digits = [];
    for (const byte of bytes) {
      digits.push((byte >> 6) & 3, (byte >> 4) & 3, (byte >> 2) & 3, byte & 3);
    }
    return digits;
  }

  function digitsToText(digits) {
    if (!Array.isArray(digits) || digits.length === 0 || digits.length % 4 !== 0) {
      throw new Error("编码长度不完整");
    }

    const bytes = new Uint8Array(digits.length / 4);
    for (let i = 0; i < digits.length; i += 4) {
      const a = digits[i];
      const b = digits[i + 1];
      const c = digits[i + 2];
      const d = digits[i + 3];
      if ([a, b, c, d].some((value) => !Number.isInteger(value) || value < 0 || value > 3)) {
        throw new Error("编码中包含无效内容");
      }
      bytes[i / 4] = a * 64 + b * 16 + c * 4 + d;
    }

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("编码不是有效的 UTF-8 数据");
    }

    if (!text.startsWith(PREFIX)) throw new Error("这不是本工具生成的编码");
    return text.slice(PREFIX.length);
  }

  function encodePRuns(text) {
    return textToDigits(text).map((digit) => "p".repeat(digit + 1)).join(".");
  }

  function decodePRuns(payload) {
    if (!payload || !/^[p.]+$/.test(payload)) throw new Error("重复 p 编码格式不正确");
    const groups = payload.split(".");
    const digits = groups.map((group) => {
      if (group.length < 1 || group.length > 4 || !/^p+$/.test(group)) {
        throw new Error("每组必须由 1 至 4 个 p 组成");
      }
      return group.length - 1;
    });
    return digitsToText(digits);
  }

  function encodeLookalike(text) {
    return textToDigits(text).map((digit) => LOOKALIKE_ALPHABET[digit]).join("");
  }

  function decodeLookalike(payload) {
    const reverse = new Map(LOOKALIKE_ALPHABET.map((char, index) => [char, index]));
    const chars = Array.from(payload || "");
    const digits = chars.map((char) => {
      if (!reverse.has(char)) throw new Error("相似 p 编码中包含无法识别的字符");
      return reverse.get(char);
    });
    return digitsToText(digits);
  }

  function encodeGithubIo(text) {
    return textToDigits(text)
      .map((digit) => Array.from({ length: digit + 1 }, () => "github.io").join("."))
      .join("/");
  }

  function decodeGithubIo(payload) {
    if (!payload) throw new Error("重复 github.io 编码为空");
    const groups = payload.split("/").filter(Boolean);
    const digits = groups.map((group) => {
      if (!/^(?:github\.io)(?:\.github\.io){0,3}$/.test(group)) {
        throw new Error("每组必须重复 1 至 4 次 github.io");
      }
      return (group.match(/github\.io/g) || []).length - 1;
    });
    return digitsToText(digits);
  }

  function encode(text, mode) {
    if (mode === MODES.P_RUNS) return encodePRuns(text);
    if (mode === MODES.LOOKALIKE) return encodeLookalike(text);
    if (mode === MODES.GITHUB_IO) return encodeGithubIo(text);
    throw new Error("未知编码模式");
  }

  function decode(payload, mode) {
    if (mode === MODES.P_RUNS) return decodePRuns(payload);
    if (mode === MODES.LOOKALIKE) return decodeLookalike(payload);
    if (mode === MODES.GITHUB_IO) return decodeGithubIo(payload);
    throw new Error("未知编码模式");
  }

  function normalizeHttpUrl(value) {
    let candidate = String(value || "").trim();
    if (!candidate) throw new Error("请输入网址");
    if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error("网址格式不正确");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("只支持 http:// 和 https:// 网址");
    }
    return parsed.href;
  }

  function isSafeHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  return Object.freeze({
    MODES,
    LOOKALIKE_ALPHABET,
    encode,
    decode,
    normalizeHttpUrl,
    isSafeHttpUrl
  });
});
