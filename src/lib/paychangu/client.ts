import { createHmac, timingSafeEqual } from 'crypto'

const PAYCHANGU_API = 'https://api.paychangu.com/v1'
const PAYCHANGU_API_SANDBOX = 'https://api.paychangu.com/sandbox/v1'

function getBaseUrl(): string {
  return process.env.NODE_ENV === 'production' ? PAYCHANGU_API : PAYCHANGU_API_SANDBOX
}

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY!}`,
  }
}

export interface InitiatePaymentParams {
  amount: number
  currency?: string
  reference: string
  callback_url: string
  return_url: string
  customer: {
    email: string
    name?: string
  }
}

export interface PayChanguResponse {
  status: string
  message: string
  data?: {
    checkout_url: string
    reference: string
  }
}

export async function initiatePayment(params: InitiatePaymentParams): Promise<PayChanguResponse> {
  const response = await fetch(`${getBaseUrl()}/charges`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency || 'MWK',
      tx_ref: params.reference,
      callback_url: params.callback_url,
      return_url: params.return_url,
      customer: params.customer,
    }),
  })

  return response.json()
}

export interface PayoutParams {
  amount: number
  reference: string
  bank_code: string
  account_number: string
  account_name: string
}

export async function sendPayout(params: PayoutParams): Promise<PayChanguResponse> {
  const response = await fetch(`${getBaseUrl()}/transfers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount: params.amount,
      currency: 'MWK',
      tx_ref: params.reference,
      bank_code: params.bank_code,
      account_number: params.account_number,
      account_name: params.account_name,
    }),
  })

  return response.json()
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function verifyPaymentStatus(reference: string): Promise<PayChanguResponse> {
  const response = await fetch(`${getBaseUrl()}/transactions/${reference}/verify`, {
    headers: getHeaders(),
  })
  return response.json()
}
