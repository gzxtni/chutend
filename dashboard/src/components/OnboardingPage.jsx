import { useState, useRef, useEffect } from 'react';
import { ChevronsRight, Check } from 'lucide-react';
import './OnboardingPage.css';

export default function OnboardingPage({ onGetStarted }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const trackRef = useRef(null);
  const handleRef = useRef(null);
  const startXRef = useRef(0);
  const maxDragRef = useRef(180);

  // Measure max drag distance dynamically
  const updateMaxDrag = () => {
    if (trackRef.current && handleRef.current) {
      const trackWidth = trackRef.current.clientWidth;
      const handleWidth = handleRef.current.clientWidth;
      // padding inside track is 6px each side
      maxDragRef.current = Math.max(0, trackWidth - handleWidth - 12);
    }
  };

  useEffect(() => {
    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, []);

  function handlePointerDown(e) {
    if (isCompleted) return;
    updateMaxDrag();
    setIsDragging(true);
    startXRef.current = e.clientX - dragX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!isDragging || isCompleted) return;
    const newX = e.clientX - startXRef.current;
    const clampedX = Math.max(0, Math.min(newX, maxDragRef.current));
    setDragX(clampedX);

    // If dragged near the very end, complete immediately
    if (clampedX >= maxDragRef.current * 0.88) {
      triggerSuccess();
    }
  }

  function handlePointerUp(e) {
    if (!isDragging || isCompleted) return;
    setIsDragging(false);

    // If released past 60% of track, complete swipe
    if (dragX >= maxDragRef.current * 0.6) {
      triggerSuccess();
    } else {
      // Spring back to start
      setDragX(0);
    }
  }

  function triggerSuccess() {
    setIsDragging(false);
    setIsCompleted(true);
    setDragX(maxDragRef.current);

    setTimeout(() => {
      onGetStarted && onGetStarted();
    }, 280);
  }

  // Click fallback: tap button to auto-slide to right and start
  function handleClick() {
    if (isCompleted) return;
    triggerSuccess();
  }

  const progressRatio = maxDragRef.current > 0 ? dragX / maxDragRef.current : 0;

  return (
    <div className="onboarding-page" id="onboarding-page">
      {/* Top Header Logo */}
      <div className="onboarding-header">
        <h2 className="onboarding-brand-logo">
          APIX<span>E</span>R
        </h2>
      </div>

      {/* Hero Image Section */}
      <div className="onboarding-hero-wrapper">
        <img
          src="/onboarding-hero.jpg"
          alt="Developer using mobile platform"
          className="onboarding-hero-img"
        />
      </div>

      {/* Bottom Content Sheet */}
      <div className="onboarding-sheet">
        <h1 className="onboarding-headline">
          TURN DATA INTO SMART DECISIONS
        </h1>

        <p className="onboarding-subtext">
          See live requests, response times, and system health instantly.
        </p>

        {/* Swipeable Track Container */}
        <div
          ref={trackRef}
          className="swipe-track-container"
          id="swipe-track-container"
        >
          {/* Subtle Track Background Hint */}
          <div
            className="swipe-track-progress"
            style={{ width: `${Math.max(10, progressRatio * 100)}%` }}
          />

          {/* Swipe Handle Pill (Draggable / Tap) */}
          <div
            ref={handleRef}
            className={`swipe-handle-pill ${isDragging ? 'is-dragging' : ''} ${isCompleted ? 'is-completed' : ''}`}
            style={{
              transform: `translate3d(${dragX}px, 0, 0)`,
              transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleClick}
            role="slider"
            aria-valuenow={Math.round(progressRatio * 100)}
            tabIndex={0}
            id="swipe-handle"
          >
            <span>{isCompleted ? 'Opening...' : 'Get Started'}</span>
          </div>

          {/* Right End Chevrons */}
          <div
            className="swipe-chevrons-target"
            style={{ opacity: Math.max(0.2, 1 - progressRatio * 1.2) }}
          >
            <ChevronsRight size={22} className="swipe-animated-chevrons" />
          </div>
        </div>
      </div>
    </div>
  );
}
