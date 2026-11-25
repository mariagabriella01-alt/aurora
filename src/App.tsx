import { useCallback, useEffect, useState } from 'react';
import { AccessibilityBar } from './components/AccessibilityBar';
import { AssistantSection } from './components/AssistantSection';
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
  SophiaPromptRequest,
  Vent,
  VentCategory,
} from './types';

export default function App() {
  const [vents, setVents] = useState<Vent[]>([]);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [reasons, setReasons] = useState<ReasonToLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventFocusTrigger, setVentFocusTrigger] = useState(0);
  const [selectedTopicRequest, setSelectedTopicRequest] = useState<{
    category: VentCategory;
    trigger: number;
  } | null>(null);
  const [sophiaPromptRequest, setSophiaPromptRequest] = useState<SophiaPromptRequest | null>(null);

  const loadSanctuary = useCallback(async () => {
    try {
      const res = await fetch('/api/sanctuary');
      if (!res.ok) return;
      const data = (await res.json()) as SanctuaryData;
      setVents(data.vents);
      setPrayers(data.prayers);
      setReasons(data.reasons);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSanctuary();
  }, [loadSanctuary]);

  const handleVentCreated = useCallback((newVent: Vent) => {
    setVents((prev) => (prev.some((v) => v.id === newVent.id) ? prev : [newVent, ...prev]));
  }, []);

  const handleVentUpdated = useCallback((updated: Vent) => {
    setVents((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }, []);

  const handlePrayerCreated = useCallback((newPrayer: Prayer) => {
    setPrayers((prev) => (prev.some((p) => p.id === newPrayer.id) ? prev : [newPrayer, ...prev]));
  }, []);

  const handlePrayerUpdated = useCallback((updated: Prayer) => {
    setPrayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handleReasonCreated = useCallback((newReason: ReasonToLive) => {
    setReasons((prev) => (prev.some((r) => r.id === newReason.id) ? prev : [newReason, ...prev]));
  }, []);

  const handleReasonUpdated = useCallback((updated: ReasonToLive) => {
    setReasons((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const es = new EventSource('/api/sanctuary/stream');
    let hadError = false;

    es.onopen = () => {
      if (hadError) {
        hadError = false;
        loadSanctuary();
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

    return () => {
      es.close();
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

  const handleAskSophia = useCallback((req: Omit<SophiaPromptRequest, 'trigger'>) => {
    setSophiaPromptRequest((prev) => ({
      ...req,
      trigger: (prev?.trigger ?? 0) + 1,
    }));
    const el = document.getElementById('assistente');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
            vents={vents}
            loading={loading}
            focusTrigger={ventFocusTrigger}
            selectedTopicRequest={selectedTopicRequest}
            onVentCreated={handleVentCreated}
            onVentUpdated={handleVentUpdated}
          />

          <MentalHealthSection onVentAboutTopic={handleVentAboutTopic} />

          <MinhaSuperacaoSection onAskSophia={handleAskSophia} />

          <AssistantSection externalPromptRequest={sophiaPromptRequest} />

          <GodSpaceSection
            prayers={prayers}
            onPrayerCreated={handlePrayerCreated}
            onPrayerUpdated={handlePrayerUpdated}
          />

          <ReasonsToLiveSection
            reasons={reasons}
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
