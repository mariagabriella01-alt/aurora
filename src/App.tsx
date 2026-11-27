import { useCallback, useEffect, useState } from 'react';
import { AccessibilityBar } from './components/AccessibilityBar';
import { CrisisSupportSection } from './components/CrisisSupportSection';
import { Footer } from './components/Footer';
import { GodSpaceSection } from './components/GodSpaceSection';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MentalHealthSection } from './components/MentalHealthSection';
import { MinhaSuperacaoSection } from './components/MinhaSuperacaoSection';
import { ReasonsToLiveSection } from './components/ReasonsToLiveSection';
import { VentWallSection } from './components/VentWallSection';
import { AccessibilityProvider } from './context/AccessibilityContext';
import type {
  Prayer,
  ReasonToLive,
  SanctuaryData,
  Vent,
  VentCategory,
} from './types';
import {
  loadConfirmedCommunityCache,
  mergeReplies,
  mergeSanctuaryData,
  saveConfirmedPrayer,
  saveConfirmedReason,
  saveConfirmedVent,
} from './utils/communitySync';

export default function App() {
  const [sanctuary, setSanctuary] = useState<SanctuaryData>(() => loadConfirmedCommunityCache());
  const [loading, setLoading] = useState(() => loadConfirmedCommunityCache().vents.length === 0);
  const [ventFocusTrigger, setVentFocusTrigger] = useState(0);
  const [selectedTopicRequest, setSelectedTopicRequest] = useState<{
    category: VentCategory;
    trigger: number;
  } | null>(null);

  const loadSanctuary = useCallback(async () => {
    try {
      const res = await fetch('/api/sanctuary', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const localBackup = loadConfirmedCommunityCache();
      if (!res.ok) {
        setSanctuary((prev) =>
          mergeSanctuaryData({ vents: [], prayers: [], reasons: [] }, localBackup, prev),
        );
        return;
      }
      const data = (await res.json()) as SanctuaryData;
      setSanctuary((prev) => mergeSanctuaryData(data, localBackup, prev));
    } catch {
      const localBackup = loadConfirmedCommunityCache();
      setSanctuary((prev) =>
        mergeSanctuaryData({ vents: [], prayers: [], reasons: [] }, localBackup, prev),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSanctuary();
  }, [loadSanctuary]);

  const handleVentCreated = useCallback((newVent: Vent) => {
    saveConfirmedVent(newVent);
    setSanctuary((prev) => {
      const exists = prev.vents.some((v) => v.id === newVent.id);
      if (exists) {
        return {
          ...prev,
          vents: prev.vents.map((v) =>
            v.id === newVent.id
              ? {
                  ...v,
                  ...newVent,
                  embraces: Math.max(v.embraces, newVent.embraces),
                  replies: mergeReplies(v.replies, newVent.replies ?? []),
                }
              : v,
          ),
        };
      }
      return {
        ...prev,
        vents: [newVent, ...prev.vents],
      };
    });
  }, []);

  const handleVentUpdated = useCallback((updated: Vent) => {
    saveConfirmedVent(updated);
    setSanctuary((prev) => {
      const exists = prev.vents.some((v) => v.id === updated.id);
      if (!exists) {
        return {
          ...prev,
          vents: [updated, ...prev.vents],
        };
      }
      return {
        ...prev,
        vents: prev.vents.map((v) =>
          v.id === updated.id
            ? {
                ...v,
                ...updated,
                embraces: Math.max(v.embraces, updated.embraces),
                replies: mergeReplies(v.replies, updated.replies ?? []),
              }
            : v,
        ),
      };
    });
  }, []);

  const handlePrayerCreated = useCallback((newPrayer: Prayer) => {
    saveConfirmedPrayer(newPrayer);
    setSanctuary((prev) => {
      if (prev.prayers.some((p) => p.id === newPrayer.id)) {
        return {
          ...prev,
          prayers: prev.prayers.map((p) =>
            p.id === newPrayer.id
              ? {
                  ...p,
                  ...newPrayer,
                  prayingCount: Math.max(p.prayingCount, newPrayer.prayingCount),
                }
              : p,
          ),
        };
      }
      return {
        ...prev,
        prayers: [newPrayer, ...prev.prayers],
      };
    });
  }, []);

  const handlePrayerUpdated = useCallback((updated: Prayer) => {
    saveConfirmedPrayer(updated);
    setSanctuary((prev) => {
      if (!prev.prayers.some((p) => p.id === updated.id)) {
        return {
          ...prev,
          prayers: [updated, ...prev.prayers],
        };
      }
      return {
        ...prev,
        prayers: prev.prayers.map((p) =>
          p.id === updated.id
            ? {
                ...p,
                ...updated,
                prayingCount: Math.max(p.prayingCount, updated.prayingCount),
              }
            : p,
        ),
      };
    });
  }, []);

  const handleReasonCreated = useCallback((newReason: ReasonToLive) => {
    saveConfirmedReason(newReason);
    setSanctuary((prev) => {
      if (prev.reasons.some((r) => r.id === newReason.id)) {
        return {
          ...prev,
          reasons: prev.reasons.map((r) =>
            r.id === newReason.id
              ? {
                  ...r,
                  ...newReason,
                  savedCount: Math.max(r.savedCount, newReason.savedCount),
                }
              : r,
          ),
        };
      }
      return {
        ...prev,
        reasons: [newReason, ...prev.reasons],
      };
    });
  }, []);

  const handleReasonUpdated = useCallback((updated: ReasonToLive) => {
    saveConfirmedReason(updated);
    setSanctuary((prev) => {
      if (!prev.reasons.some((r) => r.id === updated.id)) {
        return {
          ...prev,
          reasons: [updated, ...prev.reasons],
        };
      }
      return {
        ...prev,
        reasons: prev.reasons.map((r) =>
          r.id === updated.id
            ? {
                ...r,
                ...updated,
                savedCount: Math.max(r.savedCount, updated.savedCount),
              }
            : r,
        ),
      };
    });
  }, []);

  useEffect(() => {
    let isServerless = false;
    let es: EventSource | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadSanctuary();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollInterval = window.setInterval(() => {
      if (isServerless && document.visibilityState === 'visible') {
        void loadSanctuary();
      }
    }, 25_000);

    if (typeof EventSource !== 'undefined') {
      es = new EventSource('/api/sanctuary/stream');
      let hadError = false;

      es.onopen = () => {
        if (hadError) {
          hadError = false;
          void loadSanctuary();
        }
      };

      es.onerror = () => {
        hadError = true;
      };

      const parseJson = <T,>(raw: string): T | null => {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      };

      es.addEventListener('vent:created', (e) => {
        const vent = parseJson<Vent>((e as MessageEvent<string>).data);
        if (vent) handleVentCreated(vent);
      });
      es.addEventListener('vent:updated', (e) => {
        const vent = parseJson<Vent>((e as MessageEvent<string>).data);
        if (vent) handleVentUpdated(vent);
      });
      es.addEventListener('prayer:created', (e) => {
        const prayer = parseJson<Prayer>((e as MessageEvent<string>).data);
        if (prayer) handlePrayerCreated(prayer);
      });
      es.addEventListener('prayer:updated', (e) => {
        const prayer = parseJson<Prayer>((e as MessageEvent<string>).data);
        if (prayer) handlePrayerUpdated(prayer);
      });
      es.addEventListener('reason:created', (e) => {
        const reason = parseJson<ReasonToLive>((e as MessageEvent<string>).data);
        if (reason) handleReasonCreated(reason);
      });
      es.addEventListener('reason:updated', (e) => {
        const reason = parseJson<ReasonToLive>((e as MessageEvent<string>).data);
        if (reason) handleReasonUpdated(reason);
      });

      es.addEventListener('serverless', () => {
        isServerless = true;
        es?.close();
      });
    } else {
      isServerless = true;
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(pollInterval);
      es?.close();
    };
  }, [
    loadSanctuary,
    handleVentCreated,
    handleVentUpdated,
    handlePrayerCreated,
    handlePrayerUpdated,
    handleReasonCreated,
    handleReasonUpdated,
  ]);

  const navigateToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const jumpToVentComposer = useCallback(() => {
    const el = document.getElementById('desabafar');
    el?.scrollIntoView({ behavior: 'smooth' });
    setVentFocusTrigger((n) => n + 1);
  }, []);

  const handleVentAboutTopic = (category: VentCategory) => {
    setSelectedTopicRequest((prev) => ({
      category,
      trigger: (prev?.trigger ?? 0) + 1,
    }));
    const el = document.getElementById('desabafar');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AccessibilityProvider
      onNavigateSection={navigateToSection}
      onComposeVent={jumpToVentComposer}
    >
      <div className="min-h-screen overflow-x-clip bg-[#FEF9E6] text-[#1C1917]">
        <Header onComposeVent={jumpToVentComposer} />

        <main>
          <AccessibilityBar
            onNavigateSection={navigateToSection}
            onComposeVent={jumpToVentComposer}
          />

          <HeroSection onStartVenting={jumpToVentComposer} />

          <VentWallSection
            vents={sanctuary.vents}
            loading={loading}
            focusTrigger={ventFocusTrigger}
            selectedTopicRequest={selectedTopicRequest}
            onVentCreated={handleVentCreated}
            onVentUpdated={handleVentUpdated}
          />

          <MentalHealthSection onVentAboutTopic={handleVentAboutTopic} />

          <MinhaSuperacaoSection />

          <GodSpaceSection
            prayers={sanctuary.prayers}
            onPrayerCreated={handlePrayerCreated}
            onPrayerUpdated={handlePrayerUpdated}
          />

          <ReasonsToLiveSection
            reasons={sanctuary.reasons}
            onReasonCreated={handleReasonCreated}
            onReasonUpdated={handleReasonUpdated}
          />

          <CrisisSupportSection />
        </main>

        <Footer />
      </div>
    </AccessibilityProvider>
  );
}
