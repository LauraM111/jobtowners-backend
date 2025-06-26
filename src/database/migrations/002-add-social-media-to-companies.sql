-- Add social media columns to companies table
ALTER TABLE companies
ADD COLUMN facebookUrl VARCHAR(255) AFTER businessRegistrationNumber,
ADD COLUMN linkedinUrl VARCHAR(255) AFTER facebookUrl,
ADD COLUMN twitterUrl VARCHAR(255) AFTER linkedinUrl,
ADD COLUMN instagramUrl VARCHAR(255) AFTER twitterUrl; 