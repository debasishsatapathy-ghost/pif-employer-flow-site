import { create } from 'zustand';
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Participant,
  ParticipantKind
} from 'livekit-client';
import { ComponentTemplate, SceneData } from '@/types';
import { parseDSL } from '@/utils/parseDSL';
import { setInformTeleRoom } from '@/utils/informTele';

// Agent state from LiveKit
export type AgentState =
  | 'initializing'
  | 'listening'
  | 'thinking'
  | 'speaking';

// Connection state
export type SessionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

// Transcript entry
export interface TranscriptEntry {
  id: string;
  text: string;
  participant: 'user' | 'agent' | 'tool';
  participantName: string;
  timestamp: Date;
  isFinal: boolean;
  isAgent: boolean;
}

// UI Component from agent RPC
export interface UIComponent {
  id: string;
  templateId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Pre-warm data saved between prepare and activate
interface PreWarmData {
  room: Room;
  roomName: string;
  sessionId: string;
  templates: ComponentTemplate[];
  defaults: {
    avatarEnabled: boolean;
    avatarVisible: boolean;
    micMuted: boolean;
    volumeMuted: boolean;
    avatarAvailable: boolean;
    avatarThumbnailUrl: string | null;
  };
  agentName: string;
}

// Store state
interface VoiceSessionState {
  // Connection
  room: Room | null;
  sessionId: string | null;
  sessionState: SessionState;
  error: string | null;

  // Pre-warm (invisible to UI — room connected in background)
  _preWarm: PreWarmData | null;
  _preWarmState: 'idle' | 'warming' | 'ready' | 'failed';

  // Agent
  agentName: string | null;
  currentAgentName: string | null;
  agentState: AgentState;
  agentParticipant: RemoteParticipant | null;

  // Avatar state
  avatarEnabled: boolean;
  avatarVisible: boolean;
  avatarAvailable: boolean;
  avatarThumbnailUrl: string | null;
  avatarTogglePending: boolean;
  avatarVideoTrack: RemoteTrack | null;
  avatarAudioTrack: RemoteTrack | null;
  agentAudioTrack: RemoteTrack | null;
  avatarParticipant: RemoteParticipant | null;
  avatarAudioElement: HTMLAudioElement | null;
  agentAudioElement: HTMLAudioElement | null;

  // Audio
  isMuted: boolean;
  isVolumeMuted: boolean;

  // Transcripts
  transcripts: TranscriptEntry[];

  // UI Components (from agent RPC)
  uiComponents: UIComponent[];
  templates: ComponentTemplate[];

  // Scene state
  currentScene: SceneData | null;
  sceneHistory: SceneData[];
  sceneFuture: SceneData[];
  sceneActive: boolean;
  skeletonLayout: string | null;

  // Chat panel state
  isChatPanelOpen: boolean;

  // Theme
  theme: 'light' | 'dark';

  // Legacy overlay state (kept for compatibility)
  isOverlayExpanded: boolean;
  isOverlayVisible: boolean;

  // Actions
  preWarm: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => void;
  toggleVolume: () => void;
  toggleAvatarVisible: () => void;
  toggleAvatarHard: () => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>;
  toggleChatPanel: () => void;
  setOverlayExpanded: (expanded: boolean) => void;
  setOverlayVisible: (visible: boolean) => void;
  clearTranscripts: () => void;
  addUIComponent: (component: Omit<UIComponent, 'id' | 'timestamp'>) => void;
  removeUIComponent: (id: string) => void;
  clearUIComponents: () => void;
  submitForm: (templateId: string, formId: string, values: Record<string, unknown>) => Promise<void>;

  // Scene actions
  clearScene: () => void;
  navigateSceneBack: () => void;
  navigateSceneForward: () => void;
  tellAgent: (message: string) => Promise<void>;
  informAgent: (message: string) => Promise<void>;
}

const AGENT_STATE_ATTRIBUTE = 'lk.agent.state';

export const useVoiceSessionStore = create<VoiceSessionState>((set, get) => ({
  // Initial state
  room: null,
  sessionId: null,
  sessionState: 'idle',
  error: null,
  _preWarm: null,
  _preWarmState: 'idle',
  agentName: null,
  currentAgentName: null,
  agentState: 'initializing',
  agentParticipant: null,

  // Avatar state
  avatarEnabled: false,
  avatarVisible: true,
  avatarAvailable: false,
  avatarThumbnailUrl: null,
  avatarTogglePending: false,
  avatarVideoTrack: null,
  avatarAudioTrack: null,
  agentAudioTrack: null,
  avatarParticipant: null,
  avatarAudioElement: null,
  agentAudioElement: null,

  isMuted: false,
  isVolumeMuted: false,
  transcripts: [],
  uiComponents: [],
  templates: [],

  // Scene state
  currentScene: null,
  sceneHistory: [],
  sceneFuture: [],
  sceneActive: false,
  skeletonLayout: null,

  // Chat panel
  isChatPanelOpen: false,

  // Theme
  theme: 'dark',

  isOverlayExpanded: false,
  isOverlayVisible: true,

  // Pre-warm: create room + connect WebRTC in the background on page load.
  // Invisible to the user — no mic permission, no UI change.
  preWarm: async () => {
    const { _preWarmState, sessionState } = get();

    // Don't pre-warm if already warming, ready, or actively connected
    if (_preWarmState !== 'idle' && _preWarmState !== 'failed') return;
    if (sessionState === 'connected' || sessionState === 'connecting') return;

    set({ _preWarmState: 'warming' });

    try {
      const widgetHost = process.env.NEXT_PUBLIC_WIDGET_HOST || 'https://app.mobeus.ai';
      const apiKey = process.env.NEXT_PUBLIC_WIDGET_API_KEY || '';

      if (!apiKey) {
        set({ _preWarmState: 'failed' });
        return;
      }

      // Call prepare endpoint — creates room, returns token (no agent dispatch)
      const response = await fetch(`${widgetHost}/api/widget/session/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        console.warn('Pre-warm prepare failed:', response.status);
        set({ _preWarmState: 'failed' });
        return;
      }

      const sessionData = await response.json();

      const defaults = sessionData.defaults || {};

      // Create room and connect (WebRTC handshake happens here)
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up event listeners early so they're ready when agent joins
      setupRoomEventListeners(room, set, get);

      // Connect to room — this is the WebRTC warm-up
      await room.connect(sessionData.wsUrl || sessionData.livekitUrl, sessionData.token);

      // Do NOT enable mic yet (avoids browser permission prompt)
      // Do NOT register RPC handlers yet (agent not present)

      console.log('Pre-warm: room connected, WebRTC warm');

      // Handle the pre-warmed room being disconnected (e.g. timeout)
      room.once(RoomEvent.Disconnected, () => {
        const { _preWarmState } = get();
        if (_preWarmState === 'ready') {
          console.log('Pre-warm: room disconnected, resetting');
          set({ _preWarm: null, _preWarmState: 'idle' });
        }
      });

      set({
        _preWarm: {
          room,
          roomName: sessionData.roomName,
          sessionId: sessionData.sessionId,
          templates: Array.isArray(sessionData.templates) ? sessionData.templates : [],
          defaults: {
            avatarEnabled: Boolean(defaults.avatarEnabled),
            avatarVisible: typeof defaults.avatarVisible === 'boolean' ? defaults.avatarVisible : true,
            micMuted: typeof defaults.micMuted === 'boolean' ? defaults.micMuted : false,
            volumeMuted: typeof defaults.volumeMuted === 'boolean' ? defaults.volumeMuted : false,
            avatarAvailable: Boolean(defaults.avatarAvailable),
            avatarThumbnailUrl: defaults.avatarThumbnailUrl || null,
          },
          agentName: sessionData.agent?.name || 'AI Assistant',
        },
        _preWarmState: 'ready',
      });
    } catch (err) {
      console.warn('Pre-warm failed (will fall back to normal flow):', err);
      set({ _preWarmState: 'failed' });
    }
  },

  // Connect to voice session — uses pre-warmed room if available, otherwise falls back
  connect: async () => {
    const { sessionState, room: existingRoom, _preWarmState, _preWarm } = get();

    if (sessionState !== 'idle' && sessionState !== 'error') {
      console.warn('Already connecting or connected');
      return;
    }

    // Clean up any existing room (not the pre-warm room)
    if (existingRoom) {
      await existingRoom.disconnect();
    }

    set({
      sessionState: 'connecting',
      error: null,
      transcripts: [],
      uiComponents: [],
      templates: [],
      agentState: 'initializing',
      agentName: null,
      currentAgentName: null,
      // Reset scene state
      currentScene: null,
      sceneHistory: [],
      sceneFuture: [],
      sceneActive: false,
      skeletonLayout: null,
      // Reset avatar state
      avatarEnabled: false,
      avatarVisible: true,
      avatarAvailable: false,
      avatarTogglePending: false,
      avatarVideoTrack: null,
      avatarAudioTrack: null,
      agentAudioTrack: null,
      avatarParticipant: null,
      avatarAudioElement: null,
      agentAudioElement: null,
      isVolumeMuted: false,
    });

    try {
      const widgetHost = process.env.NEXT_PUBLIC_WIDGET_HOST || 'https://app.mobeus.ai';
      const apiKey = process.env.NEXT_PUBLIC_WIDGET_API_KEY || '';

      if (!apiKey) {
        throw new Error('Widget API key not configured');
      }

      // ── Fast path: pre-warmed room is ready ──
      if (_preWarmState === 'ready' && _preWarm && _preWarm.room.state === 'connected') {
        console.log('Using pre-warmed room:', _preWarm.roomName);

        const { room, roomName, sessionId, templates, defaults, agentName } = _preWarm;

        const avatarAvailable = defaults.avatarAvailable;
        const defaultAvatarEnabled = avatarAvailable ? defaults.avatarEnabled : false;
        const defaultAvatarVisible = avatarAvailable ? defaults.avatarVisible : defaultAvatarEnabled;

        set({
          avatarEnabled: defaultAvatarEnabled,
          avatarVisible: defaultAvatarVisible,
          avatarAvailable,
          avatarThumbnailUrl: defaults.avatarThumbnailUrl || null,
          avatarTogglePending: false,
          isMuted: defaults.micMuted,
          isVolumeMuted: defaults.volumeMuted,
          agentName,
          currentAgentName: agentName,
          templates,
        });

        // Dispatch agent to the pre-warmed room
        const activateResponse = await fetch(`${widgetHost}/api/widget/session/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, roomName }),
        });

        if (!activateResponse.ok) {
          const errData = await activateResponse.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to activate session');
        }

        // Enable microphone (triggers browser permission prompt NOW)
        await room.localParticipant.setMicrophoneEnabled(!defaults.micMuted);

        // Register RPC handlers (agent is about to join)
        registerRpcHandlers(room, set, get);

        set({
          room,
          sessionId,
          sessionState: 'connected',
          _preWarm: null,
          _preWarmState: 'idle',
        });
        applyAudioRouting(get);

        return;
      }

      // ── Slow path: fallback (no pre-warm or pre-warm failed) ──
      console.log('No pre-warm available, using standard flow');

      // Clean up stale pre-warm if any
      if (_preWarm?.room) {
        try { await _preWarm.room.disconnect(); } catch {}
      }
      set({ _preWarm: null, _preWarmState: 'idle' });

      // Create session via widget API (original flow: room + agent dispatch together)
      const response = await fetch(`${widgetHost}/api/widget/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const sessionData = await response.json();

      // API response: { agent: { name }, defaults: { avatarEnabled, avatarVisible, micMuted, volumeMuted, avatarAvailable }, ... }
      const defaults = sessionData.defaults || {};
      const avatarAvailable = Boolean(defaults.avatarAvailable);
      const rawAvatarEnabled =
        typeof defaults.avatarEnabled === 'boolean'
          ? defaults.avatarEnabled
          : false;
      const defaultAvatarEnabled = avatarAvailable ? rawAvatarEnabled : false;
      const defaultAvatarVisible =
        avatarAvailable && typeof defaults.avatarVisible === 'boolean'
          ? defaults.avatarVisible
          : defaultAvatarEnabled;
      const defaultMicMuted =
        typeof defaults.micMuted === 'boolean' ? defaults.micMuted : false;
      const defaultVolumeMuted =
        typeof defaults.volumeMuted === 'boolean' ? defaults.volumeMuted : false;

      const resolvedAgentName = sessionData.agent?.name || 'AI Assistant';

      set({
        avatarEnabled: defaultAvatarEnabled,
        avatarVisible: defaultAvatarVisible,
        avatarAvailable,
        avatarThumbnailUrl: defaults.avatarThumbnailUrl || null,
        avatarTogglePending: false,
        isMuted: defaultMicMuted,
        isVolumeMuted: defaultVolumeMuted,
        agentName: resolvedAgentName,
        currentAgentName: resolvedAgentName,
      });

      // Store templates for rendering
      if (Array.isArray(sessionData.templates)) {
        set({ templates: sessionData.templates });
      } else {
        set({ templates: [] });
      }

      // Create and configure room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up event listeners
      setupRoomEventListeners(room, set, get);

      // Connect to the room
      await room.connect(sessionData.wsUrl || sessionData.livekitUrl, sessionData.token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(!defaultMicMuted);

      // Register RPC handlers for agent UI control
      registerRpcHandlers(room, set, get);

      set({
        room,
        sessionId: sessionData.sessionId,
        sessionState: 'connected',
      });
      applyAudioRouting(get);

      // Note: No PATCH /api/sessions/{id} needed — agent shutdown callback handles persistence

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      set({
        sessionState: 'error',
        error: error.message,
      });
      console.error(error);
    }
  },

  // Disconnect from session
  disconnect: async () => {
    const { room, avatarAudioElement, agentAudioElement, _preWarm } = get();

    if (!room) return;

    set({ sessionState: 'disconnecting' });

    try {
      // Note: No PATCH /api/sessions/{id} needed — agent shutdown callback handles persistence
      await room.disconnect();

    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      avatarAudioElement?.remove();
      agentAudioElement?.remove();

      // Also clean up pre-warm room if different from active room
      if (_preWarm?.room && _preWarm.room !== room) {
        try { await _preWarm.room.disconnect(); } catch {}
      }

      // Remove chat-squeezed class
      document.body.classList.remove('chat-squeezed');

      set({
        room: null,
        sessionId: null,
        sessionState: 'idle',
        agentState: 'initializing',
        agentParticipant: null,
        isMuted: false,
        isVolumeMuted: false,
        isOverlayExpanded: false,
        isChatPanelOpen: false,
        avatarEnabled: false,
        avatarVisible: true,
        avatarAvailable: false,
        avatarTogglePending: false,
        avatarVideoTrack: null,
        avatarAudioTrack: null,
        agentAudioTrack: null,
        avatarParticipant: null,
        avatarAudioElement: null,
        agentAudioElement: null,
        uiComponents: [],
        templates: [],
        // currentScene intentionally preserved — last scene stays visible after disconnect
        skeletonLayout: null,
        _preWarm: null,
        _preWarmState: 'idle',
      });
    }
  },

  // Toggle microphone mute
  toggleMute: () => {
    const { room, isMuted } = get();
    if (!room?.localParticipant) return;

    const newMuted = !isMuted;
    room.localParticipant.setMicrophoneEnabled(!newMuted);
    set({ isMuted: newMuted });
  },

  // Toggle output volume (avatar audio or agent audio)
  toggleVolume: () => {
    const { isVolumeMuted } = get();
    const newMuted = !isVolumeMuted;
    set({ isVolumeMuted: newMuted });
    applyAudioRouting(get);
  },

  // Toggle avatar visibility (soft)
  toggleAvatarVisible: () => {
    const { avatarVisible } = get();
    set({ avatarVisible: !avatarVisible });
  },

  // Toggle avatar connection (hard)
  toggleAvatarHard: async () => {
    const { room, agentParticipant, avatarEnabled, avatarAvailable } = get();
    if (!room?.localParticipant || !avatarAvailable) return;

    let targetAgent = agentParticipant;
    if (!targetAgent) {
      for (const participant of room.remoteParticipants.values()) {
        if (
          participant.kind === ParticipantKind.AGENT &&
          !participant.attributes?.['lk.publish_on_behalf']
        ) {
          targetAgent = participant;
          set({ agentParticipant: participant });
          break;
        }
      }
    }

    if (!targetAgent) {
      console.warn('No agent participant available for avatar toggle');
      return;
    }

    const nextEnabled = !avatarEnabled;
    try {
      set({ avatarTogglePending: true });
      const response = await room.localParticipant.performRpc({
        destinationIdentity: targetAgent.identity,
        method: 'avatarToggle',
        payload: JSON.stringify({ enabled: nextEnabled }),
      });

      let parsed: { success?: boolean } = {};
      try {
        parsed = JSON.parse(response || '{}');
      } catch {
        parsed = {};
      }

      if (parsed.success !== false) {
        set({ avatarEnabled: nextEnabled });
        if (nextEnabled) {
          set({ avatarVisible: true });
        }
        applyAudioRouting(get);
      }
    } catch (error) {
      console.error('RPC avatarToggle error:', error);
    } finally {
      set({ avatarTogglePending: false });
    }
  },

  // Send typed text input to the agent
  sendTextMessage: async (text: string) => {
    const { room } = get();
    if (!room?.localParticipant) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      await room.localParticipant.sendText(trimmed, { topic: 'lk.chat' });
      set((state) => ({
        transcripts: [
          ...state.transcripts,
          {
            id: `user-text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: trimmed,
            participant: 'user',
            participantName: 'You',
            timestamp: new Date(),
            isFinal: true,
            isAgent: false,
          },
        ],
      }));
    } catch (error) {
      console.error('Failed to send text input:', error);
    }
  },

  // Chat panel toggle
  toggleChatPanel: () => {
    const { isChatPanelOpen } = get();
    const next = !isChatPanelOpen;
    set({ isChatPanelOpen: next });
    // Toggle squeeze class on body for layout shift
    if (next) {
      document.body.classList.add('chat-squeezed');
    } else {
      document.body.classList.remove('chat-squeezed');
    }
  },

  // Overlay controls (legacy)
  setOverlayExpanded: (expanded) => set({ isOverlayExpanded: expanded }),
  setOverlayVisible: (visible) => set({ isOverlayVisible: visible }),

  // Transcript management
  clearTranscripts: () => set({ transcripts: [] }),

  // UI Component management (for agent RPC)
  addUIComponent: (component) => {
    const newComponent: UIComponent = {
      ...component,
      id: `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    set((state) => ({
      uiComponents: [...state.uiComponents, newComponent],
    }));
  },

  removeUIComponent: (id) => {
    set((state) => ({
      uiComponents: state.uiComponents.filter((c) => c.id !== id),
    }));
  },

  clearUIComponents: () => set({ uiComponents: [] }),

  submitForm: async (templateId, formId, values) => {
    const { room, agentParticipant } = get();
    if (!room?.localParticipant || !agentParticipant) return;

    try {
      await room.localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: 'formSubmit',
        payload: JSON.stringify({ templateId, formId, values }),
      });
    } catch (error) {
      console.error('RPC formSubmit error:', error);
    }
  },

  // Scene actions
  clearScene: () => {
    set({ sceneActive: false, currentScene: null });
  },

  navigateSceneBack: () => {
    const { sceneHistory, currentScene, sceneFuture } = get();
    if (sceneHistory.length > 0) {
      const newHistory = [...sceneHistory];
      const previous = newHistory.pop()!;
      const newFuture = currentScene ? [currentScene, ...sceneFuture] : sceneFuture;
      set({
        currentScene: previous,
        sceneHistory: newHistory,
        sceneFuture: newFuture,
        sceneActive: true,
      });
    } else {
      set({ sceneActive: false, currentScene: null, sceneHistory: [], sceneFuture: [] });
    }
  },

  navigateSceneForward: () => {
    const { sceneFuture, currentScene, sceneHistory } = get();
    if (sceneFuture.length > 0) {
      const [next, ...rest] = sceneFuture;
      const newHistory = currentScene ? [...sceneHistory, currentScene] : sceneHistory;
      set({
        currentScene: next,
        sceneHistory: newHistory,
        sceneFuture: rest,
        sceneActive: true,
      });
    }
  },

  tellAgent: async (message: string) => {
    const { room, agentParticipant } = get();
    if (!room?.localParticipant || !agentParticipant) return;

    const trimmed = message.trim();
    if (!trimmed) return;

    try {
      // Add to transcripts as user message (visible)
      set((state) => ({
        transcripts: [
          ...state.transcripts,
          {
            id: `tell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: trimmed,
            participant: 'user' as const,
            participantName: 'You',
            timestamp: new Date(),
            isFinal: true,
            isAgent: false,
          },
        ],
      }));

      // Send RPC to agent
      await room.localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: 'tellAgent',
        payload: JSON.stringify({ message: trimmed }),
      });
    } catch (error) {
      console.error('tellAgent error:', error);
    }
  },

  informAgent: async (message: string) => {
    const { room, agentParticipant } = get();
    if (!room?.localParticipant || !agentParticipant) return;

    try {
      // NOT added to transcripts (invisible context)
      await room.localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: 'informAgent',
        payload: JSON.stringify({ message }),
      });
    } catch (error) {
      console.error('informAgent error:', error);
    }
  },
}));

function applyAudioRouting(get: () => VoiceSessionState) {
  const {
    avatarEnabled,
    isVolumeMuted,
    avatarAudioElement,
    agentAudioElement,
  } = get();

  const useAvatarAudio = avatarEnabled && !!avatarAudioElement;

  if (agentAudioElement) {
    agentAudioElement.muted = isVolumeMuted || useAvatarAudio;
  }

  if (avatarAudioElement) {
    avatarAudioElement.muted = isVolumeMuted || !useAvatarAudio;
  }
}

// Helper: Set up room event listeners
function setupRoomEventListeners(
  room: Room,
  set: (state: Partial<VoiceSessionState> | ((state: VoiceSessionState) => Partial<VoiceSessionState>)) => void,
  get: () => VoiceSessionState
) {
  // Wire up informTele room reference for data channel feedback
  setInformTeleRoom(room);

  // Connection state changes
  room.on(RoomEvent.ConnectionStateChanged, (connectionState: ConnectionState) => {
    console.log('Connection state:', connectionState);
    if (connectionState === ConnectionState.Disconnected) {
      const { avatarAudioElement, agentAudioElement } = get();
      avatarAudioElement?.remove();
      agentAudioElement?.remove();
      document.body.classList.remove('chat-squeezed');
      setInformTeleRoom(null);
      // Note: currentScene is NOT cleared on disconnect — last scene persists on the page
      set({
        sessionState: 'idle',
        agentState: 'initializing',
        agentParticipant: null,
        room: null,
        avatarEnabled: false,
        avatarVisible: true,
        avatarAvailable: false,
        avatarTogglePending: false,
        avatarVideoTrack: null,
        avatarAudioTrack: null,
        agentAudioTrack: null,
        avatarParticipant: null,
        avatarAudioElement: null,
        agentAudioElement: null,
        isMuted: false,
        isVolumeMuted: false,
        isChatPanelOpen: false,
        uiComponents: [],
        templates: [],
        // currentScene intentionally preserved — last scene persists on the page
        sceneHistory: [],
        sceneFuture: [],
        skeletonLayout: null,
      });
    }
  });

  // Track subscriptions (for agent/avatar audio and video)
  room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log('Track subscribed:', track.kind, 'from', participant.identity);

    const publishOnBehalf = participant.attributes?.['lk.publish_on_behalf'];

    if (publishOnBehalf) {
      console.log('Avatar worker track received:', track.kind);

      if (track.kind === Track.Kind.Video) {
        set({
          avatarVideoTrack: track,
          avatarParticipant: participant,
        });
      } else if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach() as HTMLAudioElement;
        audioElement.id = `audio-avatar-${participant.identity}`;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
        audioElement.play().catch((e) => console.warn('Avatar audio autoplay blocked:', e));
        set({ avatarAudioTrack: track, avatarAudioElement: audioElement });
        applyAudioRouting(get);
      }
    } else if (track.kind === Track.Kind.Audio) {
      if (participant.kind === ParticipantKind.AGENT) {
        const audioElement = track.attach() as HTMLAudioElement;
        // Background audio track (e.g. tool notification sounds) should always
        // play regardless of avatar state — it's on a separate track from the
        // agent's voice. Only the main agent voice track gets muted when avatar
        // is active (avatar re-publishes the voice audio).
        const isBackgroundAudio = publication.trackName === 'background_audio';
        if (isBackgroundAudio) {
          audioElement.id = `audio-bg-${participant.identity}`;
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
          audioElement.play().catch((e) => console.warn('Background audio autoplay blocked:', e));
          console.log('Background audio track attached (always audible)');
        } else {
          audioElement.id = `audio-agent-${participant.identity}`;
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
          audioElement.play().catch((e) => console.warn('Agent audio autoplay blocked:', e));
          set({ agentAudioTrack: track, agentAudioElement: audioElement });
          applyAudioRouting(get);
        }
      }
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log('Track unsubscribed:', track.kind);

    if (track.kind === Track.Kind.Audio) {
      const avatarElementId = `audio-avatar-${participant.identity}`;
      const agentElementId = `audio-agent-${participant.identity}`;
      document.getElementById(avatarElementId)?.remove();
      document.getElementById(agentElementId)?.remove();
    }

    const publishOnBehalf = participant.attributes?.['lk.publish_on_behalf'];
    if (publishOnBehalf) {
      if (track.kind === Track.Kind.Video) {
        set({ avatarVideoTrack: null });
      } else if (track.kind === Track.Kind.Audio) {
        set({ avatarAudioTrack: null, avatarAudioElement: null });
        applyAudioRouting(get);
      }
    } else if (track.kind === Track.Kind.Audio && participant.kind === ParticipantKind.AGENT) {
      set({ agentAudioTrack: null, agentAudioElement: null });
      applyAudioRouting(get);
    }

    track.detach();
  });

  // Participant connected
  room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
    console.log('Participant connected:', participant.identity, 'kind:', participant.kind);

    const publishOnBehalf = participant.attributes?.['lk.publish_on_behalf'];
    if (publishOnBehalf) {
      console.log('Avatar worker connected');
      set({ avatarParticipant: participant });
      return;
    }

    if (participant.kind === ParticipantKind.AGENT) {
      set({ agentParticipant: participant });
      updateAgentStateFromAttributes(participant, set);

      participant.on('attributesChanged', (changedAttributes) => {
        if (AGENT_STATE_ATTRIBUTE in changedAttributes) {
          updateAgentStateFromAttributes(participant, set);
        }
      });
    }
  });

  // Participant disconnected
  room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);

    const state = get();
    if (state.avatarParticipant?.identity === participant.identity) {
      set({
        avatarParticipant: null,
        avatarVideoTrack: null,
        avatarAudioTrack: null,
        avatarAudioElement: null,
      });
      applyAudioRouting(get);
    }
  });

  // Participant attribute changes (agent state updates)
  room.on(RoomEvent.ParticipantAttributesChanged, (changedAttributes, participant) => {
    const { agentParticipant } = get();
    if (
      participant.kind === ParticipantKind.AGENT ||
      participant.identity === agentParticipant?.identity
    ) {
      if (participant.attributes?.['lk.publish_on_behalf']) {
        return;
      }
      if (AGENT_STATE_ATTRIBUTE in changedAttributes) {
        updateAgentStateFromAttributes(participant, set);
      }
    }
  });

  // Transcription received
  room.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {
    const { agentParticipant } = get();

    for (const segment of segments) {
      const isAgent =
        participant?.kind === ParticipantKind.AGENT ||
        participant?.identity === agentParticipant?.identity;

      const entry: TranscriptEntry = {
        id: segment.id,
        text: segment.text,
        participant: isAgent ? 'agent' : 'user',
        participantName: participant?.name || participant?.identity || 'Unknown',
        timestamp: new Date(),
        isFinal: segment.final,
        isAgent,
      };

      set((state) => {
        const existingIndex = state.transcripts.findIndex((t) => t.id === segment.id);
        if (existingIndex >= 0) {
          const updated = [...state.transcripts];
          updated[existingIndex] = entry;
          return { transcripts: updated };
        }
        return { transcripts: [...state.transcripts, entry] };
      });
    }
  });

  // Disconnection
  room.on(RoomEvent.Disconnected, () => {
    const { avatarAudioElement, agentAudioElement } = get();
    avatarAudioElement?.remove();
    agentAudioElement?.remove();
    document.body.classList.remove('chat-squeezed');
    set({
      sessionState: 'idle',
      agentState: 'initializing',
      agentParticipant: null,
      room: null,
      avatarEnabled: false,
      avatarVisible: true,
      avatarAvailable: false,
      avatarTogglePending: false,
      avatarVideoTrack: null,
      avatarAudioTrack: null,
      agentAudioTrack: null,
      avatarParticipant: null,
      avatarAudioElement: null,
      agentAudioElement: null,
      isMuted: false,
      isVolumeMuted: false,
      isChatPanelOpen: false,
      uiComponents: [],
      templates: [],
      // currentScene intentionally preserved — last scene stays visible after disconnect
      skeletonLayout: null,
    });
  });

  // DataReceived: handle UI Engine scene data (skeleton + full scene)
  room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: RemoteParticipant | undefined, kind: unknown, topic: string | undefined) => {
    if (topic !== 'ui-engine:scene') return;

    try {
      const message = JSON.parse(new TextDecoder().decode(payload));
      console.log('DataReceived [ui-engine:scene]:', message.type, message);

      if (message.type === 'skeleton') {
        set({
          skeletonLayout: message.layout || message.skeleton || null,
          sceneActive: true,
        });
      } else if (message.type === 'scene') {
        let sceneData: SceneData;

        if (message.dsl && typeof message.dsl === 'string') {
          // New DSL path — parse pipe-delimited format
          const parsed = parseDSL(message.dsl);
          sceneData = {
            id: message.id || `scene-${Date.now()}`,
            badge: parsed.badge,
            layout: parsed.layout,
            cards: parsed.cards,
            footerLeft: message.footerLeft,
            footerRight: message.footerRight,
            timestamp: new Date(),
          };
        } else {
          // Legacy JSON path (backward compat during migration)
          sceneData = {
            id: message.id || `scene-${Date.now()}`,
            badge: message.badge,
            title: message.title,
            subtitle: message.subtitle,
            layout: message.layout,
            cards: message.cards || [],
            maxRows: message.maxRows,
            footerLeft: message.footerLeft,
            footerRight: message.footerRight,
            timestamp: new Date(),
          };
        }

        set((state) => ({
          currentScene: sceneData,
          skeletonLayout: null,
          sceneActive: true,
          sceneHistory: state.currentScene ? [...state.sceneHistory, state.currentScene] : state.sceneHistory,
          sceneFuture: [],
        }));
      }
    } catch (err) {
      console.error('Error parsing ui-engine:scene data:', err);
    }
  });

  // Check for existing agent participants
  for (const participant of room.remoteParticipants.values()) {
    if (participant.attributes?.['lk.publish_on_behalf']) {
      set({ avatarParticipant: participant });
      continue;
    }

    if (participant.kind === ParticipantKind.AGENT) {
      set({ agentParticipant: participant });
      updateAgentStateFromAttributes(participant, set);

      participant.on('attributesChanged', (changedAttributes) => {
        if (AGENT_STATE_ATTRIBUTE in changedAttributes) {
          updateAgentStateFromAttributes(participant, set);
        }
      });
    }
  }
}

// Helper: Update agent state from participant attributes
function updateAgentStateFromAttributes(
  participant: Participant,
  set: (state: Partial<VoiceSessionState>) => void
) {
  const stateAttr = participant.attributes[AGENT_STATE_ATTRIBUTE];
  if (stateAttr) {
    set({ agentState: stateAttr as AgentState });
  }
}

// Helper: Register RPC handlers for agent UI control
function registerRpcHandlers(
  room: Room,
  set: (state: Partial<VoiceSessionState> | ((state: VoiceSessionState) => Partial<VoiceSessionState>)) => void,
  get: () => VoiceSessionState
) {
  const localParticipant = room.localParticipant;

  // Handler: Navigate to page (client-side navigation)
  localParticipant.registerRpcMethod('navigate', async (data) => {
    try {
      const payload = JSON.parse(data.payload);
      console.log('RPC: navigate', payload);

      // Use Next.js router for client-side navigation (preserves connection)
      window.dispatchEvent(
        new CustomEvent('agent-navigate', { detail: payload })
      );

      return JSON.stringify({ success: true });
    } catch (error) {
      console.error('RPC navigate error:', error);
      return JSON.stringify({ success: false, error: String(error) });
    }
  });

  // Handler: Set full-screen scene
  localParticipant.registerRpcMethod('setScene', async (data) => {
    try {
      const payload = JSON.parse(data.payload);
      console.log('RPC: setScene', payload);

      const sceneData: SceneData = {
        id: payload.id || `scene-${Date.now()}`,
        badge: payload.badge,
        title: payload.title,
        subtitle: payload.subtitle,
        layout: payload.layout,
        cards: payload.cards || [],
        maxRows: payload.maxRows,
        footerLeft: payload.footerLeft,
        footerRight: payload.footerRight,
        timestamp: new Date(),
      };

      set((state) => ({
        currentScene: sceneData,
        sceneActive: true,
        sceneHistory: state.currentScene ? [...state.sceneHistory, state.currentScene] : state.sceneHistory,
        sceneFuture: [],
      }));

      return JSON.stringify({ success: true });
    } catch (error) {
      console.error('RPC setScene error:', error);
      return JSON.stringify({ success: false, error: String(error) });
    }
  });

  // Handler: Clear scene (return to static page)
  localParticipant.registerRpcMethod('clearScene', async () => {
    console.log('RPC: clearScene');
    set({ sceneActive: false, currentScene: null });
    return JSON.stringify({ success: true });
  });

  // Handler: Call site function
  localParticipant.registerRpcMethod('callSiteFunction', async (data) => {
    try {
      const payload = JSON.parse(data.payload);
      const { name, args } = payload;
      console.log('RPC: callSiteFunction', name, args);

      const fn = (window as any).__siteFunctions?.[name];
      if (!fn) {
        return JSON.stringify({ success: false, error: `Unknown site function: ${name}` });
      }

      const result = await fn(args);
      return JSON.stringify({ success: true, result });
    } catch (error) {
      console.error('RPC callSiteFunction error:', error);
      return JSON.stringify({ success: false, error: String(error) });
    }
  });
}
