export interface ChatMessage {
  type: "chat";
  senderPublicKey: string;
  senderFingerprint: string;
  timestamp: number;
  body: string;
  signature: string;
}

export interface MessageVerificationResult {
  valid: boolean;
  reason?: string;
}
