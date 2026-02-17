export interface ModelState {
  loaded: boolean;
  name?: string;
}

const state: ModelState = { loaded: false };

export async function loadModel(name: string): Promise<ModelState> {
  state.loaded = true;
  state.name = name;
  return state;
}

export function getModelState(): ModelState {
  return { ...state };
}
