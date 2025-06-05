import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config/api';

// Получение начального количества фишек
export const fetchInitialChips = createAsyncThunk(
  'user/fetchInitialChips',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);

      const response = await fetch(`${API_URL}/api/users/chips`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch chips');
      }

      const data = await response.json();
      return data.chips;
    } catch (error) {
      console.error('Fetch chips error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Обновление фишек в БД
export const updateUserChips = createAsyncThunk(
  'user/updateChips',
  async (amount, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token for update:', token);
      console.log('Updating chips to:', amount);

      const response = await fetch(`${API_URL}/api/users/chips`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chips: amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update chips error response:', errorData);
        throw new Error(errorData.message || 'Failed to update chips');
      }

      const data = await response.json();
      console.log('Update chips success:', data);
      return data.chips;
    } catch (error) {
      console.error('Update chips error:', error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  chips: 1000,
  isLoading: false,
  error: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Обработка получения начальных фишек
      .addCase(fetchInitialChips.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchInitialChips.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chips = action.payload;
        state.error = null;
      })
      .addCase(fetchInitialChips.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Обработка обновления фишек
      .addCase(updateUserChips.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserChips.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chips = action.payload;
        state.error = null;
      })
      .addCase(updateUserChips.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export default userSlice.reducer; 