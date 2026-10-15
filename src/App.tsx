import React, { useState, useEffect } from 'react';
import { defaultProfile } from './data/defaultProfile';
import { UserProfile, JobListing, ApplicationRecord, DailyReportSummary, WorkflowLog } from './types';
import {
  fetchProfile,
  saveProfile,
  fetchJobs,
  triggerJobSearch,
  fetchApplications,
  approveApplication,
  rejectApplication,
  fetchLogs,
  clearLogs,
  fetchDashboardStats
} from './api/client';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ProfileView } from './components/ProfileView';
import { TrackerView } from './components/TrackerView';
import { PendingApprovalsView } from './components/PendingApprovalsView';
import { JobDiscoveryView } from './components/JobDiscoveryView';
import { LogsAndRulesView } from './components/LogsAndRulesView';
import { ConnectedSourcesView } from './components/ConnectedSourcesView';
import { SearchSchedulingView } from './components/SearchSchedulingView';
import { JobDetailModal } from './components/JobDetailModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [scoreThreshold, setScoreThreshold] = useState<number>(75);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Evaluated Jobs with Match Scores
  const [evaluatedJobs, setEvaluatedJobs] = useState<JobListing[]>([]);
  
  // Applications Database Tracker
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  
  // Workflow Execution Logs
  const [logs, setLogs] = useState<WorkflowLog[]>([]);

  // Daily Summary Report
  const [dailyReport, setDailyReport] = useState<DailyReportSummary>({
    runDate: new Date().toISOString().split('T')[0],
    jobsFound: 0,
    jobsMatching: 0,
    applicationsSubmitted: 0,
    jobsSkipped: 0,
    pendingApprovals: 0
  });

  // Inspected Job Modal State
  const [inspectedJob, setInspectedJob] = useState<JobListing | null>(null);

  // Load persistent data from backend API on mount
  const loadAllData = async () => {
    try {
      const [profData, jobsData, appsData, logsData, statsData] = await Promise.allSettled([
        fetchProfile(),
        fetchJobs(),
        fetchApplications(),
        fetchLogs(),
        fetchDashboardStats()
      ]);

      if (profData.status === 'fulfilled' && profData.value) {
        setProfile(profData.value);
        if (profData.value.minMatchScore) {
          setScoreThreshold(profData.value.minMatchScore);
        }
      }

      if (jobsData.status === 'fulfilled' && jobsData.value) {
        setEvaluatedJobs(jobsData.value);
      }

      if (appsData.status === 'fulfilled' && appsData.value) {
        setApplications(appsData.value);
      }

      if (logsData.status === 'fulfilled' && logsData.value) {
        setLogs(logsData.value);
      }

      if (statsData.status === 'fulfilled' && statsData.value) {
        const s = statsData.value;
        setDailyReport({
          runDate: new Date().toISOString().split('T')[0],
          jobsFound: s.totalDiscovered,
          jobsMatching: s.highMatch,
          applicationsSubmitted: s.submitted,
          jobsSkipped: s.skipped,
          pendingApprovals: s.pendingApprovals,
          readyToApplyCount: s.readyToApply,
          interviewCount: s.interview,
          offerCount: s.offer
        });
      }
    } catch (err) {
      console.error('Error loading initial data from API:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Autonomous Real Multi-Source Job Search
  const handleStartJobSearch = async () => {
    setIsSearching(true);
    try {
      await triggerJobSearch();
      await loadAllData();
    } catch (err: any) {
      console.error('Search execution failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    setProfile(updated);
    try {
      await saveProfile(updated);
      await loadAllData();
    } catch (err) {
      console.error('Failed to save profile to server:', err);
    }
  };

  const handleScoreThresholdChange = async (newVal: number) => {
    setScoreThreshold(newVal);
    const updated = { ...profile, minMatchScore: newVal };
    setProfile(updated);
    try {
      await saveProfile(updated);
      await loadAllData();
    } catch (err) {
      console.error('Failed to update score threshold:', err);
    }
  };

  const handleApproveApplication = async (appId: string, customAnswer?: string) => {
    try {
      await approveApplication(appId, customAnswer);
      await loadAllData();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleRejectApplication = async (appId: string, reason?: string) => {
    try {
      await rejectApplication(appId, reason);
      await loadAllData();
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearLogs();
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const pendingApprovalsCount = applications.filter(a => a.status === 'Approval Required').length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        onSelectTab={setActiveTab}
        pendingCount={pendingApprovalsCount}
        totalApplicationsCount={applications.length}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header 
          onStartJobSearch={handleStartJobSearch}
          isSearching={isSearching}
          pendingApprovalsCount={pendingApprovalsCount}
          scoreThreshold={scoreThreshold}
          onScoreThresholdChange={handleScoreThresholdChange}
        />

        <main className="content-body">
          {activeTab === 'dashboard' && (
            <DashboardView 
              report={dailyReport}
              applications={applications}
              onStartJobSearch={handleStartJobSearch}
              isSearching={isSearching}
              onNavigateTab={setActiveTab}
              onSelectApplication={(app) => setActiveTab('approvals')}
              userProfile={profile}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView 
              profile={profile}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {activeTab === 'tracker' && (
            <TrackerView 
              applications={applications}
              onSelectApplication={(app) => setActiveTab('approvals')}
              onRefreshApplications={loadAllData}
            />
          )}

          {activeTab === 'approvals' && (
            <PendingApprovalsView 
              applications={applications}
              onApproveApplication={handleApproveApplication}
              onRejectApplication={handleRejectApplication}
              profile={profile}
            />
          )}

          {activeTab === 'discovery' && (
            <JobDiscoveryView 
              jobs={evaluatedJobs}
              profile={profile}
              scoreThreshold={scoreThreshold}
              onInspectJob={(job) => setInspectedJob(job)}
              onJobImported={loadAllData}
            />
          )}

          {activeTab === 'sources' && (
            <ConnectedSourcesView 
              onJobImported={loadAllData}
            />
          )}

          {activeTab === 'schedule' && (
            <SearchSchedulingView 
              onSearchCompleted={loadAllData}
            />
          )}

          {activeTab === 'logs' && (
            <LogsAndRulesView 
              logs={logs}
              onClearLogs={handleClearLogs}
            />
          )}
        </main>
      </div>

      {/* Job Inspection Modal */}
      {inspectedJob && (
        <JobDetailModal 
          job={inspectedJob}
          profile={profile}
          scoreThreshold={scoreThreshold}
          onClose={() => setInspectedJob(null)}
        />
      )}
    </div>
  );
};
