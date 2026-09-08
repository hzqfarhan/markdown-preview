'use client';

import React, { useState, useEffect } from 'react';
import {
  CloseIcon,
  CheckIcon,
  WandIcon,
  KeyIcon,
  GoogleIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
} from './Icons';

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onKeysUpdated?: () => void;
  onKeysSaved?: () => void;
}

export default function ApiSettingsModal({
  isOpen,
  onClose,
  user,
  onSignOut,
  onKeysUpdated,
  onKeysSaved,
}: ApiSettingsModalProps) {
  const [preferredProvider, setPreferredProvider] = useState<string>('Gemini');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [anthropicKey, setAnthropicKey] = useState<string>('');
  const [showKeys, setShowKeys] = useState(false);

  // Testing status
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider =
        localStorage.getItem('md_preferred_provider') ||
        localStorage.getItem('preferred_ai_provider') ||
        'Gemini';
      setPreferredProvider(savedProvider);
      setGeminiKey(
        localStorage.getItem('md_gemini_key') ||
        localStorage.getItem('gemini_api_key') ||
        ''
      );
      setOpenaiKey(
        localStorage.getItem('md_openai_key') ||
        localStorage.getItem('openai_api_key') ||
        ''
      );
      setAnthropicKey(
        localStorage.getItem('md_anthropic_key') ||
        localStorage.getItem('anthropic_api_key') ||
        ''
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);

    const activeKey =
      preferredProvider === 'Gemini'
        ? geminiKey
        : preferredProvider === 'OpenAI'
        ? openaiKey
        : preferredProvider === 'Anthropic'
        ? anthropicKey
        : '';

    try {
      const res = await fetch('/api/refine/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: preferredProvider,
          apiKey: activeKey || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected successfully to ${preferredProvider}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please check your key.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Network error occurred while testing API key.',
      });
    } finally {
      setIsTesting(false);
    }
  }

  function handleSave() {
    localStorage.setItem('md_preferred_provider', preferredProvider);
    localStorage.setItem('preferred_ai_provider', preferredProvider);

    if (geminiKey.trim()) {
      localStorage.setItem('md_gemini_key', geminiKey.trim());
      localStorage.setItem('gemini_api_key', geminiKey.trim());
    } else {
      localStorage.removeItem('md_gemini_key');
      localStorage.removeItem('gemini_api_key');
    }

    if (openaiKey.trim()) {
      localStorage.setItem('md_openai_key', openaiKey.trim());
      localStorage.setItem('openai_api_key', openaiKey.trim());
    } else {
      localStorage.removeItem('md_openai_key');
      localStorage.removeItem('openai_api_key');
    }

    if (anthropicKey.trim()) {
      localStorage.setItem('md_anthropic_key', anthropicKey.trim());
      localStorage.setItem('anthropic_api_key', anthropicKey.trim());
    } else {
      localStorage.removeItem('md_anthropic_key');
      localStorage.removeItem('anthropic_api_key');
    }

    if (onKeysUpdated) onKeysUpdated();
    if (onKeysSaved) onKeysSaved();
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(62, 39, 35, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="crayon-card modal-content"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '2.5px solid var(--crayon-border, #E8C8D8)',
          boxShadow: '0 20px 40px rgba(123, 31, 162, 0.2)',
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '2px dashed var(--crayon-border, #E8C8D8)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--crayon-pink-bg, #FCE4EC)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crayon-pink, #E91E8C)',
              }}
            >
              <KeyIcon size={20} />
            </span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading, "Patrick Hand", cursive)',
                  color: 'var(--crayon-purple, #7B1FA2)',
                }}
              >
                API & Account Settings
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: 'var(--crayon-text-secondary, #6D4C5E)',
                }}
              >
                Configure AI Refine keys and Google cloud integration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--crayon-text-muted, #A08090)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Section 1: AI Provider Selection */}
        <div style={{ marginBottom: '22px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--crayon-purple, #7B1FA2)',
              marginBottom: '6px',
            }}
          >
            Primary AI Provider
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            {(['Gemini', 'OpenAI', 'Anthropic'] as const).map((prov) => {
              const active = preferredProvider === prov;
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setPreferredProvider(prov)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: active
                      ? '2px solid var(--crayon-pink, #E91E8C)'
                      : '1.5px solid var(--crayon-border, #E8C8D8)',
                    backgroundColor: active
                      ? 'var(--crayon-pink-bg, #FCE4EC)'
                      : '#FFFFFF',
                    color: active
                      ? 'var(--crayon-pink, #E91E8C)'
                      : 'var(--crayon-text, #3E2723)',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{prov}</span>
                  {prov === 'Gemini' && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--crayon-purple, #7B1FA2)',
                        fontWeight: 600,
                      }}
                    >
                      (Free & Fast)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Key Input */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <label
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--crayon-text-secondary, #6D4C5E)',
                }}
              >
                {preferredProvider} API Key (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  color: 'var(--crayon-pink, #E91E8C)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showKeys ? 'Hide key' : 'Show key'}
              </button>
            </div>

            {preferredProvider === 'Gemini' && (
              <input
                type={showKeys ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... (or keep blank to use .env.local)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--crayon-border, #E8C8D8)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            )}

            {preferredProvider === 'OpenAI' && (
              <input
                type={showKeys ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-... (or keep blank to use .env.local)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--crayon-border, #E8C8D8)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            )}

            {preferredProvider === 'Anthropic' && (
              <input
                type={showKeys ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-... (or keep blank to use .env.local)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--crayon-border, #E8C8D8)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            )}

            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '0.75rem',
                color: 'var(--crayon-text-muted, #A08090)',
              }}
            >
              You can enter a key here to save in your browser, or set it in your project&apos;s{' '}
              <code style={{ background: '#f5f0f3', padding: '1px 4px', borderRadius: '4px' }}>
                .env.local
              </code>{' '}
              file.
            </p>
          </div>

          {/* Helper Link & Test Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '8px',
            }}
          >
            {preferredProvider === 'Gemini' ? (
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--crayon-pink, #E91E8C)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <span>Get free Gemini key from Google AI Studio</span>
                <ExternalLinkIcon size={12} />
              </a>
            ) : preferredProvider === 'OpenAI' ? (
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--crayon-pink, #E91E8C)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <span>Get OpenAI API key</span>
                <ExternalLinkIcon size={12} />
              </a>
            ) : (
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--crayon-pink, #E91E8C)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <span>Get Anthropic API key</span>
                <ExternalLinkIcon size={12} />
              </a>
            )}

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--crayon-purple-light, #BA68C8)',
                backgroundColor: 'var(--crayon-purple-bg, #F3E5F5)',
                color: 'var(--crayon-purple, #7B1FA2)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isTesting ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <WandIcon size={14} />
              <span>{isTesting ? 'Testing connection...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Test connection alert message */}
          {testResult && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: testResult.success ? '#F1F8E9' : '#FFEBEE',
                color: testResult.success ? '#33691E' : '#C62828',
                border: `1px solid ${testResult.success ? '#C5E1A5' : '#FFCDD2'}`,
              }}
            >
              {testResult.success && <CheckCircleIcon size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Section 2: Google Account & OAuth */}
        <div
          style={{
            borderTop: '2px dashed var(--crayon-border, #E8C8D8)',
            paddingTop: '18px',
            marginBottom: '20px',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--crayon-purple, #7B1FA2)',
              marginBottom: '8px',
            }}
          >
            Google Cloud Account &amp; Docs Sync
          </label>

          {user ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: 'var(--crayon-pink-subtle, #FFF0F5)',
                border: '1.5px solid var(--crayon-border, #E8C8D8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: '2px solid var(--crayon-pink, #E91E8C)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--crayon-pink, #E91E8C)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {user.name ? user.name[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3E2723' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6D4C5E' }}>{user.email}</div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--crayon-success, #8BC34A)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '2px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#8BC34A',
                        display: 'inline-block',
                      }}
                    />
                    <span>Connected — 1-Click Google Docs Export Active</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #EF5350',
                  backgroundColor: '#FFF',
                  color: '#EF5350',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: '#FAF0FF',
                border: '1.5px solid var(--crayon-border, #E8C8D8)',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '0.8rem',
                  color: 'var(--crayon-text-secondary, #6D4C5E)',
                  lineHeight: 1.4,
                }}
              >
                Connect your Google Account to export your markdown directly into Google Docs and sync documents.
              </p>
              <a
                href="/api/google/auth"
                className="btn btn-google"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#FFF',
                  border: '1.5px solid #7B1FA2',
                  color: '#7B1FA2',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '2px 2px 0px rgba(123, 31, 162, 0.1)',
                }}
              >
                <GoogleIcon size={16} />
                <span>Continue with Google</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '2px dashed var(--crayon-border, #E8C8D8)',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1.5px solid var(--crayon-border, #E8C8D8)',
              backgroundColor: '#FFF',
              color: 'var(--crayon-text-secondary, #6D4C5E)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--crayon-pink, #E91E8C)',
              color: '#FFF',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)',
            }}
          >
            <CheckIcon size={16} />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
