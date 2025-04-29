import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class ResumeService {
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
   * Find a user's resume
   */
  async findOne(userId: string): Promise<Resume> {
    const resume = await this.resumeModel.findOne({
      where: { userId },
      include: [
        { model: Education },
        { model: Experience },
        { model: Attachment },
      ],
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  /**
   * Find a resume by ID
   */
  async findById(id: string): Promise<Resume> {
    console.log(`Finding resume by ID: ${id}`);
    
    const resume = await this.resumeModel.findOne({
      where: { id },
      include: [
        { model: Education },
        { model: Experience },
        { model: Attachment },
        { 
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!resume) {
      throw new NotFoundException(`Resume with ID ${id} not found`);
    }

    return resume;
  }

  /**
   * Find a resume by user ID
   */
  async findByUserId(userId: string): Promise<Resume> {
    console.log(`Finding resume by user ID: ${userId}`);
    
    const resume = await this.resumeModel.findOne({
      where: { userId },
      include: [
        { model: Education },
        { model: Experience },
        { model: Attachment }
      ]
    });

    // Don't throw an error if not found, just return null
    return resume;
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
   * Update a user's personal details
   */
  async updatePersonalDetails(userId: string, personalDetailsDto: PersonalDetailsDto): Promise<Resume> {
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
            ...personalDetailsDto,
            userId,
          } as any,  // Type assertion to bypass type checking
          { transaction }
        );
      } else {
        // Update existing resume
        await resume.update(personalDetailsDto, { transaction });
      }

      await transaction.commit();
      return this.findOne(userId);
    } catch (error) {
      await transaction.rollback();
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
    // Find the resume
    const resume = await this.resumeModel.findOne({
      where: { userId },
      include: [{ model: Education }],
    });

    if (!resume) {
      return [];
    }

    return resume.education;
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
    // Find the resume
    const resume = await this.resumeModel.findOne({
      where: { userId },
      include: [{ model: Experience }],
    });

    if (!resume) {
      return [];
    }

    return resume.experiences;
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
} 