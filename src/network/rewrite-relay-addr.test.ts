import { describe, it, expect } from "vitest";
import { rewriteRelayAddr } from "./rewrite-relay-addr.js";

const RAW = "/ip4/172.17.0.2/tcp/9001/ws/p2p/12D3KooWPcgnc5u3n8Q2cbCipN2JLEKfSaMmis2BqkU2XP7x4rra";

describe("rewriteRelayAddr", () => {
  it("uses /dns4/ for hostnames in WSS mode", () => {
    const result = rewriteRelayAddr(RAW, "homer-prime", "8443", true, "9001");
    expect(result).toBe(
      "/dns4/homer-prime/tcp/8443/wss/p2p/12D3KooWPcgnc5u3n8Q2cbCipN2JLEKfSaMmis2BqkU2XP7x4rra",
    );
  });

  it("uses /ip4/ for IP addresses in WSS mode", () => {
    const result = rewriteRelayAddr(RAW, "108.16.112.7", "36443", true, "9001");
    expect(result).toBe(
      "/ip4/108.16.112.7/tcp/36443/wss/p2p/12D3KooWPcgnc5u3n8Q2cbCipN2JLEKfSaMmis2BqkU2XP7x4rra",
    );
  });

  it("uses /ip4/ for localhost in plain mode", () => {
    const result = rewriteRelayAddr(RAW, "127.0.0.1", "8443", false, "9001");
    expect(result).toBe(
      "/ip4/127.0.0.1/tcp/9001/ws/p2p/12D3KooWPcgnc5u3n8Q2cbCipN2JLEKfSaMmis2BqkU2XP7x4rra",
    );
  });

  it("replaces port correctly in WSS mode", () => {
    const result = rewriteRelayAddr(RAW, "example.com", "443", true, "9001");
    expect(result).toContain("/tcp/443/wss/");
  });

  it("replaces port with wsPort in plain mode", () => {
    const result = rewriteRelayAddr(RAW, "127.0.0.1", "8443", false, "5555");
    expect(result).toContain("/tcp/5555/ws/");
  });

  it("handles dns4 in raw addr for WSS mode with IP host", () => {
    const rawDns = "/dns4/internal.host/tcp/9001/ws/p2p/12D3KooWPcgnc5u3n8Q2cbCipN2JLEKfSaMmis2BqkU2XP7x4rra";
    const result = rewriteRelayAddr(rawDns, "10.0.0.1", "8443", true, "9001");
    expect(result).toContain("/ip4/10.0.0.1/");
  });
});
