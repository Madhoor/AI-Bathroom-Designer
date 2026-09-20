import type { DesignState } from "../design/types";
import type { EditorSessionState } from "./types";

export function createEditorSession(initialState: DesignState): EditorSessionState {
  return {
    past: [],
    present: initialState,
    future: [],
  };
}

export function pushSessionState(
  session: EditorSessionState,
  newState: DesignState,
): EditorSessionState {
  if (session.present === newState) {
    return session;
  }

  // Check if meaningful state elements changed
  const samePlacements =
    JSON.stringify(session.present.placements) === JSON.stringify(newState.placements);
  const sameProducts =
    session.present.selectedProducts.length === newState.selectedProducts.length;
  const sameCost = session.present.totalProductCost === newState.totalProductCost;

  if (samePlacements && sameProducts && sameCost) {
    return session;
  }

  return {
    past: [...session.past, session.present],
    present: newState,
    future: [],
  };
}

export type UndoRedoResult = EditorSessionState & {
  session: EditorSessionState;
  state: DesignState | null;
};

export function undoSession(session: EditorSessionState): UndoRedoResult {
  if (session.past.length === 0) {
    return {
      ...session,
      get session() {
        return this;
      },
      state: null,
    };
  }

  const previous = session.past[session.past.length - 1];
  const newPast = session.past.slice(0, session.past.length - 1);

  const updatedSession: UndoRedoResult = {
    past: newPast,
    present: previous,
    future: [session.present, ...session.future],
    get session() {
      return this;
    },
    state: previous,
  };

  return updatedSession;
}

export function redoSession(session: EditorSessionState): UndoRedoResult {
  if (session.future.length === 0) {
    return {
      ...session,
      get session() {
        return this;
      },
      state: null,
    };
  }

  const next = session.future[0];
  const newFuture = session.future.slice(1);

  const updatedSession: UndoRedoResult = {
    past: [...session.past, session.present],
    present: next,
    future: newFuture,
    get session() {
      return this;
    },
    state: next,
  };

  return updatedSession;
}

export function canUndo(session: EditorSessionState): boolean {
  return session.past.length > 0;
}

export function canRedo(session: EditorSessionState): boolean {
  return session.future.length > 0;
}
