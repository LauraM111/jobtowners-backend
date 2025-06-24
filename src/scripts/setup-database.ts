import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    console.log('Setting up database...');
    
    // Disable foreign key checks temporarily
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Create tables in the correct order
    console.log('Creating users table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        phoneNumber VARCHAR(255),
        userType ENUM('admin', 'user', 'candidate', 'employer') NOT NULL DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'inactive',
        studentPermitImage VARCHAR(255),
        proofOfEnrollmentImage VARCHAR(255),
        termsAccepted BOOLEAN DEFAULT false,
        isEmailVerified BOOLEAN DEFAULT false,
        isActive BOOLEAN DEFAULT false,
        stripeCustomerId VARCHAR(255),
        companyName VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating tokens table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id VARCHAR(36) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        expiresAt DATETIME NOT NULL,
        used BOOLEAN DEFAULT false,
        userId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating OTPs table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(255) NOT NULL,
        expiresAt DATETIME NOT NULL,
        used BOOLEAN DEFAULT false,
        userId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_otps_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating resumes table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id VARCHAR(36) PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        dob DATE,
        gender ENUM('Male', 'Female', 'Other'),
        maritalStatus VARCHAR(255),
        nationality VARCHAR(255),
        language VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        latitude FLOAT,
        longitude FLOAT,
        offeredSalary DECIMAL(10,2),
        yearsOfExperience FLOAT,
        qualification VARCHAR(255),
        professionalSkills VARCHAR(255),
        addressDetails TEXT,
        passionAndFutureGoals TEXT,
        videoUrl VARCHAR(255),
        cvUrl VARCHAR(255),
        userId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_resumes_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating education table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS education (
        id VARCHAR(36) PRIMARY KEY,
        institution VARCHAR(255) NOT NULL,
        degree VARCHAR(255) NOT NULL,
        fieldOfStudy VARCHAR(255),
        startDate DATE,
        endDate DATE,
        description TEXT,
        resumeId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_education_resume FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating experiences table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS experiences (
        id VARCHAR(36) PRIMARY KEY,
        position VARCHAR(255) NOT NULL,
        companyName VARCHAR(255) NOT NULL,
        startDate DATE,
        endDate DATE,
        description TEXT,
        resumeId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_experiences_resume FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating attachments table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id VARCHAR(36) PRIMARY KEY,
        fileName VARCHAR(255) NOT NULL,
        fileUrl VARCHAR(255) NOT NULL,
        description TEXT,
        resumeId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_attachments_resume FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating companies table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        companyName VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        industryType VARCHAR(255),
        website VARCHAR(255),
        foundedYear INT,
        companySize VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        alternatePhone VARCHAR(255),
        contactPerson VARCHAR(255),
        addressLine1 VARCHAR(255) NOT NULL,
        addressLine2 VARCHAR(255),
        city VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        postalCode VARCHAR(255) NOT NULL,
        latitude FLOAT,
        longitude FLOAT,
        gstNumber VARCHAR(255),
        panNumber VARCHAR(255),
        registrationNumber VARCHAR(255),
        logoUrl VARCHAR(255),
        coverImageUrl VARCHAR(255),
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        createdBy VARCHAR(36) NOT NULL,
        updatedBy VARCHAR(36),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME,
        CONSTRAINT fk_companies_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating subscription_plans table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        \`interval\` VARCHAR(255) NOT NULL DEFAULT 'month',
        intervalCount INT NOT NULL DEFAULT 1,
        currency VARCHAR(255) NOT NULL DEFAULT 'usd',
        stripeProductId VARCHAR(255),
        stripePriceId VARCHAR(255),
        features JSON,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        numberOfJobs INT NOT NULL DEFAULT 0,
        resumeViewsCount INT NOT NULL DEFAULT 0,
        skipStripe BOOLEAN NOT NULL DEFAULT false,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating subscriptions table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        planId VARCHAR(36) NOT NULL,
        stripeSubscriptionId VARCHAR(255),
        stripeCustomerId VARCHAR(255),
        startDate DATETIME NOT NULL,
        endDate DATETIME,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
        canceledAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME,
        CONSTRAINT fk_subscriptions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_subscriptions_plan FOREIGN KEY (planId) REFERENCES subscription_plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating jobs table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        jobTitle VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        jobDescription TEXT NOT NULL,
        emailAddress VARCHAR(255) NOT NULL,
        specialisms TEXT,
        category VARCHAR(255),
        jobType VARCHAR(255) NOT NULL DEFAULT 'full-time',
        offeredSalary VARCHAR(255),
        careerLevel VARCHAR(255),
        experience VARCHAR(255),
        gender VARCHAR(255) DEFAULT 'any',
        industry VARCHAR(255),
        qualification VARCHAR(255),
        applicationDeadlineDate DATETIME,
        country VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        latitude FLOAT,
        longitude FLOAT,
        postalCode VARCHAR(255),
        completeAddress TEXT,
        attachmentUrl VARCHAR(255),
        additionalAttachments TEXT,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        views INT NOT NULL DEFAULT 0,
        applications INT NOT NULL DEFAULT 0,
        verificationStatus VARCHAR(255) NOT NULL DEFAULT 'pending',
        rejectionReason TEXT,
        companyId VARCHAR(36),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME,
        CONSTRAINT fk_jobs_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_jobs_company FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating job_applications table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id VARCHAR(36) PRIMARY KEY,
        applicantId VARCHAR(36) NOT NULL,
        jobId VARCHAR(36) NOT NULL,
        resumeId VARCHAR(36) NOT NULL,
        status ENUM('pending', 'approved', 'reviewed', 'shortlisted', 'rejected', 'hired', 'withdrawn') NOT NULL DEFAULT 'pending',
        coverLetter TEXT,
        isResumeViewed BOOLEAN DEFAULT false,
        viewedAt DATETIME,
        viewedBy VARCHAR(36),
        adminNotes TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_job_applications_applicant FOREIGN KEY (applicantId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_job_applications_job FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
        CONSTRAINT fk_job_applications_resume FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating saved_jobs table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        jobId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_saved_jobs_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_saved_jobs_job FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_job (userId, jobId)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating candidate_plans table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS candidate_plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 15.00,
        currency VARCHAR(255) NOT NULL DEFAULT 'usd',
        stripeProductId VARCHAR(255),
        stripePriceId VARCHAR(255),
        dailyApplicationLimit INT NOT NULL DEFAULT 15,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating candidate_orders table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS candidate_orders (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        planId VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(255) NOT NULL DEFAULT 'usd',
        status VARCHAR(255) NOT NULL DEFAULT 'pending',
        stripePaymentIntentId VARCHAR(255),
        stripeCustomerId VARCHAR(255),
        paymentDate DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_candidate_orders_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_candidate_orders_plan FOREIGN KEY (planId) REFERENCES candidate_plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating application_limits table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS application_limits (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        dailyLimit INT NOT NULL DEFAULT 15,
        applicationsUsedToday INT NOT NULL DEFAULT 0,
        lastResetDate DATE NOT NULL,
        hasPaid BOOLEAN NOT NULL DEFAULT false,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_application_limits_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_limit (userId)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating conversations table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY,
        employerId VARCHAR(36) NOT NULL,
        candidateId VARCHAR(36) NOT NULL,
        jobApplicationId VARCHAR(36) NOT NULL,
        lastMessageAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_conversations_employer FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_conversations_candidate FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_conversations_job_application FOREIGN KEY (jobApplicationId) REFERENCES job_applications(id) ON DELETE CASCADE,
        UNIQUE KEY unique_employer_candidate_job (employerId, candidateId, jobApplicationId)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating messages table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        conversationId VARCHAR(36) NOT NULL,
        senderId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        isRead BOOLEAN DEFAULT false,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_messages_conversation FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_sender FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating message_attachments table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id VARCHAR(36) PRIMARY KEY,
        messageId VARCHAR(36) NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileType VARCHAR(100) NOT NULL,
        fileSize INT NOT NULL,
        fileUrl VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_message_attachments_message FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Add the contact_submissions table
    console.log('Creating contact_submissions table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new', 'read', 'responded') NOT NULL DEFAULT 'new',
        respondedAt DATETIME,
        respondedBy VARCHAR(36),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_contact_submissions_responder FOREIGN KEY (respondedBy) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Add the community tables
    console.log('Creating community_posts table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        postType ENUM('candidate', 'employer', 'general') NOT NULL,
        authorId VARCHAR(36) NOT NULL,
        status ENUM('active', 'pending', 'rejected', 'archived') NOT NULL DEFAULT 'active',
        likesCount INT NOT NULL DEFAULT 0,
        commentsCount INT NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME,
        CONSTRAINT fk_community_posts_author FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating post_comments table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id VARCHAR(36) PRIMARY KEY,
        postId VARCHAR(36) NOT NULL,
        authorId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        status ENUM('active', 'hidden', 'deleted') NOT NULL DEFAULT 'active',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        CONSTRAINT fk_post_comments_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_post_comments_author FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Creating post_likes table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id VARCHAR(36) PRIMARY KEY,
        postId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        CONSTRAINT fk_post_likes_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_post_likes_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_post_user_like (postId, userId)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 