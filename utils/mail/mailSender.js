const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const mailgunTransport = require('nodemailer-mailgun-transport');

/**
 * Mail Sender Utility
 * A standalone utility to send emails using Mailgun API
 */
class MailSender {
  constructor(config = {}) {
    // Ensure API key starts with "key-"
    let apiKey = config.mailgunApiKey || process.env.MAILGUN_API_KEY || '';
    if (apiKey && !apiKey.startsWith('key-')) {
      apiKey = `key-${apiKey}`;
      console.log('Added "key-" prefix to API key');
    }

    this.config = {
      fromEmail: config.fromEmail || process.env.MAIL_FROM_ADDRESS || 'default@example.com',
      fromName: config.fromName || process.env.MAIL_FROM_NAME || 'Default Name',
      mailgunApiKey: apiKey,
      mailgunDomain: config.mailgunDomain || process.env.MAILGUN_DOMAIN || ''
    };

    // Log configuration (without sensitive info)
    console.log(`Mail configuration:
      Domain: ${this.config.mailgunDomain}
      From: ${this.config.fromEmail}
      Name: ${this.config.fromName}
      API Key: ${this.config.mailgunApiKey ? this.config.mailgunApiKey.substring(0, 8) + '...' : 'Not provided'}
    `);

    // Use Mailgun API transport
    const mailgunOptions = {
      auth: {
        api_key: this.config.mailgunApiKey,
        domain: this.config.mailgunDomain
      }
    };

    console.log(`Configuring Mailgun with domain: ${this.config.mailgunDomain}`);
    this.transporter = nodemailer.createTransport(mailgunTransport(mailgunOptions));

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

module.exports = MailSender; 