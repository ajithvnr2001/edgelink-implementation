/**
 * Payment History Handler
 * Returns user's payment history for subscription timeline display
 */

import type { Env } from '../../types';

export async function handleGetPaymentHistory(
  env: Env,
  userId: string
): Promise<Response> {
  try {
    console.log('[PaymentHistory] Fetching payment history for user:', userId);

    // Fetch all payments for this user from the database
    const result = await env.DB.prepare(`
      SELECT
        payment_id,
        amount,
        currency,
        status,
        plan,
        invoice_url,
        receipt_url,
        created_at
      FROM payments
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all();

    const payments = result.results.map((payment: any) => ({
      payment_id: payment.payment_id,
      amount: payment.amount,
      currency: payment.currency || 'usd',
      status: payment.status,
      plan: payment.plan,
      invoice_url: payment.invoice_url,
      receipt_url: payment.receipt_url,
      created_at: payment.created_at
    }));

    console.log(`[PaymentHistory] Found ${payments.length} payments for user`);

    return new Response(
      JSON.stringify({
        payments,
        total: payments.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[PaymentHistory] Error fetching payment history:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch payment history',
        code: 'HISTORY_FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
