import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/avatar.png';
import { API_URL } from '../config/api';

function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusError, setBonusError] = useState('');
  const [bonusSuccess, setBonusSuccess] = useState('');
  const [msLeft, setMsLeft] = useState(0);
  const [lastBonus, setLastBonus] = useState(user?.lastBonus);
  const [chips, setChips] = useState(user?.chips);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editUsername, setEditUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  useEffect(() => {
    setLastBonus(user?.lastBonus);
    setChips(user?.chips);
    setNewUsername(user?.username || '');
  }, [user]);

  useEffect(() => {
    let timer;
    if (msLeft > 0) {
      timer = setInterval(() => {
        setMsLeft((prev) => (prev > 1000 ? prev - 1000 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [msLeft]);

  const getTimeString = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBonus = async () => {
    setBonusLoading(true);
    setBonusError('');
    setBonusSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/bonus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.msLeft) setMsLeft(data.msLeft);
        setBonusError(data.message || 'Помилка отримання бонусу');
      } else {
        setBonusSuccess(data.message);
        setChips(data.chips);
        setLastBonus(data.lastBonus);
      }
    } catch (e) {
      setBonusError('Помилка сервера');
    } finally {
      setBonusLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Помилка при видаленні облікового запису');
      } else {
        alert('Обліковий запис успішно видалено!');
        logout();
        navigate('/');
      }
    } catch (e) {
      alert('Помилка сервера при видаленні облікового запису');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUsernameSave = async () => {
    setUsernameLoading(true);
    setUsernameError('');
    setUsernameSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername })
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameError(data.message || 'Помилка зміни імені');
      } else {
        setUsernameSuccess('Імʼя успішно змінено!');
        updateUser(data);
        setEditUsername(false);
      }
    } catch (e) {
      setUsernameError('Помилка сервера');
    } finally {
      setUsernameLoading(false);
    }
  };

  // Перевіряємо, чи доступний бонус
  let bonusAvailable = true;
  if (lastBonus) {
    const last = new Date(lastBonus);
    const now = new Date();
    if (now - last < 24 * 60 * 60 * 1000) {
      bonusAvailable = false;
      if (msLeft === 0) setMsLeft(last.getTime() + 24 * 60 * 60 * 1000 - now.getTime());
    }
  }

  if (!user) {
    return <div className="text-center">Завантаження профілю...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-3xl font-bold mb-6 text-center">Профіль</h2>

        <div className="flex flex-col items-center mb-6">
          <img
            src={defaultAvatar}
            alt="Аватар"
            className="w-28 h-28 rounded-full object-cover border-4 border-gray-700 shadow-lg mb-2"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Ім'я користувача</label>
            {!editUsername ? (
              <div className="flex items-center gap-2">
            <p className="text-xl">{user.username}</p>
                <button
                  className="ml-2 text-blue-400 hover:text-blue-600 underline text-sm"
                  onClick={() => { setEditUsername(true); setUsernameError(''); setUsernameSuccess(''); }}
                >Змінити</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="rounded px-2 py-1 text-black"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  disabled={usernameLoading}
                  maxLength={24}
                />
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                  onClick={handleUsernameSave}
                  disabled={usernameLoading || !newUsername.trim() || newUsername === user.username}
                >Зберегти</button>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                  onClick={() => { setEditUsername(false); setNewUsername(user.username); setUsernameError(''); setUsernameSuccess(''); }}
                  disabled={usernameLoading}
                >Скасувати</button>
              </div>
            )}
            {usernameError && <div className="text-red-400 text-sm mt-1">{usernameError}</div>}
            {usernameSuccess && <div className="text-green-400 text-sm mt-1">{usernameSuccess}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400">Email</label>
            <p className="text-xl">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400">Chips</label>
            <p className="text-xl">{chips}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400">Учасник з</label>
            <p className="text-xl">
              {user.lastBonus 
                ? new Date(user.lastBonus).toLocaleDateString('uk-UA')
                : 'Дата невідома'
              }
            </p>
          </div>

          <div className="mt-6">
            <button
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors ${bonusLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleBonus}
              disabled={!bonusAvailable || bonusLoading}
            >
              {bonusLoading
                ? 'Завантаження...'
                : bonusAvailable
                  ? 'Отримати щоденний бонус'
                  : `Бонус доступний через ${getTimeString(msLeft)}`}
            </button>
            {bonusError && <div className="text-red-400 mt-2">{bonusError}</div>}
            {bonusSuccess && <div className="text-green-400 mt-2">{bonusSuccess}</div>}
          </div>

          {/* Блок удаления аккаунта */}
          <div className="mt-8 pt-6 border-t border-gray-600">
            {!showDeleteConfirm ? (
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Видалити обліковий запис
              </button>
            ) : (
              <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded-lg p-4">
                <p className="text-red-400 mb-4">
                  ⚠️ Ви впевнені, що хочете видалити свій обліковий запис? 
                  Ця дія є незворотною і всі ваші дані будуть втрачені назавжди!
                </p>
                <div className="flex gap-3">
                  <button
                    className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors ${deleteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Видалення...' : 'Так, видалити назавжди'}
                  </button>
                  <button
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile; 