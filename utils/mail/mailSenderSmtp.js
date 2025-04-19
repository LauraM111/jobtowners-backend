const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

/**
 * Mail Sender Utility
 * A standalone utility to send emails using SMTP
 */
class MailSenderSmtp {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
      port: config.port || process.env.MAILGUN_SMTP_PORT || 587,
      secure: config.secure || false,
      auth: {
        user: config.username || process.env.MAILGUN_SMTP_USERNAME || '',
        pass: config.password || process.env.MAILGUN_SMTP_PASSWORD || ''
      },
      fromEmail: config.fromEmail || process.env.MAIL_FROM_ADDRESS || '',
      fromName: config.fromName || process.env.MAIL_FROM_NAME || 'JobTowners'
    };

    // Log configuration (without sensitive info)
    console.log(`Mail SMTP configuration:
      Host: ${this.config.host}
      Port: ${this.config.port}
      Secure: ${this.config.secure}
      Username: ${this.config.auth.user}
      From: ${this.config.fromEmail}
      Name: ${this.config.fromName}
    `);

    // Create SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass
      }
    });

    this.templatesDir = config.templatesDir || path.join(__dirname, 'templates');
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} [options.text] - Plain text content
   * @param {string} [options.html] - HTML content
   * @param {string} [options.template] - Template name (without extension)
   * @param {Object} [options.context] - Template context data
   * @param {Array} [options.attachments] - Email attachments
   * @returns {Promise<Object>} - Nodemailer send result
   */
  async sendMail(options) {
    try {
      const { to, subject, text, html, template, context, attachments } = options;
      
      let mailHtml = html;
      
      // If template is provided, use it to generate HTML
      if (template && context) {
        const templatePath = path.join(this.templatesDir, `${template}.hbs`);
        
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          const compiledTemplate = handlebars.compile(templateContent);
          mailHtml = compiledTemplate(context);
        } else {
          console.warn(`Template not found: ${templatePath}`);
        }
      }
      
      // Prepare email options
      const mailOptions = {
        from: {
          name: this.config.fromName,
          address: this.config.fromEmail
        },
        to,
        subject,
        text,
        html: mailHtml,
        attachments
      };
      
      console.log(`Sending email to: ${to}`);
      
      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`Email sent: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send a welcome email
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @param {string} [loginUrl] - Login URL
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(to, name, loginUrl = 'http://localhost:3000/login') {
    return this.sendMail({
      to,
      subject: 'Welcome to JobTowners!',
      template: 'welcome',
      context: {
        name,
        loginUrl,
        year: new Date().getFullYear()
      }
    });
  }

  /**
   * Send a password reset email
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @param {string} token - Reset token
   * @param {string} [baseUrl] - Base URL for reset link
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetEmail(to, name, token, baseUrl = 'http://localhost:3000') {
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    return this.sendMail({
      to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        name,
        resetUrl,
        year: new Date().getFullYear()
      }
    });
  }

  /**
   * Send a notification email
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @param {string} message - Notification message
   * @param {string} [actionUrl] - Action URL
   * @returns {Promise<Object>} - Send result
   */
  async sendNotificationEmail(to, name, message, actionUrl) {
    return this.sendMail({
      to,
      subject: 'New Notification',
      template: 'notification',
      context: {
        name,
        message,
        actionUrl,
        year: new Date().getFullYear()
      }
    });
  }

  /**
   * Send a simple test email
   * @param {string} to - Recipient email
   * @returns {Promise<Object>} - Send result
   */
  async sendTestEmail(to) {
    return this.sendMail({
      to,
      subject: 'Test Email from JobTowners',
      text: 'This is a test email from JobTowners.',
      html: '<p>This is a test email from <b>JobTowners</b>.</p>'
    });
  }
}

module.exports = MailSenderSmtp; 