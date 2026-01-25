import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import canvasReducer from './slices/canvasSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    canvas: canvasReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
