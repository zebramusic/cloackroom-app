import nodemailer from 'nodemailer';
import type { HandoverReport } from '@/app/models/handover';

const gmailUser = process.env.GMAIL_USER?.trim();
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
  ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '')
  : undefined;

const transporter = gmailUser && gmailAppPassword
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })
  : null;

interface EmailAttachment {
  filename: string;
  content: string;
  encoding: string;
  cid?: string;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
  recipient?: string;
}

async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Check if email configuration is available
  if (!gmailUser || !gmailAppPassword || !transporter) {
    console.warn('Gmail configuration missing - emails will not be sent');
    return {
      success: false,
      error: 'Gmail configuration missing',
      recipient: options.to,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Cloakroom" <${gmailUser}>`,
      ...options,
    });
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId, recipient: options.to };
  } catch (error) {
    const err = error as { code?: string; response?: string } & Error;
    if (err?.code === 'EAUTH') {
      console.error('Failed to send email: invalid Gmail credentials (EAUTH).');
      return {
        success: false,
        error:
          'Invalid Gmail credentials. Update GMAIL_USER and GMAIL_APP_PASSWORD with a valid app password.',
        recipient: options.to,
      };
    }
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      recipient: options.to,
    };
  }
}

type PhotoEmailSection = {
  html: string;
  included: number;
  total: number;
};

const MAX_EMAIL_PHOTOS = 8;

function buildPhotoEmailAssets(
  photos?: string[] | null
): { section: PhotoEmailSection | null; attachments: EmailAttachment[] } {
  if (!Array.isArray(photos) || photos.length === 0) {
    return { section: null, attachments: [] };
  }

  const attachments: EmailAttachment[] = [];
  const blocks: string[] = [];
  let validPhotos = 0;

  for (const dataUrl of photos) {
    if (typeof dataUrl !== 'string') continue;
    const match = /^data:(.+?);base64,(.+)$/i.exec(dataUrl.trim());
    if (!match) continue;
    const [, mime, payload] = match;
    if (!mime || !payload) continue;
    validPhotos += 1;
    if (attachments.length >= MAX_EMAIL_PHOTOS) {
      continue;
    }
    const base64 = payload.replace(/\s+/g, '');
    if (!base64) continue;
    const extension = mime.split('/')[1]?.split('+')[0] || 'jpg';
    const index = attachments.length + 1;
    const cid = `handover-photo-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    attachments.push({
      filename: `handover-photo-${String(index).padStart(2, '0')}.${extension}`,
      content: base64,
      encoding: 'base64',
      cid,
      contentType: mime,
    });
    blocks.push(
      `<figure style="margin:0;flex:1 1 240px;max-width:260px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">` +
        `<img src="cid:${cid}" alt="Handover photo ${index}" style="display:block;width:100%;height:auto;object-fit:cover;" />` +
        `<figcaption style="padding:6px 8px;font-size:12px;color:#475569;background:#f8fafc;">Photo ${index}</figcaption>` +
      `</figure>`
    );
  }

  if (!attachments.length) {
    return { section: null, attachments: [] };
  }

  const html = `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin:-6px 0 0;">
      ${blocks.join('')}
    </div>
  `;

  return {
    section: {
      html,
      included: attachments.length,
      total: validPhotos,
    },
    attachments,
  };
}

function generateClientEmailHtml(
  handover: HandoverReport,
  photoSection?: PhotoEmailSection | null
): string {
  const language = handover.language || 'ro';
  
  const content = {
    ro: {
      subject: `Confirmare predare haine - #${handover.coatNumber}`,
      greeting: `Bună ziua ${handover.fullName},`,
      message: `Vă confirmăm că am predat către dumneavoastră următorul articol cu numărul <strong>#${handover.coatNumber}</strong>.`,
      details: 'Detalii predare:',
      coatNumber: 'Numărul articolului',
      clientName: 'Nume client',
      phone: 'Telefon',
      email: 'Email',
      clothType: 'Tip îmbrăcăminte',
      staff: 'Personal responsabil',
      event: 'Eveniment',
      notes: 'Note',
      footer: 'Acest email este dovada predării articolului către dumneavoastră. Datele vor rămâne stocate în sistemul nostru pentru a facilita rezolvarea unor eventuale reclamații ulterioare.',
      signature: 'Cu stimă,<br>Echipa Cloakroom',
      photosHeading: 'Fotografii capturate',
      photosNoteMore:
        '{count} fotografii suplimentare sunt disponibile în aplicație.'
    },
    en: {
      subject: `Coat Check Confirmation - #${handover.coatNumber}`,
      greeting: `Hello ${handover.fullName},`,
      message: `We hereby confirm that we have submitted to you the following item, identified by the number <strong>#${handover.coatNumber}</strong>.`,
      details: 'Handover details:',
      coatNumber: 'Coat Number',
      clientName: 'Client Name',
      phone: 'Phone',
      email: 'Email',
      clothType: 'Clothing Type',
      staff: 'Staff Member',
      event: 'Event',
      notes: 'Notes',
      footer: 'This email serves as proof of the submission of your item. The data will remain stored in our system to facilitate the resolution of any future claims.',
      signature: 'Best regards,<br>Cloakroom Team',
      photosHeading: 'Captured photos',
      photosNoteMore:
        '{count} additional photo(s) are available inside the dashboard.'
    }
  };
  
  const t = content[language];
  const extraPhotosCount = photoSection
    ? Math.max(photoSection.total - photoSection.included, 0)
    : 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #38bdf8; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-label { font-weight: bold; color: #475569; }
        .detail-value { color: #1e293b; }
        .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
        .coat-number { font-size: 24px; font-weight: bold; color: #0ea5e9; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cloakroom</h1>
        <div class="coat-number">#${handover.coatNumber}</div>
      </div>
      
      <div class="content">
        <p>${t.greeting}</p>
        <p>${t.message}</p>
        
        <h3>${t.details}</h3>
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">${t.coatNumber}:</span>
            <span class="detail-value">#${handover.coatNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">${t.clientName}:</span>
            <span class="detail-value">${handover.fullName}</span>
          </div>
          ${handover.phone ? `
          <div class="detail-row">
            <span class="detail-label">${t.phone}:</span>
            <span class="detail-value">${handover.phone}${handover.phoneVerified ? ' ✓' : ''}</span>
          </div>
          ` : ''}
          ${handover.email ? `
          <div class="detail-row">
            <span class="detail-label">${t.email}:</span>
            <span class="detail-value">${handover.email}</span>
          </div>
          ` : ''}
          ${handover.clothType ? `
          <div class="detail-row">
            <span class="detail-label">${t.clothType}:</span>
            <span class="detail-value">${handover.clothType}</span>
          </div>
          ` : ''}
          ${handover.staff ? `
          <div class="detail-row">
            <span class="detail-label">${t.staff}:</span>
            <span class="detail-value">${handover.staff}</span>
          </div>
          ` : ''}
          ${handover.eventName ? `
          <div class="detail-row">
            <span class="detail-label">${t.event}:</span>
            <span class="detail-value">${handover.eventName}</span>
          </div>
          ` : ''}
          ${handover.notes ? `
          <div class="detail-row">
            <span class="detail-label">${t.notes}:</span>
            <span class="detail-value">${handover.notes}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${new Date(handover.createdAt).toLocaleString()}</span>
          </div>
        </div>
        
        <p><strong>${t.footer}</strong></p>
        
        ${photoSection?.html ? `
        <h3>${t.photosHeading}</h3>
        ${photoSection.html}
        ${
          extraPhotosCount > 0
            ? `<p style="font-size:12px;color:#64748b;margin-top:8px;">${t.photosNoteMore.replace('{count}', String(extraPhotosCount))}</p>`
            : ''
        }
        ` : ''}

        <p>${t.signature}</p>
      </div>
      
      <div class="footer">
        <p>This is an automated message from Cloakroom system.</p>
      </div>
    </body>
    </html>
  `;
}

export async function sendHandoverClientEmail(
  handover: HandoverReport,
  options: { to?: string } = {}
): Promise<EmailResult> {
  const fallbackEmail = handover.email?.trim();
  const recipient = options.to?.trim() || fallbackEmail;

  if (!recipient) {
    console.log('No client email provided - skipping client notification');
    return { success: false, error: 'No client email provided' };
  }

  const { section: photoSection, attachments } = buildPhotoEmailAssets(
    handover.photos
  );
  const language = handover.language || 'ro';
  const subject = language === 'ro'
    ? `Confirmare predare haine - #${handover.coatNumber}`
    : `Coat Check Confirmation - #${handover.coatNumber}`;

  return sendEmail({
    to: recipient,
    subject,
    html: generateClientEmailHtml({ ...handover, email: recipient }, photoSection),
    attachments: attachments.length ? attachments : undefined,
  });
}

function generateAdminEmailHtml(
  handover: HandoverReport,
  photoSection?: PhotoEmailSection | null
): string {
  const extraPhotosCount = photoSection
    ? Math.max(photoSection.total - photoSection.included, 0)
    : 0;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-label { font-weight: bold; color: #475569; }
        .detail-value { color: #1e293b; }
        .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
        .coat-number { font-size: 24px; font-weight: bold; color: #fecaca; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; margin: 10px 0; color: #b91c1c; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Handover Alert</h1>
        <div class="coat-number">#${handover.coatNumber}</div>
      </div>
      
      <div class="content">
        <div class="alert">
          <strong>New handover created:</strong> A clothing item missing its original label has been identified and returned to the owner. This document serves as confirmation of the return.
        </div>
        
        <h3>Handover Details:</h3>
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Coat Number:</span>
            <span class="detail-value">#${handover.coatNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Client Name:</span>
            <span class="detail-value">${handover.fullName}</span>
          </div>
          ${handover.phone ? `
          <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${handover.phone}${handover.phoneVerified ? ' (verified)' : ''}</span>
          </div>
          ` : ''}
          ${handover.email ? `
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${handover.email}</span>
          </div>
          ` : ''}
          ${handover.clothType ? `
          <div class="detail-row">
            <span class="detail-label">Clothing Type:</span>
            <span class="detail-value">${handover.clothType}</span>
          </div>
          ` : ''}
          ${handover.staff ? `
          <div class="detail-row">
            <span class="detail-label">Staff Member:</span>
            <span class="detail-value">${handover.staff}</span>
          </div>
          ` : ''}
          ${handover.eventName ? `
          <div class="detail-row">
            <span class="detail-label">Event:</span>
            <span class="detail-value">${handover.eventName}</span>
          </div>
          ` : ''}
          ${handover.notes ? `
          <div class="detail-row">
            <span class="detail-label">Notes:</span>
            <span class="detail-value">${handover.notes}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Created:</span>
            <span class="detail-value">${new Date(handover.createdAt).toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Photos:</span>
            <span class="detail-value">${handover.photos?.length || 0} attached</span>
          </div>
        </div>
        
        <p><strong>Action Required:</strong> Review the handover details and ensure proper storage of the item.</p>

        ${photoSection?.html ? `
        <h3>Captured Photos</h3>
        ${photoSection.html}
        ${
          extraPhotosCount > 0
            ? `<p style="font-size:12px;color:#64748b;margin-top:8px;">${extraPhotosCount} additional photo(s) stored with this handover.</p>`
            : ''
        }
        ` : ''}
      </div>
      
      <div class="footer">
        <p>This notification was sent from the Cloakroom management system.</p>
      </div>
    </body>
    </html>
  `;
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const { getDb } = await import('@/lib/mongodb');
    const db = await getDb();
    
    if (!db) {
      console.warn('Database not available - cannot fetch admin emails');
      return [];
    }

    type AdminUser = {
      id: string;
      fullName: string;
      email: string;
      passwordHash: string;
      createdAt: number;
    };

    const adminUsers = await db.collection<AdminUser>('admins')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    const emails = adminUsers
      .map((admin: AdminUser) => admin.email)
      .filter((email: string) => email && email.trim())
      .map((email: string) => email.trim());
    
    console.log(`Found ${emails.length} admin email addresses`);
    return emails;
  } catch (error) {
    console.error('Failed to fetch admin emails from database:', error);
    return [];
  }
}

export async function sendHandoverEmails(handover: HandoverReport) {
  console.log(`Sending handover emails for #${handover.coatNumber}`);
  
  const results: {
    client: EmailResult;
    admin: EmailResult;
  } = {
    client: { success: false },
    admin: { success: false },
  };

  // Send email to client if email is provided
  if (handover.email) {
    console.log(`Sending client email to: ${handover.email}`);
    const clientResult = await sendHandoverClientEmail(handover);
    
    results.client = clientResult;
  } else {
    console.log('No client email provided - skipping client notification');
    results.client = {
      success: false,
      error: 'No client email provided',
      recipient: undefined,
    };
  }

  // Send notification to all admin users in the database
  const adminEmails = await getAdminEmails();
  
  if (adminEmails.length > 0) {
    console.log(`Sending admin email to: ${adminEmails.join(', ')}`);
    const { section: adminPhotoSection, attachments: adminAttachments } =
      buildPhotoEmailAssets(handover.photos);
    const adminResult = await sendEmail({
      to: adminEmails.join(','),
      subject: `New Handover Alert - #${handover.coatNumber}`,
      html: generateAdminEmailHtml(handover, adminPhotoSection),
      attachments: adminAttachments.length ? adminAttachments : undefined,
    });
    
    results.admin = adminResult;
  } else {
    console.log('No admin users found in database - skipping admin notification');
    results.admin = {
      success: false,
      error: 'No admin users found in database',
      recipient: undefined,
    };
  }

  console.log('Email sending completed:', results);
  return results;
}