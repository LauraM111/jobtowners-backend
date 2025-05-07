import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Resume } from './entities/resume.entity';
import { Education } from './entities/education.entity';
import { Experience } from './entities/experience.entity';
import { Attachment } from './entities/attachment.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { PersonalDetailsDto } from './dto/personal-details.dto';
import { User } from '../user/entities/user.entity';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { QueryTypes } from 'sequelize';

// Define an interface for the raw resume result
interface RawResumeResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // Add other fields as needed
  [key: string]: any; // Allow any other properties
}

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectModel(Resume)
    private resumeModel: typeof Resume,
    @InjectModel(Education)
    private educationModel: typeof Education,
    @InjectModel(Experience)
    private experienceModel: typeof Experience,
    @InjectModel(Attachment)
    private attachmentModel: typeof Attachment,
    private sequelize: Sequelize,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  /**
   * Create a new resume with related education, experience, and attachments
   */
  async create(userId: string, createResumeDto: CreateResumeDto): Promise<Resume> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Extract education, experiences, and attachments from the DTO
      const { education, experiences, attachments, ...resumeData } = createResumeDto;
      
      // Create resume with type assertion to avoid TypeScript errors
      const resume = await this.resumeModel.create(
        {
          ...resumeData,
          userId,
        } as unknown as Partial<Resume>,
        { transaction }
      );

      // Create education records if provided
      if (education && education.length > 0) {
        await Promise.all(
          education.map(edu => 
            this.educationModel.create(
              {
                ...edu,
                resumeId: resume.id,
              },
              { transaction }
            )
          )
        );
      }

      // Create experience records if provided
      if (experiences && experiences.length > 0) {
        await Promise.all(
          experiences.map(exp => 
            this.experienceModel.create(
              {
                ...exp,
                resumeId: resume.id,
              },
              { transaction }
            )
          )
        );
      }

      // Create attachment records if provided
      if (attachments && attachments.length > 0) {
        await Promise.all(
          attachments.map(att => 
            this.attachmentModel.create(
              {
                ...att,
                resumeId: resume.id,
              },
              { transaction }
            )
          )
        );
      }

      await transaction.commit();

      // Return the created resume with all relations
      return this.findOne(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Find all resumes (admin only)
   */
  async findAll(): Promise<Resume[]> {
    return this.resumeModel.findAll({
      include: [
        { model: Education },
        { model: Experience },
        { model: Attachment },
        { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });
  }

  /**
   * Find a resume by ID or userId
   * This method handles both finding by ID and finding by userId
   */
  async findOne(idOrUserId: string, isUserId = false): Promise<Resume> {
    console.log(`ResumeService.findOne called with ${isUserId ? 'userId' : 'id'}: ${idOrUserId}`);
    
    let resume: Resume;
    
    if (isUserId) {
      // Find by userId
      resume = await this.resumeModel.findOne({
        where: { userId: idOrUserId },
        include: [
          { model: Education },
          { model: Experience },
          { model: Attachment },
        ],
      });
    } else {
      // Find by primary key (id)
      resume = await this.resumeModel.findByPk(idOrUserId, {
        include: [
          { model: Education },
          { model: Experience },
          { model: Attachment },
        ],
      });
    }
    
    if (!resume) {
      console.log(`Resume not found with ${isUserId ? 'userId' : 'id'}: ${idOrUserId}`);
      throw new NotFoundException(`Resume not found`);
    }
    
    console.log('Resume found:', resume.id);
    return resume;
  }

  /**
   * Find a resume by user ID
   */
  async findByUserId(userId: string): Promise<Resume> {
    try {
      this.logger.debug(`Finding resume for user ID: ${userId}`);
      
      const resume = await this.resumeModel.findOne({
        where: { userId },
        include: [
          { 
            model: this.educationModel, 
            as: 'education',
            required: false
          },
          { 
            model: this.experienceModel, 
            as: 'experiences',
            required: false
          },
          { 
            model: this.attachmentModel, 
            as: 'attachments',
            required: false
          }
        ]
      });
      
      if (resume) {
        this.logger.debug(`Resume found with ID: ${resume.id}`);
      } else {
        this.logger.debug(`No resume found for user ID: ${userId}`);
      }
      
      return resume;
    } catch (error) {
      this.logger.error(`Error finding resume by user ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Find a resume by user ID with direct SQL query for debugging
   */
  async findByUserIdWithRawQuery(userId: string): Promise<any> {
    console.log(`Finding resume with raw query for user ID: ${userId}`);
    
    try {
      // Direct query to get the resume
      const [resumeResults] = await this.sequelize.query(
        `SELECT * FROM resumes WHERE userId = ?`,
        {
          replacements: [userId],
          type: QueryTypes.SELECT
        }
      ) as [RawResumeResult, unknown];
      
      console.log(`Raw resume query result:`, resumeResults);
      
      if (resumeResults) {
        // Get education records
        const educationResults = await this.sequelize.query(
          `SELECT * FROM education WHERE resumeId = ?`,
          {
            replacements: [resumeResults.id],
            type: QueryTypes.SELECT
          }
        );
        
        // Get experience records
        const experienceResults = await this.sequelize.query(
          `SELECT * FROM experiences WHERE resumeId = ?`,
          {
            replacements: [resumeResults.id],
            type: QueryTypes.SELECT
          }
        );
        
        // Get attachment records
        const attachmentResults = await this.sequelize.query(
          `SELECT * FROM attachments WHERE resumeId = ?`,
          {
            replacements: [resumeResults.id],
            type: QueryTypes.SELECT
          }
        );
        
        console.log(`Raw education query results:`, educationResults);
        console.log(`Raw experience query results:`, experienceResults);
        console.log(`Raw attachment query results:`, attachmentResults);
        
        // Construct a complete resume object
        const completeResume = {
          ...resumeResults,
          education: educationResults,
          experiences: experienceResults,
          attachments: attachmentResults
        };
        
        return completeResume;
      }
      
      return null;
    } catch (error) {
      console.error('Error in findByUserIdWithRawQuery:', error);
      return null;
    }
  }

  /**
   * Update a user's resume
   */
  async update(userId: string, updateResumeDto: UpdateResumeDto): Promise<Resume> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Update resume basic info
      await resume.update(updateResumeDto as any, { transaction });

      // Handle education updates if provided
      if (updateResumeDto.education) {
        // Delete existing education records
        await this.educationModel.destroy({
          where: { resumeId: resume.id },
          transaction,
        });

        // Create new education records
        if (updateResumeDto.education.length > 0) {
          await Promise.all(
            updateResumeDto.education.map(edu => 
              this.educationModel.create(
                {
                  ...edu,
                  resumeId: resume.id,
                },
                { transaction }
              )
            )
          );
        }
      }

      // Handle experience updates if provided
      if (updateResumeDto.experiences) {
        // Delete existing experience records
        await this.experienceModel.destroy({
          where: { resumeId: resume.id },
          transaction,
        });

        // Create new experience records
        if (updateResumeDto.experiences.length > 0) {
          await Promise.all(
            updateResumeDto.experiences.map(exp => 
              this.experienceModel.create(
                {
                  ...exp,
                  resumeId: resume.id,
                },
                { transaction }
              )
            )
          );
        }
      }

      await transaction.commit();

      // Return the updated resume with all relations
      return this.findOne(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove a user's resume
   */
  async remove(userId: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Delete related records
      await this.educationModel.destroy({
        where: { resumeId: resume.id },
        transaction,
      });

      await this.experienceModel.destroy({
        where: { resumeId: resume.id },
        transaction,
      });

      await this.attachmentModel.destroy({
        where: { resumeId: resume.id },
        transaction,
      });

      // Delete the resume
      await resume.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get a user's personal details with all resume data
   */
  async getPersonalDetails(userId: string): Promise<any | null> {
    const resume = await this.resumeModel.findOne({
      where: { userId },
      include: [
        {
          model: this.educationModel,
          as: 'education',
          attributes: ['id', 'institution', 'degree', 'fieldOfStudy', 'startDate', 'endDate', 'description']
        },
        {
          model: this.experienceModel,
          as: 'experiences'
        },
        {
          model: this.attachmentModel,
          as: 'attachments'
        }
      ]
    });

    if (!resume) {
      // Instead of throwing an error, return null
      return null;
    }

    // Return all resume data including personal details
    return {
      // Personal details
      firstName: resume.firstName,
      lastName: resume.lastName,
      email: resume.email,
      phone: resume.phone,
      dob: resume.dob,
      gender: resume.gender,
      maritalStatus: resume.maritalStatus,
      nationality: resume.nationality,
      language: resume.language,
      city: resume.city,
      state: resume.state,
      country: resume.country,
      latitude: resume.latitude,
      longitude: resume.longitude,
      offeredSalary: resume.offeredSalary,
      yearsOfExperience: resume.yearsOfExperience,
      qualification: resume.qualification,
      professionalSkills: resume.professionalSkills,
      addressDetails: resume.addressDetails,
      passionAndFutureGoals: resume.passionAndFutureGoals,
      
      // Media
      videoUrl: resume.videoUrl,
      cvUrl: resume.cvUrl,
      
      // Related data
      education: resume.education,
      experiences: resume.experiences,
      attachments: resume.attachments
    };
  }

  /**
   * Update personal details for a user
   */
  async updatePersonalDetails(userId: string, personalDetailsDto: PersonalDetailsDto): Promise<any> {
    const transaction = await this.sequelize.transaction();
    
    try {
      console.log(`[ResumeService] Updating personal details for user ID: ${userId}`);
      
      // First, check if the user exists
      const user = await this.userModel.findByPk(userId);
      
      if (!user) {
        console.error(`[ResumeService] User with ID ${userId} not found`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      
      console.log(`[ResumeService] User found: ${user.email}`);
      
      // Check if the user has a resume
      let resume = await this.resumeModel.findOne({
        where: { userId },
        transaction
      });
      
      // If no resume exists, create a new one
      if (!resume) {
        console.log(`[ResumeService] No resume found for user ${userId}, creating a new one`);
        
        try {
          // Create a basic resume with the personal details
          resume = await this.resumeModel.create({
            userId,
            ...personalDetailsDto
          }, { transaction });
          
          console.log(`[ResumeService] Created new resume with ID: ${resume.id}`);
        } catch (createError) {
          console.error(`[ResumeService] Error creating resume:`, createError);
          throw new InternalServerErrorException(`Failed to create resume: ${createError.message}`);
        }
      } else {
        console.log(`[ResumeService] Updating existing resume with ID: ${resume.id}`);
        
        try {
          // Update the existing resume with the personal details
          await resume.update(personalDetailsDto, { transaction });
          console.log(`[ResumeService] Resume updated successfully`);
        } catch (updateError) {
          console.error(`[ResumeService] Error updating resume:`, updateError);
          throw new InternalServerErrorException(`Failed to update resume: ${updateError.message}`);
        }
      }
      
      await transaction.commit();
      console.log(`[ResumeService] Transaction committed successfully`);
      
      // Return the updated resume with includes
      try {
        const updatedResume = await this.resumeModel.findOne({
          where: { userId },
          include: [
            { 
              model: this.educationModel, 
              as: 'education',
              required: false
            },
            { 
              model: this.experienceModel, 
              as: 'experiences',
              required: false
            },
            { 
              model: this.attachmentModel, 
              as: 'attachments',
              required: false
            }
          ]
        });
        
        if (!updatedResume) {
          console.error(`[ResumeService] Updated resume not found after commit`);
          throw new NotFoundException('Resume not found after update');
        }
        
        console.log(`[ResumeService] Retrieved updated resume with ID: ${updatedResume.id}`);
        return updatedResume;
      } catch (findError) {
        console.error(`[ResumeService] Error retrieving updated resume:`, findError);
        throw new InternalServerErrorException(`Failed to retrieve updated resume: ${findError.message}`);
      }
    } catch (error) {
      await transaction.rollback();
      console.error(`[ResumeService] Transaction rolled back due to error:`, error);
      throw error;
    }
  }

  /**
   * Update a user's resume video
   */
  async updateVideo(userId: string, videoUrl: string): Promise<Resume> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      let resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      // If resume doesn't exist, create a new one
      if (!resume) {
        resume = await this.resumeModel.create(
          {
            videoUrl,
            userId,
          } as any,  // Type assertion to bypass type checking
          { transaction }
        );
      } else {
        // Update existing resume
        await resume.update({ videoUrl }, { transaction });
      }

      await transaction.commit();
      return this.findOne(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update a user's resume CV document
   */
  async updateCv(userId: string, cvUrl: string): Promise<Resume> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      let resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      // If resume doesn't exist, create a new one
      if (!resume) {
        resume = await this.resumeModel.create(
          {
            cvUrl,
            userId,
          } as any,  // Type assertion to bypass type checking
          { transaction }
        );
      } else {
        // Update existing resume
        await resume.update({ cvUrl }, { transaction });
      }

      await transaction.commit();
      return this.findOne(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a user's resume video
   */
  async deleteVideo(userId: number): Promise<Resume> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Update the resume to remove the video URL
      await resume.update({ videoUrl: null }, { transaction });

      await transaction.commit();

      // Return the updated resume
      return this.findOne(userId.toString());
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a user's resume CV document
   */
  async deleteCv(userId: number): Promise<Resume> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Update the resume to remove the CV URL
      await resume.update({ cvUrl: null }, { transaction });

      await transaction.commit();

      // Return the updated resume
      return this.findOne(userId.toString());
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add an attachment to a user's resume
   */
  async addAttachment(userId: string, createAttachmentDto: CreateAttachmentDto): Promise<Attachment> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      let resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      // If resume doesn't exist, create a new one
      if (!resume) {
        resume = await this.resumeModel.create(
          { userId } as any,  // Type assertion to bypass type checking
          { transaction }
        );
      }

      // Create the attachment
      const attachment = await this.attachmentModel.create(
        {
          ...createAttachmentDto,
          resumeId: resume.id,
        },
        { transaction }
      );

      await transaction.commit();
      return attachment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all attachments for a user's resume
   */
  async getAttachments(userId: string): Promise<Attachment[]> {
    // Find the resume
    const resume = await this.resumeModel.findOne({
      where: { userId },
      include: [{ model: Attachment }],
    });

    if (!resume) {
      return [];
    }

    return resume.attachments;
  }

  /**
   * Delete an attachment from a user's resume
   */
  async deleteAttachment(userId: string, attachmentId: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Find the attachment
      const attachment = await this.attachmentModel.findOne({
        where: { 
          id: attachmentId,
          resumeId: resume.id 
        },
        transaction,
      });

      if (!attachment) {
        throw new NotFoundException('Attachment not found or does not belong to this resume');
      }

      // Delete the attachment
      await attachment.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add education to a user's resume
   */
  async addEducation(userId: string, createEducationDto: CreateEducationDto): Promise<Education> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      let resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      // If resume doesn't exist, create a new one
      if (!resume) {
        resume = await this.resumeModel.create(
          { userId } as any,  // Use type assertion to bypass type checking
          { transaction }
        );
      }

      // Convert string dates to Date objects
      const educationData: any = { ...createEducationDto };
      
      if (educationData.startDate) {
        educationData.startDate = new Date(educationData.startDate);
      }
      
      if (educationData.endDate) {
        educationData.endDate = new Date(educationData.endDate);
      }

      // Create the education entry
      const education = await this.educationModel.create(
        {
          ...educationData,
          resumeId: resume.id,
        },
        { transaction }
      );

      await transaction.commit();
      return education;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all education entries for a user's resume
   */
  async getEducation(userId: string): Promise<Education[]> {
    console.log(`Getting education for user ID: ${userId}`);
    
    try {
      // First get the resume ID
      const resume = await this.resumeModel.findOne({
        where: { userId },
        attributes: ['id']
      });
      
      if (!resume) {
        console.log('No resume found for this user');
        return [];
      }
      
      // Get education records
      const education = await this.educationModel.findAll({
        where: { resumeId: resume.id }
      });
      
      console.log(`Found ${education.length} education records`);
      return education;
    } catch (error) {
      console.error('Error getting education:', error);
      return [];
    }
  }

  /**
   * Update an education entry
   */
  async updateEducation(userId: string, educationId: string, updateEducationDto: CreateEducationDto): Promise<Education> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Find the education entry
      const education = await this.educationModel.findOne({
        where: { 
          id: educationId,
          resumeId: resume.id 
        },
        transaction,
      });

      if (!education) {
        throw new NotFoundException('Education entry not found or does not belong to this resume');
      }

      // Convert string dates to Date objects
      const updateData: any = { ...updateEducationDto };
      
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      // Update the education entry
      await education.update(updateData, { transaction });

      await transaction.commit();
      
      // Return the updated education entry
      return this.educationModel.findByPk(educationId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete an education entry
   */
  async deleteEducation(userId: string, educationId: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Find the education entry
      const education = await this.educationModel.findOne({
        where: { 
          id: educationId,
          resumeId: resume.id 
        },
        transaction,
      });

      if (!education) {
        throw new NotFoundException('Education entry not found or does not belong to this resume');
      }

      // Delete the education entry
      await education.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add work experience to a user's resume
   */
  async addExperience(userId: string, createExperienceDto: CreateExperienceDto): Promise<Experience> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      let resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      // If resume doesn't exist, create a new one
      if (!resume) {
        resume = await this.resumeModel.create(
          { userId } as any,  // Use type assertion to bypass type checking
          { transaction }
        );
      }

      // Map fromYear and toYear to startDate and endDate if they exist in the DTO
      const experienceData: any = {
        ...createExperienceDto,
        startDate: createExperienceDto.startDate || createExperienceDto['fromYear'],
        endDate: createExperienceDto.endDate || createExperienceDto['toYear'],
      };

      // Convert string dates to Date objects
      if (experienceData.startDate) {
        experienceData.startDate = new Date(experienceData.startDate);
      }
      
      if (experienceData.endDate) {
        experienceData.endDate = new Date(experienceData.endDate);
      }

      // Create the experience entry
      const experience = await this.experienceModel.create(
        {
          ...experienceData,
          resumeId: resume.id,
        },
        { transaction }
      );

      await transaction.commit();
      return experience;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all work experience entries for a user's resume
   */
  async getExperience(userId: string): Promise<Experience[]> {
    console.log(`Getting experience for user ID: ${userId}`);
    
    try {
      // First get the resume ID
      const resume = await this.resumeModel.findOne({
        where: { userId },
        attributes: ['id']
      });
      
      if (!resume) {
        console.log('No resume found for this user');
        return [];
      }
      
      // Get experience records
      const experiences = await this.experienceModel.findAll({
        where: { resumeId: resume.id }
      });
      
      console.log(`Found ${experiences.length} experience records`);
      return experiences;
    } catch (error) {
      console.error('Error getting experience:', error);
      return [];
    }
  }

  /**
   * Update a work experience entry
   */
  async updateExperience(userId: string, experienceId: string, updateExperienceDto: CreateExperienceDto): Promise<Experience> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Find the experience entry
      const experience = await this.experienceModel.findOne({
        where: { 
          id: experienceId,
          resumeId: resume.id 
        },
        transaction,
      });

      if (!experience) {
        throw new NotFoundException('Experience entry not found or does not belong to this resume');
      }

      // Convert string dates to Date objects if needed
      const updateData: any = { ...updateExperienceDto };
      
      if (updateExperienceDto.startDate) {
        updateData.startDate = new Date(updateExperienceDto.startDate);
      }
      
      if (updateExperienceDto.endDate) {
        updateData.endDate = new Date(updateExperienceDto.endDate);
      }

      // Update the experience entry
      await experience.update(updateData, { transaction });

      await transaction.commit();
      
      // Return the updated experience entry
      return this.experienceModel.findByPk(experienceId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a work experience entry
   */
  async deleteExperience(userId: number, experienceId: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find the resume
      const resume = await this.resumeModel.findOne({
        where: { userId },
        transaction,
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Find the experience entry
      const experience = await this.experienceModel.findOne({
        where: { 
          id: experienceId,
          resumeId: resume.id 
        },
        transaction,
      });

      if (!experience) {
        throw new NotFoundException('Experience entry not found or does not belong to this resume');
      }

      // Delete the experience entry
      await experience.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Create a default resume for a user if one doesn't exist
   */
  async createDefaultResumeIfNotExists(userId: string): Promise<Resume> {
    // First check if a resume already exists
    let resume = await this.findByUserId(userId);
    
    if (resume) {
      return resume;
    }
    
    // Get user data to populate the resume
    const user = await this.userModel.findByPk(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Create a basic resume with user information
    resume = await this.resumeModel.create({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      // Add other default fields as needed
    });
    
    console.log(`Created default resume with ID: ${resume.id} for user: ${userId}`);
    
    return resume;
  }

  /**
   * Update resume video URL
   */
  async updateVideoUrl(id: string, videoUrl: string): Promise<Resume> {
    const resume = await this.resumeModel.findByPk(id);
    
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    
    await resume.update({ videoUrl });
    
    return resume;
  }
} 