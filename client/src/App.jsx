import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import DailyRewardModal from './components/DailyRewardModal';
import AuthModal from './components/AuthModal';

import ProblemsPage from './pages/ProblemsPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import DuelArenaPage from './pages/DuelArenaPage';
import LiveDuelPage from './pages/LiveDuelPage';
import InterviewRoomPage from './pages/InterviewRoomPage';
import SocialPage from './pages/SocialPage';
import ChatPage from './pages/ChatPage';
import QuestsPage from './pages/QuestsPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';

function MainApp() {
  const { user, showDailyModal, setShowDailyModal } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState('problems');
  const [selectedProblemSlug, setSelectedProblemSlug] = useState('two-sum');
  const [activeDuelId, setActiveDuelId] = useState(null);
  const [chatTargetUserId, setChatTargetUserId] = useState(null);

  // Interview deep linking state
  const [interviewRoomId, setInterviewRoomId] = useState('');
  const [interviewRole, setInterviewRole] = useState('interviewer');

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Deep Link & URL Query Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qInterview = params.get('interview');
    const qRole = params.get('role');
    const qDuel = params.get('duel');
    const qProblem = params.get('problem');

    if (qInterview) {
      setInterviewRoomId(qInterview);
      setInterviewRole(qRole || 'candidate');
      setActiveTab('interview');
    } else if (qDuel) {
      setActiveDuelId(qDuel);
      setActiveTab('live-duel');
    } else if (qProblem) {
      setSelectedProblemSlug(qProblem);
      setActiveTab('problem-detail');
    }
  }, []);

  // Handlers
  const handleSelectProblem = (slug) => {
    setSelectedProblemSlug(slug);
    setActiveTab('problem-detail');
  };

  const handleEnterDuel = (duelId) => {
    setActiveDuelId(duelId);
    setActiveTab('live-duel');
  };

  const handleOpenChatWithUser = (targetUserId) => {
    setChatTargetUserId(targetUserId);
    setActiveTab('chat');
  };

  const handleChallengeUserToDuel = (targetUserId) => {
    setActiveTab('duels');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main Page Content */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'problems' && (
          <ProblemsPage onSelectProblem={handleSelectProblem} />
        )}

        {activeTab === 'problem-detail' && (
          <ProblemDetailPage
            slug={selectedProblemSlug}
            onBack={() => setActiveTab('problems')}
          />
        )}

        {activeTab === 'duels' && (
          <DuelArenaPage onEnterDuel={handleEnterDuel} />
        )}

        {activeTab === 'live-duel' && (
          <LiveDuelPage
            duelId={activeDuelId}
            onLeave={() => setActiveTab('duels')}
          />
        )}

        {activeTab === 'interview' && (
          <InterviewRoomPage
            initialRoomId={interviewRoomId}
            initialRole={interviewRole}
          />
        )}

        {activeTab === 'social' && (
          <SocialPage
            onOpenChat={handleOpenChatWithUser}
            onChallengeDuel={handleChallengeUserToDuel}
          />
        )}

        {activeTab === 'chat' && (
          <ChatPage
            initialTargetUserId={chatTargetUserId}
            onChallengeDuel={handleChallengeUserToDuel}
          />
        )}

        {activeTab === 'quests' && (
          <QuestsPage onNavigate={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'profile' && (
          <ProfilePage onNavigate={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardPage onChallengeUser={handleChallengeUserToDuel} />
        )}
      </main>

      {/* Daily Login Reward Streak Modal */}
      <DailyRewardModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
      />

      {/* Authentication Modal (Login / Register / Google Auth) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
