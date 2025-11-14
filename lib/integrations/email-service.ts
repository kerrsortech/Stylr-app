import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';
import { logger } from '@/lib/utils/logger';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface TicketEmailData {
  ticketId: string;
  shopDomain: string;
  issueCategory: string;
  issueDescription: string;
  customerEmail?: string;
  customerName?: string;
  customerId?: string;
  adminEmail?: string; // Organization's admin email
}

/**
 * Send ticket creation email to admin
 */
export async function sendTicketEmail(data: TicketEmailData): Promise<void> {
  if (!process.env.SENDGRID_API_KEY || !process.env.ADMIN_EMAIL) {
    logger.warn('Email service not configured', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      hasAdminEmail: !!process.env.ADMIN_EMAIL,
    });
    return;
  }

  try {
    // Use organization's admin email if provided, otherwise fallback to default
    const adminEmail = data.adminEmail || process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      logger.warn('No admin email configured', { shopDomain: data.shopDomain });
      return;
    }
    
    const customerInfo = [
      data.customerName && `<strong>Customer Name:</strong> ${data.customerName}`,
      data.customerEmail && `<strong>Customer Email:</strong> ${data.customerEmail}`,
      data.customerId && `<strong>Customer ID:</strong> ${data.customerId}`,
    ].filter(Boolean).join('<br>') || 'Not provided';

    const msg: MailDataRequired = {
      to: adminEmail,
      from: adminEmail, // Must be verified in SendGrid
      subject: `New Support Ticket: ${data.ticketId} - ${data.shopDomain}`,
      html: `
        <h2>New Support Ticket Created</h2>
        <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
        <p><strong>Shop Domain:</strong> ${data.shopDomain}</p>
        <p><strong>Category:</strong> ${data.issueCategory}</p>
        <p>${customerInfo}</p>
        <hr>
        <h3>Issue Description:</h3>
        <p>${data.issueDescription.replace(/\n/g, '<br>')}</p>
      `,
      text: `
New Support Ticket Created

Ticket ID: ${data.ticketId}
Shop Domain: ${data.shopDomain}
Category: ${data.issueCategory}
${data.customerName ? `Customer Name: ${data.customerName}` : ''}
${data.customerEmail ? `Customer Email: ${data.customerEmail}` : ''}
${data.customerId ? `Customer ID: ${data.customerId}` : ''}

Issue Description:
${data.issueDescription}
      `,
    };

    await sgMail.send(msg);
    logger.info('Ticket email sent', { ticketId: data.ticketId });
  } catch (error: any) {
    logger.error('Failed to send ticket email', error);
    throw error;
  }
}

