import { describe, it, expect } from "vitest";
import {
  sanitize,
  maskApiKeys,
  maskPasswords,
  maskTokens,
} from "../../src/utils/sanitizer.js";

describe("sanitizer", () => {
  describe("sanitize", () => {
    it("APIキーをマスクする", () => {
      const input = "api_key=sk-1234567890abcdef";
      const result = sanitize(input);
      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("sk-1234567890abcdef");
    });

    it("パスワードをマスクする", () => {
      const input = 'password: "my-secret-password"';
      const result = sanitize(input);
      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("my-secret-password");
    });

    it("Bearer認証ヘッダーをマスクする", () => {
      const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const result = sanitize(input);
      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it("Basic認証ヘッダーをマスクする", () => {
      const input = "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=";
      const result = sanitize(input);
      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("dXNlcm5hbWU6cGFzc3dvcmQ=");
    });

    it("複数の機密情報を同時にマスクする", () => {
      const input = `
        api_key = "abc123"
        password: secret123
        Authorization: Bearer token123
      `;
      const result = sanitize(input);
      expect(result).not.toContain("abc123");
      expect(result).not.toContain("secret123");
      expect(result).not.toContain("token123");
    });

    it("機密情報がない場合はそのまま返す", () => {
      const input = "This is a normal message without secrets";
      const result = sanitize(input);
      expect(result).toBe(input);
    });
  });

  describe("maskApiKeys", () => {
    it("api_key形式をマスクする", () => {
      const input = "api_key=sk-1234567890abcdef";
      const result = maskApiKeys(input);
      expect(result).toContain("[REDACTED]");
    });

    it("apikey形式をマスクする", () => {
      const input = "apikey: my-api-key-value";
      const result = maskApiKeys(input);
      expect(result).toContain("[REDACTED]");
    });

    it("API_KEY形式（大文字）をマスクする", () => {
      const input = "API_KEY=secret_key_value";
      const result = maskApiKeys(input);
      expect(result).toContain("[REDACTED]");
    });
  });

  describe("maskPasswords", () => {
    it("password形式をマスクする", () => {
      const input = 'password: "my-secret"';
      const result = maskPasswords(input);
      expect(result).toContain("[REDACTED]");
    });

    it("secret形式をマスクする", () => {
      const input = "secret=mysecretvalue";
      const result = maskPasswords(input);
      expect(result).toContain("[REDACTED]");
    });

    it("PASSWORD形式（大文字）をマスクする", () => {
      const input = "PASSWORD=admin123";
      const result = maskPasswords(input);
      expect(result).toContain("[REDACTED]");
    });
  });

  describe("maskTokens", () => {
    it("token形式をマスクする", () => {
      const input = "token=abc123xyz";
      const result = maskTokens(input);
      expect(result).toContain("[REDACTED]");
    });

    it("Bearer認証をマスクする", () => {
      const input = "Bearer eyJhbGciOiJIUzI1NiJ9";
      const result = maskTokens(input);
      expect(result).toContain("[REDACTED]");
    });

    it("Basic認証をマスクする", () => {
      const input = "Basic dXNlcm5hbWU6cGFzcw==";
      const result = maskTokens(input);
      expect(result).toContain("[REDACTED]");
    });
  });
});
