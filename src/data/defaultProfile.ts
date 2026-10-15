import { UserProfile } from '../types';

export const defaultProfile: UserProfile = {
  fullName: "Chandan Kumar",
  email: "chandan.dev@example.com",
  phone: "+91 98765 43210",
  currentTitle: "Senior Data & Full-Stack Engineer",
  totalExperienceYears: 4,
  primarySkills: [
    "Python", "PySpark", "SQL", "React", "TypeScript", "Next.js", 
    "Node.js", "Airflow", "PostgreSQL", "Prisma", "AWS"
  ],
  secondarySkills: [
    "Docker", "Git", "REST APIs", "GraphQL", "TailwindCSS", 
    "Pandas", "ETL Pipelines", "Data Warehousing"
  ],
  education: {
    degree: "B.Tech",
    field: "Computer Science & Engineering",
    institution: "Indian Institute of Technology / NIT",
    passingYear: 2022
  },
  preferredTitles: [
    "Senior Data Engineer",
    "Data Engineer",
    "Full Stack Engineer",
    "Senior Software Engineer",
    "Backend Developer",
    "Lead Data Automation Engineer"
  ],
  preferredIndustries: [
    "Information Technology",
    "FinTech",
    "E-commerce",
    "SaaS",
    "Artificial Intelligence"
  ],
  preferredLocations: [
    "Bengaluru",
    "Gurugram",
    "Noida",
    "Remote",
    "Hyderabad"
  ],
  workModePreference: "Remote",
  minExpectedSalary: 1800000, // 18 LPA
  currency: "INR",
  noticePeriodDays: 30,
  currentLocation: "Bengaluru, India",
  willingnessToRelocate: "Yes",
  preferredEmploymentType: "Full-time",
  targetCompanies: [
    "Blinkit", "Razorpay", "Swiggy", "Google", "Microsoft", "Zepto", "Atlassian"
  ],
  companiesToAvoid: [
    "Unverified Recruiters", "Scam Technologies Pvt Ltd", "CryptoSpam Inc"
  ],
  jobTypesToAvoid: [
    "Door-to-door Sales", "Unpaid Internships", "Tele-calling", "Commission Only"
  ],
  resumeText: `Chandan Kumar - Senior Data & Full-Stack Engineer
Email: chandan.dev@example.com | Phone: +91 98765 43210 | Location: Bengaluru, India

SUMMARY:
Highly analytical Senior Data & Full-Stack Engineer with 4 years of hands-on experience architecting scalable data pipelines, microservices, and React web platforms. Specialized in PySpark, SQL, Airflow, React, TypeScript, and cloud data infrastructures. Track record of optimizing enterprise billing systems, ETL sync workflows, and high-performance frontend interfaces.

EXPERIENCE:
Senior Full-Stack & Data Engineer | Tech Solutions (2022 - Present)
- Designed and maintained high-throughput ETL data pipelines processing over 5M daily records using PySpark, SQL, and Apache Airflow.
- Developed modern React/Next.js dashboard applications with PostgreSQL & Prisma backend.
- Streamlined vendor ledger billing workflows and real-time inventory synchronization.

SOFTWARE SKILLS:
- Languages: Python, SQL, JavaScript, TypeScript, HTML/CSS
- Frameworks & Libraries: PySpark, React, Next.js, Node.js, Express, Prisma
- Databases & Cloud: PostgreSQL, MySQL, Redis, AWS S3, Docker, Airflow

EDUCATION:
B.Tech in Computer Science & Engineering (2018 - 2022)`,
  profileSummary: "Experienced Senior Data & Full-Stack Engineer with 4 years building scalable pipelines, backend services, and interactive web dashboards.",
  workAuthorization: "Authorized to work in India without sponsorship",
  hasVisaSponsorship: false,
  legalDeclarationsVerified: true
};
