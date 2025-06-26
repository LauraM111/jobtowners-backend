import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'requireTwoBusinessVerificationFields', async: false })
export class RequireTwoBusinessVerificationFields implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    let verificationCount = 0;
    let verificationMethods = [];

    // Check for physical address (all required fields must be present)
    if (object.addressLine1 && object.city && object.state && object.country && object.postalCode) {
      verificationCount++;
      verificationMethods.push('physical address');
    }

    // Check for website
    if (object.website) {
      verificationCount++;
      verificationMethods.push('website');
    }

    // Check for business registration number
    if (object.businessRegistrationNumber) {
      verificationCount++;
      verificationMethods.push('business registration number');
    }

    // Check for social media presence (any one social media link is sufficient)
    if (object.linkedinUrl) {
      verificationCount++;
      verificationMethods.push('LinkedIn');
      return true; // Allow submission if LinkedIn is provided
    }
    if (object.facebookUrl) {
      verificationCount++;
      verificationMethods.push('Facebook');
      return true; // Allow submission if Facebook is provided
    }
    if (object.twitterUrl) {
      verificationCount++;
      verificationMethods.push('Twitter');
      return true; // Allow submission if Twitter is provided
    }
    if (object.instagramUrl) {
      verificationCount++;
      verificationMethods.push('Instagram');
      return true; // Allow submission if Instagram is provided
    }

    // If no social media link is provided, require at least 2 other verification methods
    return verificationCount >= 2;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Please provide either:\n' +
           '1. Any one social media link (LinkedIn, Facebook, Twitter, or Instagram)\n' +
           'OR\n' +
           '2. At least 2 of the following:\n' +
           '   ✅ A physical business address (all address fields required)\n' +
           '   ✅ A website\n' +
           '   ✅ A business registration number';
  }
} 