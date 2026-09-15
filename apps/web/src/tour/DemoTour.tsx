import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { clearDemoIdCache, DEMO_TOUR_STEPS, type DemoTourStep } from "./demo-tour-steps.ts";

type DemoTourContextValue = {
  active: boolean;
  stepIndex: number;
  step: DemoTourStep | null;
  total: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  back: () => void;
};

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

async function waitForSelector(selector: string, timeoutMs = 8000): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [resolvedSelector, setResolvedSelector] = useState<string | undefined>();

  const step = active ? (DEMO_TOUR_STEPS[stepIndex] ?? null) : null;

  const goToStep = useCallback(
    async (index: number) => {
      const nextStep = DEMO_TOUR_STEPS[index];
      if (!nextStep) {
        setActive(false);
        setReady(false);
        return;
      }
      setReady(false);
      setStepIndex(index);
      try {
        const path = nextStep.resolvePath ? await nextStep.resolvePath() : nextStep.path;
        const selector = nextStep.resolveSelector
          ? await nextStep.resolveSelector()
          : nextStep.selector;
        setResolvedSelector(selector);
        if (path && location.pathname !== path) {
          void navigate(path);
        }
        if (selector) {
          const el = await waitForSelector(selector);
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      } catch (error) {
        console.error(error);
        setResolvedSelector(undefined);
      }
      await new Promise((r) => setTimeout(r, 120));
      setReady(true);
    },
    [location.pathname, navigate],
  );

  const start = useCallback(() => {
    clearDemoIdCache();
    setActive(true);
    void goToStep(0);
  }, [goToStep]);

  const stop = useCallback(() => {
    setActive(false);
    setReady(false);
    setStepIndex(0);
    setResolvedSelector(undefined);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= DEMO_TOUR_STEPS.length - 1) {
      stop();
      return;
    }
    void goToStep(stepIndex + 1);
  }, [goToStep, stepIndex, stop]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    void goToStep(stepIndex - 1);
  }, [goToStep, stepIndex]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tour") === "1" && !active) {
      params.delete("tour");
      const nextUrl = `${location.pathname}${params.toString() ? `?${params}` : ""}`;
      void navigate(nextUrl, { replace: true });
      start();
    }
  }, [location.pathname, location.search, active, navigate, start]);

  useEffect(() => {
    if (!active || !step) return;
    let cancelled = false;
    void (async () => {
      const selector = resolvedSelector ?? step.selector;
      if (selector) {
        const el = await waitForSelector(selector);
        if (!cancelled) {
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
          setReady(true);
        }
      } else if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, step, location.pathname, resolvedSelector]);

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      step,
      total: DEMO_TOUR_STEPS.length,
      start,
      stop,
      next,
      back,
    }),
    [active, stepIndex, step, start, stop, next, back],
  );

  return (
    <DemoTourContext.Provider value={value}>
      {children}
      {active && step && ready ? (
        <DemoTourOverlay spotlightSelector={resolvedSelector ?? step.selector} />
      ) : null}
      {active && step && !ready ? (
        <div className="tour-loading" role="status">
          Loading step…
        </div>
      ) : null}
    </DemoTourContext.Provider>
  );
}

export function useDemoTour(): DemoTourContextValue {
  const ctx = useContext(DemoTourContext);
  if (!ctx) {
    return {
      active: false,
      stepIndex: 0,
      step: null,
      total: DEMO_TOUR_STEPS.length,
      start: () => undefined,
      stop: () => undefined,
      next: () => undefined,
      back: () => undefined,
    };
  }
  return ctx;
}

function DemoTourOverlay({ spotlightSelector }: { spotlightSelector?: string }) {
  const { step, stepIndex, total, next, back, stop } = useDemoTour();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!spotlightSelector) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(spotlightSelector);
      setRect(el?.getBoundingClientRect() ?? null);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const id = window.setInterval(update, 200);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [spotlightSelector]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop();
      if (event.key === "ArrowRight" || event.key === "Enter") next();
      if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, stop]);

  if (!step) return null;

  const pad = 8;
  const spotlight = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const cardStyle = positionCard(spotlight, step.placement ?? "auto");

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-backdrop" onClick={stop} />
      {spotlight ? (
        <div
          className="tour-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      ) : null}
      {spotlight ? <div className="tour-arrow" style={arrowStyle(spotlight, cardStyle)} /> : null}
      <div className="tour-card" style={cardStyle}>
        <p className="tour-stepcount">
          Step {stepIndex + 1} of {total}
        </p>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="button secondary" type="button" onClick={stop}>
            Skip
          </button>
          <button className="button secondary" type="button" onClick={back} disabled={stepIndex === 0}>
            Back
          </button>
          <button className="button" type="button" onClick={next}>
            {stepIndex >= total - 1 ? "Finish" : "Next"}
          </button>
        </div>
        <p className="tour-hint">← → or Enter · Esc to exit</p>
      </div>
    </div>
  );
}

function positionCard(
  spotlight: { top: number; left: number; width: number; height: number } | null,
  placement: DemoTourStep["placement"],
): CSSProperties {
  const width = 360;
  if (!spotlight) {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width,
    };
  }
  const gap = 16;
  const preferBottom = placement === "bottom" || placement === "auto";
  const spaceBelow = window.innerHeight - (spotlight.top + spotlight.height);
  const placeBelow = preferBottom && spaceBelow > 220;
  const top = placeBelow
    ? spotlight.top + spotlight.height + gap
    : Math.max(16, spotlight.top - gap - 200);
  let left = spotlight.left + spotlight.width / 2 - width / 2;
  left = Math.min(Math.max(16, left), window.innerWidth - width - 16);
  return { position: "fixed", top, left, width };
}

function arrowStyle(
  spotlight: { top: number; left: number; width: number; height: number },
  card: CSSProperties,
): CSSProperties {
  const cardTop = typeof card.top === "number" ? card.top : 0;
  const below = cardTop > spotlight.top;
  const x = spotlight.left + spotlight.width / 2;
  const y = below ? spotlight.top + spotlight.height + 4 : spotlight.top - 12;
  return {
    position: "fixed",
    left: x - 8,
    top: y,
    transform: below ? "none" : "rotate(180deg)",
  };
}
