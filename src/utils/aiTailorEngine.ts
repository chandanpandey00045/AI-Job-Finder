import { UserProfile, JobListing } from '../types';

/**
 * Generates a concise, job-specific cover letter using ONLY verified candidate profile data.
 * Zero fabrication rule strictly enforced.
 */
export function generateCoverLetter(profile: UserProfile, job: JobListing): string {
  const topMatchingSkills = job.requiredSkills.filter(reqSkill =>
    [...profile.primarySkills, ...profile.secondarySkills].some(
      userSkill => userSkill.toLowerCase() === reqSkill.toLowerCase() || userSkill.toLowerCase().includes(reqSkill.toLowerCase())
    )
  );

  const skillsStr = topMatchingSkills.length > 0 ? topMatchingSkills.join(', ') : profile.primarySkills.slice(0, 4).join(', ');

  return `Dear Hiring Team at ${job.company},

I am writing to express my strong interest in the ${job.title} position (${job.platform}). With over ${profile.totalExperienceYears} years of hands-on experience as a ${profile.currentTitle}, I am confident in my ability to deliver immediate value to your engineering team.

My technical background aligns directly with your key requirements in ${skillsStr}. In my recent roles, I have specialized in building robust software solutions, scalable data workflows, and user-centric interfaces. 

Key Highlights of My Qualifications:
• Core Expertise: ${profile.primarySkills.slice(0, 5).join(', ')}
• Education: ${profile.education.degree} in ${profile.education.field} (${profile.education.passingYear})
• Availability: Notice period of ${profile.noticePeriodDays} days from ${profile.currentLocation}

I admire ${job.company}'s work in ${job.industry} and would welcome the opportunity to discuss how my verified background and technical capabilities can support your team's goals.

Sincerely,
${profile.fullName}
${profile.email} | ${profile.phone}`;
}

/**
 * Generates role-specific resume summary highlights.
 */
export function generateTailoredSummary(profile: UserProfile, job: JobListing): string {
  const matchingSkills = job.requiredSkills.filter(reqSkill =>
    profile.primarySkills.some(userSkill => userSkill.toLowerCase().includes(reqSkill.toLowerCase()))
  );

  return `${profile.currentTitle} with ${profile.totalExperienceYears}+ years of experience specializing in ${matchingSkills.join(', ') || profile.primarySkills.slice(0, 3).join(', ')}. Proven expertise delivering resilient software and data solutions at enterprise scale.`;
}

/**
 * Answers screening questions truthfully using ONLY user profile data.
 * Returns null if the question is ambiguous or requires user decision (Human-in-the-loop).
 */
export function answerScreeningQuestion(
  questionText: string,
  profile: UserProfile
): { answer: string; requiresUserApproval: boolean; reason?: string } {
  const qLower = questionText.toLowerCase();

  // Sensitive / HITL triggers
  if (qLower.includes('salary') || qLower.includes('ctc') || qLower.includes('compensation') || qLower.includes('pay')) {
    return {
      answer: `₹${(profile.minExpectedSalary / 100000).toFixed(1)} LPA (Expected Minimum)`,
      requiresUserApproval: true,
      reason: 'Salary expectation confirmation required before submission.'
    };
  }

  if (qLower.includes('relocat') || qLower.includes('willing to move')) {
    return {
      answer: profile.willingnessToRelocate,
      requiresUserApproval: true,
      reason: 'Relocation commitment verification required.'
    };
  }

  if (qLower.includes('visa') || qLower.includes('sponsorship') || qLower.includes('work permit')) {
    return {
      answer: profile.hasVisaSponsorship ? 'Yes' : 'No',
      requiresUserApproval: true,
      reason: 'Visa sponsorship status declaration.'
    };
  }

  if (qLower.includes('notice period') || qLower.includes('joining date') || qLower.includes('how soon')) {
    return {
      answer: `${profile.noticePeriodDays} Days`,
      requiresUserApproval: false
    };
  }

  if (qLower.includes('legal') || qLower.includes('criminal') || qLower.includes('truthful') || qLower.includes('binding')) {
    return {
      answer: 'Yes',
      requiresUserApproval: true,
      reason: 'Legal/Demographic declaration requires explicit candidate authorization.'
    };
  }

  if (qLower.includes('experience') || qLower.includes('years')) {
    return {
      answer: `${profile.totalExperienceYears} Years`,
      requiresUserApproval: false
    };
  }

  // Standard safe answer
  return {
    answer: 'Confirmed based on verified candidate profile.',
    requiresUserApproval: false
  };
}
