import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'requireTwoBusinessVerificationFields', async: false })
export class RequireTwoBusinessVerificationFields implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    let verificationCount = 0;

    // Check for physical address (all required fields must be present)
    if (object.addressLine1 && object.city && object.state && object.country && object.postalCode) {
      verificationCount++;
    }

    // Check for website
    if (object.website) {
      verificationCount++;
    }

    // Check for business registration number
    if (object.businessRegistrationNumber) {
      verificationCount++;
    }

    // Check for social media presence (any one social media link is sufficient)
    const hasSocialMedia = !!(object.facebookUrl || object.linkedinUrl || object.twitterUrl || object.instagramUrl);
    if (hasSocialMedia) {
      verificationCount++;
    }

    return verificationCount >= 2;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Please provide at least 2 of the following for business verification:\n' +
           '✅ A physical business address (all address fields required)\n' +
           '✅ A website\n' +
           '✅ At least one social media link (Facebook, LinkedIn, Twitter, or Instagram)\n' +
           '✅ A business registration number';
  }
} 