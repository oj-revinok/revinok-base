'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface FeedbackButtonProps {
  /** Current user's full name (from profile) */
  userName: string;
  /** Current user's ID */
  userId: string;
}

/**
 * Sticky feedback button (bottom-right corner).
 * Opens a simple form. On submit, inserts a notification
 * to all admins with the user's name + comment.
 */
export default function FeedbackButton({ userName, userId }: FeedbackButtonProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        if (isOpen && !sending) setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, sending]);

  const handleSubmit = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to send');

      setSent(true);
      setComment('');
      setTimeout(() => {
        setSent(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Feedback error:', err);
      alert('Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={formRef}
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}
    >
      {/* ─── Popup form ─── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            right: 0,
            width: 320,
            background: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 20,
            boxShadow: colors.shadow,
            animation: 'feedbackSlideUp 0.2s ease',
          }}
        >
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 15,
              fontWeight: 600,
              color: colors.text,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Send Feedback
          </p>

          {sent ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 0',
                color: colors.success,
                fontSize: 14,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <i className="lni lni-check-circle-" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              Thanks! Feedback sent.
            </div>
          ) : (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What's on your mind? Bug, idea, anything..."
                rows={4}
                style={{
                  width: '100%',
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  color: colors.text,
                  fontSize: 13,
                  fontFamily: 'Montserrat, sans-serif',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                }}
                autoFocus
              />

              <button
                onClick={handleSubmit}
                disabled={!comment.trim() || sending}
                style={{
                  display: 'inline-flex',
                  height: 40,
                  padding: '10px 16px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 5,
                  borderRadius: 10000,
                  border: `1px solid ${colors.accent}`,
                  background: colors.accent,
                  color: '#080808',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: !comment.trim() || sending ? 'not-allowed' : 'pointer',
                  opacity: !comment.trim() || sending ? 0.5 : 1,
                  marginTop: 10,
                  width: '100%',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {sending ? 'Sending...' : 'Send Feedback'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ─── Sticky trigger button ─── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setSent(false);
        }}
        aria-label="Send feedback"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: 10000,
          border: `1px solid ${colors.accent}`,
          background: colors.accent,
          color: '#080808',
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(189,214,48,0.3)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        {isOpen ? (
          <i className="lni lni-xmark" />
        ) : (
          <i className="lni lni-comment-" />
        )}
      </button>

      {/* ─── Keyframe animation (injected once) ─── */}
      <style>{`
        @keyframes feedbackSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
