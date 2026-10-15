import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { UserProfile } from '../../src/types.js';

// Comprehensive technical skills dictionary for accurate, truthful keyword recognition
export const KNOWN_TECH_SKILLS = [
  'Python', 'PySpark', 'SQL', 'Databricks', 'Azure Databricks', 'Azure Data Factory',
  'Delta Lake', 'ADLS', 'Blob Storage', 'SQL Server', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Pandas', 'NumPy', 'ETL Pipelines', 'Data Modeling', 'Data Engineering', 'REST APIs',
  'Node.js', 'React', 'TypeScript', 'JavaScript', 'Next.js', 'Airflow', 'AWS', 'Azure',
  'Microsoft Azure', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Snowflake', 'BigQuery',
  'Kafka', 'Spark', 'Hadoop', 'Redshift', 'Redis', 'FastAPI', 'Flask', 'Django',
  'Express', 'Prisma', 'TailwindCSS', 'GraphQL', 'CI/CD', 'Terraform', 'Machine Learning',
  'Data Warehousing', 'Data Pipelines', 'Parquet', 'Delta Table', 'Java', 'C++', 'Scala',
  'Golang', 'Scikit-Learn', 'TensorFlow', 'PyTorch', 'Bash', 'HTML', 'CSS'
];

export interface ParsedResumeResult {
  rawText: string;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  currentTitle: string;
  totalExperienceYears: number;
  primarySkills: string[];
  secondarySkills: string[];
  education: {
    degree: string;
    field: string;
    institution: string;
    passingYear: number;
  };
  summary: string;
  keywords: string[];
}

export async function extractTextFromFile(filePath: string, mimeType?: string, originalFilename?: string): Promise<string> {
  const ext = (path.extname(originalFilename || filePath) || '').toLowerCase();

  // DOCX files using mammoth
  if (ext === '.docx' || mimeType?.includes('wordprocessingml') || mimeType?.includes('docx')) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  // PDF files using pdf-parse v2 (PDFParse class) with fallback
  if (ext === '.pdf' || mimeType?.includes('pdf')) {
    const buffer = fs.readFileSync(filePath);
    try {
      const pdfParseModule = await import('pdf-parse');
      // In pdf-parse v2.x, PDFParse is exported as a class
      if ((pdfParseModule as any).PDFParse) {
        const PDFParseClass = (pdfParseModule as any).PDFParse;
        const parser = new PDFParseClass({ data: buffer });
        const res = await parser.getText();
        if (res && res.text && res.text.trim().length > 0) {
          return res.text;
        }
      }
      // In legacy pdf-parse, default export is a function
      const pdfFunc = (pdfParseModule as any).default || pdfParseModule;
      if (typeof pdfFunc === 'function') {
        const res = await pdfFunc(buffer);
        if (res && res.text && res.text.trim().length > 0) {
          return res.text;
        }
      }
    } catch (err) {
      console.error('PDF parsing error in extractTextFromFile:', err);
    }

    // Secondary fallback: clean printable strings if parser failed
    const text = buffer.toString('utf-8');
    const clean = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    return clean;
  }

  // Fallback to reading as text (e.g., .txt)
  return fs.readFileSync(filePath, 'utf-8');
}

export function parseResumeText(rawText: string, existingProfile?: Partial<UserProfile>): ParsedResumeResult {
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Email extraction
  let email = existingProfile?.email || '';
  const emailMatch = cleanText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    email = emailMatch[1].trim();
  }

  // 2. Phone extraction
  let phone = existingProfile?.phone || '';
  const phoneMatch = cleanText.match(/(?:\+?\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{4,5}/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
  }

  // 3. Name extraction (avoid meta keywords like Resume, CV, Curriculum Vitae, PDF)
  let fullName = '';
  const invalidNameTokens = ['resume', 'curriculum', 'vitae', 'cv', 'profile', 'page', 'email', 'phone', 'contact', 'summary'];
  
  const explicitNameMatch = cleanText.match(/(?:Name|Full Name)\s*[:\-]\s*([A-Za-z\s]{3,35})/i);
  if (explicitNameMatch) {
    const candidate = explicitNameMatch[1].trim();
    if (!invalidNameTokens.some(tok => candidate.toLowerCase().includes(tok))) {
      fullName = candidate;
    }
  }

  if (!fullName) {
    // Look at first 4 non-empty lines
    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      const line = lines[i];
      if (
        line.length >= 3 &&
        line.length <= 40 &&
        !line.includes('@') &&
        !line.match(/\d{5,}/) &&
        !invalidNameTokens.some(tok => line.toLowerCase().includes(tok)) &&
        /^[A-Za-z\s.'-]+$/.test(line)
      ) {
        fullName = line.trim();
        break;
      }
    }
  }

  // Fallback to existingProfile or email handle if needed
  if (!fullName) {
    fullName = existingProfile?.fullName || '';
    if ((!fullName || fullName === 'Candidate') && email && email.includes('@')) {
      const handle = email.split('@')[0];
      fullName = handle.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }
  }

  // 4. Current Title / Role
  let currentTitle = existingProfile?.currentTitle || 'Data Engineer';
  const titlePatterns = [
    /Senior\s+Data\s+(?:&|and)?\s*Full[- ]?Stack\s+Engineer/i,
    /Software\s+Development\s+Engineer(?:\s+\d)?(?:,\s+Data\s+Engineering)?/i,
    /Senior\s+Data\s+Engineer/i,
    /Lead\s+Data\s+Engineer/i,
    /Senior\s+Software\s+Engineer/i,
    /Full[- ]?Stack\s+Engineer/i,
    /Full[- ]?Stack\s+Developer/i,
    /Data\s+Engineering\s+professional/i,
    /Azure\s+Data\s+Engineer/i,
    /Cloud\s+Data\s+Engineer/i,
    /PySpark\s+Developer/i,
    /ETL\s+Developer/i,
    /Data\s+Engineer/i,
    /Backend\s+Engineer/i,
    /Frontend\s+Engineer/i,
    /Software\s+Engineer/i
  ];

  for (const pat of titlePatterns) {
    const match = cleanText.match(pat);
    if (match) {
      let matched = match[0].trim();
      if (matched.toLowerCase().includes('data engineering professional') || matched.toLowerCase().includes('software development engineer 1, data engineering')) {
        currentTitle = 'Data Engineer';
      } else {
        currentTitle = matched;
      }
      break;
    }
  }

  // 5. Total Experience in Years
  let totalExperienceYears = existingProfile?.totalExperienceYears || 1;
  const expMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:industry|relevant|hands-on|total|professional|work|technical)?)?\s*(?:experience|exp)/i)
    || cleanText.match(/(?:experience|exp)\s*[:\-]\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i);

  if (expMatch) {
    const parsedExp = parseFloat(expMatch[1]);
    if (parsedExp > 0 && parsedExp < 40) {
      totalExperienceYears = parsedExp;
    }
  } else {
    // Detect year ranges like 2022 - Present (ignoring education ranges if preceded by college/university)
    const workBlock = cleanText.slice(0, cleanText.toLowerCase().indexOf('education') !== -1 ? cleanText.toLowerCase().indexOf('education') : undefined);
    const yearMatches = [...workBlock.matchAll(/(20\d\d)\s*[-–—to]+\s*(20\d\d|present|current)/gi)];
    if (yearMatches.length > 0) {
      let minYear = 2050;
      let maxYear = new Date().getFullYear();
      for (const m of yearMatches) {
        const startY = parseInt(m[1], 10);
        if (startY >= 2015 && startY < minYear) minYear = startY;
      }
      if (minYear <= maxYear) {
        totalExperienceYears = Math.max(1, maxYear - minYear);
      }
    }
  }

  // 6. Skills extraction (strictly verified against KNOWN_TECH_SKILLS found in text)
  const matchedSkills: string[] = [];

  for (const skill of KNOWN_TECH_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skillRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (skillRegex.test(cleanText)) {
      matchedSkills.push(skill);
    }
  }

  // Split into primary and secondary
  const primarySkills = matchedSkills.slice(0, 12);
  const secondarySkills = matchedSkills.slice(12);

  // 7. Location extraction
  let currentLocation = existingProfile?.currentLocation || 'Bengaluru, India';
  const locHeaderMatch = cleanText.match(/\|\s*([A-Za-z\s]+,\s*(?:U\.?P\.?|UP|Karnataka|Maharashtra|Telangana|Delhi|Haryana|Tamil Nadu|India))/i);
  if (locHeaderMatch) {
    currentLocation = locHeaderMatch[1].trim();
  } else {
    const cities = ['Lucknow', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Pune', 'Gurugram', 'Gurgaon', 'Noida', 'Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Ahmedabad', 'Remote'];
    for (const city of cities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(cleanText)) {
        currentLocation = city === 'Bangalore' ? 'Bengaluru, India' : `${city}, India`;
        break;
      }
    }
  }

  // 8. Education extraction
  let education = existingProfile?.education || {
    degree: 'B.Tech',
    field: 'Computer Science & Engineering',
    institution: 'College of Engineering',
    passingYear: 2025
  };

  const eduMatch = cleanText.match(/\b(Bachelor\s+of\s+Technology|B\.?Tech|B\.?E|Master\s+of\s+Technology|M\.?Tech|MCA|BCA|Bachelor\s+of\s+Engineering)\b\s*(?:in\s+)?([A-Za-z\s&]+?)(?=,|\n|\d|CGPA|\(|$)/i);
  if (eduMatch) {
    let deg = eduMatch[1].trim();
    if (deg.toLowerCase().includes('bachelor of technology') || deg.toLowerCase().includes('b.tech')) {
      deg = 'B.Tech / Bachelor of Technology';
    } else if (deg.toLowerCase().includes('b.e') || deg.toLowerCase().includes('bachelor of engineering')) {
      deg = 'B.E / Bachelor of Engineering';
    }
    const field = eduMatch[2] ? eduMatch[2].trim() : 'Computer Science and Engineering';
    education = {
      degree: deg,
      field: field.length > 2 ? field : education.field,
      institution: education.institution,
      passingYear: education.passingYear
    };
  }

  const collegeMatch = cleanText.match(/([A-Za-z\s&]+(?:College|Institute|University|Academy)[A-Za-z\s&]*)/i);
  if (collegeMatch) {
    const inst = collegeMatch[1].replace(/Education\s*/i, '').trim();
    if (inst.length > 5) {
      education.institution = inst;
    }
  }

  const gradYearMatch = cleanText.match(/\b(20[2-9]\d)\b/);
  if (gradYearMatch) {
    education.passingYear = parseInt(gradYearMatch[1], 10);
  }

  // 9. Summary extraction
  let summary = existingProfile?.profileSummary || '';
  const summaryBlockMatch = cleanText.match(/(?:SUMMARY|PROFILE SUMMARY|OBJECTIVE|ABOUT ME)\s*[:\n]\s*([\s\S]{50,500}?)(?=\n[A-Z\s]{4,}|\n\n|\n EXPERIENCE|\n TECHNICAL SKILLS|\n SKILLS)/i);
  if (summaryBlockMatch) {
    summary = summaryBlockMatch[1].replace(/\n+/g, ' ').trim();
  }

  return {
    rawText: cleanText,
    fullName: fullName || existingProfile?.fullName || 'Chandan Pandey',
    email: email || existingProfile?.email || '',
    phone: phone || existingProfile?.phone || '',
    currentLocation,
    currentTitle,
    totalExperienceYears: Math.round(totalExperienceYears * 10) / 10,
    primarySkills: primarySkills.length > 0 ? primarySkills : (existingProfile?.primarySkills || []),
    secondarySkills: secondarySkills.length > 0 ? secondarySkills : (existingProfile?.secondarySkills || []),
    education,
    summary,
    keywords: matchedSkills
  };
}
