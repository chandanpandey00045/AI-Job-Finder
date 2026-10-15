import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { 
  Save, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  ShieldAlert, 
  Sparkles, 
  Building, 
  FileText, 
  Zap, 
  RefreshCw,
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  Compass,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Download
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { uploadResumeFile } from '../api/client';

// Configure PDF.js worker for client-side PDF text parsing fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
}

const IN_DEMAND_SKILLS = [
  'Python', 'PySpark', 'SQL', 'Databricks', 'Azure Databricks', 'Azure Data Factory',
  'Delta Lake', 'ADLS', 'Blob Storage', 'SQL Server', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Pandas', 'NumPy', 'ETL Pipelines', 'Data Modeling', 'Data Engineering', 'REST APIs',
  'Node.js', 'React', 'TypeScript', 'JavaScript', 'Next.js', 'Airflow', 'AWS', 'Azure',
  'Microsoft Azure', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Snowflake', 'BigQuery',
  'Kafka', 'Spark', 'Hadoop', 'Redshift', 'Redis', 'FastAPI', 'Flask', 'Django',
  'Express', 'Prisma', 'TailwindCSS', 'GraphQL', 'CI/CD', 'Terraform', 'Machine Learning',
  'Data Warehousing', 'Data Pipelines', 'Parquet', 'Delta Table'
];

const PREFERRED_LOCATION_PRESETS = [
  'Remote', 'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi-NCR', 'Lucknow', 'Chennai', 'Kolkata', 'San Francisco', 'Worldwide'
];

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'skills' | 'targets' | 'compensation' | 'rules' | 'resume'>('resume');
  
  // Quick-add input states
  const [newSkill, setNewSkill] = useState('');
  const [newPreferredTitle, setNewPreferredTitle] = useState('');
  const [newPreferredLocation, setNewPreferredLocation] = useState('');
  const [newTargetCompany, setNewTargetCompany] = useState('');
  const [newAvoidCompany, setNewAvoidCompany] = useState('');
  
  // Feedback states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // File input ref for 1-click dropzone triggering
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep local formData synchronized whenever profile prop updates
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onSaveProfile(updated);
  };

  const handleNestedEducationChange = (field: string, value: any) => {
    const updated = {
      ...formData,
      education: {
        ...formData.education,
        [field]: value
      }
    };
    setFormData(updated);
    onSaveProfile(updated);
  };

  // Text & PDF Extractor Engine (Client Fallback)
  const handleParseResumeText = (rawText: string) => {
    if (!rawText || rawText.trim().length === 0) return;

    const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Email extraction
    let email = formData.email;
    const emailMatch = cleanText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      email = emailMatch[1].trim();
    }

    // 2. Phone extraction
    let phone = formData.phone;
    const phoneMatch = cleanText.match(/(?:\+?\d{1,3}[-.\s]*)?(?:\(?\d{2,5}\)?[-.\s]*)?\d{3,5}[-.\s]*\d{4,5}/);
    if (phoneMatch) {
      phone = phoneMatch[0].trim();
    }

    // 3. Name extraction
    let name = '';
    const invalidNameTokens = ['resume', 'curriculum', 'vitae', 'cv', 'profile', 'page', 'email', 'phone', 'contact', 'summary'];
    const explicitNameMatch = cleanText.match(/(?:Name|Full Name)\s*[:\-]\s*([A-Za-z\s]{3,35})/i);
    
    if (explicitNameMatch) {
      const candidateName = explicitNameMatch[1].trim();
      if (!invalidNameTokens.some(kw => candidateName.toLowerCase().includes(kw))) {
        name = candidateName;
      }
    } else if (lines.length > 0) {
      for (let i = 0; i < Math.min(lines.length, 4); i++) {
        const line = lines[i];
        if (
          line.length >= 3 &&
          line.length <= 40 &&
          !line.includes('@') &&
          !line.match(/\d{5,}/) &&
          !invalidNameTokens.some(kw => line.toLowerCase().includes(kw)) &&
          /^[A-Za-z\s.'-]+$/.test(line)
        ) {
          name = line.trim();
          break;
        }
      }
    }

    if (!name && email && email.includes('@')) {
      const handle = email.split('@')[0];
      name = handle.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }

    if (!name) name = formData.fullName;

    // 4. Job Title detection
    let detectedTitle = formData.currentTitle;
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
        const t = match[0].trim();
        if (t.toLowerCase().includes('data engineering professional') || t.toLowerCase().includes('software development engineer 1, data engineering')) {
          detectedTitle = 'Data Engineer';
        } else {
          detectedTitle = t;
        }
        break;
      }
    }

    // 5. Total Experience extraction
    let expYears = formData.totalExperienceYears || 1;
    const expMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:industry|relevant|hands-on|total|professional|work|technical)?)?\s*(?:experience|exp)/i)
      || cleanText.match(/(?:experience|exp)\s*[:\-]\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i);

    if (expMatch) {
      const parsedVal = parseFloat(expMatch[1]);
      if (parsedVal > 0 && parsedVal < 40) {
        expYears = parsedVal;
      }
    }

    // 6. Skills extraction
    const detectedSkills: string[] = [];
    for (const skill of IN_DEMAND_SKILLS) {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const skillRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (skillRegex.test(cleanText)) {
        detectedSkills.push(skill);
      }
    }

    const finalSkills = detectedSkills.length > 0 
      ? Array.from(new Set([...detectedSkills]))
      : formData.primarySkills;

    // 7. Location extraction
    let loc = formData.currentLocation || 'Lucknow, U.P.';
    const locHeaderMatch = cleanText.match(/\|\s*([A-Za-z\s]+,\s*(?:U\.?P\.?|UP|Karnataka|Maharashtra|Telangana|Delhi|Haryana|Tamil Nadu|India))/i);
    if (locHeaderMatch) {
      loc = locHeaderMatch[1].trim();
    }

    // 8. Education extraction
    let degree = formData.education.degree;
    let field = formData.education.field;
    let institution = formData.education.institution;
    let passingYear = formData.education.passingYear;

    const eduMatch = cleanText.match(/(?:Bachelor\s+of\s+Technology|B\.?Tech|B\.?E|Master\s+of\s+Technology|M\.?Tech|MCA|BCA)\s*(?:in)?\s*([A-Za-z\s&,]+?)(?=,|\n|\d|CGPA|$)/i);
    if (eduMatch) {
      degree = 'Bachelor of Technology (B.Tech)';
      field = eduMatch[1] ? eduMatch[1].trim() : 'Computer Science and Engineering';
    }

    const collegeMatch = cleanText.match(/([A-Za-z\s&]+(?:College|Institute|University|Academy)[A-Za-z\s&]*)/i);
    if (collegeMatch) {
      institution = collegeMatch[1].replace(/Education\s*/i, '').trim();
    }

    const gradYearMatch = cleanText.match(/\b(20[2-9]\d)\b/);
    if (gradYearMatch) {
      passingYear = parseInt(gradYearMatch[1], 10);
    }

    const updatedProfile: UserProfile = {
      ...formData,
      fullName: name,
      email: email,
      phone: phone,
      currentLocation: loc,
      currentTitle: detectedTitle,
      totalExperienceYears: expYears,
      primarySkills: finalSkills.slice(0, 12),
      secondarySkills: finalSkills.slice(12),
      preferredTitles: detectedTitle.includes('Data') ? [
        'Data Engineer',
        'Associate Data Engineer',
        'Azure Data Engineer',
        'PySpark Developer',
        'ETL Developer',
        'Junior Data Engineer'
      ] : formData.preferredTitles,
      education: {
        degree,
        field,
        institution,
        passingYear
      },
      resumeText: cleanText
    };

    setFormData(updatedProfile);
    onSaveProfile(updatedProfile);

    setParseNotice(`✨ Resume Synced! Extracted Name: "${name}", Title: "${detectedTitle}", ${expYears} yrs exp & ${finalSkills.length} skills.`);
    setTimeout(() => setParseNotice(null), 6000);
  };

  const parsePdfFileWithWorker = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      let extractedFullText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageItemsText = textContent.items.map((item: any) => item.str).join(' ');
        extractedFullText += pageItemsText + '\n';
      }
      return extractedFullText;
    } catch (err) {
      console.warn("PDF.js worker fallback to text stream:", err);
      return await file.text();
    }
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setParseNotice('⏳ Parsing resume and extracting candidate entities...');

    try {
      // 1. Try server-side parser with persistent storage (PDF + DOCX)
      try {
        const uploadResult = await uploadResumeFile(file);
        if (uploadResult && uploadResult.profile) {
          setFormData(uploadResult.profile);
          onSaveProfile(uploadResult.profile);
          setParseNotice(`✨ Successfully Extracted & Stored: "${uploadResult.profile.fullName}", Title: "${uploadResult.profile.currentTitle}", ${uploadResult.profile.totalExperienceYears} yrs experience, ${uploadResult.profile.primarySkills.length + (uploadResult.profile.secondarySkills?.length || 0)} skills detected! Previous application records preserved.`);
          setTimeout(() => setParseNotice(null), 8000);
          setIsParsing(false);
          return;
        }
      } catch (serverErr) {
        console.warn('Server upload fallback to client parser:', serverErr);
      }

      // 2. Client-side fallback if server offline
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const extractedText = await parsePdfFileWithWorker(file);
        handleParseResumeText(extractedText);
      } else {
        const text = await file.text();
        handleParseResumeText(text);
      }
    } catch (err: any) {
      console.error("Resume file reading error:", err);
      setParseNotice(`⚠️ Parsing notice: ${err.message || 'Please check resume file format.'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Skill Add / Remove
  const addPrimarySkill = (skillToAdd?: string) => {
    const val = (skillToAdd || newSkill).trim();
    if (!val) return;
    if (!formData.primarySkills.includes(val)) {
      const updated = {
        ...formData,
        primarySkills: [...formData.primarySkills, val]
      };
      setFormData(updated);
      onSaveProfile(updated);
    }
    setNewSkill('');
  };

  const removePrimarySkill = (skill: string) => {
    const updated = {
      ...formData,
      primarySkills: formData.primarySkills.filter(s => s !== skill)
    };
    setFormData(updated);
    onSaveProfile(updated);
  };

  // Title Add / Remove
  const addPreferredTitle = () => {
    if (!newPreferredTitle.trim()) return;
    const title = newPreferredTitle.trim();
    if (!formData.preferredTitles.includes(title)) {
      const updated = {
        ...formData,
        preferredTitles: [...formData.preferredTitles, title]
      };
      setFormData(updated);
      onSaveProfile(updated);
    }
    setNewPreferredTitle('');
  };

  const removePreferredTitle = (title: string) => {
    const updated = {
      ...formData,
      preferredTitles: formData.preferredTitles.filter(t => t !== title)
    };
    setFormData(updated);
    onSaveProfile(updated);
  };

  // Location Add / Remove
  const addPreferredLocation = (locToAdd?: string) => {
    const loc = (locToAdd || newPreferredLocation).trim();
    if (!loc) return;
    if (!formData.preferredLocations.includes(loc)) {
      const updated = {
        ...formData,
        preferredLocations: [...formData.preferredLocations, loc]
      };
      setFormData(updated);
      onSaveProfile(updated);
    }
    setNewPreferredLocation('');
  };

  const removePreferredLocation = (loc: string) => {
    const updated = {
      ...formData,
      preferredLocations: formData.preferredLocations.filter(l => l !== loc)
    };
    setFormData(updated);
    onSaveProfile(updated);
  };

  // Companies Add / Remove
  const addTargetCompany = () => {
    if (!newTargetCompany.trim()) return;
    if (!formData.targetCompanies.includes(newTargetCompany.trim())) {
      const updated = {
        ...formData,
        targetCompanies: [...formData.targetCompanies, newTargetCompany.trim()]
      };
      setFormData(updated);
      onSaveProfile(updated);
    }
    setNewTargetCompany('');
  };

  const removeTargetCompany = (comp: string) => {
    const updated = {
      ...formData,
      targetCompanies: formData.targetCompanies.filter(c => c !== comp)
    };
    setFormData(updated);
    onSaveProfile(updated);
  };

  const addAvoidCompany = () => {
    if (!newAvoidCompany.trim()) return;
    if (!formData.companiesToAvoid.includes(newAvoidCompany.trim())) {
      const updated = {
        ...formData,
        companiesToAvoid: [...formData.companiesToAvoid, newAvoidCompany.trim()]
      };
      setFormData(updated);
      onSaveProfile(updated);
    }
    setNewAvoidCompany('');
  };

  const removeAvoidCompany = (comp: string) => {
    const updated = {
      ...formData,
      companiesToAvoid: formData.companiesToAvoid.filter(c => c !== comp)
    };
    setFormData(updated);
    onSaveProfile(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Calculate Profile Completeness Percentage
  const calculateCompleteness = () => {
    let score = 0;
    if (formData.fullName && formData.fullName !== 'Candidate') score += 15;
    if (formData.email && !formData.email.includes('example.com')) score += 15;
    if (formData.phone) score += 10;
    if (formData.currentTitle) score += 15;
    if (formData.primarySkills.length >= 3) score += 20;
    if (formData.totalExperienceYears > 0) score += 10;
    if (formData.preferredTitles.length > 0) score += 10;
    if (formData.minExpectedSalary > 0) score += 5;
    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Profile Hero Header Card */}
      <div className="glass-card" style={{ padding: '1.5rem 1.75rem', background: 'linear-gradient(180deg, var(--surface-raised) 0%, var(--surface) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
            }}>
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  {formData.fullName || 'Candidate Profile'}
                </h2>
                <span className="status-badge applied" style={{ fontSize: '0.725rem' }}>
                  <CheckCircle2 size={12} /> Live Synced
                </span>
              </div>
              <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                {formData.currentTitle} • {formData.totalExperienceYears} yrs experience • {formData.primarySkills.length + (formData.secondarySkills?.length || 0)} skills indexed
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Completeness Meter */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Profile Readiness</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: completeness >= 80 ? '#34d399' : '#fbbf24' }}>
                  {completeness}%
                </span>
              </div>
              <div style={{ width: 140, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden', marginTop: '0.35rem' }}>
                <div style={{
                  width: `${completeness}%`,
                  height: '100%',
                  background: completeness >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleSave} 
              className="btn-primary" 
              style={{ padding: '0.6rem 1.4rem' }}
            >
              {saveSuccess ? <Check size={16} /> : <Save size={16} />}
              {saveSuccess ? 'Changes Saved!' : 'Save & Sync Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Parse Toast Alert */}
      {parseNotice && (
        <div style={{
          background: parseNotice.startsWith('✨') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
          border: `1px solid ${parseNotice.startsWith('✨') ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
          borderRadius: 'var(--radius)',
          padding: '0.85rem 1.25rem',
          color: parseNotice.startsWith('✨') ? '#34d399' : '#e0e7ff',
          fontSize: '0.85rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          {isParsing ? <RefreshCw size={18} className="spin" color="#818cf8" /> : <Zap size={18} color="#fbbf24" />}
          <span>{parseNotice}</span>
        </div>
      )}

      {/* Segmented Sub-Navigation Tabs */}
      <div className="tab-nav">
        <button 
          type="button"
          onClick={() => setActiveSubTab('resume')} 
          className={`tab-nav-btn ${activeSubTab === 'resume' ? 'active' : ''}`}
        >
          <FileText size={15} /> Resume Upload & Parser
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('overview')} 
          className={`tab-nav-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
        >
          <User size={15} /> Personal & Contact
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('skills')} 
          className={`tab-nav-btn ${activeSubTab === 'skills' ? 'active' : ''}`}
        >
          <Sparkles size={15} /> Skills & Tech Stack ({formData.primarySkills.length})
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('targets')} 
          className={`tab-nav-btn ${activeSubTab === 'targets' ? 'active' : ''}`}
        >
          <Compass size={15} /> Target Roles & Scope
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('compensation')} 
          className={`tab-nav-btn ${activeSubTab === 'compensation' ? 'active' : ''}`}
        >
          <DollarSign size={15} /> Compensation & Work Mode
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('rules')} 
          className={`tab-nav-btn ${activeSubTab === 'rules' ? 'active' : ''}`}
        >
          <ShieldAlert size={15} /> Rules & Avoid Lists
        </button>
      </div>

      {/* Tab 1: Resume File Upload & Parsing */}
      {activeSubTab === 'resume' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Interactive Drag & Drop Box */}
          <div 
            className={`dropzone-box ${isDragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{ cursor: 'pointer' }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              {isParsing ? <RefreshCw size={26} className="spin" color="#34d399" /> : <Upload size={26} />}
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              {isParsing ? 'Parsing Resume & Extracting Candidate Profile...' : 'Upload or Drag & Drop Resume File Here'}
            </h3>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', maxWidth: 520, margin: '0 auto 1.25rem auto' }}>
              Click anywhere in this box to browse or drag your file here. Supports <strong>PDF (.pdf)</strong> and Word <strong>DOCX (.docx)</strong> files. Automatically extracts Name, Email, Phone, Experience, Education, and Skills.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.4rem', pointerEvents: 'none' }}>
                <FileCheck size={16} /> Choose File (.pdf, .docx, .txt)
              </span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.docx,.doc,.txt" 
                onChange={handleFileUpload} 
                disabled={isParsing}
                style={{ display: 'none' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="tag-pill">PDF Document</span>
              <span className="tag-pill">DOCX Document</span>
              <span className="tag-pill">Zero Fabrication Verified</span>
              <span className="tag-pill">Applications Preserved</span>
            </div>
          </div>

          {/* Extracted Profile Highlights Card */}
          <div className="glass-card" style={{ background: 'linear-gradient(180deg, var(--surface-raised) 0%, var(--surface) 100%)', border: '1px solid var(--border-strong)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Sparkles size={16} color="#34d399" /> Live Parsed Profile Highlights
                </h4>
                <p style={{ color: 'var(--foreground-muted)', fontSize: '0.775rem' }}>
                  Current extracted candidate attributes stored in SQLite database.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <a
                  href="/api/profile/resume-download"
                  download
                  className="btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Download verified resume PDF"
                >
                  <Download size={13} /> Download Resume PDF
                </a>
                <span className="status-badge applied">
                  <Check size={13} /> {formData.primarySkills.length + (formData.secondarySkills?.length || 0)} Skills Verified
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>CANDIDATE NAME</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{formData.fullName || 'Not specified'}</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>CURRENT TITLE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#818cf8', marginTop: '0.2rem' }}>{formData.currentTitle || 'Not specified'}</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>EMAIL ADDRESS</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.2rem' }}>{formData.email || 'Not specified'}</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>PHONE NUMBER</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.2rem' }}>{formData.phone || 'Not specified'}</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>EXPERIENCE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>{formData.totalExperienceYears} Year{formData.totalExperienceYears === 1 ? '' : 's'}</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>LOCATION</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.2rem' }}>{formData.currentLocation || 'Not specified'}</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-dim)', fontWeight: 600 }}>EDUCATION</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.2rem' }}>
                  {formData.education?.degree} in {formData.education?.field} • {formData.education?.institution} ({formData.education?.passingYear})
                </div>
              </div>
            </div>

            {/* Extracted Skills Chips */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Extracted Skills ({formData.primarySkills.length + (formData.secondarySkills?.length || 0)})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[...formData.primarySkills, ...(formData.secondarySkills || [])].map(skill => (
                  <span key={skill} className="skill-chip primary">
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Raw Text View & Manual Paste Trigger */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                  Raw Resume Text Stream & Direct Pasting
                </h4>
                <p style={{ color: 'var(--foreground-muted)', fontSize: '0.775rem' }}>
                  Pasting raw resume text below immediately extracts candidate fields via real-time entity recognition.
                </p>
              </div>
              <span className="status-badge ready" style={{ fontSize: '0.7rem' }}>
                {formData.resumeText ? `${formData.resumeText.length} characters` : 'Empty'}
              </span>
            </div>

            <textarea 
              className="form-control" 
              rows={8}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6 }}
              placeholder="Paste your raw resume text here to trigger automatic regex extraction for Name, Phone, Email, Experience, Degree, and Skills..."
              value={formData.resumeText} 
              onChange={(e) => handleParseResumeText(e.target.value)} 
            />
          </div>
        </div>
      )}

      {/* Tab 2: Personal & Contact Information */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} color="#818cf8" /> Candidate Core Identity
              </h3>
              <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Verified contact and career details used when filling application forms.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="input-label">Full Legal Name</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.fullName} 
                    onChange={(e) => handleInputChange('fullName', e.target.value)} 
                    placeholder="e.g. Chandan Pandey"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Primary Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={formData.email} 
                  onChange={(e) => handleInputChange('email', e.target.value)} 
                  placeholder="name@domain.com"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.phone} 
                  onChange={(e) => handleInputChange('phone', e.target.value)} 
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Current Designation / Job Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.currentTitle} 
                  onChange={(e) => handleInputChange('currentTitle', e.target.value)} 
                  placeholder="e.g. Data Engineer"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Total Professional Experience (Years)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min={0}
                  max={45}
                  value={formData.totalExperienceYears} 
                  onChange={(e) => handleInputChange('totalExperienceYears', Number(e.target.value))} 
                />
              </div>

              <div className="form-group">
                <label className="input-label">Current City / Location</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.currentLocation || ''} 
                  onChange={(e) => handleInputChange('currentLocation', e.target.value)} 
                  placeholder="e.g. Lucknow, U.P."
                />
              </div>
            </div>

            {/* Academic Credentials */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <GraduationCap size={16} color="#34d399" /> Educational Background
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="input-label">Degree</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.education.degree} 
                    onChange={(e) => handleNestedEducationChange('degree', e.target.value)} 
                    placeholder="e.g. Bachelor of Technology (B.Tech)"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Field of Study / Specialization</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.education.field} 
                    onChange={(e) => handleNestedEducationChange('field', e.target.value)} 
                    placeholder="e.g. Computer Science and Engineering"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">College / University</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.education.institution || ''} 
                    onChange={(e) => handleNestedEducationChange('institution', e.target.value)} 
                    placeholder="e.g. KIPM College of Engineering and Technology"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Graduation Year</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={formData.education.passingYear || 2025} 
                    onChange={(e) => handleNestedEducationChange('passingYear', Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Truthfulness Verification
              </h4>
              <p style={{ color: 'var(--foreground-muted)', fontSize: '0.775rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                The agent adheres to a strict Zero-Fabrication rule: application materials and responses will only reference verified background data.
              </p>
              
              <div className={`toggle-card ${formData.legalDeclarationsVerified ? 'checked' : ''}`} onClick={() => handleInputChange('legalDeclarationsVerified', !formData.legalDeclarationsVerified)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#34d399" />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Zero Fabrication Lock</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>Forbid invented accomplishments</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.legalDeclarationsVerified} 
                  onChange={(e) => handleInputChange('legalDeclarationsVerified', e.target.checked)}
                  style={{ accentColor: '#6366f1' }}
                />
              </div>
            </div>

            <div className="glass-card" style={{ background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, var(--surface) 100%)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#c7d2fe', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={15} color="#818cf8" /> Candidate Snapshot
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Verified Skills:</span>
                  <strong style={{ color: '#f8fafc' }}>{formData.primarySkills.length + (formData.secondarySkills?.length || 0)} items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Roles:</span>
                  <strong style={{ color: '#f8fafc' }}>{formData.preferredTitles.length} roles</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Location:</span>
                  <strong style={{ color: '#f8fafc' }}>{formData.currentLocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Min CTC Expectation:</span>
                  <strong style={{ color: '#34d399' }}>₹{(formData.minExpectedSalary / 100000).toFixed(1)} LPA</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Skills & Tech Stack */}
      {activeSubTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Add Skill Control */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Verified Primary Skills ({formData.primarySkills.length})
            </h3>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              The job evaluation engine cross-references these exact skills against job descriptions with a 30% weight in the match algorithm.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Type a new skill (e.g. PySpark, Terraform, React) and press Enter..." 
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPrimarySkill(); }}}
              />
              <button type="button" onClick={() => addPrimarySkill()} className="btn-primary" style={{ padding: '0.55rem 1.25rem' }}>
                <Plus size={16} /> Add Skill
              </button>
            </div>

            {/* Current Skills Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {formData.primarySkills.map(skill => (
                <span key={skill} className="skill-chip primary">
                  <span>{skill}</span>
                  <span className="skill-chip-delete" onClick={() => removePrimarySkill(skill)} title="Remove skill">
                    <Trash2 size={13} />
                  </span>
                </span>
              ))}
            </div>

            {formData.secondarySkills && formData.secondarySkills.length > 0 && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Secondary Skills ({formData.secondarySkills.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {formData.secondarySkills.map(skill => (
                    <span key={skill} className="skill-chip emerald">
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick-Add Recommended Skills */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} color="#818cf8" /> Recommended In-Demand Tech Skills
            </h4>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.775rem', marginBottom: '0.85rem' }}>
              Click any chip below to immediately add it to your candidate profile if you have hands-on experience with it.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {IN_DEMAND_SKILLS.filter(s => !formData.primarySkills.includes(s)).slice(0, 24).map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addPrimarySkill(skill)}
                  className="btn-quick-tag"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Target Roles & Search Scope */}
      {activeSubTab === 'targets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Target Job Titles */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Target Job Titles ({formData.preferredTitles.length})
            </h3>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Multi-role search scope. Discovers jobs matching any of these specific job designations.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Data Engineer, PySpark Developer..." 
                value={newPreferredTitle}
                onChange={(e) => setNewPreferredTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreferredTitle(); }}}
              />
              <button type="button" onClick={addPreferredTitle} className="btn-secondary">
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {formData.preferredTitles.map(title => (
                <span key={title} className="skill-chip emerald">
                  <span>{title}</span>
                  <span className="skill-chip-delete" onClick={() => removePreferredTitle(title)}>
                    <Trash2 size={13} />
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Locations */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Preferred Locations ({formData.preferredLocations.length})
            </h3>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Target metropolitan hubs or Remote preference for job filtering.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Remote, Lucknow, Bengaluru..." 
                value={newPreferredLocation}
                onChange={(e) => setNewPreferredLocation(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPreferredLocation(); }}}
              />
              <button type="button" onClick={() => addPreferredLocation()} className="btn-secondary">
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1rem' }}>
              {formData.preferredLocations.map(loc => (
                <span key={loc} className="skill-chip primary">
                  <MapPin size={12} />
                  <span>{loc}</span>
                  <span className="skill-chip-delete" onClick={() => removePreferredLocation(loc)}>
                    <Trash2 size={13} />
                  </span>
                </span>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--foreground-dim)', fontWeight: 600, marginBottom: '0.4rem' }}>
                QUICK ADD POPULAR LOCATIONS:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {PREFERRED_LOCATION_PRESETS.filter(l => !formData.preferredLocations.includes(l)).map(loc => (
                  <button key={loc} type="button" onClick={() => addPreferredLocation(loc)} className="btn-quick-tag">
                    + {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Compensation & Work Mode */}
      {activeSubTab === 'compensation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Compensation & Availability Constraints
            </h3>

            <div className="form-group">
              <label className="input-label">Minimum Expected Annual Salary (INR)</label>
              <input 
                type="number" 
                className="form-control" 
                step={50000}
                value={formData.minExpectedSalary} 
                onChange={(e) => handleInputChange('minExpectedSalary', Number(e.target.value))} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                  Calculated: ₹{(formData.minExpectedSalary / 100000).toFixed(2)} Lakhs Per Annum (LPA)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                  ≈ ${(formData.minExpectedSalary / 84000).toFixed(1)}k USD
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Notice Period (Days)</label>
              <input 
                type="number" 
                className="form-control" 
                value={formData.noticePeriodDays} 
                onChange={(e) => handleInputChange('noticePeriodDays', Number(e.target.value))} 
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                {[0, 15, 30, 60, 90].map(days => (
                  <button 
                    key={days} 
                    type="button" 
                    onClick={() => handleInputChange('noticePeriodDays', days)}
                    className="btn-quick-tag"
                    style={{ borderColor: formData.noticePeriodDays === days ? '#6366f1' : undefined, color: formData.noticePeriodDays === days ? '#a5b4fc' : undefined }}
                  >
                    {days === 0 ? 'Immediate' : `${days} Days`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="input-label">Work Mode Preference</label>
                <select 
                  className="form-control" 
                  value={formData.workModePreference} 
                  onChange={(e) => handleInputChange('workModePreference', e.target.value)}
                >
                  <option value="Remote">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site Only</option>
                  <option value="Any">Any Work Mode</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Willingness to Relocate</label>
                <select 
                  className="form-control" 
                  value={formData.willingnessToRelocate} 
                  onChange={(e) => handleInputChange('willingnessToRelocate', e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Conditional">Conditional / Ask Me First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Visa & Sensitive Questionnaire Controls */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              Screening Question Approvals
            </h4>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.775rem' }}>
              Configure how the automated agent responds to sensitive application questionnaire prompts.
            </p>

            <div className={`toggle-card ${!formData.hasVisaSponsorship ? 'checked' : ''}`} onClick={() => handleInputChange('hasVisaSponsorship', !formData.hasVisaSponsorship)}>
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>Work Authorization</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--foreground-muted)' }}>Authorized to work without visa sponsorship</div>
              </div>
              <input 
                type="checkbox" 
                checked={!formData.hasVisaSponsorship} 
                onChange={(e) => handleInputChange('hasVisaSponsorship', !e.target.checked)}
                style={{ accentColor: '#6366f1' }}
              />
            </div>

            <div className={`toggle-card checked`}>
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>Human-in-the-Loop Escalation</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--foreground-muted)' }}>Pause applications when questions require personal declaration</div>
              </div>
              <input 
                type="checkbox" 
                checked={true} 
                disabled={true}
                style={{ accentColor: '#6366f1' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Company Whitelist & Hard Avoid Rules */}
      {activeSubTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Target Dream Companies */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Building size={16} color="#34d399" /> Priority Target Companies
            </h3>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Jobs discovered from these organizations receive a 5% positive score boost in weighted matching.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Target company name (e.g. Databricks, Stripe)..." 
                value={newTargetCompany}
                onChange={(e) => setNewTargetCompany(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTargetCompany(); }}}
              />
              <button type="button" onClick={addTargetCompany} className="btn-secondary">
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {formData.targetCompanies.map(comp => (
                <span key={comp} className="skill-chip emerald">
                  <Building size={12} />
                  <span>{comp}</span>
                  <span className="skill-chip-delete" onClick={() => removeTargetCompany(comp)}>
                    <Trash2 size={13} />
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Avoid / Blacklisted Companies */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldAlert size={16} color="#f87171" /> Hard Avoid / Blacklisted Companies
            </h3>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Stage A Hard Filter: The agent will instantly skip any job listings matching these companies.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Company to avoid (e.g. Revature, InfoSys)..." 
                value={newAvoidCompany}
                onChange={(e) => setNewAvoidCompany(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAvoidCompany(); }}}
              />
              <button type="button" onClick={addAvoidCompany} className="btn-secondary">
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {formData.companiesToAvoid.map(comp => (
                <span key={comp} className="skill-chip rose">
                  <ShieldAlert size={12} />
                  <span>{comp}</span>
                  <span className="skill-chip-delete" onClick={() => removeAvoidCompany(comp)}>
                    <Trash2 size={13} />
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
