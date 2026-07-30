import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, WishItem, ActionLog, UserGoal } from './types';
import { LoginSelectScreen } from './components/LoginSelectScreen';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { QuizQuest } from './components/QuizQuest';
import { WishlistSection } from './components/WishlistSection';
import { TrainingModal } from './components/TrainingModal';
import { InputReviewModal } from './components/InputReviewModal';
import { EatRiceModal } from './components/EatRiceModal';
import { ParentPortal } from './components/ParentPortal';
import { UserRegisterModal } from './components/UserRegisterModal';
import { RivalBoard } from './components/RivalBoard';
import { ReflectionView } from './components/ReflectionView';
import { LuckyGachaModal, GachaResult } from './components/LuckyGachaModal';
import { ParentPinAuthModal } from './components/ParentPinAuthModal';

export const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentGoal, setCurrentGoal] = useState<UserGoal | null>(null);
  const [isParentMode, setIsParentMode] = useState<boolean>(false);
  // Single Source of Truth activeTab State (No modal flags for full views)
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isParentPinModalOpen, setIsParentPinModalOpen] = useState<boolean>(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [inputReviewType, setInputReviewType] = useState<'input_book' | 'input_movie' | 'input_manga'>('input_book');
  const [swipeDirection, setSwipeDirection] = useState<'next' | 'prev'>('next');
  const [transitionKey, setTransitionKey] = useState(0);

  // Full 8-Menu Swipe Cycle Loop: Home -> Quiz -> Read/Movie -> Training -> Eat -> History -> Wishlist -> Rivals -> Home
  const TAB_CYCLE = useMemo(() => ['dashboard', 'quiz', 'input_book', 'training', 'eat_rice', 'action-logs', 'wishlist', 'rivals'], []);

  const handleSwipeTab = useCallback((direction: 'next' | 'prev') => {
    if (isParentMode || !currentUser) return;
    const currentIndex = TAB_CYCLE.indexOf(activeTab);
    const validIdx = currentIndex === -1 ? 0 : currentIndex;

    let nextIndex = 0;
    if (direction === 'next') {
      nextIndex = (validIdx + 1) % TAB_CYCLE.length;
    } else {
      nextIndex = (validIdx - 1 + TAB_CYCLE.length) % TAB_CYCLE.length;
    }

    setSwipeDirection(direction);
    setTransitionKey((k) => k + 1);
    setActiveTab(TAB_CYCLE[nextIndex]);
  }, [isParentMode, currentUser, activeTab, TAB_CYCLE]);

  // Also track direction when changing tabs via header click
  const handleSetActiveTab = useCallback((newTab: string) => {
    const currentIndex = TAB_CYCLE.indexOf(activeTab);
    const nextIndex = TAB_CYCLE.indexOf(newTab);
    if (nextIndex > currentIndex) {
      setSwipeDirection('next');
    } else {
      setSwipeDirection('prev');
    }
    setTransitionKey((k) => k + 1);
    setActiveTab(newTab);
  }, [activeTab, TAB_CYCLE]);

  // Touch Swipe Gesture State & Handlers
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger tab swipe when interacting with form controls or sliders
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('.slider') ||
      target.closest('.no-swipe')
    ) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    if (e.changedTouches.length !== 1) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Detect horizontal swipe: min 50px horizontal, and horizontal movement must be 1.5x vertical
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        handleSwipeTab('next'); // Swipe left -> Next tab
      } else {
        handleSwipeTab('prev'); // Swipe right -> Previous tab
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleActionSuccess = () => {
    fetchData();
    // Stay on the current page for continuous input (don't navigate to action-logs)
  };

  const handleOpenInputReviewModal = (type?: 'input_book' | 'input_movie' | 'input_manga') => {
    if (type) setInputReviewType(type);
    handleSetActiveTab('input_book');
  };

  const fetchData = async () => {
    try {
      const [uRes, wRes, lRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/wish-items'),
        fetch('/api/action-logs')
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.success && uData.users.length > 0) {
          setUsers(uData.users);

          // If currentUser is already set, update their latest user data without changing activeTab
          if (currentUser) {
            const updatedUser = uData.users.find((u: User) => u.id === currentUser.id);
            if (updatedUser) {
              setCurrentUser(updatedUser);
            }
          } else {
            // Auto-login from localStorage only on initial app load when no user is selected
            const savedParent = localStorage.getItem('incentique_is_parent_mode');
            const savedUserId = localStorage.getItem('incentique_last_user_id');

            if (savedParent === 'true') {
              setIsParentMode(true);
              setActiveTab('parent');
            } else if (savedUserId) {
              const matched = uData.users.find((u: User) => u.id === savedUserId);
              if (matched) {
                setCurrentUser(matched);
                setActiveTab('dashboard');
              }
            }
          }
        } else {
          setUsers([]);
          setCurrentUser(null);
          setIsRegisterModalOpen(true);
        }
      } else {
        setUsers([]);
        setCurrentUser(null);
        setIsRegisterModalOpen(true);
      }

      if (wRes.ok) {
        const wData = await wRes.json();
        setWishItems(wData.success ? wData.wishItems : []);
      } else {
        setWishItems([]);
      }

      if (lRes.ok) {
        const lData = await lRes.json();
        setActionLogs(lData.success ? lData.logs : []);
      } else {
        setActionLogs([]);
      }
    } catch (err) {
      // Show an empty state rather than mock data — fake logs and a fake goal
      // read as real records and hide the fact that the API is unreachable.
      console.error('Failed to load app data:', err);
      setWishItems([]);
      setActionLogs([]);
    }
  };

  const fetchUserGoal = async (userId: string) => {
    try {
      const res = await fetch(`/api/goals/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.goal) {
          setCurrentGoal(data.goal);
          return;
        }
      }
      // No goal yet — the planner widget renders its own "未設定" state
      setCurrentGoal(null);
    } catch (err) {
      setCurrentGoal(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserGoal(currentUser.id);
    }
  }, [currentUser?.id]);

  // Handle Select User (Instant 1-click login & save to localStorage)
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setIsParentMode(false);
    localStorage.setItem('incentique_last_user_id', user.id);
    localStorage.setItem('incentique_is_parent_mode', 'false');
    setActiveTab('dashboard');
  };

  // Handle Toggle Admin Mode (Triggers 4-digit PIN Auth Modal)
  const handleToggleParentMode = () => {
    if (isParentMode) {
      setIsParentMode(false);
      localStorage.setItem('incentique_is_parent_mode', 'false');
      const savedUserId = localStorage.getItem('incentique_last_user_id');
      const matched = users.find((u) => u.id === savedUserId);
      if (matched) {
        setCurrentUser(matched);
      }
      setActiveTab('dashboard');
      return;
    }
    // Prompt for 4-digit PIN authentication
    setIsParentPinModalOpen(true);
  };

  const handleParentPinSuccess = () => {
    setIsParentPinModalOpen(false);
    setIsParentMode(true);
    localStorage.setItem('incentique_is_parent_mode', 'true');
    setActiveTab('parent');
  };

  const handleUserRegistered = async (
    newUser: User,
    initialGoal?: { title: string; points: number; date: string }
  ) => {
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setIsParentMode(false);
    localStorage.setItem('incentique_last_user_id', newUser.id);
    localStorage.setItem('incentique_is_parent_mode', 'false');
    setActiveTab('dashboard');

    if (initialGoal) {
      const newGoalObj: UserGoal = {
        id: 'goal_' + Date.now(),
        user_id: newUser.id,
        target_title: initialGoal.title,
        target_points: initialGoal.points,
        target_date: initialGoal.date,
      };
      setCurrentGoal(newGoalObj);

      try {
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: newUser.id,
            targetTitle: initialGoal.title,
            targetPoints: initialGoal.points,
            targetDate: initialGoal.date,
          }),
        });
      } catch (err) {
        console.error('Failed to save initial goal:', err);
      }
    }
  };

  const handlePointsUpdate = (newPoints: number) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, current_points: newPoints });
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, current_points: newPoints } : u))
      );
    }
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('incentique_last_user_id');
    localStorage.removeItem('incentique_is_parent_mode');
    setCurrentUser(null);
    setIsParentMode(false);
    setActiveTab('dashboard');
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('この記録を削除しますか？（獲得したポイントも減算されます）')) return;
    try {
      const res = await fetch(`/api/action-logs/${logId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Delete log error:', err);
    }
  };

  // If not logged in and not in parent mode, show Login & Profile Select Landing Screen
  if (!currentUser && !isParentMode) {
    return (
      <>
        <LoginSelectScreen
          users={users}
          onSelectUser={handleSelectUser}
          onToggleParentMode={handleToggleParentMode}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        />
        <UserRegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onUserRegistered={handleUserRegistered}
          onSuccess={handleUserRegistered}
        />
        <ParentPinAuthModal
          isOpen={isParentPinModalOpen}
          onClose={() => setIsParentPinModalOpen(false)}
          onSuccess={handleParentPinSuccess}
        />
      </>
    );
  }

  return (
    <div
      className="min-h-screen bg-cyber-dark text-slate-100 flex flex-col justify-between select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div>
        {/* Header */}
        <Header
          currentUser={currentUser}
          isParentMode={isParentMode}
          onLogout={handleLogout}
          onToggleParentMode={handleToggleParentMode}
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          onOpenTrainingModal={() => handleSetActiveTab('training')}
          onOpenInputReviewModal={handleOpenInputReviewModal}
          onOpenEatRiceModal={() => handleSetActiveTab('eat_rice')}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isParentMode ? (
            activeTab === 'wishlist' ? (
              <WishlistSection
                currentUser={currentUser}
                isParentMode={isParentMode}
                users={users}
                wishItems={wishItems}
                onRefresh={fetchData}
              />
            ) : (
              <ParentPortal
                users={users}
                wishItems={wishItems}
                onRefresh={fetchData}
              />
            )
          ) : (
            <div key={transitionKey} className={swipeDirection === 'next' ? 'page-enter' : 'page-enter-reverse'}>
              {activeTab === 'dashboard' && (
                <Dashboard
                  currentUser={currentUser}
                  currentGoal={currentGoal}
                  users={users}
                  actionLogs={actionLogs}
                  onNavigate={handleSetActiveTab}
                  onOpenTrainingModal={() => handleSetActiveTab('training')}
                  onOpenInputReviewModal={handleOpenInputReviewModal}
                  onOpenEatRiceModal={() => handleSetActiveTab('eat_rice')}
                  onGoalUpdated={(newGoal) => setCurrentGoal(newGoal)}
                />
              )}

              {activeTab === 'rivals' && (
                <RivalBoard
                  users={users}
                  currentUser={currentUser}
                  actionLogs={actionLogs}
                />
              )}

              {activeTab === 'quiz' && (
                <QuizQuest
                  currentUser={currentUser}
                  onPointsUpdate={handlePointsUpdate}
                  onGachaResult={setGachaResult}
                />
              )}

              {activeTab === 'input_book' && (
                <InputReviewModal
                  currentUser={currentUser}
                  initialType={inputReviewType}
                  onSuccess={handleActionSuccess}
                  onGachaResult={setGachaResult}
                />
              )}

              {activeTab === 'training' && (
                <TrainingModal
                  currentUser={currentUser}
                  onSuccess={handleActionSuccess}
                  onGachaResult={setGachaResult}
                />
              )}

              {activeTab === 'eat_rice' && (
                <EatRiceModal
                  currentUser={currentUser}
                  actionLogs={actionLogs}
                  onSuccess={handleActionSuccess}
                  onGachaResult={setGachaResult}
                />
              )}

              {activeTab === 'action-logs' && (
                <ReflectionView
                  currentUser={currentUser}
                  actionLogs={actionLogs}
                  onDeleteLog={handleDeleteLog}
                />
              )}

              {activeTab === 'wishlist' && (
                <WishlistSection
                  currentUser={currentUser}
                  isParentMode={isParentMode}
                  users={users}
                  wishItems={wishItems}
                  onRefresh={fetchData}
                />
              )}

              {activeTab === 'parent' && (
                <ParentPortal
                  users={users}
                  wishItems={wishItems}
                  onRefresh={fetchData}
                />
              )}
            </div>
          )}
        </main>

        {/* Lucky Gacha Multiplier Bonus Modal */}
        <LuckyGachaModal
          result={gachaResult}
          onClose={() => setGachaResult(null)}
        />

        <UserRegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onUserRegistered={handleUserRegistered}
          onSuccess={handleUserRegistered}
        />

        <ParentPinAuthModal
          isOpen={isParentPinModalOpen}
          onClose={() => setIsParentPinModalOpen(false)}
          onSuccess={handleParentPinSuccess}
        />
      </div>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 pb-20 md:pb-6">
        <p>INCENTI QUEST — Cloudflare Workers, Pages & D1 (SQLite) + Gemini API Powered</p>
      </footer>
    </div>
  );
};
