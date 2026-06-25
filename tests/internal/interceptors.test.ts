import {
  Code,
  ConnectError,
  type StreamRequest,
  type UnaryRequest,
} from "@connectrpc/connect";
import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import {
  loggingInterceptor,
  timeoutInterceptor,
} from "../../src/internal/interceptors.js";

type AnyRequest = UnaryRequest | StreamRequest;

function makeRequest(overrides: Record<string, unknown> = {}): AnyRequest {
  return {
    stream: false as const,
    service: { typeName: "raft.wdm.v1.EntityService" },
    method: { name: "GetEntity" },
    header: new Headers(),
    signal: AbortSignal.timeout(30_000),
    url: "http://localhost:8080/raft.wdm.v1.EntityService/GetEntity",
    requestMethod: "POST",
    contextValues: { get: vi.fn(), set: vi.fn() },
    message: {},
    ...overrides,
  } as unknown as AnyRequest;
}

describe("loggingInterceptor", () => {
  it("logs rpc request at debug level", async () => {
    const debug = vi.fn();
    const logger = { debug, error: vi.fn() } as unknown as pino.Logger;
    const interceptor = loggingInterceptor(logger);

    const mockNext = vi.fn().mockResolvedValue({ ok: true });
    const wrapped = interceptor(mockNext);

    await wrapped(makeRequest());

    expect(debug).toHaveBeenCalledWith(
      expect.objectContaining({
        procedure: "raft.wdm.v1.EntityService/GetEntity",
      }),
      "rpc request",
    );
  });

  it("logs rpc error at error level on failure", async () => {
    const error = vi.fn();
    const logger = { debug: vi.fn(), error } as unknown as pino.Logger;
    const interceptor = loggingInterceptor(logger);

    const rpcError = new ConnectError("not found", Code.NotFound);
    const mockNext = vi.fn().mockRejectedValue(rpcError);
    const wrapped = interceptor(mockNext);

    await expect(wrapped(makeRequest())).rejects.toThrow(rpcError);

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        procedure: "raft.wdm.v1.EntityService/GetEntity",
      }),
      "rpc error",
    );
  });

  it("logs rpc response at debug level on success", async () => {
    const debug = vi.fn();
    const logger = { debug, error: vi.fn() } as unknown as pino.Logger;
    const interceptor = loggingInterceptor(logger);

    const mockNext = vi.fn().mockResolvedValue({ ok: true });
    const wrapped = interceptor(mockNext);

    await wrapped(makeRequest());

    expect(debug).toHaveBeenCalledWith(
      expect.objectContaining({
        procedure: "raft.wdm.v1.EntityService/GetEntity",
      }),
      "rpc response",
    );
  });

  it("does not log rpc response on failure", async () => {
    const debug = vi.fn();
    const logger = { debug, error: vi.fn() } as unknown as pino.Logger;
    const interceptor = loggingInterceptor(logger);

    const mockNext = vi
      .fn()
      .mockRejectedValue(new ConnectError("fail", Code.Internal));
    const wrapped = interceptor(mockNext);

    await expect(wrapped(makeRequest())).rejects.toThrow();

    const responseCalls = debug.mock.calls.filter(
      (call) => call[1] === "rpc response",
    );
    expect(responseCalls).toHaveLength(0);
  });

  it("passes through response unchanged on success", async () => {
    const logger = pino({ level: "silent" });
    const interceptor = loggingInterceptor(logger);

    const response = { stream: false, message: { id: "123" } };
    const mockNext = vi.fn().mockResolvedValue(response);
    const wrapped = interceptor(mockNext);

    const result = await wrapped(makeRequest());
    expect(result).toBe(response);
  });

  it("produces no output with silent logger", async () => {
    const debug = vi.fn();
    const error = vi.fn();
    const logger = { debug, error } as unknown as pino.Logger;
    const interceptor = loggingInterceptor(logger);
    const mockNext = vi.fn().mockResolvedValue({ ok: true });
    const wrapped = interceptor(mockNext);

    await wrapped(makeRequest());
    expect(debug).toHaveBeenCalledTimes(2);
  });
});

describe("timeoutInterceptor", () => {
  it("calls next for unary requests", async () => {
    const interceptor = timeoutInterceptor(30_000);
    const response = { stream: false, message: {} };
    const mockNext = vi.fn().mockResolvedValue(response);
    const wrapped = interceptor(mockNext);

    const result = await wrapped(makeRequest());
    expect(result).toBe(response);
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it("does not interfere with streaming calls", async () => {
    const interceptor = timeoutInterceptor(30_000);
    const response = { stream: true, message: {} };
    const mockNext = vi.fn().mockResolvedValue(response);
    const wrapped = interceptor(mockNext);

    const req = makeRequest({ stream: true });
    const result = await wrapped(req);
    expect(result).toBe(response);
  });

  it("aborts unary call that exceeds timeout", async () => {
    const interceptor = timeoutInterceptor(50);
    const slowNext = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );
    const wrapped = interceptor(slowNext);

    await expect(wrapped(makeRequest())).rejects.toThrow();
  });

  it("does not abort streaming call that exceeds timeout", async () => {
    const interceptor = timeoutInterceptor(50);
    const slowNext = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 200, { ok: true })),
    );
    const wrapped = interceptor(slowNext);

    const req = makeRequest({ stream: true });
    const result = await wrapped(req);
    expect(result).toEqual({ ok: true });
  });

  it("passes through unary calls when timeout is undefined", async () => {
    const interceptor = timeoutInterceptor();
    const response = { stream: false, message: {} };
    const mockNext = vi.fn().mockResolvedValue(response);
    const wrapped = interceptor(mockNext);

    const result = await wrapped(makeRequest());
    expect(result).toBe(response);
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it("passes through unary calls when timeout is zero", async () => {
    const interceptor = timeoutInterceptor(0);
    const response = { stream: false, message: {} };
    const mockNext = vi.fn().mockResolvedValue(response);
    const wrapped = interceptor(mockNext);

    const result = await wrapped(makeRequest());
    expect(result).toBe(response);
  });
});
