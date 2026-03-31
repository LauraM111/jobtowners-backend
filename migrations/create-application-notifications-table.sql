-- Create application_notifications table
CREATE TABLE IF NOT EXISTS `application_notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employerId` VARCHAR(36) NOT NULL UNIQUE,
  `lastCheckedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastNotificationCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_employer` (`employerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
