import { JobListing } from '../types';

export const mockJobs: JobListing[] = [
  {
    id: "job-lk-live-001",
    company: "Equal Experts",
    title: "Senior Data Engineer - PySpark & SQL Platform",
    platform: "LinkedIn",
    location: "Bengaluru, Karnataka, India",
    workMode: "Hybrid",
    salaryRange: {
      min: 2400000,
      max: 3200000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 3,
      max: 6
    },
    requiredSkills: ["PySpark", "Python", "SQL", "Data Pipelines", "Agile"],
    educationRequired: "B.Tech / B.E in CS",
    industry: "Information Technology & Services",
    description: "Equal Experts is seeking a Senior Data Engineer in Bengaluru to build agile PySpark & SQL data platform pipelines. You will collaborate with cross-functional engineering teams.",
    jobUrl: "https://in.linkedin.com/jobs/view/senior-data-engineer-at-equal-experts-4461725203",
    postedDate: "2026-08-28"
  },
  {
    id: "job-nk-live-002",
    company: "IBU Consulting",
    title: "PySpark Developer / Senior Data Engineer",
    platform: "Naukri",
    location: "Bengaluru",
    workMode: "Hybrid",
    salaryRange: {
      min: 2000000,
      max: 2600000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 2,
      max: 6
    },
    requiredSkills: ["PySpark", "SQL", "Unix", "Linux", "Data Validation"],
    educationRequired: "Bachelor's Degree",
    industry: "IT Services / Consulting",
    description: "Hiring PySpark Developer & Data Engineers with 2-6 years experience in Bengaluru. Core focus on high-throughput data validation and ETL pipeline debugging.",
    jobUrl: "https://www.naukri.com/job-listings-pyspark-developer-senior-data-engineer-ibu-consulting-bengaluru-2-to-6-years-200826500545",
    postedDate: "2026-08-20"
  },
  {
    id: "job-lk-live-003",
    company: "Thales",
    title: "Senior Data Engineer - PySpark, Databricks, SQL",
    platform: "LinkedIn",
    location: "Bengaluru, Karnataka, India",
    workMode: "On-site",
    salaryRange: {
      min: 2500000,
      max: 3400000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 5,
      max: 7
    },
    requiredSkills: ["PySpark", "Databricks", "SQL", "Data Pipeline Architecture"],
    educationRequired: "B.Tech / B.E in CS / Systems Engineering",
    industry: "Defense & Space Technology",
    description: "Thales India is hiring a Senior Data Engineer at the Bengaluru Indraprastha office. Requires strong hands-on PySpark, Databricks, and SQL infrastructure experience.",
    jobUrl: "https://in.linkedin.com/jobs/view/senior-data-engineer-pyspark-databricks-sql-at-thales-4441221202",
    postedDate: "2026-08-27",
    requiresHumanInput: true,
    humanInputReason: "Requires on-site Bengaluru physical presence authorization and target CTC confirmation.",
    screeningQuestions: [
      {
        id: "q-thales-reloc",
        question: "Confirm availability for on-site work at Thales Indraprastha office, Bengaluru.",
        type: "sensitive",
        isSensitive: true
      }
    ]
  },
  {
    id: "job-nk-live-004",
    company: "Bounteous",
    title: "Senior Data Engineer",
    platform: "Naukri",
    location: "Bengaluru",
    workMode: "Hybrid",
    salaryRange: {
      min: 2200000,
      max: 3000000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 5,
      max: 8
    },
    requiredSkills: ["Kafka", "Apache Spark", "Python", "SQL", "PySpark", "Azure Data Lake"],
    educationRequired: "B.Tech Computer Science",
    industry: "Software Product",
    description: "Bounteous is expanding its Bengaluru Data Platform team. Looking for Senior Data Engineers skilled in Kafka, Apache Spark, Python, and SQL.",
    jobUrl: "https://www.naukri.com/job-listings-senior-data-engineer-bounteous-bengaluru-5-to-8-years",
    postedDate: "2026-09-01"
  },
  {
    id: "job-nk-live-005",
    company: "Datavail",
    title: "Senior Data Engineer (Overqualified Exp Test)",
    platform: "Naukri",
    location: "Bengaluru / Mumbai / Hyderabad",
    workMode: "On-site",
    salaryRange: {
      min: 1000000,
      max: 2000000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 10,
      max: 12
    },
    requiredSkills: ["AWS Glue", "PySpark", "AWS", "Amazon SNS", "SQL"],
    educationRequired: "B.Tech",
    industry: "IT Services",
    description: "Requires 10 to 12 years of enterprise cloud engineering experience.",
    jobUrl: "https://www.naukri.com/job-listings-senior-data-engineer-datavail-mumbai-hyderabad-bengaluru-10-to-12-years-030926024738",
    postedDate: "2026-09-03"
  },
  {
    id: "job-lk-live-006",
    company: "Amgen",
    title: "Sr Data Engineer",
    platform: "LinkedIn",
    location: "Hyderabad, Telangana, India",
    workMode: "Remote",
    salaryRange: {
      min: 2600000,
      max: 3500000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 4,
      max: 7
    },
    requiredSkills: ["PySpark", "SQL", "Data Pipelines", "Cloud Infrastructure"],
    educationRequired: "Bachelor's Degree",
    industry: "Biotechnology & Pharmaceuticals",
    description: "Amgen is hiring a Sr Data Engineer to build global cloud data infrastructures. Deep PySpark & SQL expertise required.",
    jobUrl: "https://in.linkedin.com/jobs/view/sr-data-engineer-at-amgen-4455309140",
    postedDate: "2026-08-20"
  },
  {
    id: "job-nk-live-007",
    company: "Thales India Pvt Ltd",
    title: "Senior Data Engineer - PySpark, Databricks, SQL (Duplicate)",
    platform: "Naukri",
    location: "Bengaluru",
    workMode: "On-site",
    salaryRange: {
      min: 2500000,
      max: 3400000,
      currency: "INR"
    },
    requiredExperienceYears: {
      min: 5,
      max: 7
    },
    requiredSkills: ["PySpark", "Databricks", "SQL"],
    educationRequired: "B.Tech",
    industry: "Defense & Space Technology",
    description: "Duplicate posting of Thales Senior Data Engineer role listed on Naukri.",
    jobUrl: "https://www.naukri.com/job-listings-senior-data-engineer-pyspark-databricks-sql-thales-india-pvt-ltd-bengaluru-5-to-7-years-160726501597",
    postedDate: "2026-08-27",
    isDuplicate: true,
    duplicateOfId: "job-lk-live-003"
  }
];
