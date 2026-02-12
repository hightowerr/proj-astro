export interface CancellationResponse {
  success: boolean;
  refunded: boolean;
  amount: number;
  message: string;
  refundId?: string;
  error?: string;
  reason?: string;
}
